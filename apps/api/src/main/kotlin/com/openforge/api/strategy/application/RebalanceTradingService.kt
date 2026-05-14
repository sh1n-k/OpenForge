package com.openforge.api.strategy.application

import com.openforge.api.config.ApplicationProperties
import com.openforge.api.strategy.domain.OrderMode
import com.openforge.api.strategy.domain.OrderSide
import com.openforge.api.strategy.domain.StrategyStatus
import com.openforge.api.strategy.web.ApproveRebalancePlanRequest
import com.openforge.api.strategy.web.CreateRebalancePlanRequest
import com.openforge.api.strategy.web.RebalancePlanOrderResponse
import com.openforge.api.strategy.web.RebalancePlanResponse
import com.openforge.api.strategy.web.RebalanceTargetWeightRequest
import com.openforge.api.strategy.web.SyncBrokerPositionRequest
import com.openforge.api.strategy.web.SyncRebalancePlanRequest
import com.openforge.api.strategy.web.UpdateGlobalRiskKillSwitchRequest
import com.openforge.api.system.risk.SystemRiskService
import jakarta.transaction.Transactional
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import tools.jackson.databind.ObjectMapper
import java.math.BigDecimal
import java.math.RoundingMode
import java.net.http.HttpTimeoutException
import java.sql.ResultSet
import java.sql.Timestamp
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.util.UUID

