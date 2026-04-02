package com.openforge.api.strategy.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "strategy_version")
class StrategyVersionEntity(
    @Id
    @Column(columnDefinition = "uuid")
    var id: UUID = UUID.randomUUID(),
    @Column(name = "strategy_id", columnDefinition = "uuid", nullable = false)
    var strategyId: UUID,
    @Column(name = "version_number", nullable = false)
    var versionNumber: Int,
    @Enumerated(EnumType.STRING)
    @Column(name = "payload_format", nullable = false, length = 32)
    var payloadFormat: PayloadFormat,
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    var payload: Map<String, Any?>,
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "normalized_spec", columnDefinition = "jsonb")
    var normalizedSpec: Map<String, Any?>? = null,
    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status", nullable = false, length = 32)
    var validationStatus: StrategyValidationStatus = StrategyValidationStatus.INVALID,
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "validation_errors", columnDefinition = "jsonb", nullable = false)
    var validationErrors: List<Map<String, String>> = emptyList(),
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "validation_warnings", columnDefinition = "jsonb", nullable = false)
    var validationWarnings: List<Map<String, String>> = emptyList(),
    @Column(name = "change_summary", columnDefinition = "text")
    var changeSummary: String? = null,
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: OffsetDateTime = OffsetDateTime.now(),
)
