package com.openforge.api.system.broker

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonValue
import com.openforge.api.strategy.domain.OrderMode
import jakarta.validation.constraints.NotNull
import java.time.OffsetDateTime
import java.util.UUID

data class UpdateBrokerConnectionRequest(
    @field:NotNull
    val targetMode: OrderMode,
    val appKey: String? = null,
    val appSecret: String? = null,
    val accountNumber: String? = null,
    val productCode: String? = null,
    @field:NotNull
    val enabled: Boolean,
)

data class TestBrokerConnectionRequest(
    @field:NotNull
    val targetMode: OrderMode,
)

data class BrokerConnectionResponse(
    val brokerType: String,
    val targetMode: OrderMode,
    val enabled: Boolean,
    val isConfigured: Boolean,
    val maskedAppKey: String?,
    val maskedAccountNumber: String?,
    val maskedProductCode: String?,
    val lastConnectionTestAt: OffsetDateTime?,
    val lastConnectionTestStatus: BrokerConnectionTestStatus?,
    val lastConnectionTestMessage: String?,
)

data class SystemBrokerStatusResponse(
    val currentSystemMode: OrderMode,
    val paper: BrokerConnectionResponse,
    val live: BrokerConnectionResponse,
    val hasPaperConfig: Boolean,
    val hasLiveConfig: Boolean,
    val isCurrentModeConfigured: Boolean,
)

data class BrokerConnectionEventResponse(
    val id: UUID,
    val targetMode: OrderMode,
    val eventType: BrokerConnectionEventType,
    val message: String,
    val payload: Map<String, Any?>,
    val occurredAt: OffsetDateTime,
)

enum class BrokerConnectionEventType(@get:JsonValue val value: String) {
    CONFIG_SAVED("config_saved"),
    CONNECTION_TEST_SUCCEEDED("connection_test_succeeded"),
    CONNECTION_TEST_FAILED("connection_test_failed"),
    ENABLED_CHANGED("enabled_changed"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): BrokerConnectionEventType = entries.firstOrNull { it.value == value }
            ?: throw IllegalArgumentException("Unsupported brokerConnectionEventType: $value")
    }
}

enum class BrokerConnectionTestStatus(@get:JsonValue val value: String) {
    SUCCESS("success"),
    FAILED("failed"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): BrokerConnectionTestStatus = entries.firstOrNull { it.value == value }
            ?: throw IllegalArgumentException("Unsupported brokerConnectionTestStatus: $value")
    }
}