@Service
@Transactional
class RebalanceTradingService(
    private val jdbcTemplate: JdbcTemplate,
    private val objectMapper: ObjectMapper,
    private val applicationProperties: ApplicationProperties,
    private val systemRiskService: SystemRiskService,
    private val brokerOrderGateway: BrokerOrderGateway,
) {
    fun listPlans(
        strategyId: UUID,
        limit: Int,
    ): List<RebalancePlanResponse> {
        ensureStrategyExists(strategyId)
        val plans =
            jdbcTemplate.query(
                """
                select *
                from strategy_rebalance_plan
                where strategy_id = ?
                order by planned_at desc
                limit ?
                """.trimIndent(),
                { rs, _ -> mapPlan(rs) },
                strategyId,
                limit.coerceIn(1, 100),
            )
        return plans.map { it.toResponse(loadOrders(it.id)) }
    }

    fun createPlan(
        strategyId: UUID,
        request: CreateRebalancePlanRequest,
    ): RebalancePlanResponse {
        ensureStrategyExists(strategyId)
        val versionId = latestStrategyVersionId(strategyId)
        val settings = loadRiskSettings(strategyId)
        val now = OffsetDateTime.now(DEFAULT_ZONE)
        validateAccountSnapshot(request)
        validateTargets(request.targetWeights)

        val lines = planLines(strategyId, request, settings)
        val totalNotional = lines.sumOf { it.notional }
        val riskCodes = mutableListOf<String>()
        if (lines.isEmpty()) riskCodes += "no_trade_needed"
        if (settings.strategyKillSwitchEnabled) riskCodes += "strategy_kill_switch"
        if (systemRiskService.isGlobalKillSwitchEnabled()) riskCodes += "global_kill_switch"
        if (settings.strategyMaxExposure != null && totalNotional > settings.strategyMaxExposure) {
            riskCodes += "plan_notional_exceeds_strategy_max_exposure"
            stopAutomationAndEnableKillSwitch(strategyId, "expected_plan_notional_too_large")
        }

        val status = if (riskCodes.any { it != "no_trade_needed" }) PLAN_BLOCKED else PLAN_PLANNED
        val planId = UUID.randomUUID()
        val riskSummary =
            linkedMapOf(
                "passed" to (status == PLAN_PLANNED),
                "reasonCodes" to riskCodes,
                "totalNotional" to totalNotional.toDouble(),
            )
        val settingsSnapshot = settings.toSnapshot()

        jdbcTemplate.update(
            """
            insert into strategy_rebalance_plan (
                id, strategy_id, strategy_version_id, mode, status, account_snapshot, target_weights,
                settings_snapshot, risk_summary, approval_required, admin_approved, failure_reason, planned_at
            ) values (?, ?, ?, ?, ?, cast(? as jsonb), cast(? as jsonb), cast(? as jsonb), cast(? as jsonb), true, false, ?, ?)
            """.trimIndent(),
            planId,
            strategyId,
            versionId,
            request.mode.name,
            status,
            json(accountSnapshotMap(request)),
            json(targetWeightsMap(request.targetWeights)),
            json(settingsSnapshot),
            json(riskSummary),
            riskCodes.joinToString(",").ifBlank { null },
            now.toTimestamp(),
        )

        lines.forEach { line ->
            jdbcTemplate.update(
                """
                insert into strategy_rebalance_plan_order (
                    id, plan_id, strategy_id, symbol, side, quantity, price, notional, estimated_fee, estimated_tax,
                    status, idempotency_key, remaining_quantity, precheck_summary, payload
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, cast(? as jsonb), cast(? as jsonb))
                """.trimIndent(),
                line.id,
                planId,
                strategyId,
                line.symbol,
                line.side.name,
                line.quantity,
                line.price,
                line.notional,
                line.estimatedFee,
                line.estimatedTax,
                ORDER_PLANNED,
                line.idempotencyKey,
                line.quantity,
                json(line.precheckSummary),
                json(line.payload),
            )
        }

        appendAudit(
            strategyId = strategyId,
            planId = planId,
            eventType = "rebalance_plan_created",
            payload =
                mapOf(
                    "strategyVersionId" to versionId.toString(),
                    "accountSnapshot" to accountSnapshotMap(request),
                    "targetWeights" to targetWeightsMap(request.targetWeights),
                    "orderPlan" to lines.map { it.toPayloadMap() },
                    "riskSummary" to riskSummary,
                ),
        )

        return getPlan(strategyId, planId)
    }

    fun approvePlan(
        strategyId: UUID,
        planId: UUID,
        request: ApproveRebalancePlanRequest,
    ): RebalancePlanResponse {
        val plan = getPlanRecord(strategyId, planId)
        if (plan.status != PLAN_PLANNED) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Only planned rebalance plans can be approved")
        }
        if (plan.mode == OrderMode.LIVE && !request.confirmLiveRisk) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Live rebalance approval requires confirmLiveRisk=true")
        }
        val now = OffsetDateTime.now(DEFAULT_ZONE)
        jdbcTemplate.update(
            """
            update strategy_rebalance_plan
            set status = ?, admin_approved = true, approved_at = ?, approved_by = ?, updated_at = now()
            where id = ?
            """.trimIndent(),
            PLAN_APPROVED,
            now.toTimestamp(),
            request.approvedBy,
            planId,
        )
        appendAudit(strategyId, planId, "rebalance_plan_approved", mapOf("approvedBy" to request.approvedBy, "mode" to plan.mode.value))
        return getPlan(strategyId, planId)
    }

    fun sendApprovedPlan(
        strategyId: UUID,
        planId: UUID,
    ): RebalancePlanResponse {
        val plan = getPlanRecord(strategyId, planId)
        if (plan.status != PLAN_APPROVED || !plan.adminApproved) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Only explicitly approved plans can be sent")
        }
        val settings = loadRiskSettings(strategyId)
        if (plan.mode == OrderMode.LIVE) {
            enforceLiveGates(plan, settings)
        }

        val orders = loadOrders(planId)
        val account = plan.accountSnapshot
        val cash = decimal(account["cash"])
        var remainingCash = cash
        orders.forEach { order ->
            val precheck = precheckOrder(plan, order, settings, remainingCash)
            if (!(precheck["passed"] as Boolean)) {
                jdbcTemplate.update(
                    "update strategy_rebalance_plan_order set status = ?, precheck_summary = cast(? as jsonb), updated_at = now() where id = ?",
                    ORDER_REJECTED_PRECHECK,
                    json(precheck),
                    order.id,
                )
                appendAudit(strategyId, planId, "rebalance_order_precheck_failed", precheck + ("orderId" to order.id.toString()))
                return@forEach
            }

            if (order.side == OrderSide.BUY) {
                remainingCash -= order.notional + order.estimatedFee
            }
            sendOrder(strategyId, plan, order, precheck)
        }

        val refreshedOrders = loadOrders(planId)
        val planStatus =
            when {
                refreshedOrders.any { it.status in OPEN_ORDER_STATUSES } -> PLAN_SENT
                refreshedOrders.any { it.status == ORDER_REJECTED_PRECHECK } -> PLAN_BLOCKED
                refreshedOrders.any { it.status == ORDER_REJECTED } -> PLAN_BLOCKED
                else -> PLAN_SENT
            }
        jdbcTemplate.update(
            "update strategy_rebalance_plan set status = ?, sent_at = coalesce(sent_at, ?), updated_at = now() where id = ?",
            planStatus,
            OffsetDateTime.now(DEFAULT_ZONE).toTimestamp(),
            planId,
        )
        return getPlan(strategyId, planId)
    }

    fun syncPlan(
        strategyId: UUID,
        planId: UUID,
        request: SyncRebalancePlanRequest,
    ): RebalancePlanResponse {
        val plan = getPlanRecord(strategyId, planId)
        compareBrokerPositions(strategyId, plan, request.brokerPositions)
        val settings = loadRiskSettings(strategyId)
        val orders = loadOrders(planId)
        orders
            .filter { it.status in OPEN_ORDER_STATUSES }
            .forEach { order ->
                if (request.marketClosed) {
                    handleMarketClosedOrder(strategyId, plan, order, settings)
                    return@forEach
                }
                syncOrder(strategyId, planId, order)
            }

        val refreshed = loadOrders(planId)
        val planStatus =
            when {
                refreshed.any { it.status == ORDER_UNKNOWN } -> PLAN_UNKNOWN
                refreshed.all { it.status in setOf(ORDER_FILLED, ORDER_CANCELLED, ORDER_REJECTED_PRECHECK, ORDER_REJECTED) } -> PLAN_SYNCED
                else -> PLAN_SENT
            }
        jdbcTemplate.update(
            "update strategy_rebalance_plan set status = ?, synced_at = ?, updated_at = now() where id = ?",
            planStatus,
            OffsetDateTime.now(DEFAULT_ZONE).toTimestamp(),
            planId,
        )
        appendAudit(strategyId, planId, "rebalance_plan_synced", mapOf("status" to planStatus, "orders" to refreshed.map { it.toPayloadMap() }))
        return getPlan(strategyId, planId)
    }

    @Scheduled(fixedDelay = 60000)
    fun syncOpenPlans() {
        val openPlans =
            jdbcTemplate.query(
                """
                select id, strategy_id
                from strategy_rebalance_plan
                where status in ('sent', 'unknown')
                order by sent_at asc nulls last, planned_at asc
                limit 50
                """.trimIndent(),
                { rs, _ -> UUID.fromString(rs.getString("strategy_id")) to UUID.fromString(rs.getString("id")) },
            )
        openPlans.forEach { (strategyId, planId) ->
            runCatching { syncPlan(strategyId, planId, SyncRebalancePlanRequest()) }
                .onFailure { recordFailureAndMaybeStop(strategyId, "broker_status_lookup_failed", it.message ?: "scheduled broker sync failed") }
        }
    }

    fun getPlan(
        strategyId: UUID,
        planId: UUID,
    ): RebalancePlanResponse = getPlanRecord(strategyId, planId).toResponse(loadOrders(planId))

    private fun sendOrder(
        strategyId: UUID,
        plan: PlanRecord,
        order: OrderRecord,
        precheck: Map<String, Any?>,
    ) {
        val requestedAt = OffsetDateTime.now(DEFAULT_ZONE)
        try {
            val result = brokerOrderGateway.send(plan, order)
            jdbcTemplate.update(
                """
                update strategy_rebalance_plan_order
                set status = ?, broker_order_number = ?, broker_response_code = ?, broker_response_message = ?,
                    requested_at = ?, precheck_summary = cast(? as jsonb), updated_at = now()
                where id = ?
                """.trimIndent(),
                if (result.accepted) ORDER_SENT else ORDER_REJECTED,
                result.orderNumber,
                result.responseCode,
                result.message,
                requestedAt.toTimestamp(),
                json(precheck + ("brokerResponse" to result.toPayload())),
                order.id,
            )
            resetFailureCount()
            appendAudit(strategyId, plan.id, "rebalance_order_sent", mapOf("orderId" to order.id.toString(), "brokerResponse" to result.toPayload()))
        } catch (timeout: HttpTimeoutException) {
            jdbcTemplate.update(
                """
                update strategy_rebalance_plan_order
                set status = ?, broker_response_code = ?, broker_response_message = ?, requested_at = ?,
                    precheck_summary = cast(? as jsonb), updated_at = now()
                where id = ?
                """.trimIndent(),
                ORDER_UNKNOWN,
                "TIMEOUT",
                timeout.message ?: "broker order request timed out",
                requestedAt.toTimestamp(),
                json(precheck),
                order.id,
            )
            appendAudit(strategyId, plan.id, "rebalance_order_unknown_timeout", mapOf("orderId" to order.id.toString(), "message" to timeout.message))
        } catch (exception: Exception) {
            jdbcTemplate.update(
                "update strategy_rebalance_plan_order set status = ?, broker_response_code = ?, broker_response_message = ?, requested_at = ?, updated_at = now() where id = ?",
                ORDER_REJECTED,
                "ERROR",
                exception.message,
                requestedAt.toTimestamp(),
                order.id,
            )
            recordFailureAndMaybeStop(strategyId, "order_api_error", exception.message ?: "broker order API failed")
        }
    }

    private fun syncOrder(
        strategyId: UUID,
        planId: UUID,
        order: OrderRecord,
    ) {
        try {
            val result = brokerOrderGateway.status(order).normalized(order)
            jdbcTemplate.update(
                """
                update strategy_rebalance_plan_order
                set status = ?, filled_quantity = ?, remaining_quantity = ?, last_synced_at = ?,
                    broker_response_code = ?, broker_response_message = ?, updated_at = now()
                where id = ?
                """.trimIndent(),
                result.status,
                result.filledQuantity,
                result.remainingQuantity,
                OffsetDateTime.now(DEFAULT_ZONE).toTimestamp(),
                result.responseCode,
                result.message,
                order.id,
            )
            resetFailureCount()
            appendAudit(strategyId, planId, "rebalance_order_status_synced", mapOf("orderId" to order.id.toString(), "brokerStatus" to result.toPayload()))
        } catch (exception: Exception) {
            recordFailureAndMaybeStop(strategyId, "broker_status_lookup_failed", exception.message ?: "broker status lookup failed")
        }
    }

    private fun handleMarketClosedOrder(
        strategyId: UUID,
        plan: PlanRecord,
        order: OrderRecord,
        settings: RiskSettings,
    ) {
        when (settings.closeUnfilledPolicy) {
            "cancel" -> {
                jdbcTemplate.update(
                    """
                    update strategy_rebalance_plan_order
                    set status = ?, remaining_quantity = greatest(quantity - filled_quantity, 0), last_synced_at = ?, updated_at = now()
                    where id = ?
                    """.trimIndent(),
                    ORDER_CANCELLED,
                    OffsetDateTime.now(DEFAULT_ZONE).toTimestamp(),
                    order.id,
                )
                appendAudit(strategyId, plan.id, "rebalance_order_close_cancelled", mapOf("orderId" to order.id.toString(), "symbol" to order.symbol))
            }
            "keep" -> {
                appendAudit(strategyId, plan.id, "rebalance_order_close_kept", mapOf("orderId" to order.id.toString(), "symbol" to order.symbol))
            }
            "replan_next_day" -> {
                jdbcTemplate.update(
                    """
                    update strategy_rebalance_plan_order
                    set status = ?, remaining_quantity = greatest(quantity - filled_quantity, 0), last_synced_at = ?, updated_at = now()
                    where id = ?
                    """.trimIndent(),
                    ORDER_CANCELLED,
                    OffsetDateTime.now(DEFAULT_ZONE).toTimestamp(),
                    order.id,
                )
                clonePlanForNextDay(strategyId, plan, order)
            }
        }
    }

    private fun clonePlanForNextDay(
        strategyId: UUID,
        plan: PlanRecord,
        order: OrderRecord,
    ) {
        val nextPlanId = UUID.randomUUID()
        val now = OffsetDateTime.now(DEFAULT_ZONE)
        val riskSummary =
            mapOf(
                "passed" to true,
                "reasonCodes" to emptyList<String>(),
                "replannedFromPlanId" to plan.id.toString(),
                "replannedFromOrderId" to order.id.toString(),
            )
        jdbcTemplate.update(
            """
            insert into strategy_rebalance_plan (
                id, strategy_id, strategy_version_id, mode, status, account_snapshot, target_weights,
                settings_snapshot, risk_summary, approval_required, admin_approved, failure_reason, planned_at
            ) values (?, ?, ?, ?, ?, cast(? as jsonb), cast(? as jsonb), cast(? as jsonb), cast(? as jsonb), true, false, null, ?)
            """.trimIndent(),
            nextPlanId,
            strategyId,
            plan.strategyVersionId,
            plan.mode.name,
            PLAN_PLANNED,
            json(plan.accountSnapshot),
            json(plan.targetWeights),
            json(plan.settingsSnapshot),
            json(riskSummary),
            now.plusDays(1).toTimestamp(),
        )
        jdbcTemplate.update(
            """
            insert into strategy_rebalance_plan_order (
                id, plan_id, strategy_id, symbol, side, quantity, price, notional, estimated_fee, estimated_tax,
                status, idempotency_key, remaining_quantity, precheck_summary, payload
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, cast(? as jsonb), cast(? as jsonb))
            """.trimIndent(),
            UUID.randomUUID(),
            nextPlanId,
            strategyId,
            order.symbol,
            order.side.name,
            order.remainingQuantity.coerceAtLeast(1),
            order.price,
            order.price.multiply(order.remainingQuantity.coerceAtLeast(1).toBigDecimal()).scaled(),
            order.estimatedFee,
            order.estimatedTax,
            ORDER_PLANNED,
            "$strategyId:${order.symbol}:${order.side.value}:${UUID.randomUUID()}",
            order.remainingQuantity.coerceAtLeast(1),
            json(mapOf("replannedFromOrderId" to order.id.toString())),
            json(mapOf("closeUnfilledPolicy" to "replan_next_day")),
        )
        appendAudit(strategyId, plan.id, "rebalance_order_replanned_next_day", mapOf("orderId" to order.id.toString(), "nextPlanId" to nextPlanId.toString()))
    }

    private fun precheckOrder(
        plan: PlanRecord,
        order: OrderRecord,
        settings: RiskSettings,
        remainingCash: BigDecimal,
    ): Map<String, Any?> {
        val reasons = mutableListOf<String>()
        val account = plan.accountSnapshot
        if (systemRiskService.isGlobalKillSwitchEnabled()) reasons += "global_kill_switch"
        if (settings.strategyKillSwitchEnabled) reasons += "strategy_kill_switch"
        if (settings.accountMaxOrderNotional != null && order.notional > settings.accountMaxOrderNotional) reasons += "account_max_order_notional"
        if (settings.symbolMaxOrderNotional != null && order.notional > settings.symbolMaxOrderNotional) reasons += "symbol_max_order_notional"
        if (projectedDailyNotional(plan.strategyId, order.notional) > (settings.accountDailyMaxOrderNotional ?: BigDecimal("999999999999"))) {
            reasons += "account_daily_max_order_notional"
        }
        if (hasOpenOrderForSymbol(plan.strategyId, plan.id, order.symbol)) reasons += "duplicate_open_symbol_order"
        if (plan.mode == OrderMode.LIVE) {
            if (account["marketOpen"] != true || account["holiday"] == true) reasons += "live_market_closed"
            if (order.side == OrderSide.BUY && remainingCash < order.notional + order.estimatedFee) reasons += "cash_available"
            if (order.side == OrderSide.SELL && availableQuantity(account, order.symbol) < order.quantity) reasons += "sell_available_quantity"
        }
        return linkedMapOf(
            "passed" to reasons.isEmpty(),
            "reasonCodes" to reasons,
            "orderNotional" to order.notional.toDouble(),
            "remainingCashBeforeOrder" to remainingCash.toDouble(),
        )
    }

    private fun enforceLiveGates(
        plan: PlanRecord,
        settings: RiskSettings,
    ) {
        val reasons =
            buildList {
                if (!applicationProperties.liveTrading.enabled || applicationProperties.mode.lowercase() != "live") add("environment_live_not_enabled")
                if (!plan.adminApproved) add("admin_approval_required")
                if (!settings.liveTradingEnabled) add("strategy_live_not_enabled")
            }
        if (reasons.isNotEmpty()) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Live trading is blocked: ${reasons.joinToString(",")}")
        }
    }

    private fun planLines(
        strategyId: UUID,
        request: CreateRebalancePlanRequest,
        settings: RiskSettings,
    ): List<PlannedLine> {
        val positions = request.accountSnapshot.positions.associateBy { it.symbol.uppercase() }
        var cashBudget = request.accountSnapshot.cash.toBigDecimalScaled()
        return request.targetWeights.mapNotNull { target ->
            val symbol = target.symbol.uppercase()
            val price = target.price.toBigDecimalScaled()
            val current = positions[symbol]
            val currentValue = (current?.quantity ?: 0L).toBigDecimal().multiply(price).scaled()
            val targetValue =
                request.accountSnapshot.equity
                    .toBigDecimalScaled()
                    .multiply(target.targetWeight.toBigDecimal())
                    .scaled()
            val diff = targetValue.subtract(currentValue).scaled()
            val side = if (diff > BigDecimal.ZERO) OrderSide.BUY else OrderSide.SELL
            val quantity =
                if (side == OrderSide.BUY) {
                    diff.divide(price.multiply(BigDecimal.ONE + settings.feeRate), 0, RoundingMode.DOWN).longValueExact()
                } else {
                    diff
                        .abs()
                        .divide(price, 0, RoundingMode.DOWN)
                        .longValueExact()
                        .coerceAtMost(current?.availableQuantity ?: 0L)
                }
            if (quantity <= 0) return@mapNotNull null
            val notional = price.multiply(quantity.toBigDecimal()).scaled()
            if (notional < settings.minOrderNotional) return@mapNotNull null
            if (side == OrderSide.BUY && notional + notional.multiply(settings.feeRate) > cashBudget) {
                val affordableQuantity = cashBudget.divide(price.multiply(BigDecimal.ONE + settings.feeRate), 0, RoundingMode.DOWN).longValueExact()
                if (affordableQuantity <= 0) return@mapNotNull null
                val affordableNotional = price.multiply(affordableQuantity.toBigDecimal()).scaled()
                if (affordableNotional < settings.minOrderNotional) return@mapNotNull null
                cashBudget -= affordableNotional + affordableNotional.multiply(settings.feeRate).scaled()
                return@mapNotNull plannedLine(strategyId, symbol, side, affordableQuantity, price, affordableNotional, settings)
            }
            if (side == OrderSide.BUY) {
                cashBudget -= notional + notional.multiply(settings.feeRate).scaled()
            }
            plannedLine(strategyId, symbol, side, quantity, price, notional, settings)
        }
    }

    private fun plannedLine(
        strategyId: UUID,
        symbol: String,
        side: OrderSide,
        quantity: Long,
        price: BigDecimal,
        notional: BigDecimal,
        settings: RiskSettings,
    ): PlannedLine =
        PlannedLine(
            id = UUID.randomUUID(),
            symbol = symbol,
            side = side,
            quantity = quantity,
            price = price,
            notional = notional,
            estimatedFee = notional.multiply(settings.feeRate).scaled(),
            estimatedTax = if (side == OrderSide.SELL) notional.multiply(settings.taxRate).scaled() else BigDecimal.ZERO.scaled(),
            idempotencyKey = "$strategyId:$symbol:${side.value}:${UUID.randomUUID()}",
            precheckSummary = emptyMap(),
            payload = mapOf("closeUnfilledPolicy" to settings.closeUnfilledPolicy),
        )

    private fun compareBrokerPositions(
        strategyId: UUID,
        plan: PlanRecord,
        brokerPositions: List<SyncBrokerPositionRequest>,
    ) {
        if (brokerPositions.isEmpty()) return
        val plannedPositions =
            (plan.accountSnapshot["positions"] as? List<*>)
                .orEmpty()
                .mapNotNull { it as? Map<*, *> }
                .associate { it["symbol"].toString().uppercase() to (it["quantity"] as Number).toLong() }
        val broker = brokerPositions.associate { it.symbol.uppercase() to it.quantity }
        if (broker.any { (symbol, quantity) -> plannedPositions[symbol] != quantity }) {
            stopAutomationAndEnableKillSwitch(strategyId, "broker_position_mismatch")
        }
    }

    private fun recordFailureAndMaybeStop(
        strategyId: UUID,
        reason: String,
        message: String,
    ) {
        val count = incrementFailureCount()
        appendAudit(strategyId, null, "rebalance_execution_failure", mapOf("reason" to reason, "message" to message, "consecutiveFailures" to count))
        if (count >= applicationProperties.liveTrading.maxConsecutiveFailures) {
            stopAutomationAndEnableKillSwitch(strategyId, reason)
        }
    }

    private fun stopAutomationAndEnableKillSwitch(
        strategyId: UUID,
        reason: String,
    ) {
        jdbcTemplate.update("update strategy_execution_config set enabled = false, updated_at = now() where strategy_id = ?", strategyId)
        jdbcTemplate.update("update strategy set status = ?, updated_at = now() where id = ?", StrategyStatus.STOPPED.name, strategyId)
        jdbcTemplate.update(
            """
            insert into strategy_risk_config (strategy_id, mode, strategy_kill_switch_enabled)
            values (?, ?, true)
            on conflict (strategy_id) do update set strategy_kill_switch_enabled = true, updated_at = now()
            """.trimIndent(),
            strategyId,
            OrderMode.PAPER.name,
        )
        systemRiskService.updateGlobalKillSwitch(UpdateGlobalRiskKillSwitchRequest(enabled = true))
        appendAudit(strategyId, null, "rebalance_auto_stopped", mapOf("reason" to reason))
    }

    private fun incrementFailureCount(): Int {
        jdbcTemplate.update(
            """
            insert into app_config (key, value, updated_at)
            values (?, jsonb_build_object('count', 1), now())
            on conflict (key) do update set value = jsonb_build_object('count', coalesce((app_config.value->>'count')::int, 0) + 1), updated_at = now()
            """.trimIndent(),
            FAILURE_COUNT_KEY,
        )
        return jdbcTemplate.queryForObject("select (value->>'count')::int from app_config where key = ?", Int::class.java, FAILURE_COUNT_KEY) ?: 0
    }

    private fun resetFailureCount() {
        jdbcTemplate.update(
            """
            insert into app_config (key, value, updated_at)
            values (?, jsonb_build_object('count', 0), now())
            on conflict (key) do update set value = excluded.value, updated_at = now()
            """.trimIndent(),
            FAILURE_COUNT_KEY,
        )
    }

    private fun hasOpenOrderForSymbol(
        strategyId: UUID,
        planId: UUID,
        symbol: String,
    ): Boolean =
        jdbcTemplate.queryForObject(
            """
            select count(*)
            from strategy_rebalance_plan_order
            where strategy_id = ? and plan_id <> ? and symbol = ? and status in ('sent', 'accepted', 'partially_filled', 'unknown')
            """.trimIndent(),
            Long::class.java,
            strategyId,
            planId,
            symbol,
        )!! > 0

    private fun projectedDailyNotional(
        strategyId: UUID,
        candidate: BigDecimal,
    ): BigDecimal {
        val today = OffsetDateTime.now(DEFAULT_ZONE).toLocalDate()
        val existing =
            jdbcTemplate.queryForObject(
                """
                select coalesce(sum(notional), 0)
                from strategy_rebalance_plan_order
                where strategy_id = ? and requested_at::date = ? and status not in ('rejected', 'rejected_precheck', 'cancelled')
                """.trimIndent(),
                BigDecimal::class.java,
                strategyId,
                today,
            ) ?: BigDecimal.ZERO
        return existing.add(candidate).scaled()
    }

    private fun availableQuantity(
        account: Map<String, Any?>,
        symbol: String,
    ): Long =
        (account["positions"] as? List<*>)
            .orEmpty()
            .mapNotNull { it as? Map<*, *> }
            .firstOrNull { it["symbol"].toString().equals(symbol, ignoreCase = true) }
            ?.get("availableQuantity")
            ?.let { (it as Number).toLong() }
            ?: 0L

    private fun ensureStrategyExists(strategyId: UUID) {
        val exists =
            jdbcTemplate.queryForObject(
                "select count(*) from strategy where id = ? and is_archived = false",
                Long::class.java,
                strategyId,
            ) ?: 0L
        if (exists == 0L) throw ResponseStatusException(HttpStatus.NOT_FOUND, "Strategy not found: $strategyId")
    }

    private fun latestStrategyVersionId(strategyId: UUID): UUID =
        jdbcTemplate
            .query(
                "select id from strategy_version where strategy_id = ? order by version_number desc limit 1",
                { rs, _ -> UUID.fromString(rs.getString("id")) },
                strategyId,
            ).firstOrNull()
            ?: throw ResponseStatusException(HttpStatus.CONFLICT, "Strategy requires at least one version")

    private fun loadRiskSettings(strategyId: UUID): RiskSettings =
        jdbcTemplate
            .query(
                """
                select strategy_kill_switch_enabled, live_trading_enabled, strategy_max_exposure,
                       account_max_order_notional, account_daily_max_order_notional, symbol_max_order_notional,
                       min_order_notional, fee_rate, tax_rate, close_unfilled_policy
                from strategy_risk_config
                where strategy_id = ?
                """.trimIndent(),
                { rs, _ ->
                    RiskSettings(
                        strategyKillSwitchEnabled = rs.getBoolean("strategy_kill_switch_enabled"),
                        liveTradingEnabled = rs.getBoolean("live_trading_enabled"),
                        strategyMaxExposure = rs.getBigDecimal("strategy_max_exposure"),
                        accountMaxOrderNotional = rs.getBigDecimal("account_max_order_notional"),
                        accountDailyMaxOrderNotional = rs.getBigDecimal("account_daily_max_order_notional"),
                        symbolMaxOrderNotional = rs.getBigDecimal("symbol_max_order_notional"),
                        minOrderNotional = rs.getBigDecimal("min_order_notional"),
                        feeRate = rs.getBigDecimal("fee_rate"),
                        taxRate = rs.getBigDecimal("tax_rate"),
                        closeUnfilledPolicy = rs.getString("close_unfilled_policy"),
                    )
                },
                strategyId,
            ).firstOrNull() ?: RiskSettings()

    private fun getPlanRecord(
        strategyId: UUID,
        planId: UUID,
    ): PlanRecord =
        jdbcTemplate
            .query("select * from strategy_rebalance_plan where id = ? and strategy_id = ?", { rs, _ -> mapPlan(rs) }, planId, strategyId)
            .firstOrNull()
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Rebalance plan not found: $planId")

    private fun loadOrders(planId: UUID): List<OrderRecord> =
        jdbcTemplate.query(
            "select * from strategy_rebalance_plan_order where plan_id = ? order by created_at asc",
            { rs, _ -> mapOrder(rs) },
            planId,
        )

    private fun mapPlan(rs: ResultSet): PlanRecord =
        PlanRecord(
            id = UUID.fromString(rs.getString("id")),
            strategyId = UUID.fromString(rs.getString("strategy_id")),
            strategyVersionId = UUID.fromString(rs.getString("strategy_version_id")),
            mode = OrderMode.valueOf(rs.getString("mode")),
            status = rs.getString("status"),
            accountSnapshot = jsonMap(rs.getString("account_snapshot")),
            targetWeights = jsonList(rs.getString("target_weights")),
            settingsSnapshot = jsonMap(rs.getString("settings_snapshot")),
            riskSummary = jsonMap(rs.getString("risk_summary")),
            approvalRequired = rs.getBoolean("approval_required"),
            adminApproved = rs.getBoolean("admin_approved"),
            approvedAt = rs.getTimestamp("approved_at")?.toOffsetDateTime(),
            approvedBy = rs.getString("approved_by"),
            failureReason = rs.getString("failure_reason"),
            plannedAt = rs.getTimestamp("planned_at").toOffsetDateTime(),
            sentAt = rs.getTimestamp("sent_at")?.toOffsetDateTime(),
            syncedAt = rs.getTimestamp("synced_at")?.toOffsetDateTime(),
        )

    private fun mapOrder(rs: ResultSet): OrderRecord =
        OrderRecord(
            id = UUID.fromString(rs.getString("id")),
            planId = UUID.fromString(rs.getString("plan_id")),
            strategyId = UUID.fromString(rs.getString("strategy_id")),
            symbol = rs.getString("symbol"),
            side = OrderSide.valueOf(rs.getString("side")),
            quantity = rs.getLong("quantity"),
            price = rs.getBigDecimal("price"),
            notional = rs.getBigDecimal("notional"),
            estimatedFee = rs.getBigDecimal("estimated_fee"),
            estimatedTax = rs.getBigDecimal("estimated_tax"),
            status = rs.getString("status"),
            idempotencyKey = rs.getString("idempotency_key"),
            brokerOrderNumber = rs.getString("broker_order_number"),
            brokerResponseCode = rs.getString("broker_response_code"),
            brokerResponseMessage = rs.getString("broker_response_message"),
            requestedAt = rs.getTimestamp("requested_at")?.toOffsetDateTime(),
            lastSyncedAt = rs.getTimestamp("last_synced_at")?.toOffsetDateTime(),
            filledQuantity = rs.getLong("filled_quantity"),
            remainingQuantity = rs.getLong("remaining_quantity"),
            precheckSummary = jsonMap(rs.getString("precheck_summary")),
            payload = jsonMap(rs.getString("payload")),
        )

    private fun validateTargets(targets: List<RebalanceTargetWeightRequest>) {
        if (targets.isEmpty()) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one target weight is required")
        val duplicateSymbols =
            targets
                .groupingBy { it.symbol.uppercase() }
                .eachCount()
                .filterValues { it > 1 }
                .keys
        if (duplicateSymbols.isNotEmpty()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Target symbols must be unique: ${duplicateSymbols.joinToString(",")}")
        }
        targets.forEach {
            if (it.targetWeight < 0.0 || it.targetWeight > 1.0) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "targetWeight must be between 0 and 1")
            }
        }
        val total = targets.sumOf { it.targetWeight }
        if (total > 1.000001) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Target weights cannot exceed 1.0")
    }

    private fun validateAccountSnapshot(request: CreateRebalancePlanRequest) {
        val duplicateSymbols =
            request.accountSnapshot.positions
                .groupingBy { it.symbol.uppercase() }
                .eachCount()
                .filterValues { it > 1 }
                .keys
        if (duplicateSymbols.isNotEmpty()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Position symbols must be unique: ${duplicateSymbols.joinToString(",")}")
        }
        request.accountSnapshot.positions.forEach {
            if (it.availableQuantity > it.quantity) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "availableQuantity cannot exceed quantity for ${it.symbol}")
            }
        }
    }

    private fun accountSnapshotMap(request: CreateRebalancePlanRequest): Map<String, Any?> =
        linkedMapOf(
            "equity" to request.accountSnapshot.equity,
            "cash" to request.accountSnapshot.cash,
            "tradingDate" to request.accountSnapshot.tradingDate?.toString(),
            "marketOpen" to request.accountSnapshot.marketOpen,
            "holiday" to request.accountSnapshot.holiday,
            "positions" to
                request.accountSnapshot.positions.map {
                    mapOf(
                        "symbol" to it.symbol.uppercase(),
                        "quantity" to it.quantity,
                        "price" to it.price,
                        "availableQuantity" to it.availableQuantity,
                    )
                },
        )

    private fun targetWeightsMap(targets: List<RebalanceTargetWeightRequest>): List<Map<String, Any?>> =
        targets.map { mapOf("symbol" to it.symbol.uppercase(), "targetWeight" to it.targetWeight, "price" to it.price) }

    private fun appendAudit(
        strategyId: UUID,
        planId: UUID?,
        eventType: String,
        payload: Map<String, Any?>,
        orderId: UUID? = null,
    ) {
        jdbcTemplate.update(
            """
            insert into strategy_trade_audit_log (id, strategy_id, plan_id, order_id, event_type, payload)
            values (?, ?, ?, ?, ?, cast(? as jsonb))
            """.trimIndent(),
            UUID.randomUUID(),
            strategyId,
            planId,
            orderId,
            eventType,
            json(payload),
        )
    }

    private fun json(value: Any?): String = objectMapper.writeValueAsString(value)

    private fun jsonMap(raw: String): Map<String, Any?> = objectMapper.readValue(raw, Map::class.java) as Map<String, Any?>

    private fun jsonList(raw: String): List<Map<String, Any?>> = objectMapper.readValue(raw, List::class.java) as List<Map<String, Any?>>

    private fun decimal(value: Any?): BigDecimal =
        when (value) {
            is Number -> BigDecimal.valueOf(value.toDouble()).scaled()
            is String -> value.toBigDecimal().scaled()
            else -> BigDecimal.ZERO.scaled()
        }

    private fun Double.toBigDecimalScaled(): BigDecimal = BigDecimal.valueOf(this).scaled()

    private fun Timestamp.toOffsetDateTime(): OffsetDateTime = toInstant().atOffset(ZoneOffset.UTC)

    private fun OffsetDateTime.toTimestamp(): Timestamp = Timestamp.from(toInstant())

    private fun BigDecimal.scaled(): BigDecimal = setScale(6, RoundingMode.HALF_UP)

    companion object {
        private val DEFAULT_ZONE: ZoneId = ZoneId.of("Asia/Seoul")
        private const val PLAN_PLANNED = "planned"
        private const val PLAN_APPROVED = "approved"
        private const val PLAN_SENT = "sent"
        private const val PLAN_SYNCED = "synced"
        private const val PLAN_BLOCKED = "blocked"
        private const val PLAN_UNKNOWN = "unknown"
        private const val ORDER_PLANNED = "planned"
        private const val ORDER_SENT = "sent"
        private const val ORDER_ACCEPTED = "accepted"
        private const val ORDER_PARTIALLY_FILLED = "partially_filled"
        private const val ORDER_FILLED = "filled"
        private const val ORDER_CANCELLED = "cancelled"
        private const val ORDER_REJECTED = "rejected"
        private const val ORDER_REJECTED_PRECHECK = "rejected_precheck"
        private const val ORDER_UNKNOWN = "unknown"
        private const val FAILURE_COUNT_KEY = "live_trading.consecutive_failures"
        private val OPEN_ORDER_STATUSES = setOf(ORDER_SENT, ORDER_ACCEPTED, ORDER_PARTIALLY_FILLED, ORDER_UNKNOWN)
    }
}

