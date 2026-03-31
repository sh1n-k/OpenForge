package com.openforge.api.strategy.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "universe_symbol")
class UniverseSymbolEntity(
    @Id
    @Column(columnDefinition = "uuid")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "universe_id", columnDefinition = "uuid", nullable = false)
    var universeId: UUID,

    @Column(nullable = false, length = 32)
    var symbol: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var market: MarketType = MarketType.DOMESTIC,

    @Column(name = "display_name", nullable = false, length = 120)
    var displayName: String,

    @Column(name = "sort_order", nullable = false)
    var sortOrder: Int = 0,
)

