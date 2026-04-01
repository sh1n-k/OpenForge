package com.openforge.api.backtest.application

import com.openforge.api.backtest.domain.BacktestExitReason
import java.time.LocalDate
import kotlin.math.floor
import kotlin.math.max

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

        val indicatorSeries = StrategySignalSupport.calculateIndicators(spec.indicators, bars)
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

            val warmedUp = StrategySignalSupport.hasRequiredValues(spec, indicatorSeries, index)
            if (warmedUp) {
                if (position == null) {
                    if (StrategySignalSupport.evaluateGroup(spec.entry, bars, indicatorSeries, index)) {
                        pendingAction = PendingAction(ActionType.ENTRY, null)
                    }
                } else if (StrategySignalSupport.evaluateGroup(spec.exit, bars, indicatorSeries, index)) {
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
