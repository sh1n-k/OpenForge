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
import java.util.UUID

class OrderTrackingApiIntegrationTest : PostgresIntegrationTestSupport() {

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
    fun `stores requested status event when order request is created`() {
        val prepared = prepareOrderRequest("Tracking Requested")

        mockMvc.perform(get("/api/v1/strategies/${prepared.strategyId}/orders/requests/${prepared.orderRequestId}/status-events?limit=50"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(1)))
            .andExpect(jsonPath("$[0].status").value("requested"))
    }

    @Test
    fun `records partial and full fills and projects current position`() {
        val signal = prepareSignalContext("Tracking Fill")
        val orderRequestId = insertOrderRequest(
            strategyId = signal.strategyId,
            signalEventId = signal.signalEventId,
            side = "BUY",
            quantity = 2,
            price = 100.0,
            requestedAt = "2026-01-05T10:00:00+09:00",
        )

        mockMvc.perform(
            post("/api/v1/strategies/${signal.strategyId}/orders/requests/$orderRequestId/fills")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsBytes(
                        mapOf(
                            "quantity" to 1,
                            "price" to 100.0,
                            "filledAt" to "2026-01-05T10:05:00+09:00",
                        ),
                    ),
                ),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.quantity").value(1))
            .andExpect(jsonPath("$.source").value("paper_manual"))

        mockMvc.perform(get("/api/v1/strategies/${signal.strategyId}/orders/requests?limit=20"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].currentStatus").value("partially_filled"))
            .andExpect(jsonPath("$[0].filledQuantity").value(1))
            .andExpect(jsonPath("$[0].remainingQuantity").value(1))

        mockMvc.perform(
            post("/api/v1/strategies/${signal.strategyId}/orders/requests/$orderRequestId/fills")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsBytes(
                        mapOf(
                            "quantity" to 1,
                            "price" to 140.0,
                            "filledAt" to "2026-01-05T10:06:00+09:00",
                        ),
                    ),
                ),
        )
            .andExpect(status().isOk)

        mockMvc.perform(get("/api/v1/strategies/${signal.strategyId}/orders/requests/$orderRequestId/status-events?limit=50"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(4)))
            .andExpect(jsonPath("$[0].status").value("filled"))
            .andExpect(jsonPath("$[1].status").value("partially_filled"))
            .andExpect(jsonPath("$[2].status").value("accepted"))
            .andExpect(jsonPath("$[3].status").value("requested"))

        mockMvc.perform(get("/api/v1/strategies/${signal.strategyId}/fills?limit=50"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(2)))
            .andExpect(jsonPath("$[0].price").value(140.0))
            .andExpect(jsonPath("$[1].price").value(100.0))

        mockMvc.perform(get("/api/v1/strategies/${signal.strategyId}/positions"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(1)))
            .andExpect(jsonPath("$[0].symbol").value("AAA"))
            .andExpect(jsonPath("$[0].netQuantity").value(2))
            .andExpect(jsonPath("$[0].avgEntryPrice").value(120.0))

        mockMvc.perform(get("/api/v1/strategies/${signal.strategyId}/orders/requests?limit=20"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].currentStatus").value("filled"))
            .andExpect(jsonPath("$[0].filledQuantity").value(2))
            .andExpect(jsonPath("$[0].remainingQuantity").value(0))
    }

    @Test
    fun `rejects fills that exceed requested quantity`() {
        val prepared = prepareOrderRequest("Tracking Overfill")

        mockMvc.perform(
            post("/api/v1/strategies/${prepared.strategyId}/orders/requests/${prepared.orderRequestId}/fills")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsBytes(
                        mapOf(
                            "quantity" to 1,
                            "price" to 100.0,
                            "filledAt" to "2026-01-05T10:05:00+09:00",
                        ),
                    ),
                ),
        )
            .andExpect(status().isOk)

        mockMvc.perform(
            post("/api/v1/strategies/${prepared.strategyId}/orders/requests/${prepared.orderRequestId}/fills")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsBytes(
                        mapOf(
                            "quantity" to 1,
                            "price" to 101.0,
                            "filledAt" to "2026-01-05T10:06:00+09:00",
                        ),
                    ),
                ),
        )
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.detail").value(containsString("exceeds requested order quantity")))
    }

    @Test
    fun `rejects sell fills that would create a negative position`() {
        val signal = prepareSignalContext("Tracking Sell Guard")
        val sellOrderRequestId = insertOrderRequest(
            strategyId = signal.strategyId,
            signalEventId = signal.signalEventId,
            side = "SELL",
            quantity = 1,
            price = 100.0,
            requestedAt = "2026-01-05T10:02:00+09:00",
        )

        mockMvc.perform(
            post("/api/v1/strategies/${signal.strategyId}/orders/requests/$sellOrderRequestId/fills")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsBytes(
                        mapOf(
                            "quantity" to 1,
                            "price" to 100.0,
                            "filledAt" to "2026-01-05T10:05:00+09:00",
                        ),
                    ),
                ),
        )
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.detail").value(containsString("exceeds current position quantity")))
    }

    private fun prepareOrderRequest(name: String): PreparedOrderRequest {
        val signal = prepareSignalContext(name)
        val orderRequestId = mockMvc.perform(
            post("/api/v1/strategies/${signal.strategyId}/orders/requests")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsBytes(
                        mapOf(
                            "signalEventId" to signal.signalEventId,
                            "mode" to "paper",
                        ),
                    ),
                ),
        )
            .andExpect(status().isOk)
            .andReturn()
            .response
            .contentAsString
            .let { objectMapper.readTree(it).get("id").asText() }

        return PreparedOrderRequest(
            strategyId = signal.strategyId,
            signalEventId = signal.signalEventId,
            orderRequestId = orderRequestId,
        )
    }

    private fun prepareSignalContext(name: String): PreparedTrackingSignal {
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
        marketTimeProvider.setFixedNowForTesting(ZonedDateTime.parse("2026-01-05T10:00:00+09:00[Asia/Seoul]"))

        val signalEventId = mockMvc.perform(get("/api/v1/strategies/$strategyId/signals?limit=50"))
            .andExpect(status().isOk)
            .andReturn()
            .response
            .contentAsString
            .let { objectMapper.readTree(it)[0].get("id").asText() }

        return PreparedTrackingSignal(
            strategyId = strategyId,
            signalEventId = signalEventId,
        )
    }

    private fun insertOrderRequest(
        strategyId: String,
        signalEventId: String,
        side: String,
        quantity: Long,
        price: Double,
        requestedAt: String,
    ): String {
        val orderRequestId = UUID.randomUUID().toString()
        val strategyVersionId = jdbcTemplate.queryForObject(
            "select strategy_version_id from strategy_signal_event where id = ?::uuid",
            String::class.java,
            signalEventId,
        )!!
        val executionRunId = jdbcTemplate.queryForObject(
            "select run_id from strategy_signal_event where id = ?::uuid",
            String::class.java,
            signalEventId,
        )!!
        jdbcTemplate.update(
            """
                insert into strategy_order_request (
                    id, strategy_id, strategy_version_id, signal_event_id, execution_run_id,
                    mode, side, order_type, quantity, price, status, precheck_passed,
                    precheck_summary, failure_reason, requested_at, created_at, updated_at
                ) values (
                    ?::uuid, ?::uuid, ?::uuid, ?::uuid, ?::uuid,
                    'PAPER', ?, 'LIMIT', ?, ?, 'REQUESTED', true,
                    '{"passed":true}'::jsonb, null, ?::timestamptz, now(), now()
                )
            """.trimIndent(),
            orderRequestId,
            strategyId,
            strategyVersionId,
            signalEventId,
            executionRunId,
            side,
            quantity,
            price,
            requestedAt,
        )
        jdbcTemplate.update(
            """
                insert into strategy_order_status_event (
                    id, order_request_id, status, reason, payload, occurred_at, created_at, updated_at
                ) values (
                    ?::uuid, ?::uuid, 'REQUESTED', null, '{}'::jsonb, ?::timestamptz, now(), now()
                )
            """.trimIndent(),
            UUID.randomUUID().toString(),
            orderRequestId,
            requestedAt,
        )
        return orderRequestId
    }

    private fun enableExecution(strategyId: String, scheduleTime: String) {
        mockMvc.perform(
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
        )
            .andExpect(status().isOk)
    }

    private fun markBacktestCompleted(strategyId: String) {
        mockMvc.perform(
            patch("/api/v1/strategies/$strategyId")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsBytes(
                        mapOf(
                            "status" to "backtest_completed",
                        ),
                    ),
                ),
        )
            .andExpect(status().isOk)
    }

    private fun createUniverse(name: String, symbol: String): String {
        val universeId = mockMvc.perform(
            post("/api/v1/universes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsBytes(
                        mapOf(
                            "name" to name,
                            "description" to "tracking universe",
                        ),
                    ),
                ),
        )
            .andExpect(status().isOk)
            .andReturn()
            .response
            .contentAsString
            .let { objectMapper.readTree(it).get("id").asText() }

        mockMvc.perform(
            put("/api/v1/universes/$universeId/symbols")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsBytes(
                        mapOf(
                            "symbols" to listOf(
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
        )
            .andExpect(status().isOk)

        return universeId
    }

    private fun linkStrategyUniverse(strategyId: String, universeId: String) {
        mockMvc.perform(
            put("/api/v1/strategies/$strategyId/universes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsBytes(
                        mapOf(
                            "universeIds" to listOf(universeId),
                        ),
                    ),
                ),
        )
            .andExpect(status().isOk)
    }

    private fun importCsv(content: String) {
        val file = MockMultipartFile("file", "bars.csv", "text/csv", content.toByteArray())
        mockMvc.perform(multipart("/api/v1/market-data/daily-bars/import").file(file))
            .andExpect(status().isOk)
    }

    private fun createStrategy(name: String): String = mockMvc.perform(
        post("/api/v1/strategies")
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                objectMapper.writeValueAsBytes(
                    mapOf(
                        "name" to name,
                        "description" to "tracking draft",
                        "strategyType" to "builder",
                        "initialPayload" to mapOf(
                            "payloadFormat" to "builder_json",
                            "payload" to validBuilderPayload(name),
                        ),
                    ),
                ),
            ),
    )
        .andExpect(status().isOk)
        .andReturn()
        .response
        .contentAsString
        .let { objectMapper.readTree(it).get("id").asText() }

    private fun validBuilderPayload(name: String) = mapOf(
        "builderState" to mapOf(
            "metadata" to mapOf(
                "id" to name.lowercase().replace(" ", "_"),
                "name" to name,
                "description" to "tracking draft",
                "category" to "custom",
                "author" to "OpenForge",
                "tags" to listOf("tracking"),
            ),
            "indicators" to listOf(
                mapOf(
                    "indicatorId" to "sma",
                    "alias" to "sma_fast",
                    "params" to mapOf("period" to 2),
                    "output" to "value",
                ),
            ),
            "entry" to mapOf(
                "logic" to "AND",
                "conditions" to listOf(
                    mapOf(
                        "left" to mapOf("type" to "price", "field" to "close"),
                        "operator" to "cross_above",
                        "right" to mapOf("type" to "indicator", "alias" to "sma_fast", "output" to "value"),
                    ),
                ),
            ),
            "exit" to mapOf(
                "logic" to "AND",
                "conditions" to listOf(
                    mapOf(
                        "left" to mapOf("type" to "price", "field" to "close"),
                        "operator" to "cross_below",
                        "right" to mapOf("type" to "indicator", "alias" to "sma_fast", "output" to "value"),
                    ),
                ),
            ),
            "risk" to mapOf(
                "stopLoss" to mapOf("enabled" to false, "percent" to 0),
                "takeProfit" to mapOf("enabled" to false, "percent" to 0),
                "trailingStop" to mapOf("enabled" to false, "percent" to 0),
            ),
        ),
    )
}

private data class PreparedOrderRequest(
    val strategyId: String,
    val signalEventId: String,
    val orderRequestId: String,
)

private data class PreparedTrackingSignal(
    val strategyId: String,
    val signalEventId: String,
)
