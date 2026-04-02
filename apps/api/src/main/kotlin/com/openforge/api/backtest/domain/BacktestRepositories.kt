package com.openforge.api.backtest.domain

import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDate
import java.util.UUID

interface MarketDailyBarRepository : JpaRepository<MarketDailyBarEntity, MarketDailyBarId> {
    fun findAllBySymbolOrderByTradingDateAsc(symbol: String): List<MarketDailyBarEntity>

    fun findAllBySymbolAndTradingDateBetweenOrderByTradingDateAsc(
        symbol: String,
        startDate: LocalDate,
        endDate: LocalDate,
    ): List<MarketDailyBarEntity>

    fun findTopBySymbolAndTradingDateLessThanEqualOrderByTradingDateDesc(
        symbol: String,
        tradingDate: LocalDate,
    ): MarketDailyBarEntity?

    fun findTopBySymbolAndTradingDateGreaterThanEqualOrderByTradingDateAsc(
        symbol: String,
        tradingDate: LocalDate,
    ): MarketDailyBarEntity?
}

interface BacktestRunRepository : JpaRepository<BacktestRunEntity, UUID> {
    fun findAllByStrategyIdOrderByRequestedAtDesc(strategyId: UUID): List<BacktestRunEntity>

    fun findAllByStatusInOrderByRequestedAtAsc(statuses: Collection<BacktestRunStatus>): List<BacktestRunEntity>

    fun findFirstByStatusOrderByRequestedAtAsc(status: BacktestRunStatus): BacktestRunEntity?
}

interface BacktestTradeRepository : JpaRepository<BacktestTradeEntity, UUID> {
    fun findAllByRunIdOrderByEntryDateAscSymbolAsc(runId: UUID): List<BacktestTradeEntity>

    fun deleteAllByRunId(runId: UUID)
}

interface BacktestEquityPointRepository : JpaRepository<BacktestEquityPointEntity, BacktestEquityPointId> {
    fun findAllByRunIdOrderByTradingDateAsc(runId: UUID): List<BacktestEquityPointEntity>

    fun deleteAllByRunId(runId: UUID)
}
