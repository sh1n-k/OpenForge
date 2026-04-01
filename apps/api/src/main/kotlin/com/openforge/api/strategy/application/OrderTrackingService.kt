package com.openforge.api.strategy.application

import com.openforge.api.strategy.domain.OrderFillSource
import com.openforge.api.strategy.domain.OrderLifecycleStatus
import com.openforge.api.strategy.domain.OrderMode
import com.openforge.api.strategy.domain.OrderRequestStatus
import com.openforge.api.strategy.domain.OrderSide
import com.openforge.api.strategy.domain.StrategyOrderFillEntity
import com.openforge.api.strategy.domain.StrategyOrderFillRepository
import com.openforge.api.strategy.domain.StrategyOrderRequestEntity
import com.openforge.api.strategy.domain.StrategyOrderRequestRepository
import com.openforge.api.strategy.domain.StrategyOrderStatusEventEntity
import com.openforge.api.strategy.domain.StrategyOrderStatusEventRepository
import com.openforge.api.strategy.domain.StrategyRepository
import com.openforge.api.strategy.domain.StrategySignalEventRepository
import com.openforge.api.strategy.web.CreateOrderFillRequest
import com.openforge.api.strategy.web.OrderFillResponse
import com.openforge.api.strategy.web.OrderRequestResponse
import com.openforge.api.strategy.web.OrderStatusEventResponse
import com.openforge.api.strategy.web.StrategyPositionResponse
import jakarta.transaction.Transactional
import org.springframework.data.domain.PageRequest
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.OffsetDateTime
import java.util.UUID

