package com.openforge.api.symbol

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/symbols")
class SymbolMasterController(
    private val symbolMasterService: SymbolMasterService,
) {
    @GetMapping("/search")
    fun search(
        @RequestParam q: String,
        @RequestParam(required = false) exchange: String?,
        @RequestParam(defaultValue = "20") limit: Int,
    ): SymbolSearchResponse = symbolMasterService.search(q, exchange, limit.coerceIn(1, 50))

    @GetMapping("/status")
    fun status(): SymbolMasterStatusResponse = symbolMasterService.getStatus()

    @PostMapping("/collect")
    fun collect(): SymbolCollectResponse = symbolMasterService.collect()
}
