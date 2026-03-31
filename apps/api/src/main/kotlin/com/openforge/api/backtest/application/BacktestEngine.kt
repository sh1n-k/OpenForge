package com.openforge.api.backtest.application

import com.openforge.api.backtest.domain.BacktestExitReason
import java.time.LocalDate
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

class BacktestEngine {

    fun run(
        spec: StrategySpec,
        symbols: List<String>,
        barsBySymbol: Map<String, List<Bar>>,
        config: RunConfig,
    ): EngineResult {
        if (symbols.isEmpty()) {
            throw IllegalArgumentException("At least one symbol is required for backtest")
        }

        val bucketCapital = config.initialCapital / symbols.size.toDouble()
        val symbolResults = symbols.associateWith { symbol ->
            simulateSymbol(
                symbol = symbol,
                spec = spec,
                bars = barsBySymbol[symbol].orEmpty(),
                bucketCapital = bucketCapital,
                config = config,
            )
        }

        val allDates = symbolResults.values
            .flatMap { it.equitySnapshots.map(EquitySnapshot::tradingDate) }
            .distinct()
            .sorted()

        val combinedPoints = mutableListOf<EquityPoint>()
        var peak = 0.0
        for (date in allDates) {
            var equity = 0.0
            var cash = 0.0
            for (result in symbolResults.values) {
                val snapshot = result.equitySnapshots.lastOrNull { !it.tradingDate.isAfter(date) }
                if (snapshot != null) {
                    equity += snapshot.equity
                    cash += snapshot.cash
                }
            }
            peak = max(peak, equity)
            val drawdown = if (peak <= 0.0) 0.0 else max(0.0, (peak - equity) / peak)
            combinedPoints += EquityPoint(date, equity, cash, drawdown)
        }

        val trades = symbolResults.values.flatMap { it.trades }.sortedWith(
            compareBy<TradeRecord> { it.entryDate }.thenBy { it.symbol },
        )
        val finalCapital = combinedPoints.lastOrNull()?.equity ?: config.initialCapital
        val totalReturnRate = if (config.initialCapital == 0.0) 0.0 else (finalCapital - config.initialCapital) / config.initialCapital
        val maxDrawdownRate = combinedPoints.maxOfOrNull { it.drawdown } ?: 0.0
        val winCount = trades.count { it.netPnl > 0.0 }
        val grossProfit = trades.filter { it.netPnl > 0.0 }.sumOf { it.netPnl }
        val grossLoss = trades.filter { it.netPnl < 0.0 }.sumOf { -it.netPnl }
        val averagePnl = if (trades.isEmpty()) 0.0 else trades.sumOf { it.netPnl } / trades.size
        val profitFactor = if (grossLoss == 0.0) {
            if (grossProfit == 0.0) 0.0 else grossProfit
        } else {
            grossProfit / grossLoss
        }

        val summary = linkedMapOf<String, Any?>(
            "totalReturnRate" to totalReturnRate,
            "maxDrawdownRate" to maxDrawdownRate,
            "winRate" to if (trades.isEmpty()) 0.0 else winCount.toDouble() / trades.size.toDouble(),
            "tradeCount" to trades.size,
            "averagePnl" to averagePnl,
            "profitFactor" to profitFactor,
            "initialCapital" to config.initialCapital,
            "finalCapital" to finalCapital,
        )

        return EngineResult(
            summary = summary,
            trades = trades,
            equityPoints = combinedPoints,
        )
    }

