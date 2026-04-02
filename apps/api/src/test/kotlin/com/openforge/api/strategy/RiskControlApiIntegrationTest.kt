package com.openforge.api.strategy

import com.openforge.api.strategy.application.MarketTimeProvider
import com.openforge.api.support.PostgresIntegrationTestSupport
import org.hamcrest.Matchers.containsString
import org.hamcrest.Matchers.hasItem
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import tools.jackson.databind.json.JsonMapper
import java.time.ZonedDateTime
import java.util.UUID

class RiskControlApiIntegrationTest : PostgresIntegrationTestSupport() {
    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var marketTimeProvider: MarketTimeProvider

    private val objectMapper = JsonMapper.builder().findAndAddModules().build()

    @AfterEach
    fun resetClock() {
        marketTimeProvider.setFixedNowForTesting(null)
    }

    @Test
    fun `global kill switch blocks all new orders and records system event`() {
        val prepared = prepareSignalContext(name = "Global Kill", symbol = "AAA", signalType = "ENTRY", close = 12.0)
        marketTimeProvider.setFixedNowForTesting(ZonedDateTime.parse("2026-01-05T10:00:00+09:00[Asia/Seoul]"))

        mockMvc
            .perform(
                put("/api/v1/system/risk/kill-switch")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(mapOf("enabled" to true))),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.killSwitchEnabled").value(true))

        mockMvc
            .perform(get("/api/v1/strategies/${prepared.strategyId}/orders/candidates?limit=50"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].riskCheck.passed").value(false))
            .andExpect(jsonPath("$[0].riskCheck.reasonCodes[0]").value("global_kill_switch"))

        mockMvc
            .perform(
                post("/api/v1/strategies/${prepared.strategyId}/orders/requests")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(mapOf("signalEventId" to prepared.signalEventId, "mode" to "paper"))),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("rejected_risk"))
            .andExpect(jsonPath("$.failureReason").value(containsString("global_kill_switch")))

        mockMvc
            .perform(get("/api/v1/strategies/${prepared.strategyId}/risk/events?limit=50"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(1)))
            .andExpect(jsonPath("$[0].scope").value("global"))
            .andExpect(jsonPath("$[0].eventType").value("order_blocked"))
            .andExpect(jsonPath("$[0].reasonCode").value("global_kill_switch"))

        mockMvc
            .perform(get("/api/v1/system/risk/events?limit=20"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(1)))
            .andExpect(jsonPath("$[0].eventType").value("risk_global_kill_switch_changed"))
    }

    @Test
    fun `strategy kill switch blocks only that strategy and records strategy event`() {
        val prepared = prepareSignalContext(name = "Strategy Kill", symbol = "AAA", signalType = "ENTRY", close = 12.0)
        marketTimeProvider.setFixedNowForTesting(ZonedDateTime.parse("2026-01-05T10:00:00+09:00[Asia/Seoul]"))

        mockMvc
            .perform(
                put("/api/v1/strategies/${prepared.strategyId}/risk")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "perSymbolMaxNotional" to null,
                                "strategyMaxExposure" to null,
                                "maxOpenPositions" to null,
                                "dailyLossLimit" to null,
                                "strategyKillSwitchEnabled" to true,
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.strategyKillSwitchEnabled").value(true))

        mockMvc
            .perform(
                post("/api/v1/strategies/${prepared.strategyId}/orders/requests")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(mapOf("signalEventId" to prepared.signalEventId, "mode" to "paper"))),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("rejected_risk"))
            .andExpect(jsonPath("$.failureReason").value(containsString("strategy_kill_switch")))

        mockMvc
            .perform(get("/api/v1/strategies/${prepared.strategyId}/risk/events?limit=50"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(2)))
            .andExpect(jsonPath("$[*].eventType", hasItem("order_blocked")))
            .andExpect(jsonPath("$[*].eventType", hasItem("strategy_kill_switch_changed")))
    }

