package com.openforge.api.system.health

import com.openforge.api.support.PostgresIntegrationTestSupport
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class DatabaseMigrationIntegrationTest : PostgresIntegrationTestSupport() {
    @Test
    fun `creates bootstrap tables through flyway`() {
        val tables =
            jdbcTemplate.queryForList(
                """
                select table_name
                from information_schema.tables
                where table_schema = 'public'
                """.trimIndent(),
                String::class.java,
            )

        assertTrue(
            tables.containsAll(
                listOf(
                    "app_config",
                    "app_event_log",
                    "strategy",
                    "strategy_version",
                    "universe",
                    "universe_symbol",
                    "strategy_universe",
                    "market_daily_bar",
                    "backtest_run",
                    "backtest_trade",
                    "backtest_equity_point",
                ),
            ),
        )
    }
}