    private fun simulateSymbol(
        symbol: String,
        spec: StrategySpec,
        bars: List<Bar>,
        bucketCapital: Double,
        config: RunConfig,
    ): SymbolSimulationResult {
        if (bars.isEmpty()) {
            throw IllegalArgumentException("No market data found for $symbol")
        }

        val indicatorSeries = IndicatorCalculator.calculate(spec.indicators, bars)
        var cash = bucketCapital
        var position: Position? = null
        var pendingAction: PendingAction? = null
        val trades = mutableListOf<TradeRecord>()
        val equitySnapshots = mutableListOf<EquitySnapshot>()

        for (index in bars.indices) {
            val bar = bars[index]

            pendingAction?.let { pending ->
                when (pending.type) {
                    ActionType.EXIT -> {
                        if (position != null) {
                            val price = sellPrice(bar.open, config.slippageRate)
                            val trade = closePosition(
                                symbol = symbol,
                                position = position!!,
                                exitDate = bar.tradingDate,
                                exitPrice = price,
                                reason = pending.reason ?: BacktestExitReason.SIGNAL,
                                commissionRate = config.commissionRate,
                                taxRate = config.taxRate,
                            )
                            cash += trade.proceeds
                            trades += trade.record
                            position = null
                        }
                    }

                    ActionType.ENTRY -> {
                        if (position == null) {
                            val price = buyPrice(bar.open, config.slippageRate)
                            val quantity = floor(cash / (price * (1.0 + config.commissionRate))).toLong()
                            if (quantity > 0) {
                                val buyCommission = price * quantity * config.commissionRate
                                val totalCost = price * quantity + buyCommission
                                cash -= totalCost
                                position = Position(
                                    entryDate = bar.tradingDate,
                                    entryPrice = price,
                                    quantity = quantity,
                                    highestHigh = bar.high,
                                )
                            }
                        }
                    }
                }
                pendingAction = null
            }

            if (position != null) {
                position = position!!.copy(highestHigh = max(position!!.highestHigh, bar.high))
                val riskExit = resolveRiskExit(bar, position!!, spec.risk, config)
                if (riskExit != null) {
                    val trade = closePosition(
                        symbol = symbol,
                        position = position!!,
                        exitDate = bar.tradingDate,
                        exitPrice = riskExit.price,
                        reason = riskExit.reason,
                        commissionRate = config.commissionRate,
                        taxRate = config.taxRate,
                    )
                    cash += trade.proceeds
                    trades += trade.record
                    position = null
                }
            }

            val warmedUp = IndicatorCalculator.hasRequiredValues(spec, indicatorSeries, index)
            if (warmedUp) {
                if (position == null) {
                    if (evaluateGroup(spec.entry, bars, indicatorSeries, index)) {
                        pendingAction = PendingAction(ActionType.ENTRY, null)
                    }
                } else if (evaluateGroup(spec.exit, bars, indicatorSeries, index)) {
                    pendingAction = PendingAction(ActionType.EXIT, BacktestExitReason.SIGNAL)
                }
            }

            val marketValue = position?.let { it.quantity * bar.close } ?: 0.0
            equitySnapshots += EquitySnapshot(
                tradingDate = bar.tradingDate,
                equity = cash + marketValue,
                cash = cash,
            )
        }

        if (position != null) {
            val lastBar = bars.last()
            val trade = closePosition(
                symbol = symbol,
                position = position!!,
                exitDate = lastBar.tradingDate,
                exitPrice = sellPrice(lastBar.close, config.slippageRate),
                reason = BacktestExitReason.END_OF_PERIOD,
                commissionRate = config.commissionRate,
                taxRate = config.taxRate,
            )
            cash += trade.proceeds
            trades += trade.record
            position = null
            equitySnapshots[equitySnapshots.lastIndex] = EquitySnapshot(
                tradingDate = lastBar.tradingDate,
                equity = cash,
                cash = cash,
            )
        }

        return SymbolSimulationResult(trades, equitySnapshots)
    }

