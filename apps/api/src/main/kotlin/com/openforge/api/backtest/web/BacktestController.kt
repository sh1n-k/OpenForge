package com.openforge.api.backtest.web

import com.openforge.api.backtest.application.BacktestService
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.time.LocalDate
import java.util.UUID

@RestController
class BacktestController(
    private val backtestService: BacktestService,
) {
    @PostMapping("/api/v1/backtests")
    fun createBacktest(
        @Valid @RequestBody request: CreateBacktestRequest,
    ): BacktestRunQueuedResponse = backtestService.createBacktest(request)

    @GetMapping("/api/v1/backtests/{runId}")
    fun getBacktest(
        @PathVariable runId: UUID,
    ): BacktestRunDetailResponse = backtestService.getBacktest(runId)

    @GetMapping("/api/v1/strategies/{strategyId}/backtests")
    fun listStrategyBacktests(
        @PathVariable strategyId: UUID,
    ): List<BacktestRunSummaryResponse> = backtestService.listStrategyBacktests(strategyId)

    @PostMapping("/api/v1/market-data/daily-bars/import")
    fun importDailyBars(
        @RequestParam("file") file: MultipartFile,
    ): MarketDataImportResponse = backtestService.importDailyBars(file)

    @GetMapping("/api/v1/market-data/coverage")
    fun getCoverage(
        @RequestParam symbols: List<String>,
        @RequestParam startDate: LocalDate,
        @RequestParam endDate: LocalDate,
    ): MarketCoverageResponse = backtestService.getCoverage(symbols, startDate, endDate)
}
