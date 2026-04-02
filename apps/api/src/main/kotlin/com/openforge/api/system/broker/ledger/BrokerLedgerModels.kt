package com.openforge.api.system.broker.ledger

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonValue
import jakarta.validation.constraints.NotNull
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

data class BrokerLedgerSyncRequest(
    @field:NotNull
    val startDate: LocalDate,
    @field:NotNull
    val endDate: LocalDate,
    val markets: Set<BrokerLedgerMarket> = setOf(BrokerLedgerMarket.DOMESTIC, BrokerLedgerMarket.OVERSEAS),
    val overseasExchanges: Set<BrokerLedgerOverseasExchange> = BrokerLedgerOverseasExchange.entries.toSet(),
)

data class BrokerLedgerStatusResponse(
    val brokerType: String,
    val liveConfigured: Boolean,
    val latestSyncRun: BrokerLedgerSyncRunResponse?,
    val latestSuccessfulSyncRun: BrokerLedgerSyncRunResponse?,
)

data class BrokerLedgerSyncRunResponse(
    val id: UUID,
    val brokerType: String,
    val status: BrokerLedgerStatus,
    val markets: List<BrokerLedgerMarket>,
    val overseasExchanges: List<BrokerLedgerOverseasExchange>,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val tradeCount: Int,
    val balanceCount: Int,
    val profitCount: Int,
    val errorMessage: String?,
    val requestedAt: OffsetDateTime,
    val startedAt: OffsetDateTime?,
    val completedAt: OffsetDateTime?,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime,
)

data class BrokerLedgerTradeResponse(
    val id: UUID,
    val syncRunId: UUID,
    val market: BrokerLedgerMarket,
    val overseasExchange: BrokerLedgerOverseasExchange?,
    val rowKind: BrokerLedgerRowKind,
    val sourceApi: String,
    val symbol: String?,
    val symbolName: String?,
    val side: String?,
    val orderStatus: String?,
    val orderNumber: String?,
    val executionNumber: String?,
    val quantity: Long?,
    val price: BigDecimal?,
    val filledQuantity: Long?,
    val remainingQuantity: Long?,
    val realizedPnl: BigDecimal?,
    val currency: String?,
    val capturedAt: OffsetDateTime,
)

data class BrokerLedgerBalanceResponse(
    val id: UUID,
    val syncRunId: UUID,
    val market: BrokerLedgerMarket,
    val overseasExchange: BrokerLedgerOverseasExchange?,
    val rowKind: BrokerLedgerRowKind,
    val sourceApi: String,
    val symbol: String?,
    val symbolName: String?,
    val quantity: Long?,
    val averagePrice: BigDecimal?,
    val currentPrice: BigDecimal?,
    val valuationAmount: BigDecimal?,
    val unrealizedPnl: BigDecimal?,
    val realizedPnl: BigDecimal?,
    val profitRate: BigDecimal?,
    val currency: String?,
    val capturedAt: OffsetDateTime,
)

data class BrokerLedgerProfitResponse(
    val id: UUID,
    val syncRunId: UUID,
    val market: BrokerLedgerMarket,
    val overseasExchange: BrokerLedgerOverseasExchange?,
    val rowKind: BrokerLedgerRowKind,
    val sourceApi: String,
    val symbol: String?,
    val symbolName: String?,
    val quantity: Long?,
    val buyAmount: BigDecimal?,
    val sellAmount: BigDecimal?,
    val fees: BigDecimal?,
    val taxes: BigDecimal?,
    val realizedPnl: BigDecimal?,
    val profitRate: BigDecimal?,
    val currency: String?,
    val capturedAt: OffsetDateTime,
)

enum class BrokerLedgerStatus(
    @get:JsonValue val value: String,
) {
    QUEUED("queued"),
    RUNNING("running"),
    SUCCEEDED("succeeded"),
    FAILED("failed"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): BrokerLedgerStatus =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unsupported brokerLedgerStatus: $value")
    }
}