    private fun resolveRiskExit(
        bar: Bar,
        position: Position,
        risk: RiskSpec,
        config: RunConfig,
    ): RiskExit? {
        val stopLossPrice = if (risk.stopLossEnabled) position.entryPrice * (1.0 - risk.stopLossPercent) else null
        val trailingStopPrice = if (risk.trailingStopEnabled) position.highestHigh * (1.0 - risk.trailingStopPercent) else null
        val takeProfitPrice = if (risk.takeProfitEnabled) position.entryPrice * (1.0 + risk.takeProfitPercent) else null

        stopLossPrice?.let { threshold ->
            if (bar.open <= threshold) return RiskExit(BacktestExitReason.STOP_LOSS, sellPrice(bar.open, config.slippageRate))
            if (bar.low <= threshold) return RiskExit(BacktestExitReason.STOP_LOSS, sellPrice(threshold, config.slippageRate))
        }
        trailingStopPrice?.let { threshold ->
            if (bar.open <= threshold) return RiskExit(BacktestExitReason.TRAILING_STOP, sellPrice(bar.open, config.slippageRate))
            if (bar.low <= threshold) return RiskExit(BacktestExitReason.TRAILING_STOP, sellPrice(threshold, config.slippageRate))
        }
        takeProfitPrice?.let { threshold ->
            if (bar.open >= threshold) return RiskExit(BacktestExitReason.TAKE_PROFIT, sellPrice(bar.open, config.slippageRate))
            if (bar.high >= threshold) return RiskExit(BacktestExitReason.TAKE_PROFIT, sellPrice(threshold, config.slippageRate))
        }
        return null
    }

    private fun evaluateGroup(
        group: ConditionGroupSpec,
        bars: List<Bar>,
        indicators: Map<String, Map<String, List<Double?>>>,
        index: Int,
    ): Boolean {
        if (group.conditions.isEmpty()) {
            return false
        }
        val values = group.conditions.map { evaluateCondition(it, bars, indicators, index) }
        return if (group.logic == "AND") values.all { it } else values.any { it }
    }

    private fun evaluateCondition(
        condition: ConditionSpec,
        bars: List<Bar>,
        indicators: Map<String, Map<String, List<Double?>>>,
        index: Int,
    ): Boolean {
        val left = resolveOperand(condition.left, bars, indicators, index) ?: return false
        val right = resolveOperand(condition.right, bars, indicators, index) ?: return false
        return when (condition.operator) {
            "greater_than" -> left > right
            "less_than" -> left < right
            "greater_equal" -> left >= right
            "less_equal" -> left <= right
            "equals" -> abs(left - right) < 1e-9
            "cross_above" -> {
                if (index == 0) return false
                val prevLeft = resolveOperand(condition.left, bars, indicators, index - 1) ?: return false
                val prevRight = resolveOperand(condition.right, bars, indicators, index - 1) ?: return false
                prevLeft <= prevRight && left > right
            }

            "cross_below" -> {
                if (index == 0) return false
                val prevLeft = resolveOperand(condition.left, bars, indicators, index - 1) ?: return false
                val prevRight = resolveOperand(condition.right, bars, indicators, index - 1) ?: return false
                prevLeft >= prevRight && left < right
            }

            else -> false
        }
    }

    private fun resolveOperand(
        operand: OperandSpec,
        bars: List<Bar>,
        indicators: Map<String, Map<String, List<Double?>>>,
        index: Int,
    ): Double? = when (operand.type) {
        "price" -> when (operand.field) {
            "close" -> bars[index].close
            "open" -> bars[index].open
            "high" -> bars[index].high
            "low" -> bars[index].low
            "volume" -> bars[index].volume
            else -> null
        }

        "indicator" -> operand.alias?.let { alias ->
            indicators[alias]?.get(operand.output ?: "value")?.getOrNull(index)
        }

        "value" -> operand.value
        else -> null
    }

    private fun buyPrice(price: Double, slippageRate: Double): Double = price * (1.0 + slippageRate)

    private fun sellPrice(price: Double, slippageRate: Double): Double = price * (1.0 - slippageRate)

    private fun closePosition(
        symbol: String,
        position: Position,
        exitDate: LocalDate,
        exitPrice: Double,
        reason: BacktestExitReason,
        commissionRate: Double,
        taxRate: Double,
    ): ClosedTrade {
        val buyCost = position.entryPrice * position.quantity
        val buyCommission = buyCost * commissionRate
        val sellValue = exitPrice * position.quantity
        val sellCommission = sellValue * commissionRate
        val sellTax = sellValue * taxRate
        val grossPnl = sellValue - buyCost
        val netPnl = sellValue - sellCommission - sellTax - buyCost - buyCommission
        val invested = buyCost + buyCommission
        val pnlPercent = if (invested <= 0.0) 0.0 else netPnl / invested
        return ClosedTrade(
            proceeds = sellValue - sellCommission - sellTax,
            record = TradeRecord(
                symbol = symbol,
                entryDate = position.entryDate,
                exitDate = exitDate,
                entryPrice = position.entryPrice,
                exitPrice = exitPrice,
                quantity = position.quantity,
                grossPnl = grossPnl,
                netPnl = netPnl,
                pnlPercent = pnlPercent,
                exitReason = reason,
            ),
        )
    }
}

