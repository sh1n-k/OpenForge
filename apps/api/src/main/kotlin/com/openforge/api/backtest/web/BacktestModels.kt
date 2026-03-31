package com.openforge.api.backtest.web

import com.openforge.api.backtest.domain.BacktestExitReason
import com.openforge.api.backtest.domain.BacktestRunStatus
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import org.springframework.web.multipart.MultipartFile
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

data class CreateBacktestRequest(
    @field:NotNull
    val strategyId: UUID,
    val strategyVersionId: UUID? = null,
    @field:NotNull
    val startDate: LocalDate,
    @field:NotNull
    val endDate: LocalDate,
    @field:DecimalMin("1.0")
    val initialCapital: BigDecimal = BigDecimal("100000000"),
    @field:DecimalMin("0.0")
    val commissionRate: BigDecimal = BigDecimal("0.00015"),
    @field:DecimalMin("0.0")
    val taxRate: BigDecimal = BigDecimal("0.002"),
    @field:DecimalMin("0.0")
    val slippageRate: BigDecimal = BigDecimal.ZERO,
    val symbols: List<String> = emptyList(),
    val universeIds: List<UUID> = emptyList(),
)

data class BacktestRunQueuedResponse(
    val runId: UUID,
    val status: BacktestRunStatus,
)

data class BacktestHeadlineMetricsResponse(
    val totalReturnRate: Double,
    val maxDrawdownRate: Double,
    val winRate: Double,
    val tradeCount: Int,
    val averagePnl: Double,
    val profitFactor: Double,
)

data class BacktestRunSummaryResponse(
    val runId: UUID,
    val strategyVersionId: UUID,
    val status: BacktestRunStatus,
    val requestedAt: OffsetDateTime,
    val completedAt: OffsetDateTime?,
    val headlineMetrics: BacktestHeadlineMetricsResponse?,
)

data class BacktestEquityPointResponse(
    val tradingDate: LocalDate,
    val equity: Double,
    val cash: Double,
    val drawdown: Double,
)

data class BacktestTradeResponse(
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

data class BacktestRunDetailResponse(
    val runId: UUID,
    val strategyId: UUID,
    val strategyVersionId: UUID,
    val status: BacktestRunStatus,
    val requestedAt: OffsetDateTime,
    val startedAt: OffsetDateTime?,
    val completedAt: OffsetDateTime?,
    val config: Map<String, Any?>,
    val symbols: List<String>,
    val summary: Map<String, Any?>?,
    val equityCurve: List<BacktestEquityPointResponse>,
    val trades: List<BacktestTradeResponse>,
    val errorMessage: String?,
)

data class MarketCoverageResponse(
    val covered: Boolean,
    val symbols: List<MarketCoverageSymbolResponse>,
)

data class MarketCoverageSymbolResponse(
    val symbol: String,
    val covered: Boolean,
    val firstDate: LocalDate?,
    val lastDate: LocalDate?,
)

data class MarketDataImportResponse(
    val importedRows: Int,
    val symbols: List<String>,
)
