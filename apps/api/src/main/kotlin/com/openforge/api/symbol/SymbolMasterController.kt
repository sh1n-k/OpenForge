package com.openforge.api.symbol

import com.openforge.api.strategy.domain.MarketType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/v1/symbols")
class SymbolMasterController(
    private val symbolMasterService: SymbolMasterService,
) {
    @GetMapping("/search")
    fun search(
        @RequestParam q: String,
        @RequestParam(required = false) marketScope: String?,
        @RequestParam(required = false) exchange: String?,
        @RequestParam(defaultValue = "20") limit: Int,
    ): SymbolSearchResponse =
        symbolMasterService.search(
            q,
            parseMarketScope(marketScope),
            exchange,
            limit.coerceIn(1, 50),
        )

    @GetMapping("/status")
    fun status(): SymbolMasterStatusResponse = symbolMasterService.getStatus()

    @PostMapping("/collect")
    fun collect(
        @RequestParam(required = false) marketScope: String?,
    ): SymbolCollectResponse =
        symbolMasterService.collect(
            parseMarketScope(marketScope),
        )

    private fun parseMarketScope(value: String?): MarketType =
        try {
            MarketType.fromValue(value ?: MarketType.DOMESTIC.value)
        } catch (exception: IllegalArgumentException) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, exception.message, exception)
        }
}
