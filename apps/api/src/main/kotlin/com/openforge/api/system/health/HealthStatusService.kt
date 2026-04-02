package com.openforge.api.system.health

import com.openforge.api.config.ApplicationProperties
import org.springframework.boot.info.BuildProperties
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import java.time.OffsetDateTime
import javax.sql.DataSource

@Service
class HealthStatusService(
    private val jdbcTemplate: JdbcTemplate,
    private val dataSource: DataSource,
    private val applicationProperties: ApplicationProperties,
    private val buildProperties: BuildProperties?,
) {
    fun read(): HealthResponse {
        val databaseProduct =
            dataSource.connection.use { connection ->
                connection.metaData.databaseProductName
            }

        jdbcTemplate.queryForObject("select 1", Int::class.java)

        return HealthResponse(
            status = "UP",
            appName = "OpenForge API",
            version = buildProperties?.version ?: "0.0.1-SNAPSHOT",
            timestamp = OffsetDateTime.now(),
            database =
                DatabaseStatus(
                    status = "UP",
                    product = databaseProduct,
                ),
            environment = applicationProperties.environment,
            mode = applicationProperties.mode,
        )
    }
}