enum class BrokerLedgerMarket(
    @get:JsonValue val value: String,
) {
    DOMESTIC("domestic"),
    OVERSEAS("overseas"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): BrokerLedgerMarket =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unsupported brokerLedgerMarket: $value")
    }
}

enum class BrokerLedgerRowKind(
    @get:JsonValue val value: String,
) {
    ITEM("item"),
    SUMMARY("summary"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): BrokerLedgerRowKind =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unsupported brokerLedgerRowKind: $value")
    }
}

enum class BrokerLedgerOverseasExchange(
    @get:JsonValue val value: String,
    val currency: String,
) {
    NASD("NASD", "USD"),
    NYSE("NYSE", "USD"),
    AMEX("AMEX", "USD"),
    SEHK("SEHK", "HKD"),
    SHAA("SHAA", "CNY"),
    SZAA("SZAA", "CNY"),
    TKSE("TKSE", "JPY"),
    HASE("HASE", "VND"),
    VNSE("VNSE", "VND"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): BrokerLedgerOverseasExchange =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unsupported brokerLedgerOverseasExchange: $value")
    }
}

internal data class BrokerLedgerSyncRunRecord(
    val id: UUID,
    val brokerType: String,
    val status: BrokerLedgerStatus,
    val markets: List<BrokerLedgerMarket>,
    val overseasExchanges: List<BrokerLedgerOverseasExchange>,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val tradeCount: Int,
    val balanceCount: Int,
    val profitCount: Int,
    val errorMessage: String?,
    val requestedAt: OffsetDateTime,
    val startedAt: OffsetDateTime?,
    val completedAt: OffsetDateTime?,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime,
)

internal data class BrokerLedgerTradeInput(
    val market: BrokerLedgerMarket,
    val overseasExchange: BrokerLedgerOverseasExchange?,
    val rowKind: BrokerLedgerRowKind,
    val sourceApi: String,
    val symbol: String?,
    val symbolName: String?,
    val side: String?,
    val orderStatus: String?,
    val orderNumber: String?,
    val executionNumber: String?,
    val quantity: Long?,
    val price: BigDecimal?,
    val filledQuantity: Long?,
    val remainingQuantity: Long?,
    val realizedPnl: BigDecimal?,
    val currency: String?,
    val capturedAt: OffsetDateTime,
    val rawPayload: tools.jackson.databind.JsonNode,
)

internal data class BrokerLedgerBalanceInput(
    val market: BrokerLedgerMarket,
    val overseasExchange: BrokerLedgerOverseasExchange?,
    val rowKind: BrokerLedgerRowKind,
    val sourceApi: String,
    val symbol: String?,
    val symbolName: String?,
    val quantity: Long?,
    val averagePrice: BigDecimal?,
    val currentPrice: BigDecimal?,
    val valuationAmount: BigDecimal?,
    val unrealizedPnl: BigDecimal?,
    val realizedPnl: BigDecimal?,
    val profitRate: BigDecimal?,
    val currency: String?,
    val capturedAt: OffsetDateTime,
    val rawPayload: tools.jackson.databind.JsonNode,
)

internal data class BrokerLedgerProfitInput(
    val market: BrokerLedgerMarket,
    val overseasExchange: BrokerLedgerOverseasExchange?,
    val rowKind: BrokerLedgerRowKind,
    val sourceApi: String,
    val symbol: String?,
    val symbolName: String?,
    val quantity: Long?,
    val buyAmount: BigDecimal?,
    val sellAmount: BigDecimal?,
    val fees: BigDecimal?,
    val taxes: BigDecimal?,
    val realizedPnl: BigDecimal?,
    val profitRate: BigDecimal?,
    val currency: String?,
    val capturedAt: OffsetDateTime,
    val rawPayload: tools.jackson.databind.JsonNode,
)

internal data class BrokerLedgerSyncPayload(
    val trades: List<BrokerLedgerTradeInput>,
    val balances: List<BrokerLedgerBalanceInput>,
    val profits: List<BrokerLedgerProfitInput>,
)
