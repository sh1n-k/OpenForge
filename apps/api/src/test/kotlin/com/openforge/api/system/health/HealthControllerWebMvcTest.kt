package com.openforge.api.system.health

import com.openforge.api.config.SecurityConfig
import com.openforge.api.config.WebConfig
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.info.BuildProperties
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.ComponentScan
import org.springframework.context.annotation.FilterType
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.OffsetDateTime
import java.util.Properties

@WebMvcTest(
    controllers = [HealthController::class],
    excludeFilters = [
        ComponentScan.Filter(
            type = FilterType.ASSIGNABLE_TYPE,
            classes = [WebConfig::class, SecurityConfig::class],
        ),
    ],
)
@Import(HealthControllerWebMvcTest.TestConfig::class)
class HealthControllerWebMvcTest {
    @Autowired
    lateinit var mockMvc: MockMvc

    @MockitoBean
    lateinit var healthStatusService: HealthStatusService

    @Test
    fun `returns health payload`() {
        given(healthStatusService.read()).willReturn(
            HealthResponse(
                status = "UP",
                appName = "OpenForge API",
                version = "0.0.1-SNAPSHOT",
                timestamp = OffsetDateTime.parse("2026-03-31T22:30:00+09:00"),
                database =
                    DatabaseStatus(
                        status = "UP",
                        product = "PostgreSQL",
                    ),
                environment = "test",
                mode = "paper",
            ),
        )

        mockMvc
            .perform(
                get("/api/v1/health")
                    .accept(MediaType.APPLICATION_JSON),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("UP"))
            .andExpect(jsonPath("$.appName").value("OpenForge API"))
            .andExpect(jsonPath("$.database.status").value("UP"))
            .andExpect(jsonPath("$.environment").value("test"))
            .andExpect(jsonPath("$.mode").value("paper"))
    }

    @TestConfiguration
    class TestConfig {
        @Bean
        fun buildProperties(): BuildProperties =
            BuildProperties(
                Properties().apply {
                    put("group", "com.openforge")
                    put("artifact", "openforge-api")
                    put("name", "OpenForge API")
                    put("version", "0.0.1-SNAPSHOT")
                    put("time", "2026-03-31T13:30:00Z")
                },
            )
    }
}
