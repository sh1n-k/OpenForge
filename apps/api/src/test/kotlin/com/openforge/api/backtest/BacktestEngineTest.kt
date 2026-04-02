package com.openforge.api.backtest

import com.openforge.api.backtest.application.BacktestEngine
import com.openforge.api.backtest.application.Bar
import com.openforge.api.backtest.application.ConditionGroupSpec
import com.openforge.api.backtest.application.ConditionSpec
import com.openforge.api.backtest.application.IndicatorSpec
import com.openforge.api.backtest.application.OperandSpec
import com.openforge.api.backtest.application.RiskSpec
import com.openforge.api.backtest.application.RunConfig
import com.openforge.api.backtest.application.StrategySpec
import com.openforge.api.backtest.domain.BacktestExitReason
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.time.LocalDate

class BacktestEngineTest {
    private val engine = BacktestEngine()

    @Test
    fun `uses previous bar values for cross above and below`() {
        val result =
            engine.run(
                spec =
                    StrategySpec(
                        indicators =
                            listOf(
                                IndicatorSpec(id = "sma", alias = "sma_fast", params = mapOf("period" to 2.0), output = "value"),
                            ),
                        entry =
                            ConditionGroupSpec(
                                logic = "AND",
                                conditions =
                                    listOf(
                                        ConditionSpec(
                                            left = OperandSpec(type = "price", field = "close"),
                                            operator = "cross_above",
                                            right = OperandSpec(type = "indicator", alias = "sma_fast", output = "value"),
                                        ),
                                    ),
                            ),
                        exit =
                            ConditionGroupSpec(
                                logic = "AND",
                                conditions =
                                    listOf(
                                        ConditionSpec(
                                            left = OperandSpec(type = "price", field = "close"),
                                            operator = "cross_below",
                                            right = OperandSpec(type = "indicator", alias = "sma_fast", output = "value"),
                                        ),
                                    ),
                            ),
                        risk = RiskSpec(false, 0.0, false, 0.0, false, 0.0),
                    ),
                symbols = listOf("AAA"),
                barsBySymbol =
                    mapOf(
                        "AAA" to
                            listOf(
                                bar("2026-01-01", 10.0),
                                bar("2026-01-02", 9.0),
                                bar("2026-01-05", 12.0),
                                bar("2026-01-06", 13.0),
                                bar("2026-01-07", 8.0),
                                bar("2026-01-08", 8.0),
                            ),
                    ),
                config =
                    RunConfig(
                        initialCapital = 100_000_000.0,
                        commissionRate = 0.0,
                        taxRate = 0.0,
                        slippageRate = 0.0,
                    ),
            )

        assertEquals(1, result.trades.size)
        assertEquals(LocalDate.parse("2026-01-06"), result.trades[0].entryDate)
        assertEquals(LocalDate.parse("2026-01-08"), result.trades[0].exitDate)
        assertEquals(BacktestExitReason.SIGNAL, result.trades[0].exitReason)
    }

    @Test
    fun `applies conservative risk priority when stop and take hit on same bar`() {
        val result =
            engine.run(
                spec =
                    StrategySpec(
                        indicators = emptyList(),
                        entry =
                            ConditionGroupSpec(
                                logic = "AND",
                                conditions =
                                    listOf(
                                        ConditionSpec(
                                            left = OperandSpec(type = "value", value = 1.0),
                                            operator = "equals",
                                            right = OperandSpec(type = "value", value = 1.0),
                                        ),
                                    ),
                            ),
                        exit = ConditionGroupSpec(logic = "AND", conditions = emptyList()),
                        risk = RiskSpec(true, 5.0 / 100.0, true, 5.0 / 100.0, false, 0.0),
                    ),
                symbols = listOf("AAA"),
                barsBySymbol =
                    mapOf(
                        "AAA" to
                            listOf(
                                Bar(LocalDate.parse("2026-02-02"), 100.0, 100.0, 100.0, 100.0, 1_000.0),
                                Bar(LocalDate.parse("2026-02-03"), 100.0, 110.0, 90.0, 100.0, 1_000.0),
                                Bar(LocalDate.parse("2026-02-04"), 100.0, 100.0, 100.0, 100.0, 1_000.0),
                            ),
                    ),
                config =
                    RunConfig(
                        initialCapital = 1_000_000.0,
                        commissionRate = 0.0,
                        taxRate = 0.0,
                        slippageRate = 0.0,
                    ),
            )

        assertEquals(BacktestExitReason.STOP_LOSS, result.trades.first().exitReason)
        assertEquals(95.0, result.trades.first().exitPrice)
    }

    private fun bar(
        date: String,
        close: Double,
    ) = Bar(
        tradingDate = LocalDate.parse(date),
        open = close,
        high = close,
        low = close,
        close = close,
        volume = 1_000.0,
    )
}
