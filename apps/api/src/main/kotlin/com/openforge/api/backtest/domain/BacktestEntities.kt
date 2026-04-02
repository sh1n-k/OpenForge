package com.openforge.api.backtest.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.IdClass
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.io.Serializable
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

data class MarketDailyBarId(
    var symbol: String = "",
    var tradingDate: LocalDate = LocalDate.MIN,
) : Serializable

@Entity
@Table(name = "market_daily_bar")
@IdClass(MarketDailyBarId::class)
class MarketDailyBarEntity(
    @Id
    @Column(nullable = false, length = 32)
    var symbol: String,
    @Id
    @Column(name = "trading_date", nullable = false)
    var tradingDate: LocalDate,
    @Column(nullable = false, precision = 19, scale = 6)
    var open: BigDecimal,
    @Column(nullable = false, precision = 19, scale = 6)
    var high: BigDecimal,
    @Column(nullable = false, precision = 19, scale = 6)
    var low: BigDecimal,
    @Column(nullable = false, precision = 19, scale = 6)
    var close: BigDecimal,
    @Column(nullable = false, precision = 19, scale = 0)
    var volume: BigDecimal,
)

@Entity
@Table(name = "backtest_run")
class BacktestRunEntity(
    @Id
    @Column(columnDefinition = "uuid")
    var id: UUID = UUID.randomUUID(),
    @Column(name = "strategy_id", columnDefinition = "uuid", nullable = false)
    var strategyId: UUID,
    @Column(name = "strategy_version_id", columnDefinition = "uuid", nullable = false)
    var strategyVersionId: UUID,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var status: BacktestRunStatus = BacktestRunStatus.QUEUED,
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "run_config", columnDefinition = "jsonb", nullable = false)
    var runConfig: Map<String, Any?>,
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "normalized_spec", columnDefinition = "jsonb", nullable = false)
    var normalizedSpec: Map<String, Any?>,
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    var symbols: List<String>,
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    var summary: Map<String, Any?>? = null,
    @Column(name = "error_message", columnDefinition = "text")
    var errorMessage: String? = null,
    @Column(name = "requested_at", nullable = false)
    var requestedAt: OffsetDateTime = OffsetDateTime.now(),
    @Column(name = "started_at")
    var startedAt: OffsetDateTime? = null,
    @Column(name = "completed_at")
    var completedAt: OffsetDateTime? = null,
)

@Entity
@Table(name = "backtest_trade")
class BacktestTradeEntity(
    @Id
    @Column(columnDefinition = "uuid")
    var id: UUID = UUID.randomUUID(),
    @Column(name = "run_id", columnDefinition = "uuid", nullable = false)
    var runId: UUID,
    @Column(nullable = false, length = 32)
    var symbol: String,
    @Column(name = "entry_date", nullable = false)
    var entryDate: LocalDate,
    @Column(name = "exit_date", nullable = false)
    var exitDate: LocalDate,
    @Column(name = "entry_price", nullable = false, precision = 19, scale = 6)
    var entryPrice: BigDecimal,
    @Column(name = "exit_price", nullable = false, precision = 19, scale = 6)
    var exitPrice: BigDecimal,
    @Column(nullable = false)
    var quantity: Long,
    @Column(name = "gross_pnl", nullable = false, precision = 19, scale = 6)
    var grossPnl: BigDecimal,
    @Column(name = "net_pnl", nullable = false, precision = 19, scale = 6)
    var netPnl: BigDecimal,
    @Column(name = "pnl_percent", nullable = false, precision = 19, scale = 8)
    var pnlPercent: BigDecimal,
    @Enumerated(EnumType.STRING)
    @Column(name = "exit_reason", nullable = false, length = 32)
    var exitReason: BacktestExitReason,
)

data class BacktestEquityPointId(
    var runId: UUID = UUID(0, 0),
    var tradingDate: LocalDate = LocalDate.MIN,
) : Serializable

@Entity
@Table(name = "backtest_equity_point")
@IdClass(BacktestEquityPointId::class)
class BacktestEquityPointEntity(
    @Id
    @Column(name = "run_id", columnDefinition = "uuid", nullable = false)
    var runId: UUID,
    @Id
    @Column(name = "trading_date", nullable = false)
    var tradingDate: LocalDate,
    @Column(nullable = false, precision = 19, scale = 6)
    var equity: BigDecimal,
    @Column(nullable = false, precision = 19, scale = 6)
    var cash: BigDecimal,
    @Column(nullable = false, precision = 19, scale = 8)
    var drawdown: BigDecimal,
)
