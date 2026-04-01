package com.openforge.api.strategy.web

import com.openforge.api.strategy.domain.MarketType
import com.openforge.api.strategy.domain.OrderFillSource
import com.openforge.api.strategy.domain.OrderLifecycleStatus
import com.openforge.api.strategy.domain.OrderMode
import com.openforge.api.strategy.domain.OrderRequestStatus
import com.openforge.api.strategy.domain.OrderSide
import com.openforge.api.strategy.domain.PayloadFormat
import com.openforge.api.strategy.domain.StrategyExecutionMode
import com.openforge.api.strategy.domain.StrategyExecutionRunStatus
import com.openforge.api.strategy.domain.StrategyExecutionTriggerType
import com.openforge.api.strategy.domain.StrategySignalType
import com.openforge.api.strategy.domain.StrategyStatus
import com.openforge.api.strategy.domain.StrategyType
import com.openforge.api.strategy.domain.StrategyValidationStatus
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive
import java.time.OffsetDateTime
import java.util.UUID

data class CreateStrategyRequest(
    @field:NotBlank
    val name: String,
    val description: String? = null,
    @field:NotNull
    val strategyType: StrategyType,
    @field:Valid
    @field:NotNull
    val initialPayload: StrategyPayloadRequest,
)

data class StrategyPayloadRequest(
    @field:NotNull
    val payloadFormat: PayloadFormat,
    @field:NotNull
    val payload: Map<String, Any?>,
    val changeSummary: String? = null,
)

data class UpdateStrategyRequest(
    val name: String? = null,
    val description: String? = null,
    val status: StrategyStatus? = null,
)

data class ReplaceStrategyUniversesRequest(
    @field:NotNull
    val universeIds: List<UUID>,
)

data class StrategyValidationMessageResponse(
    val category: String,
    val message: String,
)

data class StrategyValidateRequest(
    @field:NotNull
    val strategyType: StrategyType,
    @field:NotNull
    val payloadFormat: PayloadFormat,
    @field:NotNull
    val payload: Map<String, Any?>,
)

data class StrategyValidateResponse(
    val valid: Boolean,
    val normalizedSpec: Map<String, Any?>?,
    val yamlPreview: String,
    val errors: List<StrategyValidationMessageResponse>,
    val warnings: List<StrategyValidationMessageResponse>,
    val summary: String,
)

data class StrategySummaryResponse(
    val id: UUID,
    val name: String,
    val description: String?,
    val strategyType: StrategyType,
    val status: StrategyStatus,
    val latestVersionId: UUID?,
    val latestVersionNumber: Int?,
    val versionCount: Long,
    val universeCount: Long,
    val updatedAt: OffsetDateTime,
)

data class StrategyVersionResponse(
    val id: UUID,
    val versionNumber: Int,
    val payloadFormat: PayloadFormat,
    val payload: Map<String, Any?>,
    val validationStatus: StrategyValidationStatus,
    val validationErrors: List<StrategyValidationMessageResponse>,
    val validationWarnings: List<StrategyValidationMessageResponse>,
    val changeSummary: String?,
    val createdAt: OffsetDateTime,
)

data class UniverseReferenceResponse(
    val id: UUID,
    val name: String,
    val description: String?,
)

data class StrategyDetailResponse(
    val id: UUID,
    val name: String,
    val description: String?,
    val strategyType: StrategyType,
    val status: StrategyStatus,
    val latestVersionId: UUID?,
    val latestVersionNumber: Int?,
    val versionCount: Long,
    val universeCount: Long,
    val latestValidationStatus: StrategyValidationStatus?,
    val latestValidationErrors: List<StrategyValidationMessageResponse>,
    val latestValidationWarnings: List<StrategyValidationMessageResponse>,
    val latestVersion: StrategyVersionResponse?,
    val universes: List<UniverseReferenceResponse>,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime,
)

data class UpdateStrategyExecutionRequest(
    @field:NotNull
    val enabled: Boolean,
    @field:NotBlank
    val scheduleTime: String,
)

data class StrategyExecutionLastRunResponse(
    val runId: UUID,
    val status: StrategyExecutionRunStatus,
    val scheduledDate: java.time.LocalDate,
    val startedAt: OffsetDateTime,
    val completedAt: OffsetDateTime?,
    val signalCount: Int,
    val errorMessage: String?,
)