interface BrokerOrderGateway {
    fun send(
        plan: PlanRecord,
        order: OrderRecord,
    ): BrokerSendResult

    fun status(order: OrderRecord): BrokerStatusResult
}

@Service
class MockBrokerOrderGateway(
    private val applicationProperties: ApplicationProperties,
) : BrokerOrderGateway {
    override fun send(
        plan: PlanRecord,
        order: OrderRecord,
    ): BrokerSendResult {
        if (!applicationProperties.liveTrading.mockBroker) {
            throw IllegalStateException("Real broker order gateway is not configured")
        }
        if (order.symbol.contains("TIMEOUT")) {
            throw HttpTimeoutException("mock broker timeout")
        }
        if (order.symbol.contains("APIERR")) {
            throw IllegalStateException("mock broker API error")
        }
        return BrokerSendResult(
            accepted = true,
            orderNumber = "MOCK-${order.id.toString().take(8)}",
            responseCode = "0",
            message = "mock order accepted",
        )
    }

    override fun status(order: OrderRecord): BrokerStatusResult =
        if (order.symbol.contains("BADSTATUS")) {
            BrokerStatusResult(
                status = "mystery",
                filledQuantity = order.quantity + 10,
                remainingQuantity = order.quantity + 10,
                responseCode = "0",
                message = "mock bad status",
            )
        } else {
            BrokerStatusResult(
                status = "accepted",
                filledQuantity = order.filledQuantity,
                remainingQuantity = order.remainingQuantity.coerceAtLeast(0),
                responseCode = "0",
                message = "mock status accepted",
            )
        }
}

