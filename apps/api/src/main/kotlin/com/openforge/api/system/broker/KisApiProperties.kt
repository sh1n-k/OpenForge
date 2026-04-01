package com.openforge.api.system.broker

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("app.kis")
data class KisApiProperties(
    val paperBaseUrl: String = "https://openapivts.koreainvestment.com:29443",
    val liveBaseUrl: String = "https://openapi.koreainvestment.com:9443",
    val connectTimeoutMillis: Long = 5_000,
    val readTimeoutMillis: Long = 5_000,
)
