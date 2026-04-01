package com.openforge.api.strategy.domain

import com.openforge.api.common.jpa.BaseAuditableEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "strategy_order_request")
class StrategyOrderRequestEntity(
    @Id
    @Column(columnDefinition = "uuid")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "strategy_id", columnDefinition = "uuid", nullable = false)
    var strategyId: UUID,

    @Column(name = "strategy_version_id", columnDefinition = "uuid", nullable = false)
    var strategyVersionId: UUID,

    @Column(name = "signal_event_id", columnDefinition = "uuid", nullable = false)
    var signalEventId: UUID,

    @Column(name = "execution_run_id", columnDefinition = "uuid", nullable = false)
    var executionRunId: UUID,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var mode: OrderMode,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var side: OrderSide,

    @Enumerated(EnumType.STRING)
    @Column(name = "order_type", nullable = false, length = 32)
    var orderType: OrderType = OrderType.LIMIT,

    @Column(nullable = false)
    var quantity: Long,

    @Column(nullable = false, precision = 19, scale = 6)
    var price: BigDecimal,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var status: OrderRequestStatus,

    @Column(name = "precheck_passed", nullable = false)
    var precheckPassed: Boolean,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "precheck_summary", columnDefinition = "jsonb", nullable = false)
    var precheckSummary: Map<String, Any?>,

    @Column(name = "failure_reason", columnDefinition = "text")
    var failureReason: String? = null,

    @Column(name = "requested_at", nullable = false)
    var requestedAt: OffsetDateTime,
) : BaseAuditableEntity()

@Entity
@Table(name = "strategy_order_status_event")
class StrategyOrderStatusEventEntity(
    @Id
    @Column(columnDefinition = "uuid")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "order_request_id", columnDefinition = "uuid", nullable = false)
    var orderRequestId: UUID,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var status: OrderLifecycleStatus,

    @Column(columnDefinition = "text")
    var reason: String? = null,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    var payload: Map<String, Any?> = emptyMap(),

    @Column(name = "occurred_at", nullable = false)
    var occurredAt: OffsetDateTime,
) : BaseAuditableEntity()

@Entity
@Table(name = "strategy_order_fill")
class StrategyOrderFillEntity(
    @Id
    @Column(columnDefinition = "uuid")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "order_request_id", columnDefinition = "uuid", nullable = false)
    var orderRequestId: UUID,

    @Column(name = "strategy_id", columnDefinition = "uuid", nullable = false)
    var strategyId: UUID,

    @Column(name = "strategy_version_id", columnDefinition = "uuid", nullable = false)
    var strategyVersionId: UUID,

    @Column(nullable = false, length = 32)
    var symbol: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var side: OrderSide,

    @Column(nullable = false)
    var quantity: Long,

    @Column(nullable = false, precision = 19, scale = 6)
    var price: BigDecimal,

    @Column(name = "filled_at", nullable = false)
    var filledAt: OffsetDateTime,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var source: OrderFillSource,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    var payload: Map<String, Any?> = emptyMap(),
) : BaseAuditableEntity()
