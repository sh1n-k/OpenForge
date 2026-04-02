package com.openforge.api.operations

import com.openforge.api.strategy.application.OrderTrackingService
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
    private val orderTrackingService: OrderTrackingService,
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

        return requests.map { req ->
            val symbol =
                runCatching {
                    signalEventRepository.findById(req.signalEventId).orElse(null)?.symbol
                }.getOrNull() ?: ""

            CrossStrategyOrderRequestResponse(
                id = req.id,
                strategyId = req.strategyId,
                strategyName = nameMap[req.strategyId] ?: "",
                symbol = symbol,
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

        return strategies.flatMap { strategy ->
            orderTrackingService.currentPositionProjections(strategy.id).map { p ->
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
}
