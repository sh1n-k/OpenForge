package com.openforge.api.backtest.application

import java.time.LocalDate
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

object StrategySignalSupport {

    fun parseStrategySpec(normalizedSpec: Map<String, Any?>): StrategySpec {
        val strategy = normalizedSpec["strategy"] as? Map<*, *>
            ?: throw IllegalArgumentException("normalizedSpec.strategy is required")
        val indicators = ((strategy["indicators"] as? List<*>) ?: emptyList<Any?>()).map { raw ->
            val indicator = raw as? Map<*, *> ?: throw IllegalArgumentException("indicator entry is invalid")
            IndicatorSpec(
                id = indicator["id"]?.toString() ?: throw IllegalArgumentException("indicator.id is required"),
                alias = indicator["alias"]?.toString() ?: throw IllegalArgumentException("indicator.alias is required"),
                params = ((indicator["params"] as? Map<*, *>) ?: emptyMap<Any, Any>()).entries.associate { (key, value) ->
                    key.toString() to numberValue(value)
                },
                output = indicator["output"]?.toString() ?: "value",
            )
        }
        val entry = parseConditionGroup(strategy["entry"] as? Map<*, *>)
        val exit = parseConditionGroup(strategy["exit"] as? Map<*, *>)
        val riskMap = normalizedSpec["risk"] as? Map<*, *> ?: emptyMap<String, Any>()
        return StrategySpec(
            indicators = indicators,
            entry = entry,
            exit = exit,
            risk = RiskSpec(
                stopLossEnabled = boolValue((riskMap["stop_loss"] as? Map<*, *>)?.get("enabled")),
                stopLossPercent = percent((riskMap["stop_loss"] as? Map<*, *>)?.get("percent")),
                takeProfitEnabled = boolValue((riskMap["take_profit"] as? Map<*, *>)?.get("enabled")),
                takeProfitPercent = percent((riskMap["take_profit"] as? Map<*, *>)?.get("percent")),
                trailingStopEnabled = boolValue((riskMap["trailing_stop"] as? Map<*, *>)?.get("enabled")),
                trailingStopPercent = percent((riskMap["trailing_stop"] as? Map<*, *>)?.get("percent")),
            ),
        )
    }

    fun calculateIndicators(
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

    fun evaluateGroup(
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

    fun resolveOperand(
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

    private fun parseConditionGroup(source: Map<*, *>?): ConditionGroupSpec = ConditionGroupSpec(
        logic = source?.get("logic")?.toString() ?: "AND",
        conditions = ((source?.get("conditions") as? List<*>) ?: emptyList<Any?>()).map { raw ->
            val condition = raw as? Map<*, *> ?: throw IllegalArgumentException("condition entry is invalid")
            ConditionSpec(
                left = parseOperand(condition["left"] as? Map<*, *>),
                operator = condition["operator"]?.toString() ?: throw IllegalArgumentException("operator is required"),
                right = parseOperand(condition["right"] as? Map<*, *>),
            )
        },
    )

    private fun parseOperand(source: Map<*, *>?): OperandSpec = OperandSpec(
        type = source?.get("type")?.toString() ?: throw IllegalArgumentException("operand.type is required"),
        field = source["field"]?.toString(),
        alias = source["alias"]?.toString(),
        output = source["output"]?.toString(),
        value = source["value"]?.let(::numberValue),
    )

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
                previous = (values[index] - previous) * multiplier + previous
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
                previous = (value - previous) * multiplier + previous
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

    private fun numberValue(value: Any?): Double = when (value) {
        is Number -> value.toDouble()
        is String -> value.toDouble()
        else -> throw IllegalArgumentException("Numeric value is required")
    }

    private fun boolValue(value: Any?): Boolean = when (value) {
        is Boolean -> value
        is String -> value.toBooleanStrictOrNull() ?: false
        else -> false
    }

    private fun percent(value: Any?): Double = (value?.let(::numberValue) ?: 0.0) / 100.0
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
    val exitReason: com.openforge.api.backtest.domain.BacktestExitReason,
)

data class EquityPoint(
    val tradingDate: LocalDate,
    val equity: Double,
    val cash: Double,
    val drawdown: Double,
)
