package com.openforge.api.operations

import com.openforge.api.strategy.domain.OrderSide
import com.openforge.api.strategy.domain.StrategyOrderFillEntity
import com.openforge.api.strategy.domain.StrategyOrderFillRepository
import com.openforge.api.strategy.domain.StrategyOrderRequestRepository
import com.openforge.api.strategy.domain.StrategyRepository
import com.openforge.api.strategy.domain.StrategySignalEventRepository
import org.springframework.data.domain.PageRequest
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.OffsetDateTime
import java.util.UUID

@Service
class OperationalQueryService(
    private val strategyRepository: StrategyRepository,
    private val orderRequestRepository: StrategyOrderRequestRepository,
    private val orderFillRepository: StrategyOrderFillRepository,
    private val signalEventRepository: StrategySignalEventRepository,
) {
    fun listOrders(
        strategyId: UUID?,
        limit: Int,
    ): List<CrossStrategyOrderRequestResponse> {
        val strategies = strategyRepository.findAllByIsArchivedFalseOrderByUpdatedAtDesc()
        val nameMap = strategies.associate { it.id to it.name }
        val pageable = PageRequest.of(0, normalizeLimit(limit, 50))

        val requests =
            if (strategyId != null) {
                orderRequestRepository.findAllByStrategyIdOrderByRequestedAtDesc(strategyId, pageable)
            } else {
                orderRequestRepository.findAllByOrderByRequestedAtDesc(pageable)
            }
        val signalById = signalEventRepository.findAllById(requests.map { it.signalEventId }).associateBy { it.id }

        return requests.map { req ->
            CrossStrategyOrderRequestResponse(
                id = req.id,
                strategyId = req.strategyId,
                strategyName = nameMap[req.strategyId] ?: "",
                symbol = signalById[req.signalEventId]?.symbol ?: "",
                side = req.side.value,
                quantity = req.quantity,
                price = req.price.toDouble(),
                mode = req.mode.value,
                status = req.status.value,
                precheckPassed = req.precheckPassed,
                failureReason = req.failureReason,
                requestedAt = req.requestedAt,
            )
        }
    }

    fun listFills(
        strategyId: UUID?,
        limit: Int,
    ): List<CrossStrategyFillResponse> {
        val strategies = strategyRepository.findAllByIsArchivedFalseOrderByUpdatedAtDesc()
        val nameMap = strategies.associate { it.id to it.name }
        val pageable = PageRequest.of(0, normalizeLimit(limit, 50))

        val fills =
            if (strategyId != null) {
                orderFillRepository.findAllByStrategyIdOrderByFilledAtDesc(strategyId, pageable)
            } else {
                orderFillRepository.findAllByOrderByFilledAtDesc(pageable)
            }

        return fills.map { fill ->
            CrossStrategyFillResponse(
                id = fill.id,
                orderRequestId = fill.orderRequestId,
                strategyId = fill.strategyId,
                strategyName = nameMap[fill.strategyId] ?: "",
                symbol = fill.symbol,
                side = fill.side.value,
                quantity = fill.quantity,
                price = fill.price.toDouble(),
                realizedPnl = fill.realizedPnl.toDouble(),
                filledAt = fill.filledAt,
                source = fill.source.value,
            )
        }
    }

    fun listPositions(strategyId: UUID?): List<CrossStrategyPositionResponse> {
        val strategies =
            if (strategyId != null) {
                strategyRepository.findByIdAndIsArchivedFalse(strategyId)?.let { listOf(it) } ?: emptyList()
            } else {
                strategyRepository.findAllByIsArchivedFalseOrderByUpdatedAtDesc()
            }
        val strategyIds = strategies.map { it.id }
        val positionsByStrategyId =
            if (strategyIds.isEmpty()) {
                emptyMap()
            } else {
                currentPositionsByStrategy(
                    orderFillRepository.findAllByStrategyIdInOrderByStrategyIdAscFilledAtAsc(strategyIds),
                )
            }

        return strategies.flatMap { strategy ->
            positionsByStrategyId[strategy.id].orEmpty().map { p ->
                CrossStrategyPositionResponse(
                    strategyId = strategy.id,
                    strategyName = strategy.name,
                    symbol = p.symbol,
                    netQuantity = p.netQuantity,
                    avgEntryPrice = p.avgEntryPrice.toDouble(),
                    lastFillAt = p.lastFillAt,
                )
            }
        }
    }

    private fun normalizeLimit(
        value: Int,
        defaultValue: Int,
    ): Int = value.coerceIn(1, 500).takeIf { it > 0 } ?: defaultValue

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