    @Test
    fun `per symbol max notional blocks buy order and candidate preview matches`() {
        val prepared = prepareSignalContext(name = "Symbol Exposure", symbol = "AAA", signalType = "ENTRY", close = 12.0)
        marketTimeProvider.setFixedNowForTesting(ZonedDateTime.parse("2026-01-05T10:00:00+09:00[Asia/Seoul]"))
        updateStrategyRisk(
            prepared.strategyId,
            mapOf(
                "perSymbolMaxNotional" to 10.0,
                "strategyMaxExposure" to null,
                "maxOpenPositions" to null,
                "dailyLossLimit" to null,
                "strategyKillSwitchEnabled" to false,
            ),
        )

        mockMvc
            .perform(get("/api/v1/strategies/${prepared.strategyId}/orders/candidates?limit=50"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].riskCheck.passed").value(false))
            .andExpect(jsonPath("$[0].riskCheck.reasonCodes[0]").value("per_symbol_max_notional"))

        mockMvc
            .perform(
                post("/api/v1/strategies/${prepared.strategyId}/orders/requests")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(mapOf("signalEventId" to prepared.signalEventId, "mode" to "paper"))),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("rejected_risk"))
            .andExpect(jsonPath("$.failureReason").value(containsString("per_symbol_max_notional")))
    }

    @Test
    fun `strategy max exposure and max open positions block projected buy exposure`() {
        val strategy = prepareStrategyContext("Exposure Limits")
        val buyAaaSignal = insertSignalEvent(strategy, symbol = "AAA", signalType = "ENTRY", close = 10.0)
        marketTimeProvider.setFixedNowForTesting(ZonedDateTime.parse("2026-01-05T10:00:00+09:00[Asia/Seoul]"))
        val aaaOrderId = createOrderRequest(strategy.strategyId, buyAaaSignal)
        createFill(strategy.strategyId, aaaOrderId, quantity = 1, price = 10.0, filledAt = "2026-01-05T10:05:00+09:00")

        val buyBbbSignal = insertSignalEvent(strategy, symbol = "BBB", signalType = "ENTRY", close = 12.0)
        updateStrategyRisk(
            strategy.strategyId,
            mapOf(
                "perSymbolMaxNotional" to null,
                "strategyMaxExposure" to 15.0,
                "maxOpenPositions" to 1,
                "dailyLossLimit" to null,
                "strategyKillSwitchEnabled" to false,
            ),
        )

        mockMvc
            .perform(get("/api/v1/strategies/${strategy.strategyId}/orders/candidates?limit=50"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].symbol").value("BBB"))
            .andExpect(jsonPath("$[0].riskCheck.passed").value(false))
            .andExpect(jsonPath("$[0].riskCheck.reasonCodes", hasSize<Any>(2)))

        mockMvc
            .perform(
                post("/api/v1/strategies/${strategy.strategyId}/orders/requests")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(mapOf("signalEventId" to buyBbbSignal, "mode" to "paper"))),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("rejected_risk"))
            .andExpect(jsonPath("$.failureReason").value(containsString("strategy_max_exposure")))
    }

    @Test
    fun `daily loss limit blocks new buys but sell orders bypass the loss rule`() {
        val strategy = prepareStrategyContext("Daily Loss")
        marketTimeProvider.setFixedNowForTesting(ZonedDateTime.parse("2026-01-05T10:00:00+09:00[Asia/Seoul]"))

        val aaaBuySignal = insertSignalEvent(strategy, symbol = "AAA", signalType = "ENTRY", close = 100.0)
        val aaaBuyOrderId = createOrderRequest(strategy.strategyId, aaaBuySignal)
        createFill(strategy.strategyId, aaaBuyOrderId, quantity = 1, price = 100.0, filledAt = "2026-01-05T10:01:00+09:00")

        val bbbBuySignal = insertSignalEvent(strategy, symbol = "BBB", signalType = "ENTRY", close = 100.0)
        val bbbBuyOrderId = createOrderRequest(strategy.strategyId, bbbBuySignal)
        createFill(strategy.strategyId, bbbBuyOrderId, quantity = 1, price = 100.0, filledAt = "2026-01-05T10:02:00+09:00")

        val bbbSellSignal = insertSignalEvent(strategy, symbol = "BBB", signalType = "EXIT", close = 80.0)
        val bbbSellOrderId = createOrderRequest(strategy.strategyId, bbbSellSignal)
        createFill(strategy.strategyId, bbbSellOrderId, quantity = 1, price = 80.0, filledAt = "2026-01-05T10:03:00+09:00")

        updateStrategyRisk(
            strategy.strategyId,
            mapOf(
                "perSymbolMaxNotional" to null,
                "strategyMaxExposure" to null,
                "maxOpenPositions" to null,
                "dailyLossLimit" to 10.0,
                "strategyKillSwitchEnabled" to false,
            ),
        )

        val cccBuySignal = insertSignalEvent(strategy, symbol = "CCC", signalType = "ENTRY", close = 50.0)
        mockMvc
            .perform(
                post("/api/v1/strategies/${strategy.strategyId}/orders/requests")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(mapOf("signalEventId" to cccBuySignal, "mode" to "paper"))),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("rejected_risk"))
            .andExpect(jsonPath("$.failureReason").value(containsString("daily_loss_limit")))

