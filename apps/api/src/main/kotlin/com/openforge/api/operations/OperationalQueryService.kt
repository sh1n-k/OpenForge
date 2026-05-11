package com.openforge.api.operations

import com.openforge.api.strategy.domain.StrategyOrderFillRepository
import com.openforge.api.strategy.domain.StrategyOrderRequestRepository
import com.openforge.api.strategy.domain.StrategyRepository
import com.openforge.api.strategy.domain.StrategySignalEventRepository
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
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
        val pageable = PageRequest.of(0, normalizeLimit(limit))

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
        val pageable = PageRequest.of(0, normalizeLimit(limit))

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

    private fun normalizeLimit(value: Int): Int = value.coerceIn(1, 500)
}
