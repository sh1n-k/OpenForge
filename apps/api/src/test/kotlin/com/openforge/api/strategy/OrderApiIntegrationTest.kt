package com.openforge.api.strategy

import com.openforge.api.strategy.application.MarketTimeProvider
import com.openforge.api.strategy.application.PaperExecutionService
import com.openforge.api.support.PostgresIntegrationTestSupport
import org.hamcrest.Matchers.containsString
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.AfterEach
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

class OrderApiIntegrationTest : PostgresIntegrationTestSupport() {
    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var paperExecutionService: PaperExecutionService

    @Autowired
    lateinit var marketTimeProvider: MarketTimeProvider

    private val objectMapper = JsonMapper.builder().findAndAddModules().build()

    @AfterEach
    fun resetClock() {
        marketTimeProvider.setFixedNowForTesting(null)
    }

    @Test
    fun `lists order candidates from recent signals`() {
        val signalEventId = prepareSignal("Order Candidate")
        marketTimeProvider.setFixedNowForTesting(ZonedDateTime.parse("2026-01-05T10:00:00+09:00[Asia/Seoul]"))

        mockMvc
            .perform(get("/api/v1/strategies/${signalEventId.strategyId}/orders/candidates?limit=50"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(1)))
            .andExpect(jsonPath("$[0].signalEventId").value(signalEventId.signalEventId))
            .andExpect(jsonPath("$[0].side").value("buy"))
            .andExpect(jsonPath("$[0].quantity").value(1))
            .andExpect(jsonPath("$[0].price").value(12.0))
            .andExpect(jsonPath("$[0].precheck.passed").value(true))
    }

    @Test
    fun `marks candidate as invalid when strategy status is not running`() {
        val prepared = prepareSignal("Status Guard")
        marketTimeProvider.setFixedNowForTesting(ZonedDateTime.parse("2026-01-05T10:00:00+09:00[Asia/Seoul]"))
        markBacktestCompleted(prepared.strategyId)

        mockMvc
            .perform(get("/api/v1/strategies/${prepared.strategyId}/orders/candidates?limit=50"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].precheck.passed").value(false))
            .andExpect(jsonPath("$[0].precheck.strategyStatus").value(false))
            .andExpect(jsonPath("$[0].precheck.reasonCodes[0]").value("strategy_status"))
    }

    @Test
    fun `marks candidate as invalid outside market hours`() {
        val prepared = prepareSignal("Market Hours Guard")
        marketTimeProvider.setFixedNowForTesting(ZonedDateTime.parse("2026-01-05T16:00:00+09:00[Asia/Seoul]"))

        mockMvc
            .perform(get("/api/v1/strategies/${prepared.strategyId}/orders/candidates?limit=50"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].precheck.passed").value(false))
            .andExpect(jsonPath("$[0].precheck.marketHours").value(false))
            .andExpect(jsonPath("$[0].precheck.reasonCodes[0]").value("market_hours"))
    }

    @Test
    fun `marks candidate as invalid when price is missing`() {
        val prepared = prepareSignal("Price Guard")
        jdbcTemplate.update(
            "update strategy_signal_event set payload = '{}'::jsonb where id = ?::uuid",
            prepared.signalEventId,
        )
        marketTimeProvider.setFixedNowForTesting(ZonedDateTime.parse("2026-01-05T10:00:00+09:00[Asia/Seoul]"))

        mockMvc
            .perform(get("/api/v1/strategies/${prepared.strategyId}/orders/candidates?limit=50"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].price").value(0.0))
            .andExpect(jsonPath("$[0].precheck.passed").value(false))
            .andExpect(jsonPath("$[0].precheck.priceValid").value(false))
            .andExpect(jsonPath("$[0].precheck.reasonCodes[0]").value("price_invalid"))
    }

    @Test
    fun `creates paper order request and blocks duplicate requests`() {
        val prepared = prepareSignal("Order Create")
        marketTimeProvider.setFixedNowForTesting(ZonedDateTime.parse("2026-01-05T10:00:00+09:00[Asia/Seoul]"))

        mockMvc
            .perform(
                post("/api/v1/strategies/${prepared.strategyId}/orders/requests")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "signalEventId" to prepared.signalEventId,
                                "mode" to "paper",
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("requested"))
            .andExpect(jsonPath("$.currentStatus").value("requested"))
            .andExpect(jsonPath("$.filledQuantity").value(0))
            .andExpect(jsonPath("$.remainingQuantity").value(1))
            .andExpect(jsonPath("$.precheckPassed").value(true))

        mockMvc
            .perform(get("/api/v1/strategies/${prepared.strategyId}/orders/requests?limit=20"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(1)))
            .andExpect(jsonPath("$[0].signalEventId").value(prepared.signalEventId))
            .andExpect(jsonPath("$[0].status").value("requested"))
            .andExpect(jsonPath("$[0].currentStatus").value("requested"))

        mockMvc
            .perform(
                post("/api/v1/strategies/${prepared.strategyId}/orders/requests")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "signalEventId" to prepared.signalEventId,
                                "mode" to "paper",
                            ),
                        ),
                    ),
            ).andExpect(status().isConflict)
            .andExpect(jsonPath("$.detail").value(containsString("Duplicate order request")))
    }

