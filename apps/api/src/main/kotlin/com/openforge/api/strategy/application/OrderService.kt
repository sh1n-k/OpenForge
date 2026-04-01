package com.openforge.api.strategy.application

import com.openforge.api.strategy.domain.OrderMode
import com.openforge.api.strategy.domain.OrderRequestStatus
import com.openforge.api.strategy.domain.OrderSide
import com.openforge.api.strategy.domain.OrderType
import com.openforge.api.strategy.domain.StrategyEntity
import com.openforge.api.strategy.domain.StrategyExecutionRunRepository
import com.openforge.api.strategy.domain.StrategyOrderRequestEntity
import com.openforge.api.strategy.domain.StrategyOrderRequestRepository
import com.openforge.api.strategy.domain.StrategyRepository
import com.openforge.api.strategy.domain.StrategySignalEventEntity
import com.openforge.api.strategy.domain.StrategySignalEventRepository
import com.openforge.api.strategy.domain.StrategySignalType
import com.openforge.api.strategy.domain.StrategyStatus
import com.openforge.api.strategy.web.CreateOrderRequest
import com.openforge.api.strategy.web.OrderCandidateResponse
import com.openforge.api.strategy.web.OrderPrecheckResponse
import com.openforge.api.strategy.web.OrderRequestResponse
import jakarta.transaction.Transactional
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.data.domain.PageRequest
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.DayOfWeek
import java.time.LocalTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.UUID

