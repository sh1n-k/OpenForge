package com.openforge.api.strategy

import com.openforge.api.support.PostgresIntegrationTestSupport
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import tools.jackson.databind.json.JsonMapper

class StrategyApiIntegrationTest : PostgresIntegrationTestSupport() {
    @Autowired
    lateinit var mockMvc: MockMvc

    private val objectMapper =
        JsonMapper
            .builder()
            .findAndAddModules()
            .build()

    @Test
    fun `creates strategy with initial version and returns detail`() {
        mockMvc
            .perform(
                post("/api/v1/strategies")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "name" to "KIS Builder",
                                "description" to "builder draft",
                                "strategyType" to "builder",
                                "initialPayload" to
                                    mapOf(
                                        "payloadFormat" to "builder_json",
                                        "payload" to validBuilderPayload("KIS Builder", "builder draft"),
                                        "changeSummary" to "initial draft",
                                    ),
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.name").value("KIS Builder"))
            .andExpect(jsonPath("$.latestVersionNumber").value(1))
            .andExpect(jsonPath("$.versionCount").value(1))
            .andExpect(jsonPath("$.latestValidationStatus").value("valid"))
            .andExpect(jsonPath("$.latestVersion.payloadFormat").value("builder_json"))
    }

    @Test
    fun `returns problem detail for invalid payload format`() {
        mockMvc
            .perform(
                post("/api/v1/strategies")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "name" to "Broken",
                                "strategyType" to "builder",
                                "initialPayload" to
                                    mapOf(
                                        "payloadFormat" to "code_text",
                                        "payload" to mapOf("source" to "print('x')"),
                                    ),
                            ),
                        ),
                    ),
            ).andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.title").value("Bad Request"))
    }

    @Test
    fun `validates builder payload and returns yaml preview`() {
        mockMvc
            .perform(
                post("/api/v1/strategies/validate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "strategyType" to "builder",
                                "payloadFormat" to "builder_json",
                                "payload" to validBuilderPayload("Preview Builder", "preview"),
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.valid").value(true))
            .andExpect(jsonPath("$.normalizedSpec.strategy.id").value("preview_builder"))
            .andExpect(jsonPath("$.yamlPreview").value(org.hamcrest.Matchers.containsString("metadata:")))
    }

    @Test
    fun `archives strategy instead of deleting it`() {
        val strategyId =
            mockMvc
                .perform(
                    post("/api/v1/strategies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            objectMapper.writeValueAsBytes(
                                mapOf(
                                    "name" to "Archive Me",
                                    "strategyType" to "code",
                                    "initialPayload" to
                                        mapOf(
                                            "payloadFormat" to "code_text",
                                            "payload" to validCodePayload("Archive Me"),
                                        ),
                                ),
                            ),
                        ),
                ).andReturn()
                .response
                .contentAsString
                .let { objectMapper.readTree(it).get("id").asText() }

        mockMvc
            .perform(delete("/api/v1/strategies/$strategyId"))
            .andExpect(status().isOk)

        mockMvc
            .perform(get("/api/v1/strategies"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(0)))
    }

    private fun validBuilderPayload(
        name: String,
        description: String,
    ) = mapOf(
        "builderState" to
            mapOf(
                "metadata" to
                    mapOf(
                        "id" to name.lowercase().replace(" ", "_"),
                        "name" to name,
                        "description" to description,
                        "category" to "custom",
                        "author" to "OpenForge",
                        "tags" to listOf("builder"),
                    ),
                "indicators" to
                    listOf(
                        mapOf(
                            "indicatorId" to "sma",
                            "alias" to "sma_fast",
                            "params" to mapOf("period" to 5),
                            "output" to "value",
                        ),
                    ),
                "entry" to
                    mapOf(
                        "logic" to "AND",
                        "conditions" to emptyList<Map<String, Any?>>(),
                    ),
                "exit" to
                    mapOf(
                        "logic" to "AND",
                        "conditions" to emptyList<Map<String, Any?>>(),
                    ),
                "risk" to
                    mapOf(
                        "stopLoss" to mapOf("enabled" to false, "percent" to 0),
                        "takeProfit" to mapOf("enabled" to false, "percent" to 0),
                        "trailingStop" to mapOf("enabled" to false, "percent" to 0),
                    ),
            ),
    )

    private fun validCodePayload(name: String) =
        mapOf(
            "source" to
                """
                version: "1.0"
                metadata:
                  name: "$name"
                  description: "code strategy"
                  author: "OpenForge"
                  tags: ["code"]
                strategy:
                  id: "${name.lowercase().replace(" ", "_")}"
                  category: "custom"
                  indicators:
                    - id: "sma"
                      alias: "sma_fast"
                      params:
                        period: 5
                      output: "value"
                  entry:
                    logic: "AND"
                    conditions: []
                  exit:
                    logic: "AND"
                    conditions: []
                risk:
                  stop_loss:
                    enabled: false
                    percent: 0
                  take_profit:
                    enabled: false
                    percent: 0
                  trailing_stop:
                    enabled: false
                    percent: 0
                """.trimIndent(),
            "sourceKind" to "openforge_yaml",
        )
}
