package com.openforge.api.symbol

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.OffsetDateTime

@Entity
@Table(name = "symbol_master_status")
class SymbolMasterStatusEntity(
    @Id
    @Column(name = "market_scope", length = 16, nullable = false)
    var marketScope: String,
    @Column(name = "collected_at")
    var collectedAt: OffsetDateTime? = null,
)