@Service
@Transactional
class OrderService(
    private val strategyRepository: StrategyRepository,
    private val signalEventRepository: StrategySignalEventRepository,
    private val executionRunRepository: StrategyExecutionRunRepository,
    private val orderRequestRepository: StrategyOrderRequestRepository,
    private val orderPrecheckService: OrderPrecheckService,
    private val paperOrderService: PaperOrderService,
    private val marketTimeProvider: MarketTimeProvider,
) {

    fun listOrderCandidates(strategyId: UUID, limit: Int): List<OrderCandidateResponse> {
        val strategy = getActiveStrategy(strategyId)
        val signals = signalEventRepository.findAllByStrategyIdOrderByCreatedAtDesc(
            strategy.id,
            PageRequest.of(0, normalizeLimit(limit, 50)),
        )
        if (signals.isEmpty()) {
            return emptyList()
        }

        val existingRequests = orderRequestRepository.findAllByStrategyIdAndSignalEventIdIn(
            strategy.id,
            signals.map { it.id },
        )
        val existingKeys = existingRequests.associateBy { candidateKey(it.signalEventId, it.side, it.mode) }
        val referenceTime = marketTimeProvider.now()

        return signals.map { signal ->
            val side = sideFor(signal.signalType)
            val mode = OrderMode.PAPER
            val quantity = DEFAULT_QUANTITY
            val price = priceFor(signal)
            val alreadyRequested = existingKeys.containsKey(candidateKey(signal.id, side, mode))
            val precheck = orderPrecheckService.precheck(
                strategy = strategy,
                mode = mode,
                quantity = quantity,
                price = price,
                referenceTime = referenceTime,
                alreadyRequested = alreadyRequested,
            )

            OrderCandidateResponse(
                signalEventId = signal.id,
                executionRunId = signal.runId,
                strategyVersionId = signal.strategyVersionId,
                symbol = signal.symbol,
                side = side,
                quantity = quantity,
                price = price?.toDouble() ?: 0.0,
                tradingDate = signal.tradingDate,
                mode = mode,
                alreadyRequested = alreadyRequested,
                precheck = precheck,
            )
        }
    }

    fun listOrderRequests(strategyId: UUID, limit: Int): List<OrderRequestResponse> {
        getActiveStrategy(strategyId)
        return orderRequestRepository.findAllByStrategyIdOrderByRequestedAtDesc(
            strategyId,
            PageRequest.of(0, normalizeLimit(limit, 20)),
        ).map(::toOrderRequestResponse)
    }

    fun createOrderRequest(strategyId: UUID, request: CreateOrderRequest): OrderRequestResponse {
        val strategy = getActiveStrategy(strategyId)
        val signal = signalEventRepository.findById(request.signalEventId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "Signal event not found: ${request.signalEventId}")
        }
        if (signal.strategyId != strategy.id) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Signal event does not belong to the requested strategy")
        }
        if (request.mode == OrderMode.LIVE) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Live order mode is not implemented yet")
        }

        val side = sideFor(signal.signalType)
        if (orderRequestRepository.existsByStrategyIdAndSignalEventIdAndSideAndMode(
                strategy.id,
                signal.id,
                side,
                request.mode,
            )
        ) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Duplicate order request already exists for this signal")
        }

        executionRunRepository.findById(signal.runId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "Execution run not found: ${signal.runId}")
        }

        val quantity = DEFAULT_QUANTITY
        val price = priceFor(signal)
        val requestedAt = marketTimeProvider.now()
        val precheck = orderPrecheckService.precheck(
            strategy = strategy,
            mode = request.mode,
            quantity = quantity,
            price = price,
            referenceTime = requestedAt,
            alreadyRequested = false,
        )

        return try {
            if (!precheck.passed) {
                paperOrderService.saveRejectedPrecheck(
                    strategy = strategy,
                    signal = signal,
                    side = side,
                    mode = request.mode,
                    quantity = quantity,
                    price = price ?: BigDecimal.ZERO,
                    precheck = precheck,
                    requestedAt = requestedAt.toOffsetDateTime(),
                )
            } else {
                paperOrderService.savePending(
                    strategy = strategy,
                    signal = signal,
                    side = side,
                    mode = request.mode,
                    quantity = quantity,
                    price = price!!,
                    precheck = precheck,
                    requestedAt = requestedAt.toOffsetDateTime(),
                )
            }.let(::toOrderRequestResponse)
        } catch (_: DataIntegrityViolationException) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Duplicate order request already exists for this signal")
        }
    }

    private fun getActiveStrategy(strategyId: UUID): StrategyEntity = strategyRepository.findByIdAndIsArchivedFalse(strategyId)
        ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Strategy not found: $strategyId")

    private fun sideFor(signalType: StrategySignalType): OrderSide = when (signalType) {
        StrategySignalType.ENTRY -> OrderSide.BUY
        StrategySignalType.EXIT -> OrderSide.SELL
    }

    private fun priceFor(signal: StrategySignalEventEntity): BigDecimal? {
        val raw = signal.payload["close"] ?: return null
        return when (raw) {
            is Number -> BigDecimal.valueOf(raw.toDouble()).setScale(6, RoundingMode.HALF_UP)
            is String -> raw.toBigDecimalOrNull()?.setScale(6, RoundingMode.HALF_UP)
            else -> null
        }
    }

    private fun toOrderRequestResponse(entity: StrategyOrderRequestEntity): OrderRequestResponse = OrderRequestResponse(
        id = entity.id,
        signalEventId = entity.signalEventId,
        symbol = signalEventRepository.findById(entity.signalEventId).orElseThrow().symbol,
        side = entity.side,
        quantity = entity.quantity,
        price = entity.price.toDouble(),
        mode = entity.mode,
        status = entity.status,
        precheckPassed = entity.precheckPassed,
        failureReason = entity.failureReason,
        requestedAt = entity.requestedAt,
    )

    private fun candidateKey(signalEventId: UUID, side: OrderSide, mode: OrderMode): String =
        "$signalEventId:${side.value}:${mode.value}"

    private fun normalizeLimit(value: Int, defaultValue: Int): Int = value.coerceIn(1, 100).takeIf { it > 0 } ?: defaultValue

    companion object {
        private const val DEFAULT_QUANTITY = 1L
        private val DEFAULT_ZONE_ID: ZoneId = ZoneId.of("Asia/Seoul")
    }
}