@Service
@Transactional
class OrderTrackingService(
    private val strategyRepository: StrategyRepository,
    private val orderRequestRepository: StrategyOrderRequestRepository,
    private val orderStatusEventRepository: StrategyOrderStatusEventRepository,
    private val orderFillRepository: StrategyOrderFillRepository,
    private val signalEventRepository: StrategySignalEventRepository,
) {

    fun listOrderStatusEvents(strategyId: UUID, orderRequestId: UUID, limit: Int): List<OrderStatusEventResponse> {
        getStrategy(strategyId)
        getOrderRequest(strategyId, orderRequestId)
        return orderStatusEventRepository.findAllByOrderRequestIdOrderByOccurredAtDesc(
            orderRequestId,
            PageRequest.of(0, normalizeLimit(limit, 50)),
        ).map(::toOrderStatusEventResponse)
    }

    fun listFills(strategyId: UUID, limit: Int): List<OrderFillResponse> {
        getStrategy(strategyId)
        return orderFillRepository.findAllByStrategyIdOrderByFilledAtDesc(
            strategyId,
            PageRequest.of(0, normalizeLimit(limit, 50)),
        ).map(::toOrderFillResponse)
    }

    fun listPositions(strategyId: UUID): List<StrategyPositionResponse> {
        getStrategy(strategyId)
        return projectPositions(strategyId)
    }

    fun createFill(
        strategyId: UUID,
        orderRequestId: UUID,
        request: CreateOrderFillRequest,
    ): OrderFillResponse {
        val orderRequest = getOrderRequest(strategyId, orderRequestId)
        val symbol = symbolFor(orderRequest)
        if (orderRequest.mode == OrderMode.LIVE) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Live fill tracking is not implemented yet")
        }
        if (!orderRequest.precheckPassed || orderRequest.status == OrderRequestStatus.REJECTED_PRECHECK) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Rejected order request cannot receive fills")
        }

        val existingFills = orderFillRepository.findAllByOrderRequestIdOrderByFilledAtAsc(orderRequestId)
        val existingFilledQuantity = existingFills.sumOf { it.quantity }
        val newFilledQuantity = existingFilledQuantity + request.quantity
        if (newFilledQuantity > orderRequest.quantity) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Fill quantity exceeds requested order quantity")
        }

        if (orderRequest.side == OrderSide.SELL) {
            val availableQuantity = projectPositionState(strategyId)[symbol]?.netQuantity ?: 0L
            if (availableQuantity < request.quantity) {
                throw ResponseStatusException(HttpStatus.CONFLICT, "Sell fill exceeds current position quantity")
            }
        }

        val fillEntity = orderFillRepository.save(
            StrategyOrderFillEntity(
                orderRequestId = orderRequest.id,
                strategyId = orderRequest.strategyId,
                strategyVersionId = orderRequest.strategyVersionId,
                symbol = symbol,
                side = orderRequest.side,
                quantity = request.quantity,
                price = request.price.toBigDecimal().scaled(),
                filledAt = request.filledAt,
                source = OrderFillSource.PAPER_MANUAL,
                payload = mapOf("source" to OrderFillSource.PAPER_MANUAL.value),
            ),
        )

        if (existingFills.isEmpty()) {
            appendStatusEvent(
                orderRequestId = orderRequest.id,
                status = OrderLifecycleStatus.ACCEPTED,
                reason = "paper fill received",
                occurredAt = request.filledAt.minusNanos(1_000),
                payload = mapOf(
                    "filledQuantity" to request.quantity,
                    "price" to fillEntity.price.toDouble(),
                    "source" to fillEntity.source.value,
                ),
            )
        }

        appendStatusEvent(
            orderRequestId = orderRequest.id,
            status = if (newFilledQuantity == orderRequest.quantity) {
                OrderLifecycleStatus.FILLED
            } else {
                OrderLifecycleStatus.PARTIALLY_FILLED
            },
            reason = if (newFilledQuantity == orderRequest.quantity) {
                "order fully filled"
            } else {
                "order partially filled"
            },
            occurredAt = request.filledAt,
            payload = mapOf(
                "filledQuantity" to newFilledQuantity,
                "remainingQuantity" to (orderRequest.quantity - newFilledQuantity),
                "source" to fillEntity.source.value,
            ),
        )

        return toOrderFillResponse(fillEntity)
    }

    fun toOrderRequestResponse(
        orderRequest: StrategyOrderRequestEntity,
        symbol: String = symbolFor(orderRequest),
    ): OrderRequestResponse {
        val filledQuantity = orderFillRepository.findAllByOrderRequestIdOrderByFilledAtAsc(orderRequest.id).sumOf { it.quantity }
        val currentStatus = currentStatus(orderRequest)
        return OrderRequestResponse(
            id = orderRequest.id,
            signalEventId = orderRequest.signalEventId,
            symbol = symbol,
            side = orderRequest.side,
            quantity = orderRequest.quantity,
            price = orderRequest.price.toDouble(),
            mode = orderRequest.mode,
            status = orderRequest.status,
            currentStatus = currentStatus,
            filledQuantity = filledQuantity,
            remainingQuantity = (orderRequest.quantity - filledQuantity).coerceAtLeast(0),
            precheckPassed = orderRequest.precheckPassed,
            failureReason = orderRequest.failureReason,
            requestedAt = orderRequest.requestedAt,
        )
    }

    fun appendRequested(orderRequest: StrategyOrderRequestEntity) {
        appendStatusEvent(
            orderRequestId = orderRequest.id,
            status = OrderLifecycleStatus.REQUESTED,
            reason = null,
            occurredAt = orderRequest.requestedAt,
            payload = mapOf(
                "mode" to orderRequest.mode.value,
                "side" to orderRequest.side.value,
                "quantity" to orderRequest.quantity,
                "price" to orderRequest.price.toDouble(),
            ),
        )
    }

    fun appendRejectedPrecheck(orderRequest: StrategyOrderRequestEntity) {
        appendStatusEvent(
            orderRequestId = orderRequest.id,
            status = OrderLifecycleStatus.REJECTED,
            reason = orderRequest.failureReason,
            occurredAt = orderRequest.requestedAt,
            payload = mapOf(
                "mode" to orderRequest.mode.value,
                "side" to orderRequest.side.value,
                "reason" to orderRequest.failureReason,
            ),
        )
    }

    private fun getStrategy(strategyId: UUID) = strategyRepository.findByIdAndIsArchivedFalse(strategyId)
        ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Strategy not found: $strategyId")

    private fun getOrderRequest(strategyId: UUID, orderRequestId: UUID): StrategyOrderRequestEntity =
        orderRequestRepository.findByIdAndStrategyId(orderRequestId, strategyId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Order request not found: $orderRequestId")

    private fun appendStatusEvent(
        orderRequestId: UUID,
        status: OrderLifecycleStatus,
        reason: String?,
        occurredAt: OffsetDateTime,
        payload: Map<String, Any?>,
    ) {
        orderStatusEventRepository.save(
            StrategyOrderStatusEventEntity(
                orderRequestId = orderRequestId,
                status = status,
                reason = reason,
                payload = payload,
                occurredAt = occurredAt,
            ),
        )
    }

    private fun currentStatus(orderRequest: StrategyOrderRequestEntity): OrderLifecycleStatus =
        orderStatusEventRepository.findTopByOrderRequestIdOrderByOccurredAtDesc(orderRequest.id)?.status
            ?: when (orderRequest.status) {
                OrderRequestStatus.REQUESTED,
                OrderRequestStatus.PENDING,
                -> OrderLifecycleStatus.REQUESTED

                OrderRequestStatus.REJECTED_DUPLICATE,
                OrderRequestStatus.REJECTED_PRECHECK,
                -> OrderLifecycleStatus.REJECTED
            }

    private fun projectPositions(strategyId: UUID): List<StrategyPositionResponse> = projectPositionState(strategyId)
        .values
        .filter { it.netQuantity > 0L }
        .sortedBy { it.symbol }
        .map {
            StrategyPositionResponse(
                symbol = it.symbol,
                netQuantity = it.netQuantity,
                avgEntryPrice = it.avgEntryPrice.toDouble(),
                lastFillAt = it.lastFillAt,
            )
        }

    private fun projectPositionState(strategyId: UUID): Map<String, PositionState> {
        val states = linkedMapOf<String, PositionState>()
        orderFillRepository.findAllByStrategyIdOrderByFilledAtAsc(strategyId).forEach { fill ->
            val current = states.getOrPut(fill.symbol) { PositionState(symbol = fill.symbol) }
            when (fill.side) {
                OrderSide.BUY -> {
                    val nextQuantity = current.netQuantity + fill.quantity
                    val totalCost = current.avgEntryPrice * BigDecimal.valueOf(current.netQuantity) +
                        fill.price * BigDecimal.valueOf(fill.quantity)
                    current.netQuantity = nextQuantity
                    current.avgEntryPrice = if (nextQuantity == 0L) {
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
        return states
    }

    private fun toOrderStatusEventResponse(entity: StrategyOrderStatusEventEntity): OrderStatusEventResponse = OrderStatusEventResponse(
        id = entity.id,
        orderRequestId = entity.orderRequestId,
        status = entity.status,
        reason = entity.reason,
        occurredAt = entity.occurredAt,
        payload = entity.payload,
    )

    private fun toOrderFillResponse(entity: StrategyOrderFillEntity): OrderFillResponse = OrderFillResponse(
        id = entity.id,
        orderRequestId = entity.orderRequestId,
        symbol = entity.symbol,
        side = entity.side,
        quantity = entity.quantity,
        price = entity.price.toDouble(),
        filledAt = entity.filledAt,
        source = entity.source,
    )

    private fun BigDecimal.scaled(): BigDecimal = setScale(6, RoundingMode.HALF_UP)

    private fun symbolFor(orderRequest: StrategyOrderRequestEntity): String = signalEventRepository.findById(orderRequest.signalEventId)
        .orElseThrow {
            ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Signal event not found for order request: ${orderRequest.signalEventId}",
            )
        }
        .symbol

    private fun normalizeLimit(value: Int, defaultValue: Int): Int = value.coerceIn(1, 100).takeIf { it > 0 } ?: defaultValue

    private data class PositionState(
        val symbol: String,
        var netQuantity: Long = 0,
        var avgEntryPrice: BigDecimal = BigDecimal.ZERO.setScale(6, RoundingMode.HALF_UP),
        var lastFillAt: OffsetDateTime? = null,
    )
}
