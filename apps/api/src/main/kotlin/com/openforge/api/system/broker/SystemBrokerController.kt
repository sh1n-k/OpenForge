package com.openforge.api.system.broker

import jakarta.validation.Valid
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/system/broker")
class SystemBrokerController(
    private val brokerConnectionService: BrokerConnectionService,
) {

    @GetMapping
    fun read(): SystemBrokerStatusResponse = brokerConnectionService.getStatus()

    @PutMapping("/config")
    fun updateConfig(
        @Valid @RequestBody request: UpdateBrokerConnectionRequest,
    ): BrokerConnectionResponse = brokerConnectionService.updateConfig(request)

    @PostMapping("/test")
    fun testConnection(
        @Valid @RequestBody request: TestBrokerConnectionRequest,
    ): BrokerConnectionResponse = brokerConnectionService.testConnection(request)

    @GetMapping("/events")
    fun events(
        @RequestParam(defaultValue = "20") limit: Int,
    ): List<BrokerConnectionEventResponse> = brokerConnectionService.listEvents(limit)
}
