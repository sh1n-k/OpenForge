package com.openforge.api.strategy.application

import com.openforge.api.backtest.application.Bar
import com.openforge.api.backtest.application.StrategySignalSupport
import com.openforge.api.backtest.application.StrategySpec
import com.openforge.api.backtest.domain.MarketDailyBarRepository
import com.openforge.api.strategy.domain.StrategyEntity
import com.openforge.api.strategy.domain.StrategyExecutionConfigEntity
import com.openforge.api.strategy.domain.StrategyExecutionConfigRepository
import com.openforge.api.strategy.domain.StrategyExecutionMode
import com.openforge.api.strategy.domain.StrategyExecutionRunEntity
import com.openforge.api.strategy.domain.StrategyExecutionRunRepository
import com.openforge.api.strategy.domain.StrategyExecutionRunStatus
import com.openforge.api.strategy.domain.StrategyExecutionTriggerType
import com.openforge.api.strategy.domain.StrategyRepository
import com.openforge.api.strategy.domain.MarketType
import com.openforge.api.strategy.domain.StrategySignalEventEntity
import com.openforge.api.strategy.domain.StrategySignalEventRepository
import com.openforge.api.strategy.domain.StrategySignalType
import com.openforge.api.strategy.domain.StrategyStatus
import com.openforge.api.strategy.domain.StrategyUniverseRepository
import com.openforge.api.strategy.domain.StrategyValidationStatus
import com.openforge.api.strategy.domain.StrategyVersionEntity
import com.openforge.api.strategy.domain.StrategyVersionRepository
import com.openforge.api.strategy.domain.UniverseRepository
import com.openforge.api.strategy.domain.UniverseSymbolRepository
import com.openforge.api.strategy.editor.StrategyEditorService
import com.openforge.api.strategy.web.StrategyExecutionLastRunResponse
import com.openforge.api.strategy.web.StrategyExecutionResponse
import com.openforge.api.strategy.web.StrategyExecutionRunResponse
import com.openforge.api.strategy.web.StrategySignalEventResponse
import com.openforge.api.strategy.web.UpdateStrategyExecutionRequest
import jakarta.annotation.PostConstruct
import jakarta.transaction.Transactional
import org.springframework.data.domain.PageRequest
import org.springframework.http.HttpStatus
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.time.DateTimeException
import java.time.LocalDate
import java.time.LocalTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.LinkedHashMap
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean

