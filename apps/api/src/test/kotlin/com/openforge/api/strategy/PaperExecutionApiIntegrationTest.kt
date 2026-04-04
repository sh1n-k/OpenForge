package com.openforge.api.strategy

import com.openforge.api.strategy.application.PaperExecutionService
import com.openforge.api.support.PostgresIntegrationTestSupport
import com.openforge.api.symbol.SymbolMasterEntity
import com.openforge.api.symbol.SymbolMasterRepository
import org.hamcrest.Matchers.containsString
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import tools.jackson.databind.json.JsonMapper
import java.time.ZonedDateTime

class PaperExecutionApiIntegrationTest : PostgresIntegrationTestSupport() {
    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var paperExecutionService: PaperExecutionService

    @Autowired
    lateinit var symbolMasterRepository: SymbolMasterRepository

    private val objectMapper = JsonMapper.builder().findAndAddModules().build()

    @Test
    fun `enables only after backtest completed`() {
        val strategyId = createStrategy("Paper Enable Guard")
        val universeId = createUniverse("KR Core", "AAA")
        linkStrategyUniverse(strategyId, universeId)

        mockMvc
            .perform(
                put("/api/v1/strategies/$strategyId/execution")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "enabled" to true,
                                "scheduleTime" to "09:00",
                            ),
                        ),
                    ),
            ).andExpect(status().isConflict)
            .andExpect(jsonPath("$.detail").value(containsString("backtested")))

        markBacktestCompleted(strategyId)

        mockMvc
            .perform(
                put("/api/v1/strategies/$strategyId/execution")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "enabled" to true,
                                "scheduleTime" to "09:00",
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.enabled").value(true))
            .andExpect(jsonPath("$.strategyStatus").value("running"))
            .andExpect(jsonPath("$.scheduleTime").value("09:00"))
    }

    @Test
    fun `rejects enabling when universe is missing`() {
        val strategyId = createStrategy("Paper No Universe")
        markBacktestCompleted(strategyId)

        mockMvc
            .perform(
                put("/api/v1/strategies/$strategyId/execution")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "enabled" to true,
                                "scheduleTime" to "09:00",
                            ),
                        ),
                    ),
            ).andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.detail").value(containsString("linked symbol")))
    }

    @Test
    fun `processes due schedule once and stores signals`() {
        importCsv(
            """
            symbol,date,open,high,low,close,volume
            AAA,2026-01-01,10,10,10,10,1000
            AAA,2026-01-02,9,9,9,9,1000
            AAA,2026-01-05,12,12,12,12,1000
            """.trimIndent(),
        )

        val strategyId = createStrategy("Paper Scheduled")
        val universeId = createUniverse("KR Core", "AAA")
        linkStrategyUniverse(strategyId, universeId)
        markBacktestCompleted(strategyId)
        enableExecution(strategyId, "09:00")

        val now = ZonedDateTime.parse("2026-01-05T09:30:00+09:00[Asia/Seoul]")
        paperExecutionService.processDueExecutionsAt(now)
        paperExecutionService.processDueExecutionsAt(now.plusMinutes(1))

        mockMvc
            .perform(get("/api/v1/strategies/$strategyId/execution/runs?limit=20"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(1)))
            .andExpect(jsonPath("$[0].status").value("completed"))
            .andExpect(jsonPath("$[0].signalCount").value(1))

        mockMvc
            .perform(get("/api/v1/strategies/$strategyId/signals?limit=50"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(1)))
            .andExpect(jsonPath("$[0].symbol").value("AAA"))
            .andExpect(jsonPath("$[0].signalType").value("entry"))

        mockMvc
            .perform(get("/api/v1/strategies/$strategyId/execution"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.lastRun.signalCount").value(1))
    }

    @Test
    fun `stores completed run even when no signals were generated`() {
        importCsv(
            """
            symbol,date,open,high,low,close,volume
            AAA,2026-01-01,10,10,10,10,1000
            AAA,2026-01-02,10,10,10,10,1000
            AAA,2026-01-03,10,10,10,10,1000
            """.trimIndent(),
        )

        val strategyId = createStrategy("No Signal Strategy", payload = noSignalPayload("No Signal Strategy"))
        val universeId = createUniverse("KR Core", "AAA")
        linkStrategyUniverse(strategyId, universeId)
        markBacktestCompleted(strategyId)
        enableExecution(strategyId, "09:00")

        paperExecutionService.processDueExecutionsAt(
            ZonedDateTime.parse("2026-01-03T09:30:00+09:00[Asia/Seoul]"),
        )

        mockMvc
            .perform(get("/api/v1/strategies/$strategyId/execution/runs?limit=20"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].status").value("completed"))
            .andExpect(jsonPath("$[0].signalCount").value(0))

        mockMvc
            .perform(get("/api/v1/strategies/$strategyId/signals?limit=50"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(0)))
    }

    @Test
    fun `disables execution when a new version is appended`() {
        val strategyId = createStrategy("Draft On Version")
        val universeId = createUniverse("KR Core", "AAA")
        linkStrategyUniverse(strategyId, universeId)
        markBacktestCompleted(strategyId)
        enableExecution(strategyId, "09:00")

        mockMvc
            .perform(
                post("/api/v1/strategies/$strategyId/versions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "payloadFormat" to "builder_json",
                                "payload" to validBuilderPayload("Draft On Version"),
                                "changeSummary" to "new draft",
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)

        mockMvc
            .perform(get("/api/v1/strategies/$strategyId"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("draft"))

        mockMvc
            .perform(get("/api/v1/strategies/$strategyId/execution"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.enabled").value(false))
            .andExpect(jsonPath("$.strategyStatus").value("draft"))
    }

    @Test
    fun `rejects enabling when linked universe is overseas`() {
        symbolMasterRepository.save(
            SymbolMasterEntity(
                marketScope = "us",
                code = "AAPL",
                exchange = "nasdaq",
                name = "Apple",
            ),
        )

        val strategyId = createStrategy("Paper Overseas Guard")
        val universeId = createUniverse("US Core", "AAPL", "us")
        linkStrategyUniverse(strategyId, universeId)
        markBacktestCompleted(strategyId)

        mockMvc
            .perform(
                put("/api/v1/strategies/$strategyId/execution")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "enabled" to true,
                                "scheduleTime" to "09:00",
                            ),
                        ),
                    ),
            ).andExpect(status().isConflict)
            .andExpect(jsonPath("$.detail").value(containsString("overseas universes")))
    }

    @Test
    fun `disables execution when overseas universe is linked later`() {
        val strategyId = createStrategy("Paper Overseas Rewire")
        val domesticUniverseId = createUniverse("KR Core", "AAA")
        linkStrategyUniverse(strategyId, domesticUniverseId)
        markBacktestCompleted(strategyId)
        enableExecution(strategyId, "09:00")

        symbolMasterRepository.save(
            SymbolMasterEntity(
                marketScope = "us",
                code = "AAPL",
                exchange = "nasdaq",
                name = "Apple",
            ),
        )
        val overseasUniverseId = createUniverse("US Core", "AAPL", "us")

        mockMvc
            .perform(
                put("/api/v1/strategies/$strategyId/universes")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(mapOf("universeIds" to listOf(domesticUniverseId, overseasUniverseId)))),
            ).andExpect(status().isOk)

        mockMvc
            .perform(get("/api/v1/strategies/$strategyId/execution"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.enabled").value(false))
            .andExpect(jsonPath("$.strategyStatus").value("stopped"))
    }

    @Test
    fun `updates execution timezone and mode`() {
        val strategyId = createStrategy("Paper Config Update")
        val domesticUniverseId = createUniverse("KR Core", "AAA")
        linkStrategyUniverse(strategyId, domesticUniverseId)
        markBacktestCompleted(strategyId)

        mockMvc
            .perform(
                put("/api/v1/strategies/$strategyId/execution")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "enabled" to false,
                                "mode" to "paper",
                                "scheduleTime" to "10:15",
                                "timezone" to "America/New_York",
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.enabled").value(false))
            .andExpect(jsonPath("$.mode").value("paper"))
            .andExpect(jsonPath("$.scheduleTime").value("10:15"))
            .andExpect(jsonPath("$.timezone").value("America/New_York"))
    }

    private fun enableExecution(
        strategyId: String,
        scheduleTime: String,
    ) {
        mockMvc
            .perform(
                put("/api/v1/strategies/$strategyId/execution")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "enabled" to true,
                                "mode" to "paper",
                                "scheduleTime" to scheduleTime,
                                "timezone" to "Asia/Seoul",
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
    }

    private fun markBacktestCompleted(strategyId: String) {
        mockMvc
            .perform(
                patch("/api/v1/strategies/$strategyId")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "status" to "backtest_completed",
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
    }

    private fun createUniverse(
        name: String,
        symbol: String,
        marketScope: String = "domestic",
    ): String {
        seedSymbolMaster(symbol, marketScope)
        val universeId =
            mockMvc
                .perform(
                    post("/api/v1/universes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            objectMapper.writeValueAsBytes(
                                mapOf(
                                    "name" to name,
                                    "marketScope" to marketScope,
                                    "description" to "paper universe",
                                ),
                            ),
                        ),
                ).andExpect(status().isOk)
                .andReturn()
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
                                            "symbol" to symbol,
                                            "exchange" to if (marketScope == "us") "nasdaq" else "kospi",
                                            "market" to marketScope,
                                            "displayName" to symbol,
                                            "sortOrder" to 0,
                                        ),
                                    ),
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)

        return universeId
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

    private fun linkStrategyUniverse(
        strategyId: String,
        universeId: String,
    ) {
        mockMvc
            .perform(
                put("/api/v1/strategies/$strategyId/universes")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "universeIds" to listOf(universeId),
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
    }

    private fun importCsv(content: String) {
        val file = MockMultipartFile("file", "bars.csv", "text/csv", content.toByteArray())
        mockMvc
            .perform(multipart("/api/v1/market-data/daily-bars/import").file(file))
            .andExpect(status().isOk)
    }

    private fun createStrategy(
        name: String,
        payload: Map<String, Any?> = validBuilderPayload(name),
    ): String =
        mockMvc
            .perform(
                post("/api/v1/strategies")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "name" to name,
                                "description" to "paper draft",
                                "strategyType" to "builder",
                                "initialPayload" to
                                    mapOf(
                                        "payloadFormat" to "builder_json",
                                        "payload" to payload,
                                    ),
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
            .andReturn()
            .response
            .contentAsString
            .let { objectMapper.readTree(it).get("id").asText() }

    private fun validBuilderPayload(name: String) =
        mapOf(
            "builderState" to
                mapOf(
                    "metadata" to
                        mapOf(
                            "id" to name.lowercase().replace(" ", "_"),
                            "name" to name,
                            "description" to "paper draft",
                            "category" to "custom",
                            "author" to "OpenForge",
                            "tags" to listOf("paper"),
                        ),
                    "indicators" to
                        listOf(
                            mapOf(
                                "indicatorId" to "sma",
                                "alias" to "sma_fast",
                                "params" to mapOf("period" to 2),
                                "output" to "value",
                            ),
                        ),
                    "entry" to
                        mapOf(
                            "logic" to "AND",
                            "conditions" to
                                listOf(
                                    mapOf(
                                        "left" to mapOf("type" to "price", "field" to "close"),
                                        "operator" to "cross_above",
                                        "right" to mapOf("type" to "indicator", "alias" to "sma_fast", "output" to "value"),
                                    ),
                                ),
                        ),
                    "exit" to
                        mapOf(
                            "logic" to "AND",
                            "conditions" to
                                listOf(
                                    mapOf(
                                        "left" to mapOf("type" to "price", "field" to "close"),
                                        "operator" to "cross_below",
                                        "right" to mapOf("type" to "indicator", "alias" to "sma_fast", "output" to "value"),
                                    ),
                                ),
                        ),
                    "risk" to
                        mapOf(
                            "stopLoss" to mapOf("enabled" to false, "percent" to 0),
                            "takeProfit" to mapOf("enabled" to false, "percent" to 0),
                            "trailingStop" to mapOf("enabled" to false, "percent" to 0),
                        ),
                ),
        )

    private fun noSignalPayload(name: String) =
        mapOf(
            "builderState" to
                mapOf(
                    "metadata" to
                        mapOf(
                            "id" to name.lowercase().replace(" ", "_"),
                            "name" to name,
                            "description" to "paper draft",
                            "category" to "custom",
                            "author" to "OpenForge",
                            "tags" to listOf("paper"),
                        ),
                    "indicators" to emptyList<Map<String, Any?>>(),
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
}