        val aaaSellSignal = insertSignalEvent(strategy, symbol = "AAA", signalType = "EXIT", close = 95.0)
        mockMvc
            .perform(
                post("/api/v1/strategies/${strategy.strategyId}/orders/requests")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(mapOf("signalEventId" to aaaSellSignal, "mode" to "paper"))),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("requested"))

        mockMvc
            .perform(get("/api/v1/strategies/${strategy.strategyId}/risk/events?limit=50"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[*].eventType", hasItem("daily_loss_limit_tripped")))
    }

    private fun prepareSignalContext(
        name: String,
        symbol: String,
        signalType: String,
        close: Double,
    ): PreparedSignalContext {
        val strategy = prepareStrategyContext(name)
        val signalEventId = insertSignalEvent(strategy, symbol, signalType, close)
        return PreparedSignalContext(strategy.strategyId, signalEventId)
    }

    private fun prepareStrategyContext(name: String): PreparedStrategy {
        val strategyId = createStrategy(name)
        jdbcTemplate.update("update strategy set status = 'RUNNING' where id = ?::uuid", strategyId)
        val strategyVersionId =
            jdbcTemplate.queryForObject(
                "select id from strategy_version where strategy_id = ?::uuid order by version_number desc limit 1",
                String::class.java,
                strategyId,
            )!!
        val runId = UUID.randomUUID().toString()
        jdbcTemplate.update(
            """
            insert into strategy_execution_run (
                id, strategy_id, strategy_version_id, trigger_type, status,
                scheduled_date, started_at, completed_at, symbol_count, signal_count,
                summary, error_message
            ) values (
                ?::uuid, ?::uuid, ?::uuid, 'SCHEDULED', 'COMPLETED',
                '2026-01-05', '2026-01-05T09:30:00+09:00', '2026-01-05T09:31:00+09:00', 1, 1,
                '{}'::jsonb, null
            )
            """.trimIndent(),
            runId,
            strategyId,
            strategyVersionId,
        )
        return PreparedStrategy(strategyId, strategyVersionId, runId)
    }

    private fun insertSignalEvent(
        prepared: PreparedStrategy,
        symbol: String,
        signalType: String,
        close: Double,
    ): String {
        val signalEventId = UUID.randomUUID().toString()
        jdbcTemplate.update(
            """
            insert into strategy_signal_event (
                id, run_id, strategy_id, strategy_version_id, symbol, signal_type,
                trading_date, payload, created_at, updated_at
            ) values (
                ?::uuid, ?::uuid, ?::uuid, ?::uuid, ?, ?, '2026-01-05',
                cast(? as jsonb), now(), now()
            )
            """.trimIndent(),
            signalEventId,
            prepared.runId,
            prepared.strategyId,
            prepared.strategyVersionId,
            symbol,
            signalType,
            objectMapper.writeValueAsString(mapOf("close" to close)),
        )
        return signalEventId
    }

    private fun createOrderRequest(
        strategyId: String,
        signalEventId: String,
    ): String =
        mockMvc
            .perform(
                post("/api/v1/strategies/$strategyId/orders/requests")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(mapOf("signalEventId" to signalEventId, "mode" to "paper"))),
            ).andExpect(status().isOk)
            .andReturn()
            .response
            .contentAsString
            .let { objectMapper.readTree(it).get("id").asText() }

    private fun createFill(
        strategyId: String,
        orderRequestId: String,
        quantity: Long,
        price: Double,
        filledAt: String,
    ) {
        mockMvc
            .perform(
                post("/api/v1/strategies/$strategyId/orders/requests/$orderRequestId/fills")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "quantity" to quantity,
                                "price" to price,
                                "filledAt" to filledAt,
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
    }

    private fun updateStrategyRisk(
        strategyId: String,
        payload: Map<String, Any?>,
    ) {
        mockMvc
            .perform(
                put("/api/v1/strategies/$strategyId/risk")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(payload)),
            ).andExpect(status().isOk)
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
                                "description" to "risk draft",
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
                            "description" to "risk draft",
                            "category" to "custom",
                            "author" to "OpenForge",
                            "tags" to listOf("risk"),
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

private data class PreparedSignalContext(
    val strategyId: String,
    val signalEventId: String,
)

private data class PreparedStrategy(
    val strategyId: String,
    val strategyVersionId: String,
    val runId: String,
)
