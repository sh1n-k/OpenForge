package com.openforge.api.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("app")
data class ApplicationProperties(
    val environment: String = "local",
    val mode: String = "paper",
    val webOrigin: String = "http://127.0.0.1:3000",
    val auth: AuthProperties = AuthProperties(),
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
