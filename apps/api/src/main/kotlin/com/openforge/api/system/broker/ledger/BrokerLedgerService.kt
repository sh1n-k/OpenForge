package com.openforge.api.system.broker.ledger

import com.openforge.api.strategy.domain.OrderMode
import com.openforge.api.system.broker.BrokerConnectionService
import jakarta.annotation.PostConstruct
import jakarta.transaction.Transactional
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import tools.jackson.databind.ObjectMapper
import java.math.BigDecimal
import java.sql.Timestamp
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

@Service
@Transactional
class BrokerLedgerService(
    private val jdbcTemplate: JdbcTemplate,
    private val objectMapper: ObjectMapper,
    private val brokerConnectionService: BrokerConnectionService,
) {
    @PostConstruct
    fun recoverInterruptedSyncRuns() {
        jdbcTemplate.update(
            """
            update broker_ledger_sync_run
            set status = 'failed',
                error_message = 'interrupted',
                completed_at = coalesce(completed_at, now()),
                updated_at = now()
            where status in ('queued', 'running')
            """.trimIndent(),
        )
    }

    fun getStatus(): BrokerLedgerStatusResponse {
        val liveConfigured = brokerConnectionService.hasEnabledConfig(OrderMode.LIVE)

        return BrokerLedgerStatusResponse(
            brokerType = BROKER_TYPE,
            liveConfigured = liveConfigured,
            latestSyncRun = findLatestSyncRunResponse(),
            latestSuccessfulSyncRun = findLatestSuccessfulSyncRunResponse(),
        )
    }

    fun createSyncRun(request: BrokerLedgerSyncRequest): BrokerLedgerSyncRunResponse {
        val normalized = normalizeRequest(request)
        brokerConnectionService.loadCredentials(OrderMode.LIVE)

        val runId = UUID.randomUUID()
        val now = OffsetDateTime.now(ZoneOffset.UTC)
        jdbcTemplate.update(
            """
            insert into broker_ledger_sync_run (
                id,
                broker_type,
                status,
                markets,
                overseas_exchanges,
                start_date,
                end_date,
                trade_count,
                balance_count,
                profit_count,
                requested_at,
                started_at,
                completed_at,
                error_message,
                created_at,
                updated_at
            ) values (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, null, null, null, now(), now())
            """.trimIndent(),
            runId,
            BROKER_TYPE,
            BrokerLedgerStatus.QUEUED.value,
            marketsToStorage(normalized.markets),
            overseasExchangesToStorage(normalized.overseasExchanges),
            normalized.startDate,
            normalized.endDate,
            now.toTimestamp(),
        )

        appendAppEvent(
            eventType = "broker_ledger_sync_queued",
            level = "info",
            payload =
                mapOf(
                    "syncRunId" to runId,
                    "startDate" to normalized.startDate.toString(),
                    "endDate" to normalized.endDate.toString(),
                    "markets" to normalized.markets.map { it.value },
                    "overseasExchanges" to normalized.overseasExchanges.map { it.value },
                ),
        )

        return findSyncRunResponse(runId)
            ?: throw IllegalStateException("Failed to create sync run $runId")
    }

    fun markRunning(runId: UUID) {
        jdbcTemplate.update(
            """
            update broker_ledger_sync_run
            set status = ?,
                started_at = coalesce(started_at, now()),
                updated_at = now()
            where id = ? and status in ('queued', 'running')
            """.trimIndent(),
            BrokerLedgerStatus.RUNNING.value,
            runId,
        )
        appendAppEvent(
            eventType = "broker_ledger_sync_running",
            level = "info",
            payload = mapOf("syncRunId" to runId),
        )
    }

    internal fun applySyncResult(
        runId: UUID,
        payload: BrokerLedgerSyncPayload,
    ) {
        payload.trades.forEach { insertTrade(runId, it) }
        payload.balances.forEach { insertBalance(runId, it) }
        payload.profits.forEach { insertProfit(runId, it) }

        val tradeItemCount = payload.trades.count { it.rowKind == BrokerLedgerRowKind.ITEM }
        val balanceItemCount = payload.balances.count { it.rowKind == BrokerLedgerRowKind.ITEM }
        val profitItemCount = payload.profits.count { it.rowKind == BrokerLedgerRowKind.ITEM }

        jdbcTemplate.update(
            """
            update broker_ledger_sync_run
            set status = ?,
                trade_count = ?,
                balance_count = ?,
                profit_count = ?,
                completed_at = coalesce(completed_at, now()),
                error_message = null,
                updated_at = now()
            where id = ?
            """.trimIndent(),
            BrokerLedgerStatus.SUCCEEDED.value,
            tradeItemCount,
            balanceItemCount,
            profitItemCount,
            runId,
        )
        appendAppEvent(
            eventType = "broker_ledger_sync_succeeded",
            level = "info",
            payload =
                mapOf(
                    "syncRunId" to runId,
                    "tradeCount" to tradeItemCount,
                    "balanceCount" to balanceItemCount,
                    "profitCount" to profitItemCount,
                ),
        )
    }

    fun markFailed(
        runId: UUID,
        message: String,
    ) {
        jdbcTemplate.update(
            """
            update broker_ledger_sync_run
            set status = ?,
                error_message = ?,
                completed_at = coalesce(completed_at, now()),
                updated_at = now()
            where id = ?
            """.trimIndent(),
            BrokerLedgerStatus.FAILED.value,
            message,
            runId,
        )
        appendAppEvent(
            eventType = "broker_ledger_sync_failed",
            level = "error",
            payload = mapOf("syncRunId" to runId, "message" to message),
        )
    }

    fun findSyncRunResponse(runId: UUID): BrokerLedgerSyncRunResponse? =
        jdbcTemplate
            .query(
                """
                select id, broker_type, status, markets, overseas_exchanges, start_date, end_date,
                       trade_count, balance_count, profit_count, error_message, requested_at,
                       started_at, completed_at, created_at, updated_at
                from broker_ledger_sync_run
                where id = ?
                """.trimIndent(),
                { rs, _ -> rs.toSyncRunResponse() },
                runId,
            ).firstOrNull()

    fun listSyncRuns(limit: Int): List<BrokerLedgerSyncRunResponse> =
        jdbcTemplate.query(
            """
            select id, broker_type, status, markets, overseas_exchanges, start_date, end_date,
                   trade_count, balance_count, profit_count, error_message, requested_at,
                   started_at, completed_at, created_at, updated_at
            from broker_ledger_sync_run
            order by requested_at desc, created_at desc
            limit ?
            """.trimIndent(),
            { rs, _ -> rs.toSyncRunResponse() },
            normalizeLimit(limit, 20),
        )

    fun listTrades(
        syncRunId: UUID?,
        market: BrokerLedgerMarket?,
        limit: Int,
    ): List<BrokerLedgerTradeResponse> {
        val resolvedRunId = resolveSyncRunId(syncRunId) ?: return emptyList()
        val params = mutableListOf<Any>(resolvedRunId)
        val sql =
            StringBuilder(
                """
                select id, sync_run_id, market, overseas_exchange, row_kind, source_api, symbol, symbol_name,
                       side, order_status, order_number, execution_number, quantity, price, filled_quantity,
                       remaining_quantity, realized_pnl, currency, captured_at
                from broker_ledger_trade_entry
                where sync_run_id = ?
                  and row_kind = 'item'
                """.trimIndent(),
            )
        market?.let {
            sql.append(" and market = ?")
            params += it.value
        }
        sql.append(" order by captured_at desc, created_at desc limit ?")
        params += normalizeLimit(limit, 100)
        return jdbcTemplate.query(sql.toString(), { rs, _ -> rs.toTradeResponse() }, *params.toTypedArray())
    }

    fun listBalances(
        syncRunId: UUID?,
        market: BrokerLedgerMarket?,
        limit: Int,
    ): List<BrokerLedgerBalanceResponse> {
        val resolvedRunId = resolveSyncRunId(syncRunId) ?: return emptyList()
        val params = mutableListOf<Any>(resolvedRunId)
        val sql =
            StringBuilder(
                """
                select id, sync_run_id, market, overseas_exchange, row_kind, source_api, symbol, symbol_name,
                       quantity, average_price, current_price, valuation_amount, unrealized_pnl, realized_pnl,
                       profit_rate, currency, captured_at
                from broker_ledger_balance_snapshot
                where sync_run_id = ?
                  and row_kind = 'item'
                """.trimIndent(),
            )
        market?.let {
            sql.append(" and market = ?")
            params += it.value
        }
        sql.append(" order by captured_at desc, created_at desc limit ?")
        params += normalizeLimit(limit, 100)
        return jdbcTemplate.query(sql.toString(), { rs, _ -> rs.toBalanceResponse() }, *params.toTypedArray())
    }

    fun listProfits(
        syncRunId: UUID?,
        market: BrokerLedgerMarket?,
        limit: Int,
    ): List<BrokerLedgerProfitResponse> {
        val resolvedRunId = resolveSyncRunId(syncRunId) ?: return emptyList()
        val params = mutableListOf<Any>(resolvedRunId)
        val sql =
            StringBuilder(
                """
                select id, sync_run_id, market, overseas_exchange, row_kind, source_api, symbol, symbol_name,
                       quantity, buy_amount, sell_amount, fees, taxes, realized_pnl, profit_rate, currency, captured_at
                from broker_ledger_profit_snapshot
                where sync_run_id = ?
                  and row_kind = 'item'
                """.trimIndent(),
            )
        market?.let {
            sql.append(" and market = ?")
            params += it.value
        }
        sql.append(" order by captured_at desc, created_at desc limit ?")
        params += normalizeLimit(limit, 100)
        return jdbcTemplate.query(sql.toString(), { rs, _ -> rs.toProfitResponse() }, *params.toTypedArray())
    }

    private fun resolveSyncRunId(syncRunId: UUID?): UUID? {
        if (syncRunId != null) {
            return jdbcTemplate
                .query(
                    "select id from broker_ledger_sync_run where id = ?",
                    { rs, _ -> UUID.fromString(rs.getString("id")) },
                    syncRunId,
                ).firstOrNull()
                ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Broker ledger sync run not found: $syncRunId")
        }
        return findLatestSuccessfulSyncRunResponse()?.id
    }

    private fun findLatestSyncRunResponse(): BrokerLedgerSyncRunResponse? =
        jdbcTemplate
            .query(
                """
                select id, broker_type, status, markets, overseas_exchanges, start_date, end_date,
                       trade_count, balance_count, profit_count, error_message, requested_at,
                       started_at, completed_at, created_at, updated_at
                from broker_ledger_sync_run
                order by requested_at desc, created_at desc
                limit 1
                """.trimIndent(),
                { rs, _ -> rs.toSyncRunResponse() },
            ).firstOrNull()

    private fun findLatestSuccessfulSyncRunResponse(): BrokerLedgerSyncRunResponse? =
        jdbcTemplate
            .query(
                """
                select id, broker_type, status, markets, overseas_exchanges, start_date, end_date,
                       trade_count, balance_count, profit_count, error_message, requested_at,
                       started_at, completed_at, created_at, updated_at
                from broker_ledger_sync_run
                where status = ?
                order by coalesce(completed_at, requested_at) desc, created_at desc
                limit 1
                """.trimIndent(),
                { rs, _ -> rs.toSyncRunResponse() },
                BrokerLedgerStatus.SUCCEEDED.value,
            ).firstOrNull()

    private fun insertTrade(
        runId: UUID,
        input: BrokerLedgerTradeInput,
    ) {
        jdbcTemplate.update(
            """
            insert into broker_ledger_trade_entry (
                id, sync_run_id, market, overseas_exchange, row_kind, source_api, symbol, symbol_name,
                side, order_status, order_number, execution_number, quantity, price, filled_quantity,
                remaining_quantity, realized_pnl, currency, raw_payload, captured_at, created_at, updated_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, cast(? as jsonb), ?, now(), now())
            """.trimIndent(),
            UUID.randomUUID(),
            runId,
            input.market.value,
            input.overseasExchange?.value,
            input.rowKind.value,
            input.sourceApi,
            input.symbol,
            input.symbolName,
            input.side,
            input.orderStatus,
            input.orderNumber,
            input.executionNumber,
            input.quantity,
            input.price,
            input.filledQuantity,
            input.remainingQuantity,
            input.realizedPnl,
            input.currency,
            objectMapper.writeValueAsString(input.rawPayload),
            input.capturedAt.toTimestamp(),
        )
    }

    private fun insertBalance(
        runId: UUID,
        input: BrokerLedgerBalanceInput,
    ) {
        jdbcTemplate.update(
            """
            insert into broker_ledger_balance_snapshot (
                id, sync_run_id, market, overseas_exchange, row_kind, source_api, symbol, symbol_name,
                quantity, average_price, current_price, valuation_amount, unrealized_pnl, realized_pnl,
                profit_rate, currency, raw_payload, captured_at, created_at, updated_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, cast(? as jsonb), ?, now(), now())
            """.trimIndent(),
            UUID.randomUUID(),
            runId,
            input.market.value,
            input.overseasExchange?.value,
            input.rowKind.value,
            input.sourceApi,
            input.symbol,
            input.symbolName,
            input.quantity,
            input.averagePrice,
            input.currentPrice,
            input.valuationAmount,
            input.unrealizedPnl,
            input.realizedPnl,
            input.profitRate,
            input.currency,
            objectMapper.writeValueAsString(input.rawPayload),
            input.capturedAt.toTimestamp(),
        )
    }

    private fun insertProfit(
        runId: UUID,
        input: BrokerLedgerProfitInput,
    ) {
        jdbcTemplate.update(
            """
            insert into broker_ledger_profit_snapshot (
                id, sync_run_id, market, overseas_exchange, row_kind, source_api, symbol, symbol_name,
                quantity, buy_amount, sell_amount, fees, taxes, realized_pnl, profit_rate, currency,
                raw_payload, captured_at, created_at, updated_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, cast(? as jsonb), ?, now(), now())
            """.trimIndent(),
            UUID.randomUUID(),
            runId,
            input.market.value,
            input.overseasExchange?.value,
            input.rowKind.value,
            input.sourceApi,
            input.symbol,
            input.symbolName,
            input.quantity,
            input.buyAmount,
            input.sellAmount,
            input.fees,
            input.taxes,
            input.realizedPnl,
            input.profitRate,
            input.currency,
            objectMapper.writeValueAsString(input.rawPayload),
            input.capturedAt.toTimestamp(),
        )
    }

    private fun appendAppEvent(
        eventType: String,
        level: String,
        payload: Map<String, Any?>,
    ) {
        jdbcTemplate.update(
            """
            insert into app_event_log (event_type, level, payload, created_at)
            values (?, ?, cast(? as jsonb), now())
            """.trimIndent(),
            eventType,
            level,
            objectMapper.writeValueAsString(payload),
        )
    }

    private fun normalizeRequest(request: BrokerLedgerSyncRequest): BrokerLedgerSyncRequest {
        val markets = if (request.markets.isEmpty()) setOf(BrokerLedgerMarket.DOMESTIC, BrokerLedgerMarket.OVERSEAS) else request.markets
        val exchanges = if (request.overseasExchanges.isEmpty()) BrokerLedgerOverseasExchange.entries.toSet() else request.overseasExchanges
        if (request.startDate.isAfter(request.endDate)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "startDate must be on or before endDate")
        }
        return request.copy(markets = markets, overseasExchanges = exchanges)
    }

    private fun marketsToStorage(markets: Set<BrokerLedgerMarket>): String =
        markets.map { it.value }.sorted().joinToString(",")

    private fun overseasExchangesToStorage(exchanges: Set<BrokerLedgerOverseasExchange>): String =
        exchanges.map { it.value }.sorted().joinToString(",")

    private fun parseMarkets(value: String?): List<BrokerLedgerMarket> =
        value
            ?.split(',')
            ?.mapNotNull { token ->
                token.trim().takeIf { it.isNotEmpty() }?.let { BrokerLedgerMarket.fromValue(it) }
            }
            ?.ifEmpty { listOf(BrokerLedgerMarket.DOMESTIC, BrokerLedgerMarket.OVERSEAS) }
            ?: emptyList()

    private fun parseExchanges(value: String?): List<BrokerLedgerOverseasExchange> =
        value
            ?.split(',')
            ?.mapNotNull { token ->
                token.trim().takeIf { it.isNotEmpty() }?.let { BrokerLedgerOverseasExchange.fromValue(it) }
            }
            ?: emptyList()

    private fun normalizeLimit(
        value: Int,
        defaultValue: Int,
    ): Int = value.coerceIn(1, 500).takeIf { it > 0 } ?: defaultValue

    private fun Timestamp.toOffsetDateTimeUtc(): OffsetDateTime = toInstant().atOffset(ZoneOffset.UTC)

    private fun OffsetDateTime.toTimestamp(): Timestamp = Timestamp.from(toInstant())

    private fun java.sql.ResultSet.toSyncRunResponse(): BrokerLedgerSyncRunResponse =
        BrokerLedgerSyncRunResponse(
            id = UUID.fromString(getString("id")),
            brokerType = getString("broker_type"),
            status = BrokerLedgerStatus.fromValue(getString("status")),
            markets = parseMarkets(getString("markets")),
            overseasExchanges = parseExchanges(getString("overseas_exchanges")),
            startDate = getDate("start_date").toLocalDate(),
            endDate = getDate("end_date").toLocalDate(),
            tradeCount = getInt("trade_count"),
            balanceCount = getInt("balance_count"),
            profitCount = getInt("profit_count"),
            errorMessage = getString("error_message"),
            requestedAt = getTimestamp("requested_at").toOffsetDateTimeUtc(),
            startedAt = getTimestamp("started_at")?.toOffsetDateTimeUtc(),
            completedAt = getTimestamp("completed_at")?.toOffsetDateTimeUtc(),
            createdAt = getTimestamp("created_at").toOffsetDateTimeUtc(),
            updatedAt = getTimestamp("updated_at").toOffsetDateTimeUtc(),
        )

    private fun java.sql.ResultSet.toTradeResponse(): BrokerLedgerTradeResponse =
        BrokerLedgerTradeResponse(
            id = UUID.fromString(getString("id")),
            syncRunId = UUID.fromString(getString("sync_run_id")),
            market = BrokerLedgerMarket.fromValue(getString("market")),
            overseasExchange = getString("overseas_exchange")?.takeIf { it.isNotBlank() }?.let(BrokerLedgerOverseasExchange::fromValue),
            rowKind = BrokerLedgerRowKind.fromValue(getString("row_kind")),
            sourceApi = getString("source_api"),
            symbol = getString("symbol"),
            symbolName = getString("symbol_name"),
            side = getString("side"),
            orderStatus = getString("order_status"),
            orderNumber = getString("order_number"),
            executionNumber = getString("execution_number"),
            quantity = getLongOrNull("quantity"),
            price = getBigDecimal("price"),
            filledQuantity = getLongOrNull("filled_quantity"),
            remainingQuantity = getLongOrNull("remaining_quantity"),
            realizedPnl = getBigDecimal("realized_pnl"),
            currency = getString("currency"),
            capturedAt = getTimestamp("captured_at").toOffsetDateTimeUtc(),
        )

    private fun java.sql.ResultSet.toBalanceResponse(): BrokerLedgerBalanceResponse =
        BrokerLedgerBalanceResponse(
            id = UUID.fromString(getString("id")),
            syncRunId = UUID.fromString(getString("sync_run_id")),
            market = BrokerLedgerMarket.fromValue(getString("market")),
            overseasExchange = getString("overseas_exchange")?.takeIf { it.isNotBlank() }?.let(BrokerLedgerOverseasExchange::fromValue),
            rowKind = BrokerLedgerRowKind.fromValue(getString("row_kind")),
            sourceApi = getString("source_api"),
            symbol = getString("symbol"),
            symbolName = getString("symbol_name"),
            quantity = getLongOrNull("quantity"),
            averagePrice = getBigDecimal("average_price"),
            currentPrice = getBigDecimal("current_price"),
            valuationAmount = getBigDecimal("valuation_amount"),
            unrealizedPnl = getBigDecimal("unrealized_pnl"),
            realizedPnl = getBigDecimal("realized_pnl"),
            profitRate = getBigDecimal("profit_rate"),
            currency = getString("currency"),
            capturedAt = getTimestamp("captured_at").toOffsetDateTimeUtc(),
        )

    private fun java.sql.ResultSet.toProfitResponse(): BrokerLedgerProfitResponse =
        BrokerLedgerProfitResponse(
            id = UUID.fromString(getString("id")),
            syncRunId = UUID.fromString(getString("sync_run_id")),
            market = BrokerLedgerMarket.fromValue(getString("market")),
            overseasExchange = getString("overseas_exchange")?.takeIf { it.isNotBlank() }?.let(BrokerLedgerOverseasExchange::fromValue),
            rowKind = BrokerLedgerRowKind.fromValue(getString("row_kind")),
            sourceApi = getString("source_api"),
            symbol = getString("symbol"),
            symbolName = getString("symbol_name"),
            quantity = getLongOrNull("quantity"),
            buyAmount = getBigDecimal("buy_amount"),
            sellAmount = getBigDecimal("sell_amount"),
            fees = getBigDecimal("fees"),
            taxes = getBigDecimal("taxes"),
            realizedPnl = getBigDecimal("realized_pnl"),
            profitRate = getBigDecimal("profit_rate"),
            currency = getString("currency"),
            capturedAt = getTimestamp("captured_at").toOffsetDateTimeUtc(),
        )

    private fun java.sql.ResultSet.getLongOrNull(column: String): Long? =
        getObject(column)?.let {
            when (it) {
                is Number -> it.toLong()
                else -> getString(column)?.toLongOrNull()
            }
        }

    private companion object {
        private const val BROKER_TYPE = "kis"
    }
}
