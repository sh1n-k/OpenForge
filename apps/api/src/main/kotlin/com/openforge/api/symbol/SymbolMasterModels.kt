package com.openforge.api.symbol

import java.time.OffsetDateTime

data class SymbolSearchItemResponse(
    val code: String,
    val name: String,
    val exchange: String,
)

data class SymbolSearchResponse(
    val query: String,
    val total: Int,
    val items: List<SymbolSearchItemResponse>,
)

data class SymbolMasterStatusResponse(
    val kospiCount: Int,
    val kosdaqCount: Int,
    val totalCount: Int,
    val collectedAt: OffsetDateTime?,
    val needsUpdate: Boolean,
)

data class SymbolCollectResponse(
    val success: Boolean,
    val kospiCount: Int,
    val kosdaqCount: Int,
    val totalCount: Int,
    val errors: List<String>,
)
