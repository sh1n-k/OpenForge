package com.openforge.api.system.health

import java.time.OffsetDateTime

data class HealthResponse(
    val status: String,
    val appName: String,
    val version: String,
    val timestamp: OffsetDateTime,
    val database: DatabaseStatus,
    val environment: String,
    val mode: String,
)

data class DatabaseStatus(
    val status: String,
    val product: String,
)

