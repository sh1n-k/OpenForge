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
    @Column(length = 32)
    var id: String = "singleton",
    @Column(name = "kospi_count", nullable = false)
    var kospiCount: Int = 0,
    @Column(name = "kosdaq_count", nullable = false)
    var kosdaqCount: Int = 0,
    @Column(name = "collected_at")
    var collectedAt: OffsetDateTime? = null,
)