@Service
@Transactional
class PaperExecutionService(
    private val strategyRepository: StrategyRepository,
    private val strategyVersionRepository: StrategyVersionRepository,
    private val strategyUniverseRepository: StrategyUniverseRepository,
    private val universeRepository: UniverseRepository,
    private val universeSymbolRepository: UniverseSymbolRepository,
    private val strategyExecutionConfigRepository: StrategyExecutionConfigRepository,
    private val strategyExecutionRunRepository: StrategyExecutionRunRepository,
    private val strategySignalEventRepository: StrategySignalEventRepository,
    private val marketDailyBarRepository: MarketDailyBarRepository,
    private val strategyEditorService: StrategyEditorService,
    private val signalEngine: PaperSignalEngine,
) {
    private val processing = AtomicBoolean(false)

    @PostConstruct
    fun markInterruptedRuns() {
        val interrupted =
            strategyExecutionRunRepository.findAll().filter {
                it.status == StrategyExecutionRunStatus.RUNNING
            }
        interrupted.forEach {
            it.status = StrategyExecutionRunStatus.FAILED
            it.errorMessage = "interrupted"
            it.completedAt = OffsetDateTime.now(DEFAULT_ZONE_ID)
        }
        if (interrupted.isNotEmpty()) {
            strategyExecutionRunRepository.saveAll(interrupted)
        }
    }

    fun getExecution(strategyId: UUID): StrategyExecutionResponse {
        val strategy = getActiveStrategy(strategyId)
        val config = strategyExecutionConfigRepository.findById(strategy.id).orElse(defaultConfig(strategy.id))
        return toExecutionResponse(strategy, config)
    }

    fun updateExecution(
        strategyId: UUID,
        request: UpdateStrategyExecutionRequest,
    ): StrategyExecutionResponse {
        val strategy = getActiveStrategy(strategyId)
        val config = strategyExecutionConfigRepository.findById(strategy.id).orElse(defaultConfig(strategy.id))
        config.scheduleTime = parseScheduleTime(request.scheduleTime)
        config.timezone = parseTimezone(request.timezone)
        config.mode = request.mode

        if (request.enabled) {
            ensureStrategyExecutable(strategy)
            config.enabled = true
            strategy.status = StrategyStatus.RUNNING
        } else {
            config.enabled = false
            if (strategy.status != StrategyStatus.DRAFT) {
                strategy.status = StrategyStatus.STOPPED
            }
        }

        strategyRepository.save(strategy)
        strategyExecutionConfigRepository.save(config)
        return getExecution(strategy.id)
    }

    fun listExecutionRuns(
        strategyId: UUID,
        limit: Int,
    ): List<StrategyExecutionRunResponse> {
        getActiveStrategy(strategyId)
        return strategyExecutionRunRepository
            .findAllByStrategyIdOrderByStartedAtDesc(
                strategyId,
                PageRequest.of(0, normalizeLimit(limit, 20)),
            ).map(::toRunResponse)
    }

    fun listSignals(
        strategyId: UUID,
        limit: Int,
    ): List<StrategySignalEventResponse> {
        getActiveStrategy(strategyId)
        return strategySignalEventRepository
            .findAllByStrategyIdOrderByCreatedAtDesc(
                strategyId,
                PageRequest.of(0, normalizeLimit(limit, 50)),
            ).map(::toSignalResponse)
    }

    @Scheduled(fixedDelay = 60000)
    fun processDueExecutions() {
        processDueExecutionsAt(ZonedDateTime.now(DEFAULT_ZONE_ID))
    }

    fun processDueExecutionsAt(referenceTime: ZonedDateTime) {
        if (!processing.compareAndSet(false, true)) {
            return
        }
        try {
            val configs = strategyExecutionConfigRepository.findAllByEnabledTrueOrderByUpdatedAtAsc()
            configs.forEach { config ->
                val zoneId = ZoneId.of(config.timezone)
                val zonedNow = referenceTime.withZoneSameInstant(zoneId)
                val scheduledDate = zonedNow.toLocalDate()
                if (config.lastScheduledDate == scheduledDate) {
                    return@forEach
                }
                if (zonedNow.toLocalTime().isBefore(config.scheduleTime)) {
                    return@forEach
                }

                config.lastScheduledDate = scheduledDate
                strategyExecutionConfigRepository.save(config)
                executeScheduledRun(config, zonedNow)
            }
        } finally {
            processing.set(false)
        }
    }

    private fun executeScheduledRun(
        config: StrategyExecutionConfigEntity,
        scheduledAt: ZonedDateTime,
    ) {
        val strategy = strategyRepository.findByIdAndIsArchivedFalse(config.strategyId) ?: return
        val versions = strategyVersionRepository.findAllByStrategyIdOrderByVersionNumberDesc(strategy.id)
        if (versions.isEmpty()) {
            return
        }

        val symbols = resolveLinkedSymbols(strategy.id)
        val run =
            strategyExecutionRunRepository.save(
                StrategyExecutionRunEntity(
                    strategyId = strategy.id,
                    strategyVersionId = versions.first().id,
                    triggerType = StrategyExecutionTriggerType.SCHEDULED,
                    status = StrategyExecutionRunStatus.RUNNING,
                    scheduledDate = scheduledAt.toLocalDate(),
                    startedAt = scheduledAt.toOffsetDateTime(),
                    symbolCount = symbols.size,
                    signalCount = 0,
                ),
            )

        try {
            ensureStrategyExecutable(strategy)
            if (symbols.isEmpty()) {
                throw IllegalStateException("Strategy requires at least one linked symbol")
            }

            val executableVersion = resolveLatestExecutableVersion(strategy, versions)
            run.strategyVersionId = executableVersion.id
            val spec = StrategySignalSupport.parseStrategySpec(executableVersion.normalizedSpec!!)
            val barsBySymbol =
                symbols.associateWith { symbol ->
                    marketDailyBarRepository.findAllBySymbolOrderByTradingDateAsc(symbol).map {
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
            val signals = signalEngine.generateSignals(spec, barsBySymbol)

            strategySignalEventRepository.saveAll(
                signals.map { signal ->
                    StrategySignalEventEntity(
                        runId = run.id,
                        strategyId = strategy.id,
                        strategyVersionId = executableVersion.id,
                        symbol = signal.symbol,
                        signalType = signal.signalType,
                        tradingDate = signal.tradingDate,
                        payload = signal.payload,
                    )
                },
            )

            run.signalCount = signals.size
            run.status = StrategyExecutionRunStatus.COMPLETED
            run.summary =
                linkedMapOf(
                    "evaluatedSymbolCount" to symbols.size,
                    "signalCount" to signals.size,
                    "signalSymbols" to signals.map { it.symbol }.distinct(),
                )
            run.completedAt = OffsetDateTime.now(ZoneId.of(config.timezone))
            run.errorMessage = null
            strategyExecutionRunRepository.save(run)
        } catch (exception: Exception) {
            run.status = StrategyExecutionRunStatus.FAILED
            run.errorMessage = exception.message ?: "Paper execution failed"
            run.completedAt = OffsetDateTime.now(ZoneId.of(config.timezone))
            strategyExecutionRunRepository.save(run)
        }
    }

    private fun ensureStrategyExecutable(strategy: StrategyEntity) {
        if (strategy.status == StrategyStatus.DRAFT) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Only backtested strategies can enable paper execution")
        }
        ensureDomesticUniverseScope(strategy.id)
        if (resolveLinkedSymbols(strategy.id).isEmpty()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Strategy requires at least one linked symbol")
        }
        resolveLatestExecutableVersion(
            strategy,
            strategyVersionRepository.findAllByStrategyIdOrderByVersionNumberDesc(strategy.id),
        )
    }

    private fun resolveLatestExecutableVersion(
        strategy: StrategyEntity,
        versions: List<StrategyVersionEntity>,
    ): StrategyVersionEntity {
        val validatedVersions = versions.map { ensureExecutableValidation(it, strategy) }
        return validatedVersions.firstOrNull {
            it.validationStatus == StrategyValidationStatus.VALID && it.normalizedSpec != null
        } ?: throw ResponseStatusException(HttpStatus.CONFLICT, "Strategy does not have a valid executable version")
    }

    private fun ensureExecutableValidation(
        version: StrategyVersionEntity,
        strategy: StrategyEntity,
    ): StrategyVersionEntity {
        if (version.normalizedSpec != null && version.validationStatus == StrategyValidationStatus.VALID) {
            return version
        }

        val result =
            strategyEditorService.validateStoredPayload(
                strategy.strategyType,
                version.payloadFormat,
                version.payload,
            )
        version.normalizedSpec = result.normalizedSpec?.let(::deepCopyMap)
        version.validationStatus = if (result.valid) StrategyValidationStatus.VALID else StrategyValidationStatus.INVALID
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
        return strategyVersionRepository.save(version)
    }

    private fun resolveLinkedSymbols(strategyId: UUID): List<String> {
        val universeIds = strategyUniverseRepository.findAllByStrategyId(strategyId).map { it.universeId }.distinct()
        if (universeIds.isEmpty()) {
            return emptyList()
        }

        val activeUniverses = universeRepository.findAllById(universeIds).filter { !it.isArchived }
        if (activeUniverses.size != universeIds.size) {
            return emptyList()
        }

        return universeIds
            .flatMap { universeId ->
                universeSymbolRepository.findAllByUniverseIdOrderBySortOrderAscSymbolAscExchangeAsc(universeId).map { it.symbol.uppercase() }
            }.distinct()
    }

    private fun ensureDomesticUniverseScope(strategyId: UUID) {
        val universeIds = strategyUniverseRepository.findAllByStrategyId(strategyId).map { it.universeId }.distinct()
        if (universeIds.isEmpty()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Strategy requires at least one linked symbol")
        }

        val activeUniverses = universeRepository.findAllById(universeIds).filter { !it.isArchived }
        if (activeUniverses.size != universeIds.size) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Universe contains archived or missing entries")
        }

        if (activeUniverses.any { it.marketScope != MarketType.DOMESTIC }) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Strategy contains overseas universes and cannot enable paper execution")
        }
    }

    private fun getActiveStrategy(strategyId: UUID): StrategyEntity =
        strategyRepository.findByIdAndIsArchivedFalse(strategyId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Strategy not found: $strategyId")

    private fun defaultConfig(strategyId: UUID): StrategyExecutionConfigEntity =
        StrategyExecutionConfigEntity(
            strategyId = strategyId,
            enabled = false,
            mode = StrategyExecutionMode.PAPER,
            scheduleTime = DEFAULT_SCHEDULE_TIME,
            timezone = DEFAULT_TIMEZONE,
        )

    private fun parseScheduleTime(value: String): LocalTime =
        try {
            LocalTime.parse(value.trim(), SCHEDULE_TIME_FORMATTER)
        } catch (_: DateTimeParseException) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "scheduleTime must use HH:mm format")
        }

    private fun parseTimezone(value: String): String =
        try {
            ZoneId.of(value.trim()).id
        } catch (_: DateTimeException) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "timezone must be a valid IANA timezone")
        }

    private fun normalizeLimit(
        value: Int,
        defaultValue: Int,
    ): Int = value.coerceIn(1, 100).takeIf { it > 0 } ?: defaultValue

    private fun toExecutionResponse(
        strategy: StrategyEntity,
        config: StrategyExecutionConfigEntity,
    ): StrategyExecutionResponse {
        val lastRun = strategyExecutionRunRepository.findTopByStrategyIdOrderByStartedAtDesc(strategy.id)
        return StrategyExecutionResponse(
            mode = config.mode,
            enabled = config.enabled,
            scheduleTime = config.scheduleTime.format(SCHEDULE_TIME_FORMATTER),
            timezone = config.timezone,
            strategyStatus = strategy.status,
            lastRun = lastRun?.let(::toLastRunResponse),
            nextRunAt = nextRunAt(config),
        )
    }

    private fun nextRunAt(config: StrategyExecutionConfigEntity): OffsetDateTime? {
        if (!config.enabled) {
            return null
        }

        val zoneId = ZoneId.of(config.timezone)
        val now = ZonedDateTime.now(zoneId)
        val nextDate =
            if (config.lastScheduledDate == now.toLocalDate()) {
                now.toLocalDate().plusDays(1)
            } else {
                now.toLocalDate()
            }
        return ZonedDateTime.of(nextDate, config.scheduleTime, zoneId).toOffsetDateTime()
    }

    private fun toLastRunResponse(run: StrategyExecutionRunEntity): StrategyExecutionLastRunResponse =
        StrategyExecutionLastRunResponse(
            runId = run.id,
            status = run.status,
            scheduledDate = run.scheduledDate,
            startedAt = run.startedAt,
            completedAt = run.completedAt,
            signalCount = run.signalCount,
            errorMessage = run.errorMessage,
        )

    private fun toRunResponse(run: StrategyExecutionRunEntity): StrategyExecutionRunResponse =
        StrategyExecutionRunResponse(
            runId = run.id,
            status = run.status,
            triggerType = run.triggerType,
            scheduledDate = run.scheduledDate,
            startedAt = run.startedAt,
            completedAt = run.completedAt,
            symbolCount = run.symbolCount,
            signalCount = run.signalCount,
            errorMessage = run.errorMessage,
            strategyVersionId = run.strategyVersionId,
        )

    private fun toSignalResponse(signal: StrategySignalEventEntity): StrategySignalEventResponse =
        StrategySignalEventResponse(
            id = signal.id,
            runId = signal.runId,
            strategyVersionId = signal.strategyVersionId,
            symbol = signal.symbol,
            signalType = signal.signalType,
            tradingDate = signal.tradingDate,
            createdAt = signal.createdAt,
            payload = signal.payload,
        )

    @Suppress("UNCHECKED_CAST")
    private fun deepCopyMap(value: Map<String, Any?>): Map<String, Any?> =
        value.entries
            .associate { (key, nestedValue) ->
                key to deepCopyValue(nestedValue)
            }.toMap(LinkedHashMap())

    @Suppress("UNCHECKED_CAST")
    private fun deepCopyValue(value: Any?): Any? =
        when (value) {
            is Map<*, *> -> value.entries.associate { it.key.toString() to deepCopyValue(it.value) }.toMap(LinkedHashMap())
            is List<*> -> value.map(::deepCopyValue)
            else -> value
        }

    companion object {
        private val DEFAULT_ZONE_ID: ZoneId = ZoneId.of("Asia/Seoul")
        private const val DEFAULT_TIMEZONE = "Asia/Seoul"
        private val DEFAULT_SCHEDULE_TIME: LocalTime = LocalTime.of(16, 0)
        private val SCHEDULE_TIME_FORMATTER: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")
    }
}

