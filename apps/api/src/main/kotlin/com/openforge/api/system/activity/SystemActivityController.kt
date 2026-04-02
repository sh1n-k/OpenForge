package com.openforge.api.system.activity

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/system/activity")
class SystemActivityController(private val systemActivityService: SystemActivityService) {

    @GetMapping
    fun list(
        @RequestParam(defaultValue = "100") limit: @Min(1) @Max(500) Int,
        @RequestParam(required = false) category: String?,
    ): List<ActivityEventResponse> = systemActivityService.listEvents(limit, category)
}