data class PlanRecord(
    val id: UUID,
    val strategyId: UUID,
    val strategyVersionId: UUID,
    val mode: OrderMode,
    val status: String,
    val accountSnapshot: Map<String, Any?>,
    val targetWeights: List<Map<String, Any?>>,
    val settingsSnapshot: Map<String, Any?>,
    val riskSummary: Map<String, Any?>,
    val approvalRequired: Boolean,
    val adminApproved: Boolean,
    val approvedAt: OffsetDateTime?,
    val approvedBy: String?,
    val failureReason: String?,
    val plannedAt: OffsetDateTime,
    val sentAt: OffsetDateTime?,
    val syncedAt: OffsetDateTime?,
) {
    fun toResponse(orders: List<OrderRecord>): RebalancePlanResponse =
        RebalancePlanResponse(
            id = id,
            strategyId = strategyId,
            strategyVersionId = strategyVersionId,
            mode = mode,
            status = status,
            accountSnapshot = accountSnapshot,
            targetWeights = targetWeights,
            settingsSnapshot = settingsSnapshot,
            riskSummary = riskSummary,
            approvalRequired = approvalRequired,
            adminApproved = adminApproved,
            approvedAt = approvedAt,
            approvedBy = approvedBy,
            failureReason = failureReason,
            plannedAt = plannedAt,
            sentAt = sentAt,
            syncedAt = syncedAt,
            orders = orders.map { it.toResponse() },
        )
}