@Service
class PaperSignalEngine {
    fun generateSignals(
        spec: StrategySpec,
        barsBySymbol: Map<String, List<Bar>>,
    ): List<GeneratedSignal> =
        barsBySymbol.entries.flatMap { (symbol, bars) ->
            if (bars.isEmpty()) {
                return@flatMap emptyList()
            }

            val lastIndex = bars.lastIndex
            val indicators = StrategySignalSupport.calculateIndicators(spec.indicators, bars)
            if (!StrategySignalSupport.hasRequiredValues(spec, indicators, lastIndex)) {
                return@flatMap emptyList()
            }

            val lastBar = bars[lastIndex]
            buildList {
                if (StrategySignalSupport.evaluateGroup(spec.entry, bars, indicators, lastIndex)) {
                    add(
                        GeneratedSignal(
                            symbol = symbol,
                            signalType = StrategySignalType.ENTRY,
                            tradingDate = lastBar.tradingDate,
                            payload = payloadFor(lastBar),
                        ),
                    )
                }
                if (StrategySignalSupport.evaluateGroup(spec.exit, bars, indicators, lastIndex)) {
                    add(
                        GeneratedSignal(
                            symbol = symbol,
                            signalType = StrategySignalType.EXIT,
                            tradingDate = lastBar.tradingDate,
                            payload = payloadFor(lastBar),
                        ),
                    )
                }
            }
        }

    private fun payloadFor(bar: Bar): Map<String, Any?> =
        linkedMapOf(
            "open" to bar.open,
            "high" to bar.high,
            "low" to bar.low,
            "close" to bar.close,
            "volume" to bar.volume,
        )
}

data class GeneratedSignal(
    val symbol: String,
    val signalType: StrategySignalType,
    val tradingDate: LocalDate,
    val payload: Map<String, Any?>,
)
