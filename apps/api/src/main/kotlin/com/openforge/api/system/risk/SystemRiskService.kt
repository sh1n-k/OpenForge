package com.openforge.api.system.risk

import com.openforge.api.strategy.web.GlobalRiskEventResponse
import com.openforge.api.strategy.web.GlobalRiskResponse
import com.openforge.api.strategy.web.UpdateGlobalRiskKillSwitchRequest
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import tools.jackson.databind.ObjectMapper
import java.sql.Timestamp
import java.time.OffsetDateTime
import java.time.ZoneOffset

@Service
class SystemRiskService(
    private val jdbcTemplate: JdbcTemplate,
    private val objectMapper: ObjectMapper,
) {

    fun getGlobalRisk(): GlobalRiskResponse {
        val state = globalRiskState()
        return GlobalRiskResponse(
            killSwitchEnabled = state.enabled,
            updatedAt = state.updatedAt,
        )
    }

    fun updateGlobalKillSwitch(request: UpdateGlobalRiskKillSwitchRequest): GlobalRiskResponse {
        val payload = objectMapper.writeValueAsString(
            mapOf("enabled" to request.enabled),
        )
        jdbcTemplate.update(
            """
                insert into app_config (key, value, updated_at)
                values (?, cast(? as jsonb), now())
                on conflict (key) do update set
                    value = excluded.value,
                    updated_at = now()
            """.trimIndent(),
            GLOBAL_KILL_SWITCH_KEY,
            payload,
        )
        jdbcTemplate.update(
            """
                insert into app_event_log (event_type, level, payload, created_at)
                values (?, ?, cast(? as jsonb), now())
            """.trimIndent(),
            GLOBAL_KILL_SWITCH_EVENT_TYPE,
            "info",
            payload,
        )
        return getGlobalRisk()
    }

    fun listGlobalRiskEvents(limit: Int): List<GlobalRiskEventResponse> = jdbcTemplate.query(
        """
            select id, event_type, level, payload::text as payload_text, created_at
            from app_event_log
            where event_type = ?
            order by created_at desc
            limit ?
        """.trimIndent(),
        { rs, _ ->
            val payload = objectMapper.readValue(rs.getString("payload_text"), Map::class.java) as Map<String, Any?>
            val enabled = payload["enabled"] as? Boolean ?: false
            GlobalRiskEventResponse(
                id = rs.getLong("id"),
                eventType = rs.getString("event_type"),
                reasonCode = if (enabled) "global_kill_switch_enabled" else "global_kill_switch_disabled",
                message = if (enabled) "전역 킬 스위치 활성화" else "전역 킬 스위치 비활성화",
                payload = payload,
                occurredAt = rs.getTimestamp("created_at").toOffsetDateTimeUtc(),
            )
        },
        GLOBAL_KILL_SWITCH_EVENT_TYPE,
        normalizeLimit(limit, 20),
    )

    fun isGlobalKillSwitchEnabled(): Boolean {
        return globalRiskState().enabled
    }

    private fun globalRiskState(): GlobalRiskState {
        val row = jdbcTemplate.query(
            "select value::text as value_text, updated_at from app_config where key = ?",
            { rs, _ ->
                val payload = objectMapper.readValue(rs.getString("value_text"), Map::class.java) as Map<String, Any?>
                GlobalRiskState(
                    enabled = payload["enabled"] as? Boolean ?: false,
                    updatedAt = rs.getTimestamp("updated_at").toOffsetDateTimeUtc(),
                )
            },
            GLOBAL_KILL_SWITCH_KEY,
        ).firstOrNull()
        return row ?: GlobalRiskState(enabled = false, updatedAt = null)
    }

    private fun normalizeLimit(value: Int, defaultValue: Int): Int = value.coerceIn(1, 100).takeIf { it > 0 } ?: defaultValue

    private fun Timestamp.toOffsetDateTimeUtc(): OffsetDateTime = toInstant().atOffset(ZoneOffset.UTC)

    companion object {
        const val GLOBAL_KILL_SWITCH_KEY: String = "risk.global_kill_switch"
        const val GLOBAL_KILL_SWITCH_EVENT_TYPE: String = "risk_global_kill_switch_changed"
    }
}

private data class GlobalRiskState(
    val enabled: Boolean,
    val updatedAt: OffsetDateTime?,
)
