package com.openforge.api.strategy.application

import com.openforge.api.strategy.domain.OrderMode
import com.openforge.api.strategy.domain.OrderSide
import com.openforge.api.strategy.domain.RiskEventScope
import com.openforge.api.strategy.domain.StrategyEntity
import com.openforge.api.strategy.domain.StrategyRepository
import com.openforge.api.strategy.domain.StrategyRiskConfigEntity
import com.openforge.api.strategy.domain.StrategyRiskConfigRepository
import com.openforge.api.strategy.domain.StrategyRiskEventEntity
import com.openforge.api.strategy.domain.StrategyRiskEventRepository
import com.openforge.api.strategy.domain.StrategyRiskEventType
import com.openforge.api.strategy.web.OrderRiskCheckResponse
import com.openforge.api.strategy.web.StrategyRiskEventResponse
import com.openforge.api.strategy.web.StrategyRiskResponse
import com.openforge.api.strategy.web.UpdateStrategyRiskRequest
import com.openforge.api.system.risk.SystemRiskService
import jakarta.transaction.Transactional
import org.springframework.data.domain.PageRequest
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.OffsetDateTime
import java.time.ZonedDateTime
import java.util.UUID

@Service
@Transactional
class RiskControlService(
    private val strategyRepository: StrategyRepository,
    private val strategyRiskConfigRepository: StrategyRiskConfigRepository,
    private val strategyRiskEventRepository: StrategyRiskEventRepository,
    private val orderTrackingService: OrderTrackingService,
    private val systemRiskService: SystemRiskService,
) {
    fun getRisk(strategyId: UUID): StrategyRiskResponse {
        getActiveStrategy(strategyId)
        return toRiskResponse(configFor(strategyId))
    }

    fun updateRisk(
        strategyId: UUID,
        request: UpdateStrategyRiskRequest,
    ): StrategyRiskResponse {
        getActiveStrategy(strategyId)
        val config = configFor(strategyId)
        val previousKillSwitch = config.strategyKillSwitchEnabled
        config.perSymbolMaxNotional = request.perSymbolMaxNotional?.positiveDecimal("perSymbolMaxNotional")
        config.strategyMaxExposure = request.strategyMaxExposure?.positiveDecimal("strategyMaxExposure")
        config.maxOpenPositions = request.maxOpenPositions
        config.dailyLossLimit = request.dailyLossLimit?.positiveDecimal("dailyLossLimit")
        config.strategyKillSwitchEnabled = request.strategyKillSwitchEnabled
        config.liveTradingEnabled = request.liveTradingEnabled ?: config.liveTradingEnabled
        config.accountMaxOrderNotional = request.accountMaxOrderNotional?.positiveDecimal("accountMaxOrderNotional")
        config.accountDailyMaxOrderNotional = request.accountDailyMaxOrderNotional?.positiveDecimal("accountDailyMaxOrderNotional")
        config.symbolMaxOrderNotional = request.symbolMaxOrderNotional?.positiveDecimal("symbolMaxOrderNotional")
        config.minOrderNotional = request.minOrderNotional?.positiveDecimal("minOrderNotional") ?: config.minOrderNotional
        config.feeRate = request.feeRate?.nonNegativeRate("feeRate") ?: config.feeRate
        config.taxRate = request.taxRate?.nonNegativeRate("taxRate") ?: config.taxRate
        config.closeUnfilledPolicy = request.closeUnfilledPolicy?.let(::normalizeClosePolicy) ?: config.closeUnfilledPolicy
        config.mode = OrderMode.PAPER
        strategyRiskConfigRepository.save(config)

        if (previousKillSwitch != request.strategyKillSwitchEnabled) {
            strategyRiskEventRepository.save(
                StrategyRiskEventEntity(
                    strategyId = strategyId,
                    scope = RiskEventScope.STRATEGY,
                    eventType = StrategyRiskEventType.STRATEGY_KILL_SWITCH_CHANGED,
                    reasonCode = if (request.strategyKillSwitchEnabled) "strategy_kill_switch_enabled" else "strategy_kill_switch_disabled",
                    message =
                        if (request.strategyKillSwitchEnabled) {
                            "전략 킬 스위치가 활성화되었습니다."
                        } else {
                            "전략 킬 스위치가 비활성화되었습니다."
                        },
                    payload = mapOf("enabled" to request.strategyKillSwitchEnabled),
                    occurredAt = OffsetDateTime.now(),
                ),
            )
        }

        return toRiskResponse(config)
    }

    fun listRiskEvents(
        strategyId: UUID,
        limit: Int,
    ): List<StrategyRiskEventResponse> {
        getActiveStrategy(strategyId)
        return strategyRiskEventRepository
            .findAllByStrategyIdOrderByOccurredAtDesc(
                strategyId,
                PageRequest.of(0, normalizeLimit(limit, 50)),
            ).map(::toRiskEventResponse)
    }

    fun evaluateOrder(
        strategy: StrategyEntity,
        symbol: String,
        side: OrderSide,
        quantity: Long,
        price: BigDecimal,
        mode: OrderMode,
        referenceTime: ZonedDateTime,
    ): RiskEvaluationResult {
        val context = evaluationContext(strategy.id, referenceTime)
        return evaluateOrder(strategy, symbol, side, quantity, price, mode, context)
    }

    fun evaluationContext(
        strategyId: UUID,
        referenceTime: ZonedDateTime,
    ): RiskEvaluationContext =
        RiskEvaluationContext(
            config = configFor(strategyId),
            globalKillSwitchEnabled = systemRiskService.isGlobalKillSwitchEnabled(),
            positions = orderTrackingService.currentPositionProjections(strategyId),
            openOrders = orderTrackingService.openBuyOrderProjections(strategyId),
            currentDailyRealizedLoss = orderTrackingService.currentDailyRealizedLoss(strategyId, referenceTime.toLocalDate()),
        )

    fun evaluateOrder(
        strategy: StrategyEntity,
        symbol: String,
        side: OrderSide,
        quantity: Long,
        price: BigDecimal,
        mode: OrderMode,
        context: RiskEvaluationContext,
    ): RiskEvaluationResult {
        val candidateNotional = price.multiply(BigDecimal.valueOf(quantity)).scaled()
        val currentSymbolExposure =
            context.positions.firstOrNull { it.symbol == symbol }?.let {
                it.avgEntryPrice.multiply(BigDecimal.valueOf(it.netQuantity)).scaled()
            } ?: BigDecimal.ZERO.scaled()
        val pendingSymbolExposure =
            context.openOrders
                .filter { it.symbol == symbol }
                .sumOf { it.price.multiply(BigDecimal.valueOf(it.remainingQuantity)).scaled() }
        val currentStrategyExposure =
            context.positions.sumOf {
                it.avgEntryPrice.multiply(BigDecimal.valueOf(it.netQuantity)).scaled()
            }
        val pendingStrategyExposure =
            context.openOrders.sumOf {
                it.price.multiply(BigDecimal.valueOf(it.remainingQuantity)).scaled()
            }

        val currentOpenSymbols = context.positions.map { it.symbol }.toSet()
        val pendingOpenSymbols =
            context.openOrders
                .filter { it.symbol !in currentOpenSymbols }
                .map { it.symbol }
                .toSet()
        val currentOpenPositionCount = currentOpenSymbols.size + pendingOpenSymbols.size

        val projectedSymbolExposure =
            if (side == OrderSide.BUY) {
                currentSymbolExposure + pendingSymbolExposure + candidateNotional
            } else {
                currentSymbolExposure + pendingSymbolExposure
            }
        val projectedStrategyExposure =
            if (side == OrderSide.BUY) {
                currentStrategyExposure + pendingStrategyExposure + candidateNotional
            } else {
                currentStrategyExposure + pendingStrategyExposure
            }
        val projectedOpenPositions =
            if (
                side == OrderSide.BUY &&
                symbol !in currentOpenSymbols &&
                symbol !in pendingOpenSymbols
            ) {
                currentOpenPositionCount + 1
            } else {
                currentOpenPositionCount
            }

        val reasonCodes =
            buildList {
                if (mode == OrderMode.LIVE) add("mode_not_implemented")
                if (context.globalKillSwitchEnabled) add("global_kill_switch")
                if (context.config.strategyKillSwitchEnabled) add("strategy_kill_switch")
                if (side == OrderSide.BUY) {
                    if (context.config.perSymbolMaxNotional != null && projectedSymbolExposure > context.config.perSymbolMaxNotional) {
                        add("per_symbol_max_notional")
                    }
                    if (context.config.strategyMaxExposure != null && projectedStrategyExposure > context.config.strategyMaxExposure) {
                        add("strategy_max_exposure")
                    }
                    if (context.config.maxOpenPositions != null && projectedOpenPositions > context.config.maxOpenPositions!!) {
                        add("max_open_positions")
                    }
                    if (context.config.dailyLossLimit != null && context.currentDailyRealizedLoss >= context.config.dailyLossLimit) {
                        add("daily_loss_limit")
                    }
                }
            }

        return RiskEvaluationResult(
            response =
                OrderRiskCheckResponse(
                    passed = reasonCodes.isEmpty(),
                    reasonCodes = reasonCodes,
                    projectedSymbolExposure = projectedSymbolExposure.toDouble(),
                    projectedStrategyExposure = projectedStrategyExposure.toDouble(),
                    projectedOpenPositions = projectedOpenPositions,
                    currentDailyRealizedLoss = context.currentDailyRealizedLoss.toDouble(),
                ),
            strategyKillSwitchEnabled = context.config.strategyKillSwitchEnabled,
            globalKillSwitchEnabled = context.globalKillSwitchEnabled,
        )
    }

    fun recordBlockedOrder(
        strategyId: UUID,
        orderRequestId: UUID,
        evaluation: RiskEvaluationResult,
        occurredAt: OffsetDateTime,
    ) {
        evaluation.response.reasonCodes.forEach { reasonCode ->
            strategyRiskEventRepository.save(
                StrategyRiskEventEntity(
                    strategyId = strategyId,
                    orderRequestId = orderRequestId,
                    scope = if (reasonCode == "global_kill_switch") RiskEventScope.GLOBAL else RiskEventScope.STRATEGY,
                    eventType = StrategyRiskEventType.ORDER_BLOCKED,
                    reasonCode = reasonCode,
                    message = riskMessage(reasonCode),
                    payload =
                        mapOf(
                            "reasonCodes" to evaluation.response.reasonCodes,
                            "projectedSymbolExposure" to evaluation.response.projectedSymbolExposure,
                            "projectedStrategyExposure" to evaluation.response.projectedStrategyExposure,
                            "projectedOpenPositions" to evaluation.response.projectedOpenPositions,
                            "currentDailyRealizedLoss" to evaluation.response.currentDailyRealizedLoss,
                        ),
                    occurredAt = occurredAt,
                ),
            )
        }

        if ("daily_loss_limit" in evaluation.response.reasonCodes) {
            strategyRiskEventRepository.save(
                StrategyRiskEventEntity(
                    strategyId = strategyId,
                    orderRequestId = orderRequestId,
                    scope = RiskEventScope.STRATEGY,
                    eventType = StrategyRiskEventType.DAILY_LOSS_LIMIT_TRIPPED,
                    reasonCode = "daily_loss_limit",
                    message = "일일 손실 한도를 초과해 주문이 차단되었습니다.",
                    payload =
                        mapOf(
                            "currentDailyRealizedLoss" to evaluation.response.currentDailyRealizedLoss,
                        ),
                    occurredAt = occurredAt,
                ),
            )
        }
    }

    private fun getActiveStrategy(strategyId: UUID): StrategyEntity =
        strategyRepository.findByIdAndIsArchivedFalse(strategyId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Strategy not found: $strategyId")

    private fun configFor(strategyId: UUID): StrategyRiskConfigEntity =
        strategyRiskConfigRepository
            .findById(strategyId)
            .orElse(
                StrategyRiskConfigEntity(
                    strategyId = strategyId,
                    mode = OrderMode.PAPER,
                ),
            )

    private fun toRiskResponse(config: StrategyRiskConfigEntity): StrategyRiskResponse =
        StrategyRiskResponse(
            mode = config.mode,
            perSymbolMaxNotional = config.perSymbolMaxNotional?.toDouble(),
            strategyMaxExposure = config.strategyMaxExposure?.toDouble(),
            maxOpenPositions = config.maxOpenPositions,
            dailyLossLimit = config.dailyLossLimit?.toDouble(),
            strategyKillSwitchEnabled = config.strategyKillSwitchEnabled,
            liveTradingEnabled = config.liveTradingEnabled,
            accountMaxOrderNotional = config.accountMaxOrderNotional?.toDouble(),
            accountDailyMaxOrderNotional = config.accountDailyMaxOrderNotional?.toDouble(),
            symbolMaxOrderNotional = config.symbolMaxOrderNotional?.toDouble(),
            minOrderNotional = config.minOrderNotional.toDouble(),
            feeRate = config.feeRate.toDouble(),
            taxRate = config.taxRate.toDouble(),
            closeUnfilledPolicy = config.closeUnfilledPolicy,
            updatedAt = config.updatedAt,
        )

    private fun toRiskEventResponse(entity: StrategyRiskEventEntity): StrategyRiskEventResponse =
        StrategyRiskEventResponse(
            id = entity.id,
            strategyId = entity.strategyId,
            orderRequestId = entity.orderRequestId,
            scope = entity.scope,
            eventType = entity.eventType,
            reasonCode = entity.reasonCode,
            message = entity.message,
            payload = entity.payload,
            occurredAt = entity.occurredAt,
        )

    private fun riskMessage(reasonCode: String): String =
        when (reasonCode) {
            "global_kill_switch" -> "전역 킬 스위치로 주문이 차단되었습니다."
            "strategy_kill_switch" -> "전략 킬 스위치로 주문이 차단되었습니다."
            "per_symbol_max_notional" -> "종목당 투자 한도를 초과해 주문이 차단되었습니다."
            "strategy_max_exposure" -> "전략 최대 노출 한도를 초과해 주문이 차단되었습니다."
            "max_open_positions" -> "동시 보유 수 제한을 초과해 주문이 차단되었습니다."
            "daily_loss_limit" -> "일일 손실 한도를 초과해 주문이 차단되었습니다."
            else -> "리스크 규칙 위반으로 주문이 차단되었습니다."
        }

    private fun BigDecimal.scaled(): BigDecimal = setScale(6, RoundingMode.HALF_UP)

    private fun Double.positiveDecimal(field: String): BigDecimal {
        val decimal = toBigDecimal().scaled()
        if (decimal <= BigDecimal.ZERO) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "$field must be greater than 0")
        }
        return decimal
    }

    private fun Double.nonNegativeRate(field: String): BigDecimal {
        val decimal = toBigDecimal().setScale(8, RoundingMode.HALF_UP)
        if (decimal < BigDecimal.ZERO) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "$field must be greater than or equal to 0")
        }
        return decimal
    }

    private fun normalizeClosePolicy(value: String): String =
        value.lowercase().takeIf { it in setOf("cancel", "keep", "replan_next_day") }
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported closeUnfilledPolicy: $value")

    private fun normalizeLimit(
        value: Int,
        defaultValue: Int,
    ): Int = value.coerceIn(1, 100).takeIf { it > 0 } ?: defaultValue
}

data class RiskEvaluationResult(
    val response: OrderRiskCheckResponse,
    val strategyKillSwitchEnabled: Boolean,
    val globalKillSwitchEnabled: Boolean,
)

data class RiskEvaluationContext(
    val config: StrategyRiskConfigEntity,
    val globalKillSwitchEnabled: Boolean,
    val positions: List<OrderTrackingService.PositionProjection>,
    val openOrders: List<OrderTrackingService.OpenOrderProjection>,
    val currentDailyRealizedLoss: BigDecimal,
)
