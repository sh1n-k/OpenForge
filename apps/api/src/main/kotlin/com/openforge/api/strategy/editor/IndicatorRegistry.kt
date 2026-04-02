package com.openforge.api.strategy.editor

object IndicatorRegistry {
    val indicators: Map<String, StrategyEditorIndicatorDefinition> =
        listOf(
            StrategyEditorIndicatorDefinition(
                id = "sma",
                outputs = setOf("value"),
                defaultOutput = "value",
                defaults = linkedMapOf("period" to 20),
            ),
            StrategyEditorIndicatorDefinition(
                id = "ema",
                outputs = setOf("value"),
                defaultOutput = "value",
                defaults = linkedMapOf("period" to 20),
            ),
            StrategyEditorIndicatorDefinition(
                id = "rsi",
                outputs = setOf("value"),
                defaultOutput = "value",
                defaults = linkedMapOf("period" to 14),
            ),
            StrategyEditorIndicatorDefinition(
                id = "macd",
                outputs = setOf("value", "signal"),
                defaultOutput = "value",
                defaults =
                    linkedMapOf(
                        "fastPeriod" to 12,
                        "slowPeriod" to 26,
                        "signalPeriod" to 9,
                    ),
            ),
            StrategyEditorIndicatorDefinition(
                id = "volume_sma",
                outputs = setOf("value"),
                defaultOutput = "value",
                defaults = linkedMapOf("period" to 20),
            ),
            StrategyEditorIndicatorDefinition(
                id = "rolling_high",
                outputs = setOf("value"),
                defaultOutput = "value",
                defaults = linkedMapOf("period" to 20),
            ),
            StrategyEditorIndicatorDefinition(
                id = "rolling_low",
                outputs = setOf("value"),
                defaultOutput = "value",
                defaults = linkedMapOf("period" to 20),
            ),
        ).associateBy { it.id }

    val supportedOperators =
        setOf(
            "greater_than",
            "less_than",
            "greater_equal",
            "less_equal",
            "cross_above",
            "cross_below",
            "equals",
        )

    val supportedPriceFields = setOf("close", "open", "high", "low", "volume")
    val conditionKeys = setOf("left", "operator", "right")
    val builderRootKeys = setOf("metadata", "indicators", "entry", "exit", "risk")
}
