package com.openforge.api.symbol

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.IdClass
import jakarta.persistence.Table
import java.io.Serializable

data class SymbolMasterId(
    val code: String = "",
    val exchange: String = "",
) : Serializable

@Entity
@Table(name = "symbol_master")
@IdClass(SymbolMasterId::class)
class SymbolMasterEntity(
    @Id
    @Column(length = 12, nullable = false)
    var code: String,
    @Id
    @Column(length = 16, nullable = false)
    var exchange: String,
    @Column(length = 120, nullable = false)
    var name: String,
)
