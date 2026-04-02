package com.openforge.api.symbol

import com.openforge.api.strategy.domain.MarketType
import java.time.OffsetDateTime

data class SymbolSearchItemResponse(
    val code: String,
    val name: String,
    val exchange: String,
    val marketScope: MarketType,
)

data class SymbolSearchResponse(
    val query: String,
    val total: Int,
    val items: List<SymbolSearchItemResponse>,
)

data class SymbolMasterExchangeCountResponse(
    val exchange: String,
    val count: Int,
)

data class SymbolMasterMarketStatusResponse(
    val marketScope: MarketType,
    val exchangeCounts: List<SymbolMasterExchangeCountResponse>,
    val totalCount: Int,
    val collectedAt: OffsetDateTime?,
    val needsUpdate: Boolean,
)

data class SymbolMasterStatusResponse(
    val markets: List<SymbolMasterMarketStatusResponse>,
)

data class SymbolCollectResponse(
    val marketScope: MarketType,
    val success: Boolean,
    val exchangeCounts: List<SymbolMasterExchangeCountResponse>,
    val totalCount: Int,
    val errors: List<String>,
)
