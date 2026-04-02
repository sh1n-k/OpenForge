package com.openforge.api.system.health

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/health")
class HealthController(
    private val healthStatusService: HealthStatusService,
) {
    @GetMapping
    fun read(): HealthResponse = healthStatusService.read()
}