data class OrderRecord(
    val id: UUID,
    val planId: UUID,
    val strategyId: UUID,
    val symbol: String,
    val side: OrderSide,
    val quantity: Long,
    val price: BigDecimal,
    val notional: BigDecimal,
    val estimatedFee: BigDecimal,
    val estimatedTax: BigDecimal,
    val status: String,
    val idempotencyKey: String,
    val brokerOrderNumber: String?,
    val brokerResponseCode: String?,
    val brokerResponseMessage: String?,
    val requestedAt: OffsetDateTime?,
    val lastSyncedAt: OffsetDateTime?,
    val filledQuantity: Long,
    val remainingQuantity: Long,
    val precheckSummary: Map<String, Any?>,
    val payload: Map<String, Any?>,
) {
    fun toResponse(): RebalancePlanOrderResponse =
        RebalancePlanOrderResponse(
            id = id,
            symbol = symbol,
            side = side,
            quantity = quantity,
            price = price.toDouble(),
            notional = notional.toDouble(),
            estimatedFee = estimatedFee.toDouble(),
            estimatedTax = estimatedTax.toDouble(),
            status = status,
            idempotencyKey = idempotencyKey,
            brokerOrderNumber = brokerOrderNumber,
            brokerResponseCode = brokerResponseCode,
            brokerResponseMessage = brokerResponseMessage,
            requestedAt = requestedAt,
            filledQuantity = filledQuantity,
            remainingQuantity = remainingQuantity,
            precheckSummary = precheckSummary,
        )

    fun toPayloadMap(): Map<String, Any?> =
        mapOf(
            "id" to id.toString(),
            "symbol" to symbol,
            "side" to side.value,
            "quantity" to quantity,
            "price" to price.toDouble(),
            "notional" to notional.toDouble(),
            "status" to status,
            "idempotencyKey" to idempotencyKey,
            "brokerOrderNumber" to brokerOrderNumber,
        )
}

