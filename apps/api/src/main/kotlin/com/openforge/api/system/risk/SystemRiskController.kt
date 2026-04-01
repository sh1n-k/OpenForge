package com.openforge.api.system.risk

import com.openforge.api.strategy.web.GlobalRiskEventResponse
import com.openforge.api.strategy.web.GlobalRiskResponse
import com.openforge.api.strategy.web.UpdateGlobalRiskKillSwitchRequest
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/system/risk")
class SystemRiskController(
    private val systemRiskService: SystemRiskService,
) {

    @GetMapping
    fun read(): GlobalRiskResponse = systemRiskService.getGlobalRisk()

    @PutMapping("/kill-switch")
    fun updateKillSwitch(
        @Valid @RequestBody request: UpdateGlobalRiskKillSwitchRequest,
    ): GlobalRiskResponse = systemRiskService.updateGlobalKillSwitch(request)

    @GetMapping("/events")
    fun events(
        @RequestParam(defaultValue = "20") limit: Int,
    ): List<GlobalRiskEventResponse> = systemRiskService.listGlobalRiskEvents(limit)
}
