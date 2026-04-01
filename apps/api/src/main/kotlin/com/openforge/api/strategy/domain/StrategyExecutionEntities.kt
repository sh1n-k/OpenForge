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
import java.time.LocalDate
import java.time.LocalTime
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "strategy_execution_config")
class StrategyExecutionConfigEntity(
    @Id
    @Column(name = "strategy_id", columnDefinition = "uuid")
    var strategyId: UUID,

    @Column(nullable = false)
    var enabled: Boolean = false,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var mode: StrategyExecutionMode = StrategyExecutionMode.PAPER,

    @Column(name = "schedule_time", nullable = false)
    var scheduleTime: LocalTime,

    @Column(nullable = false, length = 64)
    var timezone: String,

    @Column(name = "last_scheduled_date")
    var lastScheduledDate: LocalDate? = null,
) : BaseAuditableEntity()

@Entity
@Table(name = "strategy_execution_run")
class StrategyExecutionRunEntity(
    @Id
    @Column(columnDefinition = "uuid")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "strategy_id", columnDefinition = "uuid", nullable = false)
    var strategyId: UUID,

    @Column(name = "strategy_version_id", columnDefinition = "uuid", nullable = false)
    var strategyVersionId: UUID,

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type", nullable = false, length = 32)
    var triggerType: StrategyExecutionTriggerType = StrategyExecutionTriggerType.SCHEDULED,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var status: StrategyExecutionRunStatus = StrategyExecutionRunStatus.RUNNING,

    @Column(name = "scheduled_date", nullable = false)
    var scheduledDate: LocalDate,

    @Column(name = "started_at", nullable = false)
    var startedAt: OffsetDateTime,

    @Column(name = "completed_at")
    var completedAt: OffsetDateTime? = null,

    @Column(name = "symbol_count", nullable = false)
    var symbolCount: Int,

    @Column(name = "signal_count", nullable = false)
    var signalCount: Int = 0,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    var summary: Map<String, Any?>? = null,

    @Column(name = "error_message", columnDefinition = "text")
    var errorMessage: String? = null,
)

@Entity
@Table(name = "strategy_signal_event")
class StrategySignalEventEntity(
    @Id
    @Column(columnDefinition = "uuid")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "run_id", columnDefinition = "uuid", nullable = false)
    var runId: UUID,

    @Column(name = "strategy_id", columnDefinition = "uuid", nullable = false)
    var strategyId: UUID,

    @Column(name = "strategy_version_id", columnDefinition = "uuid", nullable = false)
    var strategyVersionId: UUID,

    @Column(nullable = false, length = 32)
    var symbol: String,

    @Enumerated(EnumType.STRING)
    @Column(name = "signal_type", nullable = false, length = 32)
    var signalType: StrategySignalType,

    @Column(name = "trading_date", nullable = false)
    var tradingDate: LocalDate,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    var payload: Map<String, Any?> = emptyMap(),
) : BaseAuditableEntity()