private object IndicatorCalculator {

    fun calculate(
        indicators: List<IndicatorSpec>,
        bars: List<Bar>,
    ): Map<String, Map<String, List<Double?>>> = indicators.associate { indicator ->
        indicator.alias to when (indicator.id) {
            "sma" -> mapOf("value" to sma(bars.map { it.close }, indicator.period("period")))
            "ema" -> mapOf("value" to ema(bars.map { it.close }, indicator.period("period")))
            "rsi" -> mapOf("value" to rsi(bars.map { it.close }, indicator.period("period")))
            "volume_sma" -> mapOf("value" to sma(bars.map { it.volume }, indicator.period("period")))
            "rolling_high" -> mapOf("value" to rolling(bars.map { it.high }, indicator.period("period"), true))
            "rolling_low" -> mapOf("value" to rolling(bars.map { it.low }, indicator.period("period"), false))
            "macd" -> {
                val fast = ema(bars.map { it.close }, indicator.period("fastPeriod"))
                val slow = ema(bars.map { it.close }, indicator.period("slowPeriod"))
                val value = fast.indices.map { index ->
                    val fastValue = fast[index]
                    val slowValue = slow[index]
                    if (fastValue == null || slowValue == null) null else fastValue - slowValue
                }
                val signal = emaNullable(value, indicator.period("signalPeriod"))
                mapOf("value" to value, "signal" to signal)
            }

            else -> mapOf("value" to List(bars.size) { null })
        }
    }

    fun hasRequiredValues(
        spec: StrategySpec,
        indicators: Map<String, Map<String, List<Double?>>>,
        index: Int,
    ): Boolean {
        val aliases = spec.indicators.map { it.alias }.toSet()
        return aliases.all { alias -> indicators[alias]?.values?.any { it.getOrNull(index) != null } == true }
    }

    private fun sma(values: List<Double>, period: Int): List<Double?> {
        val result = MutableList<Double?>(values.size) { null }
        var sum = 0.0
        for (index in values.indices) {
            sum += values[index]
            if (index >= period) {
                sum -= values[index - period]
            }
            if (index >= period - 1) {
                result[index] = sum / period
            }
        }
        return result
    }

    private fun ema(values: List<Double>, period: Int): List<Double?> {
        val result = MutableList<Double?>(values.size) { null }
        val seed = sma(values, period)
        var previous: Double? = null
        val multiplier = 2.0 / (period + 1).toDouble()
        for (index in values.indices) {
            if (index == period - 1) {
                previous = seed[index]
                result[index] = previous
            } else if (index >= period && previous != null) {
                previous = (values[index] - previous!!) * multiplier + previous!!
                result[index] = previous
            }
        }
        return result
    }

    private fun emaNullable(values: List<Double?>, period: Int): List<Double?> {
        val result = MutableList<Double?>(values.size) { null }
        var previous: Double? = null
        val multiplier = 2.0 / (period + 1).toDouble()
        val seededWindow = mutableListOf<Double>()
        for (index in values.indices) {
            val value = values[index] ?: continue
            if (previous == null) {
                seededWindow += value
                if (seededWindow.size == period) {
                    previous = seededWindow.average()
                    result[index] = previous
                }
            } else {
                previous = (value - previous!!) * multiplier + previous!!
                result[index] = previous
            }
        }
        return result
    }

