package com.openforge.api.operations

import com.openforge.api.strategy.application.StrategyRuntimeState
import com.openforge.api.strategy.domain.OrderSide
import com.openforge.api.strategy.domain.StrategyExecutionConfigRepository
import com.openforge.api.strategy.domain.StrategyExecutionRunRepository
import com.openforge.api.strategy.domain.StrategyOrderFillEntity
import com.openforge.api.strategy.domain.StrategyOrderFillRepository
import com.openforge.api.strategy.domain.StrategyOrderRequestRepository
import com.openforge.api.strategy.domain.StrategyRepository
import com.openforge.api.strategy.domain.StrategyRiskEventRepository
import com.openforge.api.strategy.domain.StrategyRiskEventType
import com.openforge.api.system.health.HealthStatusService
import com.openforge.api.system.risk.SystemRiskService
import org.springframework.data.domain.PageRequest
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.util.UUID

@Service
class DashboardService(
    private val strategyRepository: StrategyRepository,
    private val executionConfigRepository: StrategyExecutionConfigRepository,
    private val executionRunRepository: StrategyExecutionRunRepository,
    private val orderRequestRepository: StrategyOrderRequestRepository,
    private val orderFillRepository: StrategyOrderFillRepository,
    private val riskEventRepository: StrategyRiskEventRepository,
    private val systemRiskService: SystemRiskService,
    private val healthStatusService: HealthStatusService,
) {
    fun getDashboard(): DashboardResponse {
        val strategies = strategyRepository.findAllByIsArchivedFalseOrderByUpdatedAtDesc()
        val strategyIds = strategies.map { it.id }
        val strategyMap = strategies.associateBy { it.id }
        val executionConfigs = executionConfigRepository.findAll().associateBy { it.strategyId }

        val today = LocalDate.now(ZONE_ID)
        val todayStart = today.atStartOfDay(ZONE_ID).toOffsetDateTime()
        val allTodayOrders =
            if (strategyIds.isEmpty()) {
                emptyList()
            } else {
                orderRequestRepository.findAllByStrategyIdInAndRequestedAtAfter(strategyIds, todayStart)
            }
        val todayOrderCountsByStrategyId = allTodayOrders.groupingBy { it.strategyId }.eachCount()
        val allFillsAsc =
            if (strategyIds.isEmpty()) {
                emptyList()
            } else {
                orderFillRepository.findAllByStrategyIdInOrderByStrategyIdAscFilledAtAsc(strategyIds)
            }
        val positionsByStrategyId = currentPositionsByStrategy(allFillsAsc)
        val latestRunByStrategyId =
            if (strategyIds.isEmpty()) {
                emptyMap()
            } else {
                executionRunRepository
                    .findAllByStrategyIdInOrderByStartedAtDesc(strategyIds)
                    .distinctBy { it.strategyId }
                    .associateBy { it.strategyId }
            }

        val strategySummaries =
            strategies.map { strategy ->
                val config = executionConfigs[strategy.id]
                val lastRun = latestRunByStrategyId[strategy.id]
                val positions = positionsByStrategyId[strategy.id].orEmpty()

                DashboardStrategySummary(
                    id = strategy.id,
                    name = strategy.name,
                    strategyType = strategy.strategyType.value,
                    status = StrategyRuntimeState.resolveDisplayStatus(strategy.status, config?.enabled == true).value,
                    executionEnabled = config?.enabled ?: false,
                    lastRunStatus = lastRun?.status?.value,
                    lastRunAt = lastRun?.startedAt,
                    positionCount = positions.size,
                    todayOrderCount = todayOrderCountsByStrategyId[strategy.id] ?: 0,
                )
            }

        val runningStrategyCount = strategySummaries.count { it.executionEnabled }
        val allTodayFills = allFillsAsc.filter { it.filledAt >= todayStart }
        val todayPnl = allTodayFills.sumOf { it.realizedPnl.toDouble() }

        val allPositions =
            strategies.flatMap { strategy ->
                positionsByStrategyId[strategy.id].orEmpty().map { p ->
                    DashboardPositionItem(
                        strategyId = strategy.id,
                        strategyName = strategy.name,
                        symbol = p.symbol,
                        netQuantity = p.netQuantity,
                        avgEntryPrice = p.avgEntryPrice.toDouble(),
                        lastFillAt = p.lastFillAt,
                    )
                }
            }

        val recentFills =
            if (strategyIds.isEmpty()) {
                emptyList()
            } else {
                orderFillRepository
                    .findAllByStrategyIdInOrderByFilledAtDesc(strategyIds, PageRequest.of(0, 10))
                    .map { fill ->
                        DashboardFillItem(
                            id = fill.id,
                            strategyId = fill.strategyId,
                            strategyName = strategyMap[fill.strategyId]?.name ?: "",
                            symbol = fill.symbol,
                            side = fill.side.value,
                            quantity = fill.quantity,
                            price = fill.price.toDouble(),
                            realizedPnl = fill.realizedPnl.toDouble(),
                            filledAt = fill.filledAt,
                        )
                    }
            }

        val recentErrors =
            buildList {
                if (strategyIds.isNotEmpty()) {
                    executionRunRepository
                        .findAllByStrategyIdInAndErrorMessageIsNotNullOrderByStartedAtDesc(
                            strategyIds,
                            PageRequest.of(0, 10),
                        ).forEach { run ->
                            val strategy = strategyMap[run.strategyId]
                            add(
                                DashboardErrorItem(
                                    source = "execution",
                                    strategyId = run.strategyId,
                                    strategyName = strategy?.name,
                                    message = run.errorMessage!!,
                                    occurredAt = run.completedAt ?: run.startedAt,
                                ),
                            )
                        }

                    riskEventRepository
                        .findAllByStrategyIdInAndEventTypeOrderByOccurredAtDesc(
                            strategyIds,
                            StrategyRiskEventType.ORDER_BLOCKED,
                            PageRequest.of(0, 10),
                        ).forEach { event ->
                            val strategy = strategyMap[event.strategyId]
                            add(
                                DashboardErrorItem(
                                    source = "risk",
                                    strategyId = event.strategyId,
                                    strategyName = strategy?.name,
                                    message = event.message,
                                    occurredAt = event.occurredAt,
                                ),
                            )
                        }
                }
            }.sortedByDescending { it.occurredAt }
                .take(10)

        val healthResponse = runCatching { healthStatusService.read() }.getOrNull()

        return DashboardResponse(
            runningStrategyCount = runningStrategyCount,
            todayOrderCount = allTodayOrders.size,
            todayPnl = todayPnl,
            positionCount = allPositions.size,
            strategySummaries = strategySummaries,
            recentFills = recentFills,
            currentPositions = allPositions,
            recentErrors = recentErrors,
            globalKillSwitchEnabled = systemRiskService.isGlobalKillSwitchEnabled(),
            health =
                HealthSummary(
                    apiStatus = healthResponse?.status ?: "UNKNOWN",
                    dbStatus = healthResponse?.database?.status ?: "UNKNOWN",
                ),
        )
    }

    companion object {
        private val ZONE_ID: ZoneId = ZoneId.of("Asia/Seoul")
    }

    private fun currentPositionsByStrategy(fills: List<StrategyOrderFillEntity>): Map<UUID, List<PositionProjection>> {
        val statesByStrategy = linkedMapOf<UUID, LinkedHashMap<String, PositionState>>()
        fills.forEach { fill ->
            val states = statesByStrategy.getOrPut(fill.strategyId) { linkedMapOf() }
            val current = states.getOrPut(fill.symbol) { PositionState(symbol = fill.symbol) }
            when (fill.side) {
                OrderSide.BUY -> {
                    val nextQuantity = current.netQuantity + fill.quantity
                    val totalCost =
                        current.avgEntryPrice * BigDecimal.valueOf(current.netQuantity) +
                            fill.price * BigDecimal.valueOf(fill.quantity)
                    current.netQuantity = nextQuantity
                    current.avgEntryPrice =
                        if (nextQuantity == 0L) {
                            BigDecimal.ZERO.scaled()
                        } else {
                            totalCost.divide(BigDecimal.valueOf(nextQuantity), 6, RoundingMode.HALF_UP).scaled()
                        }
                }

                OrderSide.SELL -> {
                    if (current.netQuantity < fill.quantity) {
                        throw ResponseStatusException(HttpStatus.CONFLICT, "Stored fill stream would create a negative position")
                    }
                    current.netQuantity -= fill.quantity
                    if (current.netQuantity == 0L) {
                        current.avgEntryPrice = BigDecimal.ZERO.scaled()
                    }
                }
            }
            current.lastFillAt = fill.filledAt
        }
        return statesByStrategy.mapValues { (_, states) ->
            states.values
                .filter { it.netQuantity > 0L }
                .sortedBy { it.symbol }
                .map {
                    PositionProjection(
                        symbol = it.symbol,
                        netQuantity = it.netQuantity,
                        avgEntryPrice = it.avgEntryPrice,
                        lastFillAt = it.lastFillAt,
                    )
                }
        }
    }

    private fun BigDecimal.scaled(): BigDecimal = setScale(6, RoundingMode.HALF_UP)

    private data class PositionProjection(
        val symbol: String,
        val netQuantity: Long,
        val avgEntryPrice: BigDecimal,
        val lastFillAt: OffsetDateTime?,
    )

    private data class PositionState(
        val symbol: String,
        var netQuantity: Long = 0,
        var avgEntryPrice: BigDecimal = BigDecimal.ZERO.setScale(6, RoundingMode.HALF_UP),
        var lastFillAt: OffsetDateTime? = null,
    )
}
