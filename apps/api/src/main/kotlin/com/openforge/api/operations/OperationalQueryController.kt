package com.openforge.api.operations

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1")
class OperationalQueryController(
    private val operationalQueryService: OperationalQueryService,
) {

    @GetMapping("/orders")
    fun orders(
        @RequestParam(required = false) strategyId: UUID?,
        @RequestParam(defaultValue = "50") limit: Int,
    ): List<CrossStrategyOrderRequestResponse> = operationalQueryService.listOrders(strategyId, limit)

    @GetMapping("/fills")
    fun fills(
        @RequestParam(required = false) strategyId: UUID?,
        @RequestParam(defaultValue = "50") limit: Int,
    ): List<CrossStrategyFillResponse> = operationalQueryService.listFills(strategyId, limit)

    @GetMapping("/positions")
    fun positions(
        @RequestParam(required = false) strategyId: UUID?,
    ): List<CrossStrategyPositionResponse> = operationalQueryService.listPositions(strategyId)
}
