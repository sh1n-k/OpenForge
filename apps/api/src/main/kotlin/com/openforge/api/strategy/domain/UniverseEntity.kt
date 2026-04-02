package com.openforge.api.strategy.domain

import com.openforge.api.common.jpa.BaseAuditableEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "universe")
class UniverseEntity(
    @Id
    @Column(columnDefinition = "uuid")
    var id: UUID = UUID.randomUUID(),
    @Enumerated(EnumType.STRING)
    @Column(name = "market_scope", nullable = false, length = 16)
    var marketScope: MarketType = MarketType.DOMESTIC,
    @Column(nullable = false, length = 120)
    var name: String,
    @Column(columnDefinition = "text")
    var description: String? = null,
    @Column(name = "is_archived", nullable = false)
    var isArchived: Boolean = false,
) : BaseAuditableEntity()