    @Test
    fun `stores rejected precheck request when created outside market hours`() {
        val prepared = prepareSignal("Rejected Precheck")
        marketTimeProvider.setFixedNowForTesting(ZonedDateTime.parse("2026-01-05T16:00:00+09:00[Asia/Seoul]"))

        mockMvc
            .perform(
                post("/api/v1/strategies/${prepared.strategyId}/orders/requests")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "signalEventId" to prepared.signalEventId,
                                "mode" to "paper",
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("rejected_precheck"))
            .andExpect(jsonPath("$.currentStatus").value("rejected"))
            .andExpect(jsonPath("$.precheckPassed").value(false))
            .andExpect(jsonPath("$.failureReason").value(containsString("market_hours")))
    }

    @Test
    fun `rejects live mode explicitly`() {
        val prepared = prepareSignal("Live Guard")
        marketTimeProvider.setFixedNowForTesting(ZonedDateTime.parse("2026-01-05T10:00:00+09:00[Asia/Seoul]"))

        mockMvc
            .perform(
                post("/api/v1/strategies/${prepared.strategyId}/orders/requests")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "signalEventId" to prepared.signalEventId,
                                "mode" to "live",
                            ),
                        ),
                    ),
            ).andExpect(status().isConflict)
            .andExpect(jsonPath("$.detail").value(containsString("Live order mode")))
    }

    private fun prepareSignal(name: String): PreparedSignal {
        importCsv(
            """
            symbol,date,open,high,low,close,volume
            AAA,2026-01-01,10,10,10,10,1000
            AAA,2026-01-02,9,9,9,9,1000
            AAA,2026-01-05,12,12,12,12,1000
            """.trimIndent(),
        )
        val strategyId = createStrategy(name)
        val universeId = createUniverse("KR Core $name", "AAA")
        linkStrategyUniverse(strategyId, universeId)
        markBacktestCompleted(strategyId)
        enableExecution(strategyId, "09:00")
        paperExecutionService.processDueExecutionsAt(
            ZonedDateTime.parse("2026-01-05T09:30:00+09:00[Asia/Seoul]"),
        )

        val signalEventId =
            mockMvc
                .perform(get("/api/v1/strategies/$strategyId/signals?limit=50"))
                .andExpect(status().isOk)
                .andReturn()
                .response
                .contentAsString
                .let { objectMapper.readTree(it)[0].get("id").asText() }

        return PreparedSignal(strategyId = strategyId, signalEventId = signalEventId)
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
                                "scheduleTime" to scheduleTime,
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
    ): String {
        val universeId =
            mockMvc
                .perform(
                    post("/api/v1/universes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            objectMapper.writeValueAsBytes(
                                mapOf(
                                    "name" to name,
                                    "description" to "order universe",
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
                                            "market" to "domestic",
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

    private fun createStrategy(name: String): String =
        mockMvc
            .perform(
                post("/api/v1/strategies")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "name" to name,
                                "description" to "order draft",
                                "strategyType" to "builder",
                                "initialPayload" to
                                    mapOf(
                                        "payloadFormat" to "builder_json",
                                        "payload" to validBuilderPayload(name),
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
                            "description" to "order draft",
                            "category" to "custom",
                            "author" to "OpenForge",
                            "tags" to listOf("order"),
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
}

private data class PreparedSignal(
    val strategyId: String,
    val signalEventId: String,
)
