package com.openforge.api.strategy.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "strategy_universe")
class StrategyUniverseEntity(
    @Id
    @Column(columnDefinition = "uuid")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "strategy_id", columnDefinition = "uuid", nullable = false)
    var strategyId: UUID,

    @Column(name = "universe_id", columnDefinition = "uuid", nullable = false)
    var universeId: UUID,

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: OffsetDateTime = OffsetDateTime.now(),
)