data class PlannedLine(
    val id: UUID,
    val symbol: String,
    val side: OrderSide,
    val quantity: Long,
    val price: BigDecimal,
    val notional: BigDecimal,
    val estimatedFee: BigDecimal,
    val estimatedTax: BigDecimal,
    val idempotencyKey: String,
    val precheckSummary: Map<String, Any?>,
    val payload: Map<String, Any?>,
) {
    fun toPayloadMap(): Map<String, Any?> =
        mapOf(
            "id" to id.toString(),
            "symbol" to symbol,
            "side" to side.value,
            "quantity" to quantity,
            "price" to price.toDouble(),
            "notional" to notional.toDouble(),
            "estimatedFee" to estimatedFee.toDouble(),
            "estimatedTax" to estimatedTax.toDouble(),
            "idempotencyKey" to idempotencyKey,
        )
}

data class RiskSettings(
    val strategyKillSwitchEnabled: Boolean = false,
    val liveTradingEnabled: Boolean = false,
    val strategyMaxExposure: BigDecimal? = null,
    val accountMaxOrderNotional: BigDecimal? = null,
    val accountDailyMaxOrderNotional: BigDecimal? = null,
    val symbolMaxOrderNotional: BigDecimal? = null,
    val minOrderNotional: BigDecimal = BigDecimal("5000.000000"),
    val feeRate: BigDecimal = BigDecimal("0.00015000"),
    val taxRate: BigDecimal = BigDecimal("0.00180000"),
    val closeUnfilledPolicy: String = "cancel",
) {
    fun toSnapshot(): Map<String, Any?> =
        mapOf(
            "strategyKillSwitchEnabled" to strategyKillSwitchEnabled,
            "liveTradingEnabled" to liveTradingEnabled,
            "strategyMaxExposure" to strategyMaxExposure?.toDouble(),
            "accountMaxOrderNotional" to accountMaxOrderNotional?.toDouble(),
            "accountDailyMaxOrderNotional" to accountDailyMaxOrderNotional?.toDouble(),
            "symbolMaxOrderNotional" to symbolMaxOrderNotional?.toDouble(),
            "minOrderNotional" to minOrderNotional.toDouble(),
            "feeRate" to feeRate.toDouble(),
            "taxRate" to taxRate.toDouble(),
            "closeUnfilledPolicy" to closeUnfilledPolicy,
        )
}

