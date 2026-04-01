package com.openforge.api.support

import org.junit.jupiter.api.BeforeEach
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.context.TestPropertySource
import org.testcontainers.containers.PostgreSQLContainer

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(
    properties = [
        "app.web-origin=http://127.0.0.1:3000",
        "app.environment=test",
        "app.mode=paper",
    ],
)
abstract class PostgresIntegrationTestSupport {

    @Autowired
    lateinit var jdbcTemplate: JdbcTemplate

    @BeforeEach
    fun cleanupData() {
        jdbcTemplate.execute(
            "truncate table strategy_order_request, strategy_signal_event, strategy_execution_run, strategy_execution_config, backtest_equity_point, backtest_trade, backtest_run, market_daily_bar, strategy_universe, universe_symbol, strategy_version, strategy, universe restart identity cascade",
        )
    }

    companion object {
        @JvmStatic
        @DynamicPropertySource
        fun registerProperties(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", SharedPostgresContainer.instance::getJdbcUrl)
            registry.add("spring.datasource.username", SharedPostgresContainer.instance::getUsername)
            registry.add("spring.datasource.password", SharedPostgresContainer.instance::getPassword)
        }
    }
}

private object SharedPostgresContainer {
    val instance: PostgreSQLContainer<*> = PostgreSQLContainer("postgres:18-alpine").apply {
        start()
    }
}
