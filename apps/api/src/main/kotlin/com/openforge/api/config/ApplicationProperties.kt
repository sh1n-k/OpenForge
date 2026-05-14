package com.openforge.api.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("app")
data class ApplicationProperties(
    val environment: String = "local",
    val mode: String = "paper",
    val webOrigin: String = "http://127.0.0.1:3000",
    val auth: AuthProperties = AuthProperties(),
    val liveTrading: LiveTradingProperties = LiveTradingProperties(),
) {
    init {
        if (environment != "local" && environment != "test") {
            require(auth.jwtSecret.isNotBlank()) {
                "OPENFORGE_JWT_SECRET must be set in non-local environments (current: $environment)"
            }
        }
    }
}

data class AuthProperties(
    val password: String = "",
    val jwtSecret: String = "",
    val tokenExpiryHours: Long = 24,
    val refreshExpiryDays: Long = 7,
)

data class LiveTradingProperties(
    val enabled: Boolean = false,
    val mockBroker: Boolean = true,
    val allowLiveBroker: Boolean = false,
    val maxOrderNotional: java.math.BigDecimal = java.math.BigDecimal("100000.000000"),
    val maxConsecutiveFailures: Int = 3,
)