data class StrategyExecutionResponse(
    val mode: StrategyExecutionMode,
    val enabled: Boolean,
    val scheduleTime: String,
    val timezone: String,
    val strategyStatus: StrategyStatus,
    val lastRun: StrategyExecutionLastRunResponse?,
    val nextRunAt: OffsetDateTime?,
)

data class StrategyExecutionRunResponse(
    val runId: UUID,
    val status: StrategyExecutionRunStatus,
    val triggerType: StrategyExecutionTriggerType,
    val scheduledDate: java.time.LocalDate,
    val startedAt: OffsetDateTime,
    val completedAt: OffsetDateTime?,
    val symbolCount: Int,
    val signalCount: Int,
    val errorMessage: String?,
    val strategyVersionId: UUID,
)

data class StrategySignalEventResponse(
    val id: UUID,
    val runId: UUID,
    val strategyVersionId: UUID,
    val symbol: String,
    val signalType: StrategySignalType,
    val tradingDate: java.time.LocalDate,
    val createdAt: OffsetDateTime,
    val payload: Map<String, Any?>,
)

data class CreateOrderRequest(
    @field:NotNull
    val signalEventId: UUID,
    val mode: OrderMode = OrderMode.PAPER,
)

data class OrderPrecheckResponse(
    val passed: Boolean,
    val marketHours: Boolean,
    val strategyStatus: Boolean,
    val duplicateOrder: Boolean,
    val quantityValid: Boolean,
    val priceValid: Boolean,
    val reasonCodes: List<String>,
)

data class OrderCandidateResponse(
    val signalEventId: UUID,
    val executionRunId: UUID,
    val strategyVersionId: UUID,
    val symbol: String,
    val side: OrderSide,
    val quantity: Long,
    val price: Double,
    val tradingDate: java.time.LocalDate,
    val mode: OrderMode,
    val alreadyRequested: Boolean,
    val precheck: OrderPrecheckResponse,
)

data class OrderRequestResponse(
    val id: UUID,
    val signalEventId: UUID,
    val symbol: String,
    val side: OrderSide,
    val quantity: Long,
    val price: Double,
    val mode: OrderMode,
    val status: OrderRequestStatus,
    val currentStatus: OrderLifecycleStatus,
    val filledQuantity: Long,
    val remainingQuantity: Long,
    val precheckPassed: Boolean,
    val failureReason: String?,
    val requestedAt: OffsetDateTime,
)

data class CreateOrderFillRequest(
    @field:Positive
    val quantity: Long,
    @field:Positive
    val price: Double,
    @field:NotNull
    val filledAt: OffsetDateTime,
)

data class OrderStatusEventResponse(
    val id: UUID,
    val orderRequestId: UUID,
    val status: OrderLifecycleStatus,
    val reason: String?,
    val occurredAt: OffsetDateTime,
    val payload: Map<String, Any?>,
)

data class OrderFillResponse(
    val id: UUID,
    val orderRequestId: UUID,
    val symbol: String,
    val side: OrderSide,
    val quantity: Long,
    val price: Double,
    val filledAt: OffsetDateTime,
    val source: OrderFillSource,
)

data class StrategyPositionResponse(
    val symbol: String,
    val netQuantity: Long,
    val avgEntryPrice: Double,
    val lastFillAt: OffsetDateTime?,
)

data class CreateUniverseRequest(
    @field:NotBlank
    val name: String,
    val description: String? = null,
)

data class UpdateUniverseRequest(
    val name: String? = null,
    val description: String? = null,
)

data class UniverseSymbolInput(
    @field:NotBlank
    val symbol: String,
    val market: MarketType = MarketType.DOMESTIC,
    @field:NotBlank
    val displayName: String,
    val sortOrder: Int = 0,
)

data class ReplaceUniverseSymbolsRequest(
    @field:NotNull
    val symbols: List<@Valid UniverseSymbolInput>,
)

data class UniverseSummaryResponse(
    val id: UUID,
    val name: String,
    val description: String?,
    val symbolCount: Long,
    val strategyCount: Long,
    val updatedAt: OffsetDateTime,
)

data class UniverseSymbolResponse(
    val symbol: String,
    val market: MarketType,
    val displayName: String,
    val sortOrder: Int,
)

data class UniverseDetailResponse(
    val id: UUID,
    val name: String,
    val description: String?,
    val symbolCount: Long,
    val strategyCount: Long,
    val symbols: List<UniverseSymbolResponse>,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime,
)
