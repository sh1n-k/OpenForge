package com.openforge.api.symbol

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import com.openforge.api.strategy.domain.MarketType
import java.time.OffsetDateTime

@Entity
@Table(name = "symbol_master_status")
class SymbolMasterStatusEntity(
    @Id
    @Enumerated(EnumType.STRING)
    @Column(name = "market_scope", length = 16, nullable = false)
    var marketScope: MarketType = MarketType.DOMESTIC,
    @Column(name = "collected_at")
    var collectedAt: OffsetDateTime? = null,
)
