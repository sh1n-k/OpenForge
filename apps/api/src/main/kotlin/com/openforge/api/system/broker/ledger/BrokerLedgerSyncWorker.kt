package com.openforge.api.system.broker.ledger

import com.openforge.api.strategy.domain.OrderMode
import com.openforge.api.system.broker.BrokerConnectionService
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class BrokerLedgerSyncWorker(
    private val brokerLedgerService: BrokerLedgerService,
    private val brokerConnectionService: BrokerConnectionService,
    private val kisLedgerClient: BrokerLedgerKisClient,
) {
    @Async
    fun process(runId: UUID) {
        brokerLedgerService.markRunning(runId)

        val run =
            brokerLedgerService.findSyncRunResponse(runId)
                ?: return

        val credentials =
            runCatching { brokerConnectionService.loadCredentials(OrderMode.LIVE) }
                .getOrElse { throwable ->
                    brokerLedgerService.markFailed(runId, throwable.message ?: "Failed to load live broker credentials")
                    return
                }

        val payload =
            runCatching {
                kisLedgerClient.fetchSyncPayload(
                    credentials,
                    BrokerLedgerSyncRequest(run.startDate, run.endDate, run.markets.toSet(), run.overseasExchanges.toSet()),
                )
            }.getOrElse { throwable ->
                brokerLedgerService.markFailed(runId, throwable.message ?: "KIS ledger sync failed")
                return
            }

        runCatching {
            brokerLedgerService.applySyncResult(runId, payload)
        }.getOrElse { throwable ->
            brokerLedgerService.markFailed(runId, throwable.message ?: "Failed to persist broker ledger sync result")
        }
    }
}
