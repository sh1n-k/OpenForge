package com.openforge.api.strategy

import com.openforge.api.strategy.application.StrategyService
import com.openforge.api.strategy.domain.PayloadFormat
import com.openforge.api.strategy.domain.StrategyType
import com.openforge.api.strategy.web.CreateStrategyRequest
import com.openforge.api.strategy.web.StrategyPayloadRequest
import com.openforge.api.support.PostgresIntegrationTestSupport
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import tools.jackson.databind.json.JsonMapper

class UniverseApiIntegrationTest : PostgresIntegrationTestSupport() {
    @Autowired
    lateinit var mockMvc: MockMvc

    private val objectMapper =
        JsonMapper
            .builder()
            .findAndAddModules()
            .build()

    @Autowired
    lateinit var strategyService: StrategyService

    @Test
    fun `replaces universe symbols and updates strategy links`() {
        val universeId =
            mockMvc
                .perform(
                    post("/api/v1/universes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            objectMapper.writeValueAsBytes(
                                mapOf(
                                    "name" to "Semis",
                                    "marketScope" to "domestic",
                                    "description" to "KR semis",
                                ),
                            ),
                        ),
                ).andReturn()
                .response
                .contentAsString
                .let { objectMapper.readTree(it).get("id").asText() }

        seedSymbolMaster("005930", "domestic")
        seedSymbolMaster("000660", "domestic")
        mockMvc
            .perform(
                put("/api/v1/universes/$universeId/symbols")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "symbols" to
                                    listOf(
                                        mapOf("symbol" to "005930", "exchange" to "kospi", "displayName" to "삼성전자", "market" to "domestic", "sortOrder" to 0),
                                        mapOf("symbol" to "000660", "exchange" to "kospi", "displayName" to "SK하이닉스", "market" to "domestic", "sortOrder" to 1),
                                    ),
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.symbolCount").value(2))
            .andExpect(jsonPath("$.marketScope").value("domestic"))
            .andExpect(jsonPath("$.symbols[0].symbol").value("005930"))
            .andExpect(jsonPath("$.symbols[0].exchange").value("kospi"))

        val strategy =
            strategyService.createStrategy(
                CreateStrategyRequest(
                    name = "Universe Link",
                    description = null,
                    strategyType = StrategyType.CODE,
                    initialPayload =
                        StrategyPayloadRequest(
                            payloadFormat = PayloadFormat.CODE_TEXT,
                            payload =
                                mapOf(
                                    "source" to
                                        """
                                        version: "1.0"
                                        metadata:
                                          name: "Universe Link"
                                          description: "code strategy"
                                          author: "OpenForge"
                                          tags: ["code"]
                                        strategy:
                                          id: "universe_link"
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
                                ),
                            changeSummary = "initial",
                        ),
                ),
            )

        mockMvc
            .perform(
                put("/api/v1/strategies/${strategy.id}/universes")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(mapOf("universeIds" to listOf(universeId)))),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.universeCount").value(1))
            .andExpect(jsonPath("$.universes[0].name").value("Semis"))
    }

    @Test
    fun `rejects symbols whose market scope does not match the universe`() {
        val universeId =
            mockMvc
                .perform(
                    post("/api/v1/universes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            objectMapper.writeValueAsBytes(
                                mapOf(
                                    "name" to "KR Only",
                                    "marketScope" to "domestic",
                                    "description" to "KR only",
                                ),
                            ),
                        ),
                ).andReturn()
                .response
                .contentAsString
                .let { objectMapper.readTree(it).get("id").asText() }

        mockMvc
            .perform(
                put("/api/v1/universes/$universeId/symbols")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "symbols" to
                                    listOf(
                                        mapOf(
                                            "symbol" to "AAPL",
                                            "exchange" to "nasdaq",
                                            "displayName" to "Apple",
                                            "market" to "us",
                                            "sortOrder" to 0,
                                        ),
                                    ),
                            ),
                        ),
                    ),
            ).andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("market scope")))
    }

    @Test
    fun `rejects symbols when exchange is missing`() {
        seedSymbolMaster("005930", "domestic")
        val universeId =
            mockMvc
                .perform(
                    post("/api/v1/universes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            objectMapper.writeValueAsBytes(
                                mapOf(
                                    "name" to "KR Missing Exchange",
                                    "marketScope" to "domestic",
                                ),
                            ),
                        ),
                ).andReturn()
                .response
                .contentAsString
                .let { objectMapper.readTree(it).get("id").asText() }

        mockMvc
            .perform(
                put("/api/v1/universes/$universeId/symbols")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "symbols" to
                                    listOf(
                                        mapOf(
                                            "symbol" to "005930",
                                            "displayName" to "삼성전자",
                                            "market" to "domestic",
                                            "sortOrder" to 0,
                                        ),
                                    ),
                            ),
                        ),
                    ),
            ).andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("exchange")))
    }

    private fun seedSymbolMaster(
        symbol: String,
        marketScope: String,
    ) {
        val exchange = if (marketScope == "us") "nasdaq" else "kospi"
        jdbcTemplate.update(
            """
            insert into symbol_master (market_scope, code, exchange, name)
            values (?, ?, ?, ?)
            on conflict do nothing
            """.trimIndent(),
            marketScope,
            symbol.uppercase(),
            exchange,
            symbol,
        )
    }
}