@Service
class OrderPrecheckService(
) {
    fun precheck(
        strategy: StrategyEntity,
        mode: OrderMode,
        quantity: Long,
        price: BigDecimal?,
        referenceTime: ZonedDateTime,
        alreadyRequested: Boolean,
    ): OrderPrecheckResponse {
        val marketHours = isMarketHours(referenceTime)
        val strategyStatus = strategy.status == StrategyStatus.RUNNING
        val duplicateOrder = alreadyRequested
        val quantityValid = quantity > 0
        val priceValid = price != null && price > BigDecimal.ZERO

        val reasonCodes = buildList {
            if (!marketHours) add("market_hours")
            if (!strategyStatus) add("strategy_status")
            if (duplicateOrder) add("duplicate_order")
            if (!quantityValid) add("quantity_invalid")
            if (!priceValid) add("price_invalid")
            if (mode == OrderMode.LIVE) add("mode_not_implemented")
        }

        return OrderPrecheckResponse(
            passed = reasonCodes.isEmpty(),
            marketHours = marketHours,
            strategyStatus = strategyStatus,
            duplicateOrder = duplicateOrder,
            quantityValid = quantityValid,
            priceValid = priceValid,
            reasonCodes = reasonCodes,
        )
    }

    private fun isMarketHours(referenceTime: ZonedDateTime): Boolean {
        val dayOfWeek = referenceTime.dayOfWeek
        if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
            return false
        }
        val time = referenceTime.toLocalTime()
        return !time.isBefore(MARKET_OPEN) && !time.isAfter(MARKET_CLOSE)
    }

    companion object {
        private val MARKET_OPEN: LocalTime = LocalTime.of(9, 0)
        private val MARKET_CLOSE: LocalTime = LocalTime.of(15, 30)
    }
}

@Service
class MarketTimeProvider {
    @Volatile
    private var fixedNow: ZonedDateTime? = null

    fun now(): ZonedDateTime = fixedNow?.withZoneSameInstant(DEFAULT_ZONE_ID) ?: ZonedDateTime.now(DEFAULT_ZONE_ID)

    fun setFixedNowForTesting(value: ZonedDateTime?) {
        fixedNow = value
    }

    companion object {
        private val DEFAULT_ZONE_ID: ZoneId = ZoneId.of("Asia/Seoul")
    }
}

@Service
class PaperOrderService(
    private val orderRequestRepository: StrategyOrderRequestRepository,
) {
    fun savePending(
        strategy: StrategyEntity,
        signal: StrategySignalEventEntity,
        side: OrderSide,
        mode: OrderMode,
        quantity: Long,
        price: BigDecimal,
        precheck: OrderPrecheckResponse,
        requestedAt: OffsetDateTime,
    ): StrategyOrderRequestEntity = orderRequestRepository.save(
        StrategyOrderRequestEntity(
            strategyId = strategy.id,
            strategyVersionId = signal.strategyVersionId,
            signalEventId = signal.id,
            executionRunId = signal.runId,
            mode = mode,
            side = side,
            orderType = OrderType.LIMIT,
            quantity = quantity,
            price = price,
            status = OrderRequestStatus.PENDING,
            precheckPassed = true,
            precheckSummary = precheck.toSummaryMap(),
            failureReason = null,
            requestedAt = requestedAt,
        ),
    )

    fun saveRejectedPrecheck(
        strategy: StrategyEntity,
        signal: StrategySignalEventEntity,
        side: OrderSide,
        mode: OrderMode,
        quantity: Long,
        price: BigDecimal,
        precheck: OrderPrecheckResponse,
        requestedAt: OffsetDateTime,
    ): StrategyOrderRequestEntity = orderRequestRepository.save(
        StrategyOrderRequestEntity(
            strategyId = strategy.id,
            strategyVersionId = signal.strategyVersionId,
            signalEventId = signal.id,
            executionRunId = signal.runId,
            mode = mode,
            side = side,
            orderType = OrderType.LIMIT,
            quantity = quantity,
            price = price,
            status = OrderRequestStatus.REJECTED_PRECHECK,
            precheckPassed = false,
            precheckSummary = precheck.toSummaryMap(),
            failureReason = precheck.reasonCodes.joinToString(","),
            requestedAt = requestedAt,
        ),
    )

    private fun OrderPrecheckResponse.toSummaryMap(): Map<String, Any?> = linkedMapOf(
        "passed" to passed,
        "marketHours" to marketHours,
        "strategyStatus" to strategyStatus,
        "duplicateOrder" to duplicateOrder,
        "quantityValid" to quantityValid,
        "priceValid" to priceValid,
        "reasonCodes" to reasonCodes,
    )
}
