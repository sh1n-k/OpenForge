package com.openforge.api.backtest.domain

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.time.LocalDate
import java.util.UUID

interface MarketDailyBarRepository : JpaRepository<MarketDailyBarEntity, MarketDailyBarId> {
    fun findAllBySymbolOrderByTradingDateAsc(symbol: String): List<MarketDailyBarEntity>

    fun findAllBySymbolInOrderBySymbolAscTradingDateAsc(symbols: Collection<String>): List<MarketDailyBarEntity>

    fun findAllBySymbolAndTradingDateBetweenOrderByTradingDateAsc(
        symbol: String,
        startDate: LocalDate,
        endDate: LocalDate,
    ): List<MarketDailyBarEntity>

    fun findAllBySymbolInAndTradingDateBetweenOrderBySymbolAscTradingDateAsc(
        symbols: Collection<String>,
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

    @Query(
        """
        select b.symbol as symbol, max(b.tradingDate) as tradingDate
        from MarketDailyBarEntity b
        where b.symbol in :symbols
          and b.tradingDate <= :tradingDate
        group by b.symbol
        """,
    )
    fun findLatestDatesOnOrBefore(
        symbols: Collection<String>,
        tradingDate: LocalDate,
    ): List<SymbolTradingDate>

    @Query(
        """
        select b.symbol as symbol, min(b.tradingDate) as tradingDate
        from MarketDailyBarEntity b
        where b.symbol in :symbols
          and b.tradingDate >= :tradingDate
        group by b.symbol
        """,
    )
    fun findEarliestDatesOnOrAfter(
        symbols: Collection<String>,
        tradingDate: LocalDate,
    ): List<SymbolTradingDate>
}

interface SymbolTradingDate {
    val symbol: String
    val tradingDate: LocalDate
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
