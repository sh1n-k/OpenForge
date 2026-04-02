package com.openforge.api.system.broker.ledger

import jakarta.validation.Valid
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/system/broker/ledger")
class BrokerLedgerController(
    private val brokerLedgerService: BrokerLedgerService,
    private val brokerLedgerSyncWorker: BrokerLedgerSyncWorker,
) {
    @GetMapping("/status")
    fun status(): BrokerLedgerStatusResponse = brokerLedgerService.getStatus()

    @PostMapping("/sync")
    fun sync(
        @Valid @RequestBody request: BrokerLedgerSyncRequest,
    ): BrokerLedgerSyncRunResponse {
        val run = brokerLedgerService.createSyncRun(request)
        brokerLedgerSyncWorker.process(run.id)
        return run
    }

    @GetMapping("/sync-runs")
    fun syncRuns(
        @RequestParam(defaultValue = "20") limit: Int,
    ): List<BrokerLedgerSyncRunResponse> = brokerLedgerService.listSyncRuns(limit)

    @GetMapping("/trades")
    fun trades(
        @RequestParam(required = false) syncRunId: UUID?,
        @RequestParam(required = false) market: BrokerLedgerMarket?,
        @RequestParam(defaultValue = "100") limit: Int,
    ): List<BrokerLedgerTradeResponse> = brokerLedgerService.listTrades(syncRunId, market, limit)

    @GetMapping("/balances")
    fun balances(
        @RequestParam(required = false) syncRunId: UUID?,
        @RequestParam(required = false) market: BrokerLedgerMarket?,
        @RequestParam(defaultValue = "100") limit: Int,
    ): List<BrokerLedgerBalanceResponse> = brokerLedgerService.listBalances(syncRunId, market, limit)

    @GetMapping("/profits")
    fun profits(
        @RequestParam(required = false) syncRunId: UUID?,
        @RequestParam(required = false) market: BrokerLedgerMarket?,
        @RequestParam(defaultValue = "100") limit: Int,
    ): List<BrokerLedgerProfitResponse> = brokerLedgerService.listProfits(syncRunId, market, limit)
}
