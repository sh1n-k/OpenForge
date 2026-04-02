package com.openforge.api.system.activity

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import java.sql.Timestamp
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

@Service
class SystemActivityService(
    private val jdbcTemplate: JdbcTemplate,
) {

    fun listEvents(limit: Int, category: String?): List<ActivityEventResponse> {
        val normalized = normalizeLimit(limit, 100)

        val unions = buildList {
            if (category == null || category == "execution") {
                add(
                    """
                    select 'execution-' || r.id::text as id,
                           'execution' as category,
                           r.strategy_id as strategy_id,
                           s.name as strategy_name,
                           case when r.error_message is not null then r.error_message
                                else 'Execution run ' || r.status end as summary,
                           case when r.error_message is not null then 'error' else 'info' end as severity,
                           coalesce(r.completed_at, r.started_at) as occurred_at
                    from strategy_execution_run r
                    left join strategy s on s.id = r.strategy_id
                    """.trimIndent(),
                )
            }

            if (category == null || category == "signal") {
                add(
                    """
                    select 'signal-' || e.id::text as id,
                           'signal' as category,
                           e.strategy_id as strategy_id,
                           s.name as strategy_name,
                           e.signal_type || ' signal for ' || e.symbol as summary,
                           'info' as severity,
                           e.created_at as occurred_at
                    from strategy_signal_event e
                    left join strategy s on s.id = e.strategy_id
                    """.trimIndent(),
                )
            }

            if (category == null || category == "order") {
                add(
                    """
                    select 'order-' || o.id::text as id,
                           'order' as category,
                           o.strategy_id as strategy_id,
                           s.name as strategy_name,
                           o.side || ' ' || o.quantity || ' @ ' || o.price || ' (' || o.status || ')' as summary,
                           case when o.status like 'REJECTED%' then 'error' else 'info' end as severity,
                           o.requested_at as occurred_at
                    from strategy_order_request o
                    left join strategy s on s.id = o.strategy_id
                    """.trimIndent(),
                )
            }

            if (category == null || category == "risk") {
                add(
                    """
                    select 'risk-' || re.id::text as id,
                           'risk' as category,
                           re.strategy_id as strategy_id,
                           s.name as strategy_name,
                           re.message as summary,
                           'warn' as severity,
                           re.occurred_at as occurred_at
                    from strategy_risk_event re
                    left join strategy s on s.id = re.strategy_id
                    """.trimIndent(),
                )
            }

            if (category == null || category == "broker") {
                add(
                    """
                    select 'broker-' || b.id::text as id,
                           'broker' as category,
                           null::uuid as strategy_id,
                           null as strategy_name,
                           b.message as summary,
                           case when b.event_type = 'connection_test_failed' then 'error' else 'info' end as severity,
                           b.occurred_at as occurred_at
                    from broker_connection_event b
                    """.trimIndent(),
                )
            }

            if (category == null || category == "system") {
                add(
                    """
                    select 'system-' || l.id::text as id,
                           'system' as category,
                           null::uuid as strategy_id,
                           null as strategy_name,
                           l.event_type as summary,
                           l.level as severity,
                           l.created_at as occurred_at
                    from app_event_log l
                    """.trimIndent(),
                )
            }
        }

        if (unions.isEmpty()) {
            return emptyList()
        }

        val sql = unions.joinToString(" union all ") + " order by occurred_at desc limit ?"

        return jdbcTemplate.query(sql, { rs, _ ->
            ActivityEventResponse(
                id = rs.getString("id"),
                category = rs.getString("category"),
                strategyId = rs.getString("strategy_id")?.let { UUID.fromString(it) },
                strategyName = rs.getString("strategy_name"),
                summary = rs.getString("summary"),
                severity = rs.getString("severity"),
                occurredAt = rs.getTimestamp("occurred_at").toOffsetDateTimeUtc(),
            )
        }, normalized)
    }

    private fun normalizeLimit(value: Int, defaultValue: Int): Int = value.coerceIn(1, 500).takeIf { it > 0 } ?: defaultValue

    private fun Timestamp.toOffsetDateTimeUtc(): OffsetDateTime = toInstant().atOffset(ZoneOffset.UTC)
}