    private fun rsi(values: List<Double>, period: Int): List<Double?> {
        val result = MutableList<Double?>(values.size) { null }
        if (values.size <= period) {
            return result
        }

        var gainSum = 0.0
        var lossSum = 0.0
        for (index in 1..period) {
            val change = values[index] - values[index - 1]
            if (change >= 0) gainSum += change else lossSum += -change
        }
        var avgGain = gainSum / period
        var avgLoss = lossSum / period
        result[period] = if (avgLoss == 0.0) 100.0 else 100.0 - (100.0 / (1.0 + avgGain / avgLoss))

        for (index in period + 1 until values.size) {
            val change = values[index] - values[index - 1]
            val gain = max(change, 0.0)
            val loss = max(-change, 0.0)
            avgGain = ((avgGain * (period - 1)) + gain) / period
            avgLoss = ((avgLoss * (period - 1)) + loss) / period
            result[index] = if (avgLoss == 0.0) 100.0 else 100.0 - (100.0 / (1.0 + avgGain / avgLoss))
        }
        return result
    }

    private fun rolling(values: List<Double>, period: Int, useMax: Boolean): List<Double?> {
        val result = MutableList<Double?>(values.size) { null }
        for (index in values.indices) {
            if (index < period - 1) {
                continue
            }
            val window = values.subList(index - period + 1, index + 1)
            result[index] = if (useMax) window.max() else window.min()
        }
        return result
    }
}

data class StrategySpec(
    val indicators: List<IndicatorSpec>,
    val entry: ConditionGroupSpec,
    val exit: ConditionGroupSpec,
    val risk: RiskSpec,
)

data class IndicatorSpec(
    val id: String,
    val alias: String,
    val params: Map<String, Double>,
    val output: String,
) {
    fun period(name: String): Int = (params[name] ?: 0.0).toInt().coerceAtLeast(1)
}

data class ConditionGroupSpec(
    val logic: String,
    val conditions: List<ConditionSpec>,
)

data class ConditionSpec(
    val left: OperandSpec,
    val operator: String,
    val right: OperandSpec,
)

data class OperandSpec(
    val type: String,
    val field: String? = null,
    val alias: String? = null,
    val output: String? = null,
    val value: Double? = null,
)

data class RiskSpec(
    val stopLossEnabled: Boolean,
    val stopLossPercent: Double,
    val takeProfitEnabled: Boolean,
    val takeProfitPercent: Double,
    val trailingStopEnabled: Boolean,
    val trailingStopPercent: Double,
)

data class RunConfig(
    val initialCapital: Double,
    val commissionRate: Double,
    val taxRate: Double,
    val slippageRate: Double,
)

data class Bar(
    val tradingDate: LocalDate,
    val open: Double,
    val high: Double,
    val low: Double,
    val close: Double,
    val volume: Double,
)

data class EngineResult(
    val summary: Map<String, Any?>,
    val trades: List<TradeRecord>,
    val equityPoints: List<EquityPoint>,
)

data class TradeRecord(
    val symbol: String,
    val entryDate: LocalDate,
    val exitDate: LocalDate,
    val entryPrice: Double,
    val exitPrice: Double,
    val quantity: Long,
    val grossPnl: Double,
    val netPnl: Double,
    val pnlPercent: Double,
    val exitReason: BacktestExitReason,
)

data class EquityPoint(
    val tradingDate: LocalDate,
    val equity: Double,
    val cash: Double,
    val drawdown: Double,
)

private data class Position(
    val entryDate: LocalDate,
    val entryPrice: Double,
    val quantity: Long,
    val highestHigh: Double,
)

private data class RiskExit(
    val reason: BacktestExitReason,
    val price: Double,
)

private enum class ActionType {
    ENTRY,
    EXIT,
}

private data class PendingAction(
    val type: ActionType,
    val reason: BacktestExitReason?,
)

private data class ClosedTrade(
    val proceeds: Double,
    val record: TradeRecord,
)

private data class SymbolSimulationResult(
    val trades: List<TradeRecord>,
    val equitySnapshots: List<EquitySnapshot>,
)

private data class EquitySnapshot(
    val tradingDate: LocalDate,
    val equity: Double,
    val cash: Double,
)
