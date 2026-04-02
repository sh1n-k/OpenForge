package com.openforge.api.system.activity

import java.time.OffsetDateTime
import java.util.UUID

data class ActivityEventResponse(
    val id: String,
    val category: String,
    val strategyId: UUID?,
    val strategyName: String?,
    val summary: String,
    val severity: String,
    val occurredAt: OffsetDateTime,
)
