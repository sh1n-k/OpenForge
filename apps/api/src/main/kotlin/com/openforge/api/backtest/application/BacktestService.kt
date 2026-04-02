package com.openforge.api.backtest.application

import com.openforge.api.backtest.domain.BacktestEquityPointEntity
import com.openforge.api.backtest.domain.BacktestEquityPointRepository
import com.openforge.api.backtest.domain.BacktestRunEntity
import com.openforge.api.backtest.domain.BacktestRunRepository
import com.openforge.api.backtest.domain.BacktestRunStatus
import com.openforge.api.backtest.domain.BacktestTradeEntity
import com.openforge.api.backtest.domain.BacktestTradeRepository
import com.openforge.api.backtest.domain.MarketDailyBarEntity
import com.openforge.api.backtest.domain.MarketDailyBarRepository
import com.openforge.api.backtest.web.BacktestEquityPointResponse
import com.openforge.api.backtest.web.BacktestHeadlineMetricsResponse
import com.openforge.api.backtest.web.BacktestRunDetailResponse
import com.openforge.api.backtest.web.BacktestRunQueuedResponse
import com.openforge.api.backtest.web.BacktestRunSummaryResponse
import com.openforge.api.backtest.web.BacktestTradeResponse
import com.openforge.api.backtest.web.CreateBacktestRequest
import com.openforge.api.backtest.web.MarketCoverageResponse
import com.openforge.api.backtest.web.MarketCoverageSymbolResponse
import com.openforge.api.backtest.web.MarketDataImportResponse
import com.openforge.api.symbol.SymbolMasterRepository
import com.openforge.api.strategy.domain.StrategyRepository
import com.openforge.api.strategy.domain.MarketType
import com.openforge.api.strategy.domain.StrategyStatus
import com.openforge.api.strategy.domain.StrategyUniverseRepository
import com.openforge.api.strategy.domain.StrategyValidationStatus
import com.openforge.api.strategy.domain.StrategyVersionEntity
import com.openforge.api.strategy.domain.StrategyVersionRepository
import com.openforge.api.strategy.domain.UniverseRepository
import com.openforge.api.strategy.domain.UniverseSymbolRepository
import com.openforge.api.strategy.editor.StrategyEditorService
import jakarta.annotation.PostConstruct
import jakarta.transaction.Transactional
import org.springframework.http.HttpStatus
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import java.io.BufferedReader
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean

@Service
@Transactional
class BacktestService(
    private val strategyRepository: StrategyRepository,
    private val strategyVersionRepository: StrategyVersionRepository,
    private val strategyUniverseRepository: StrategyUniverseRepository,
    private val universeRepository: UniverseRepository,
    private val universeSymbolRepository: UniverseSymbolRepository,
    private val marketDailyBarRepository: MarketDailyBarRepository,
    private val backtestRunRepository: BacktestRunRepository,
    private val backtestTradeRepository: BacktestTradeRepository,
    private val backtestEquityPointRepository: BacktestEquityPointRepository,
    private val symbolMasterRepository: SymbolMasterRepository,
    private val strategyEditorService: StrategyEditorService,
) {
    private val engine = BacktestEngine()
    private val processing = AtomicBoolean(false)

    @PostConstruct
    fun markInterruptedRuns() {
        val interrupted =
            backtestRunRepository.findAllByStatusInOrderByRequestedAtAsc(
                listOf(BacktestRunStatus.QUEUED, BacktestRunStatus.RUNNING),
            )
        interrupted.forEach {
            it.status = BacktestRunStatus.FAILED
            it.errorMessage = "interrupted"
            it.completedAt = OffsetDateTime.now()
        }
        if (interrupted.isNotEmpty()) {
            backtestRunRepository.saveAll(interrupted)
        }
    }

    fun createBacktest(request: CreateBacktestRequest): BacktestRunQueuedResponse {
        if (request.startDate.isAfter(request.endDate)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "startDate must be before or equal to endDate")
        }
        if (request.symbols.isNotEmpty() && request.universeIds.isNotEmpty()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide either symbols or universeIds, not both")
        }

        val strategy =
            strategyRepository.findByIdAndIsArchivedFalse(request.strategyId)
                ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Strategy not found: ${request.strategyId}")
        val version = resolveVersion(strategy.id, request.strategyVersionId)
        if (version.normalizedSpec == null || version.validationStatus != StrategyValidationStatus.VALID) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Strategy version must be valid before running backtest")
        }

        val resolvedSymbols = resolveSymbols(strategy.id, request.symbols, request.universeIds)
        if (resolvedSymbols.isEmpty()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Backtest requires at least one symbol")
        }
        val coverage = getCoverage(resolvedSymbols, request.startDate, request.endDate)
        if (!coverage.covered) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Market data coverage is incomplete for the selected symbols")
        }

        val run =
            backtestRunRepository.save(
                BacktestRunEntity(
                    strategyId = strategy.id,
                    strategyVersionId = version.id,
                    status = BacktestRunStatus.QUEUED,
                    runConfig =
                        linkedMapOf(
                            "startDate" to request.startDate.toString(),
                            "endDate" to request.endDate.toString(),
                            "initialCapital" to request.initialCapital.toDouble(),
                            "commissionRate" to request.commissionRate.toDouble(),
                            "taxRate" to request.taxRate.toDouble(),
                            "slippageRate" to request.slippageRate.toDouble(),
                        ),
                    normalizedSpec = deepCopyMap(version.normalizedSpec!!),
                    symbols = resolvedSymbols,
                ),
            )

        return BacktestRunQueuedResponse(runId = run.id, status = run.status)
    }

    fun getBacktest(runId: UUID): BacktestRunDetailResponse {
        val run =
            backtestRunRepository.findById(runId).orElseThrow {
                ResponseStatusException(HttpStatus.NOT_FOUND, "Backtest run not found: $runId")
            }
        val points = backtestEquityPointRepository.findAllByRunIdOrderByTradingDateAsc(run.id)
        val trades = backtestTradeRepository.findAllByRunIdOrderByEntryDateAscSymbolAsc(run.id)
        return BacktestRunDetailResponse(
            runId = run.id,
            strategyId = run.strategyId,
            strategyVersionId = run.strategyVersionId,
            status = run.status,
            requestedAt = run.requestedAt,
            startedAt = run.startedAt,
            completedAt = run.completedAt,
            config = run.runConfig,
            symbols = run.symbols,
            summary = run.summary,
            equityCurve =
                points.map {
                    BacktestEquityPointResponse(
                        tradingDate = it.tradingDate,
                        equity = it.equity.toDouble(),
                        cash = it.cash.toDouble(),
                        drawdown = it.drawdown.toDouble(),
                    )
                },
            trades =
                trades.map {
                    BacktestTradeResponse(
                        symbol = it.symbol,
                        entryDate = it.entryDate,
                        exitDate = it.exitDate,
                        entryPrice = it.entryPrice.toDouble(),
                        exitPrice = it.exitPrice.toDouble(),
                        quantity = it.quantity,
                        grossPnl = it.grossPnl.toDouble(),
                        netPnl = it.netPnl.toDouble(),
                        pnlPercent = it.pnlPercent.toDouble(),
                        exitReason = it.exitReason,
                    )
                },
            errorMessage = run.errorMessage,
        )
    }

    fun listStrategyBacktests(strategyId: UUID): List<BacktestRunSummaryResponse> {
        strategyRepository.findByIdAndIsArchivedFalse(strategyId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Strategy not found: $strategyId")
        return backtestRunRepository.findAllByStrategyIdOrderByRequestedAtDesc(strategyId).map { run ->
            BacktestRunSummaryResponse(
                runId = run.id,
                strategyVersionId = run.strategyVersionId,
                status = run.status,
                requestedAt = run.requestedAt,
                completedAt = run.completedAt,
                headlineMetrics = run.summary?.let(::toHeadlineMetrics),
            )
        }
    }

    fun importDailyBars(file: MultipartFile): MarketDataImportResponse {
        if (file.isEmpty) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "CSV file is required")
        }

        val rows = mutableListOf<MarketDailyBarEntity>()
        file.inputStream.bufferedReader().use { reader ->
            parseCsv(reader, rows)
        }

        rows.forEach { entity ->
            marketDailyBarRepository.save(entity)
        }
        return MarketDataImportResponse(
            importedRows = rows.size,
            symbols = rows.map { it.symbol }.distinct().sorted(),
        )
    }

    fun getCoverage(
        symbols: List<String>,
        startDate: LocalDate,
        endDate: LocalDate,
    ): MarketCoverageResponse {
        val normalizedSymbols = symbols.map { it.trim().uppercase() }.filter { it.isNotBlank() }.distinct()
        val coverage =
            normalizedSymbols.map { symbol ->
                val first = marketDailyBarRepository.findTopBySymbolAndTradingDateLessThanEqualOrderByTradingDateDesc(symbol, startDate)
                val last = marketDailyBarRepository.findTopBySymbolAndTradingDateGreaterThanEqualOrderByTradingDateAsc(symbol, endDate)
                MarketCoverageSymbolResponse(
                    symbol = symbol,
                    covered = first != null && last != null && !first.tradingDate.isAfter(startDate) && !last.tradingDate.isBefore(endDate),
                    firstDate = first?.tradingDate,
                    lastDate = last?.tradingDate,
                )
            }
        return MarketCoverageResponse(
            covered = coverage.isNotEmpty() && coverage.all { it.covered },
            symbols = coverage,
        )
    }

    @Scheduled(fixedDelay = 1000)
    fun processQueuedRuns() {
        processNextQueuedRun()
    }

    fun processNextQueuedRun() {
        if (!processing.compareAndSet(false, true)) {
            return
        }
        try {
            val run = backtestRunRepository.findFirstByStatusOrderByRequestedAtAsc(BacktestRunStatus.QUEUED) ?: return
            executeRun(run)
        } finally {
            processing.set(false)
        }
    }

    private fun executeRun(run: BacktestRunEntity) {
        run.status = BacktestRunStatus.RUNNING
        run.startedAt = OffsetDateTime.now()
        run.errorMessage = null
        backtestRunRepository.save(run)

        try {
            val spec = StrategySignalSupport.parseStrategySpec(run.normalizedSpec)
            val config =
                RunConfig(
                    initialCapital = numberValue(run.runConfig["initialCapital"]),
                    commissionRate = numberValue(run.runConfig["commissionRate"]),
                    taxRate = numberValue(run.runConfig["taxRate"]),
                    slippageRate = numberValue(run.runConfig["slippageRate"]),
                )
            val barsBySymbol =
                run.symbols.associateWith { symbol ->
                    marketDailyBarRepository
                        .findAllBySymbolAndTradingDateBetweenOrderByTradingDateAsc(
                            symbol,
                            LocalDate.parse(run.runConfig["startDate"].toString()),
                            LocalDate.parse(run.runConfig["endDate"].toString()),
                        ).map {
                            Bar(
                                tradingDate = it.tradingDate,
                                open = it.open.toDouble(),
                                high = it.high.toDouble(),
                                low = it.low.toDouble(),
                                close = it.close.toDouble(),
                                volume = it.volume.toDouble(),
                            )
                        }
                }
            val result = engine.run(spec, run.symbols, barsBySymbol, config)

            backtestTradeRepository.deleteAllByRunId(run.id)
            backtestEquityPointRepository.deleteAllByRunId(run.id)
            backtestTradeRepository.saveAll(
                result.trades.map {
                    BacktestTradeEntity(
                        runId = run.id,
                        symbol = it.symbol,
                        entryDate = it.entryDate,
                        exitDate = it.exitDate,
                        entryPrice = decimal(it.entryPrice, 6),
                        exitPrice = decimal(it.exitPrice, 6),
                        quantity = it.quantity,
                        grossPnl = decimal(it.grossPnl, 6),
                        netPnl = decimal(it.netPnl, 6),
                        pnlPercent = decimal(it.pnlPercent, 8),
                        exitReason = it.exitReason,
                    )
                },
            )
            backtestEquityPointRepository.saveAll(
                result.equityPoints.map {
                    BacktestEquityPointEntity(
                        runId = run.id,
                        tradingDate = it.tradingDate,
                        equity = decimal(it.equity, 6),
                        cash = decimal(it.cash, 6),
                        drawdown = decimal(it.drawdown, 8),
                    )
                },
            )

            run.summary = result.summary
            run.status = BacktestRunStatus.COMPLETED
            run.completedAt = OffsetDateTime.now()
            backtestRunRepository.save(run)

            val strategy = strategyRepository.findByIdAndIsArchivedFalse(run.strategyId)
            if (strategy != null && strategy.latestVersionId == run.strategyVersionId) {
                strategy.status = StrategyStatus.BACKTEST_COMPLETED
                strategyRepository.save(strategy)
            }
        } catch (exception: Exception) {
            run.status = BacktestRunStatus.FAILED
            run.errorMessage = exception.message ?: "Backtest failed"
            run.completedAt = OffsetDateTime.now()
            backtestRunRepository.save(run)
        }
    }

    private fun resolveVersion(
        strategyId: UUID,
        requestedVersionId: UUID?,
    ): StrategyVersionEntity {
        val version =
            if (requestedVersionId != null) {
                strategyVersionRepository
                    .findById(requestedVersionId)
                    .orElseThrow {
                        ResponseStatusException(HttpStatus.NOT_FOUND, "Strategy version not found: $requestedVersionId")
                    }.also {
                        if (it.strategyId != strategyId) {
                            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Strategy version does not belong to the requested strategy")
                        }
                    }
            } else {
                strategyVersionRepository.findTopByStrategyIdOrderByVersionNumberDesc(strategyId)
                    ?: throw ResponseStatusException(HttpStatus.CONFLICT, "Strategy does not have any versions")
            }

        if (version.normalizedSpec == null || version.validationStatus != StrategyValidationStatus.VALID) {
            val result =
                strategyEditorService.validateStoredPayload(
                    strategyRepository.findById(strategyId).orElseThrow().strategyType,
                    version.payloadFormat,
                    version.payload,
                )
            version.normalizedSpec = result.normalizedSpec?.let(::deepCopyMap)
            version.validationStatus =
                if (result.valid) {
                    StrategyValidationStatus.VALID
                } else {
                    StrategyValidationStatus.INVALID
                }
            version.validationErrors =
                result.errors.map {
                    linkedMapOf(
                        "category" to it.category,
                        "message" to it.message,
                    )
                }
            version.validationWarnings =
                result.warnings.map {
                    linkedMapOf(
                        "category" to it.category,
                        "message" to it.message,
                    )
                }
            strategyVersionRepository.save(version)
        }
        return version
    }

    private fun resolveSymbols(
        strategyId: UUID,
        symbols: List<String>,
        universeIds: List<UUID>,
    ): List<String> {
        val directSymbols = symbols.map { it.trim().uppercase() }.filter { it.isNotBlank() }
        if (directSymbols.isNotEmpty()) {
            ensureDomesticDirectSymbols(directSymbols)
            return directSymbols.distinct()
        }

        val resolvedUniverseIds =
            if (universeIds.isNotEmpty()) {
                universeIds.distinct()
            } else {
                strategyUniverseRepository.findAllByStrategyId(strategyId).map { it.universeId }.distinct()
            }
        if (resolvedUniverseIds.isEmpty()) {
            return emptyList()
        }

        val activeUniverses = universeRepository.findAllById(resolvedUniverseIds).filter { !it.isArchived }
        if (activeUniverses.size != resolvedUniverseIds.size) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Universe contains archived or missing entries")
        }
        if (activeUniverses.any { it.marketScope != MarketType.DOMESTIC }) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Backtest does not support overseas universes yet")
        }

        return resolvedUniverseIds
            .flatMap { universeId ->
                universeSymbolRepository.findAllByUniverseIdOrderBySortOrderAscSymbolAscExchangeAsc(universeId).map { it.symbol.uppercase() }
            }.distinct()
    }

    private fun ensureDomesticDirectSymbols(symbols: List<String>) {
        val marketScopes = symbolMasterRepository.findDistinctMarketScopesByCodeIn(symbols.distinct())
        if (marketScopes.any { it != MarketType.DOMESTIC.value }) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Backtest does not support overseas symbols yet")
        }
    }

    private fun parseCsv(
        reader: BufferedReader,
        rows: MutableList<MarketDailyBarEntity>,
    ) {
        val lines = reader.readLines().filter { it.isNotBlank() }
        if (lines.isEmpty()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "CSV file is empty")
        }
        lines.drop(1).forEachIndexed { index, line ->
            val columns = line.split(",").map { it.trim() }
            if (columns.size != 7) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid CSV format at line ${index + 2}")
            }
            try {
                rows +=
                    MarketDailyBarEntity(
                        symbol = columns[0].uppercase(),
                        tradingDate = LocalDate.parse(columns[1]),
                        open = BigDecimal(columns[2]),
                        high = BigDecimal(columns[3]),
                        low = BigDecimal(columns[4]),
                        close = BigDecimal(columns[5]),
                        volume = BigDecimal(columns[6]),
                    )
            } catch (_: Exception) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid CSV value at line ${index + 2}")
            }
        }
    }

    private fun decimal(
        value: Double,
        scale: Int,
    ): BigDecimal = BigDecimal.valueOf(value).setScale(scale, RoundingMode.HALF_UP)

    private fun numberValue(value: Any?): Double =
        when (value) {
            is Number -> value.toDouble()
            is String -> value.toDouble()
            else -> throw IllegalArgumentException("Numeric value is required")
        }

    private fun toHeadlineMetrics(summary: Map<String, Any?>): BacktestHeadlineMetricsResponse =
        BacktestHeadlineMetricsResponse(
            totalReturnRate = numberValue(summary["totalReturnRate"]),
            maxDrawdownRate = numberValue(summary["maxDrawdownRate"]),
            winRate = numberValue(summary["winRate"]),
            tradeCount = numberValue(summary["tradeCount"]).toInt(),
            averagePnl = numberValue(summary["averagePnl"]),
            profitFactor = numberValue(summary["profitFactor"]),
        )

    @Suppress("UNCHECKED_CAST")
    private fun deepCopyMap(value: Map<String, Any?>): Map<String, Any?> =
        value.entries
            .associate { (key, nestedValue) ->
                key to deepCopyValue(nestedValue)
            }.toMap(linkedMapOf())

    @Suppress("UNCHECKED_CAST")
    private fun deepCopyValue(value: Any?): Any? =
        when (value) {
            is Map<*, *> -> value.entries.associate { it.key.toString() to deepCopyValue(it.value) }.toMap(linkedMapOf())
            is List<*> -> value.map(::deepCopyValue)
            else -> value
        }
}