data class BrokerSendResult(
    val accepted: Boolean,
    val orderNumber: String?,
    val responseCode: String,
    val message: String,
) {
    fun toPayload(): Map<String, Any?> = mapOf("accepted" to accepted, "orderNumber" to orderNumber, "responseCode" to responseCode, "message" to message)
}

data class BrokerStatusResult(
    val status: String,
    val filledQuantity: Long,
    val remainingQuantity: Long,
    val responseCode: String,
    val message: String,
) {
    fun normalized(order: OrderRecord): BrokerStatusResult {
        val normalizedStatus = status.takeIf { it in ALLOWED_STATUSES } ?: "unknown"
        val boundedFilled = filledQuantity.coerceIn(0, order.quantity)
        val boundedRemaining =
            remainingQuantity
                .coerceIn(0, order.quantity)
                .let { if (boundedFilled + it > order.quantity) order.quantity - boundedFilled else it }
        return copy(
            status = normalizedStatus,
            filledQuantity = boundedFilled,
            remainingQuantity = boundedRemaining,
            responseCode = if (normalizedStatus == "unknown" && status !in ALLOWED_STATUSES) "UNKNOWN_STATUS" else responseCode,
            message = if (normalizedStatus == "unknown" && status !in ALLOWED_STATUSES) "Unrecognized broker status: $status" else message,
        )
    }

    fun toPayload(): Map<String, Any?> =
        mapOf(
            "status" to status,
            "filledQuantity" to filledQuantity,
            "remainingQuantity" to remainingQuantity,
            "responseCode" to responseCode,
            "message" to message,
        )

    companion object {
        private val ALLOWED_STATUSES = setOf("sent", "accepted", "partially_filled", "filled", "cancelled", "rejected", "unknown")
    }
}
