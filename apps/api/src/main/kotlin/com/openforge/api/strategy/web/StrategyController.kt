package com.openforge.api.strategy.web

import com.openforge.api.strategy.application.PaperExecutionService
import com.openforge.api.strategy.application.StrategyService
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/strategies")
class StrategyController(
    private val strategyService: StrategyService,
    private val paperExecutionService: PaperExecutionService,
) {

    @PostMapping("/validate")
    fun validate(
        @Valid @RequestBody request: StrategyValidateRequest,
    ): StrategyValidateResponse = strategyService.validate(request)

    @GetMapping
    fun list(): List<StrategySummaryResponse> = strategyService.listStrategies()

    @PostMapping
    fun create(
        @Valid @RequestBody request: CreateStrategyRequest,
    ): StrategyDetailResponse = strategyService.createStrategy(request)

    @GetMapping("/{strategyId}")
    fun detail(
        @PathVariable strategyId: UUID,
    ): StrategyDetailResponse = strategyService.getStrategy(strategyId)

    @GetMapping("/{strategyId}/execution")
    fun execution(
        @PathVariable strategyId: UUID,
    ): StrategyExecutionResponse = paperExecutionService.getExecution(strategyId)

    @PutMapping("/{strategyId}/execution")
    fun updateExecution(
        @PathVariable strategyId: UUID,
        @Valid @RequestBody request: UpdateStrategyExecutionRequest,
    ): StrategyExecutionResponse = paperExecutionService.updateExecution(strategyId, request)

    @GetMapping("/{strategyId}/execution/runs")
    fun executionRuns(
        @PathVariable strategyId: UUID,
        @org.springframework.web.bind.annotation.RequestParam(defaultValue = "20") limit: Int,
    ): List<StrategyExecutionRunResponse> = paperExecutionService.listExecutionRuns(strategyId, limit)

    @GetMapping("/{strategyId}/signals")
    fun signals(
        @PathVariable strategyId: UUID,
        @org.springframework.web.bind.annotation.RequestParam(defaultValue = "50") limit: Int,
    ): List<StrategySignalEventResponse> = paperExecutionService.listSignals(strategyId, limit)

    @PatchMapping("/{strategyId}")
    fun update(
        @PathVariable strategyId: UUID,
        @Valid @RequestBody request: UpdateStrategyRequest,
    ): StrategyDetailResponse = strategyService.updateStrategy(strategyId, request)

    @PostMapping("/{strategyId}/versions")
    fun appendVersion(
        @PathVariable strategyId: UUID,
        @Valid @RequestBody request: StrategyPayloadRequest,
    ): StrategyVersionResponse = strategyService.appendStrategyVersion(strategyId, request)

    @GetMapping("/{strategyId}/versions")
    fun versions(
        @PathVariable strategyId: UUID,
    ): List<StrategyVersionResponse> = strategyService.listStrategyVersions(strategyId)

    @PostMapping("/{strategyId}/clone")
    fun clone(
        @PathVariable strategyId: UUID,
    ): StrategyDetailResponse = strategyService.cloneStrategy(strategyId)

    @PutMapping("/{strategyId}/universes")
    fun replaceUniverses(
        @PathVariable strategyId: UUID,
        @Valid @RequestBody request: ReplaceStrategyUniversesRequest,
    ): StrategyDetailResponse = strategyService.replaceStrategyUniverses(strategyId, request.universeIds)

    @DeleteMapping("/{strategyId}")
    fun archive(
        @PathVariable strategyId: UUID,
    ) {
        strategyService.archiveStrategy(strategyId)
    }
}
