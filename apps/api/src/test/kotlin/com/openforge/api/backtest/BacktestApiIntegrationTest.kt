package com.openforge.api.backtest

import com.openforge.api.backtest.application.BacktestService
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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import tools.jackson.databind.json.JsonMapper

class BacktestApiIntegrationTest : PostgresIntegrationTestSupport() {
    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var backtestService: BacktestService

    @Autowired
    lateinit var symbolMasterRepository: SymbolMasterRepository

    private val objectMapper = JsonMapper.builder().findAndAddModules().build()

    @Test
    fun `imports csv and runs backtest job to completion`() {
        importCsv(
            """
            symbol,date,open,high,low,close,volume
            AAA,2026-01-01,10,10,10,10,1000
            AAA,2026-01-02,9,9,9,9,1000
            AAA,2026-01-05,12,12,12,12,1000
            AAA,2026-01-06,13,13,13,13,1000
            AAA,2026-01-07,8,8,8,8,1000
            AAA,2026-01-08,8,8,8,8,1000
            """.trimIndent(),
        )

        val strategyId = createStrategy("Backtest Builder")
        val runId =
            mockMvc
                .perform(
                    post("/api/v1/backtests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            objectMapper.writeValueAsBytes(
                                mapOf(
                                    "strategyId" to strategyId,
                                    "startDate" to "2026-01-01",
                                    "endDate" to "2026-01-08",
                                    "symbols" to listOf("AAA"),
                                ),
                            ),
                        ),
                ).andExpect(status().isOk)
                .andExpect(jsonPath("$.status").value("queued"))
                .andReturn()
                .response
                .contentAsString
                .let { objectMapper.readTree(it).get("runId").asText() }

        awaitBacktestStatus(runId, "completed")

        mockMvc
            .perform(get("/api/v1/backtests/$runId"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("completed"))
            .andExpect(jsonPath("$.summary.tradeCount").value(1))
            .andExpect(jsonPath("$.trades", hasSize<Any>(1)))
            .andExpect(jsonPath("$.equityCurve").isArray)

        mockMvc
            .perform(get("/api/v1/strategies/$strategyId/backtests"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].status").value("completed"))
            .andExpect(jsonPath("$[0].headlineMetrics.tradeCount").value(1))

        mockMvc
            .perform(get("/api/v1/strategies/$strategyId"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("backtest_completed"))
    }

    @Test
    fun `rejects run when coverage is missing`() {
        val strategyId = createStrategy("Coverage Missing")

        mockMvc
            .perform(
                post("/api/v1/backtests")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "strategyId" to strategyId,
                                "startDate" to "2026-01-01",
                                "endDate" to "2026-01-08",
                                "symbols" to listOf("AAA"),
                            ),
                        ),
                    ),
            ).andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.detail").value(containsString("coverage")))
    }

    @Test
    fun `rejects run when overseas universe is selected`() {
        symbolMasterRepository.save(
            SymbolMasterEntity(
                marketScope = "us",
                code = "AAPL",
                exchange = "nasdaq",
                name = "Apple",
            ),
        )
        importCsv(
            """
            symbol,date,open,high,low,close,volume
            AAPL,2026-01-01,10,10,10,10,1000
            AAPL,2026-01-02,11,11,11,11,1000
            """.trimIndent(),
            expectedRows = 2,
        )

        val strategyId = createStrategy("Overseas Block")
        val universeId = createUniverse("US Core", "AAPL", "us")

        mockMvc
            .perform(
                post("/api/v1/backtests")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "strategyId" to strategyId,
                                "startDate" to "2026-01-01",
                                "endDate" to "2026-01-02",
                                "universeIds" to listOf(universeId),
                            ),
                        ),
                    ),
            ).andExpect(status().isConflict)
            .andExpect(jsonPath("$.detail").value(containsString("overseas universes")))
    }

    @Test
    fun `rejects run when overseas direct symbol is selected`() {
        symbolMasterRepository.save(
            SymbolMasterEntity(
                marketScope = "us",
                code = "AAPL",
                exchange = "nasdaq",
                name = "Apple",
            ),
        )
        importCsv(
            """
            symbol,date,open,high,low,close,volume
            AAPL,2026-01-01,10,10,10,10,1000
            AAPL,2026-01-02,11,11,11,11,1000
            """.trimIndent(),
            expectedRows = 2,
        )

        val strategyId = createStrategy("Overseas Direct Block")

        mockMvc
            .perform(
                post("/api/v1/backtests")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "strategyId" to strategyId,
                                "startDate" to "2026-01-01",
                                "endDate" to "2026-01-02",
                                "symbols" to listOf("AAPL"),
                            ),
                        ),
                    ),
            ).andExpect(status().isConflict)
            .andExpect(jsonPath("$.detail").value(containsString("overseas symbols")))
    }

    @Test
    fun `returns problem detail for malformed csv`() {
        val file =
            MockMultipartFile(
                "file",
                "bars.csv",
                "text/csv",
                "symbol,date,open,high,low,close,volume\nAAA,2026-01-01,10,11".toByteArray(),
            )

        mockMvc
            .perform(multipart("/api/v1/market-data/daily-bars/import").file(file))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.title").value("Bad Request"))
    }

    private fun importCsv(
        content: String,
        expectedRows: Int = 6,
    ) {
        val file = MockMultipartFile("file", "bars.csv", "text/csv", content.toByteArray())
        mockMvc
            .perform(multipart("/api/v1/market-data/daily-bars/import").file(file))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.importedRows").value(expectedRows))
    }

    private fun createStrategy(name: String): String =
        mockMvc
            .perform(
                post("/api/v1/strategies")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "name" to name,
                                "description" to "builder draft",
                                "strategyType" to "builder",
                                "initialPayload" to
                                    mapOf(
                                        "payloadFormat" to "builder_json",
                                        "payload" to validBuilderPayload(name),
                                    ),
                            ),
                        ),
                    ),
            ).andReturn()
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
                            "description" to "builder draft",
                            "category" to "custom",
                            "author" to "OpenForge",
                            "tags" to listOf("builder"),
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
                                    "description" to "backtest universe",
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

    private fun awaitBacktestStatus(
        runId: String,
        expectedStatus: String,
    ) {
        repeat(20) { attempt ->
            backtestService.processNextQueuedRun()
            val response =
                mockMvc
                    .perform(get("/api/v1/backtests/$runId"))
                    .andExpect(status().isOk)
                    .andReturn()
                    .response
                    .contentAsString
            val currentStatus = objectMapper.readTree(response).get("status").asText()
            if (currentStatus == expectedStatus) {
                return
            }
            if (currentStatus == "failed") {
                throw AssertionError("Expected backtest $runId to reach $expectedStatus but was failed")
            }
            if (attempt < 19) {
                Thread.sleep(50)
            }
        }

        val finalResponse =
            mockMvc
                .perform(get("/api/v1/backtests/$runId"))
                .andExpect(status().isOk)
                .andReturn()
                .response
                .contentAsString
        val finalStatus = objectMapper.readTree(finalResponse).get("status").asText()
        throw AssertionError("Expected backtest $runId to reach $expectedStatus but was $finalStatus")
    }
}
