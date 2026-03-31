package com.openforge.api.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("app")
data class ApplicationProperties(
    val environment: String = "local",
    val mode: String = "paper",
    val webOrigin: String = "http://127.0.0.1:3000",
)
