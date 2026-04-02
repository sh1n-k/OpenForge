package com.openforge.api.operations

import java.time.OffsetDateTime
import java.util.UUID

data class DashboardResponse(
    val runningStrategyCount: Int,
    val todayOrderCount: Int,
    val todayPnl: Double,
    val positionCount: Int,
    val strategySummaries: List<DashboardStrategySummary>,
    val recentFills: List<DashboardFillItem>,
    val currentPositions: List<DashboardPositionItem>,
    val recentErrors: List<DashboardErrorItem>,
    val globalKillSwitchEnabled: Boolean,
    val health: HealthSummary,
)

data class DashboardStrategySummary(
    val id: UUID,
    val name: String,
    val strategyType: String,
    val status: String,
    val executionEnabled: Boolean,
    val lastRunStatus: String?,
    val lastRunAt: OffsetDateTime?,
    val positionCount: Int,
    val todayOrderCount: Int,
)

data class DashboardFillItem(
    val id: UUID,
    val strategyId: UUID,
    val strategyName: String,
    val symbol: String,
    val side: String,
    val quantity: Long,
    val price: Double,
    val realizedPnl: Double,
    val filledAt: OffsetDateTime,
)

data class DashboardPositionItem(
    val strategyId: UUID,
    val strategyName: String,
    val symbol: String,
    val netQuantity: Long,
    val avgEntryPrice: Double,
    val lastFillAt: OffsetDateTime?,
)

data class DashboardErrorItem(
    val source: String,
    val strategyId: UUID?,
    val strategyName: String?,
    val message: String,
    val occurredAt: OffsetDateTime,
)

data class HealthSummary(
    val apiStatus: String,
    val dbStatus: String,
)

data class CrossStrategyOrderRequestResponse(
    val id: UUID,
    val strategyId: UUID,
    val strategyName: String,
    val symbol: String,
    val side: String,
    val quantity: Long,
    val price: Double,
    val mode: String,
    val status: String,
    val precheckPassed: Boolean,
    val failureReason: String?,
    val requestedAt: OffsetDateTime,
)

data class CrossStrategyFillResponse(
    val id: UUID,
    val orderRequestId: UUID,
    val strategyId: UUID,
    val strategyName: String,
    val symbol: String,
    val side: String,
    val quantity: Long,
    val price: Double,
    val realizedPnl: Double,
    val filledAt: OffsetDateTime,
    val source: String,
)

data class CrossStrategyPositionResponse(
    val strategyId: UUID,
    val strategyName: String,
    val symbol: String,
    val netQuantity: Long,
    val avgEntryPrice: Double,
    val lastFillAt: OffsetDateTime?,
)
