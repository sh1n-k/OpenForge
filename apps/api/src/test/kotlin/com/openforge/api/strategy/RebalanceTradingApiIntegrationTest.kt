package com.openforge.api.strategy

import com.openforge.api.support.PostgresIntegrationTestSupport
import org.hamcrest.Matchers.containsString
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.MediaType
import org.springframework.test.context.TestPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import tools.jackson.databind.json.JsonMapper

class RebalanceTradingApiIntegrationTest : PostgresIntegrationTestSupport() {
    @Autowired
    lateinit var mockMvc: MockMvc

    private val objectMapper = JsonMapper.builder().findAndAddModules().build()

    @Test
    fun `creates planned rebalance orders with explicit fee tax minimum and cash sizing`() {
        val strategyId = createStrategy("MVP Plan")
        updateRisk(
            strategyId,
            mapOf(
                "strategyKillSwitchEnabled" to false,
                "minOrderNotional" to 1000.0,
                "feeRate" to 0.001,
                "taxRate" to 0.002,
            ),
        )

        mockMvc
            .perform(
                post("/api/v1/strategies/$strategyId/rebalance/plans")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(defaultPlanPayload())),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("planned"))
            .andExpect(jsonPath("$.adminApproved").value(false))
            .andExpect(jsonPath("$.orders", hasSize<Any>(3)))
            .andExpect(jsonPath("$.orders[0].symbol").value("AAA"))
            .andExpect(jsonPath("$.orders[0].side").value("buy"))
            .andExpect(jsonPath("$.orders[0].quantity").value(9))
            .andExpect(jsonPath("$.orders[0].estimatedFee").value(9.0))
            .andExpect(jsonPath("$.orders[2].symbol").value("CCC"))
            .andExpect(jsonPath("$.orders[2].side").value("sell"))
            .andExpect(jsonPath("$.orders[2].estimatedTax").value(40.0))
    }

    @Test
    fun `requires explicit approval before sending and stores broker response with idempotency key`() {
        val strategyId = createStrategy("MVP Approval")
        updateRisk(strategyId, mapOf("strategyKillSwitchEnabled" to false, "minOrderNotional" to 1000.0))
        val planId = createPlan(strategyId, defaultPlanPayload())

        mockMvc
            .perform(post("/api/v1/strategies/$strategyId/rebalance/plans/$planId/send"))
            .andExpect(status().isConflict)

        approvePlan(strategyId, planId)

        mockMvc
            .perform(post("/api/v1/strategies/$strategyId/rebalance/plans/$planId/send"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("sent"))
            .andExpect(jsonPath("$.orders[0].status").value("sent"))
            .andExpect(jsonPath("$.orders[0].idempotencyKey").isNotEmpty)
            .andExpect(jsonPath("$.orders[0].brokerOrderNumber").value(containsString("MOCK-")))
            .andExpect(jsonPath("$.orders[0].brokerResponseCode").value("0"))

        val auditCount =
            jdbcTemplate.queryForObject(
                "select count(*) from strategy_trade_audit_log where strategy_id = ?::uuid and event_type in ('rebalance_plan_created', 'rebalance_plan_approved', 'rebalance_order_sent')",
                Long::class.java,
                strategyId,
            )
        check(auditCount == 5L)
    }

    @Test
    fun `database unique constraints prevent duplicate plan orders and idempotency keys`() {
        val strategyId = createStrategy("MVP Unique")
        updateRisk(strategyId, mapOf("strategyKillSwitchEnabled" to false, "minOrderNotional" to 1000.0))
        val planId = createPlan(strategyId, singleTargetPayload(symbol = "AAA"))
        val order =
            jdbcTemplate.queryForMap(
                """
                select id, symbol, side, quantity, price, notional, estimated_fee, estimated_tax, idempotency_key
                from strategy_rebalance_plan_order
                where plan_id = ?::uuid
                limit 1
                """.trimIndent(),
                planId,
            )

        assertThrows<DataIntegrityViolationException> {
            jdbcTemplate.update(
                """
                insert into strategy_rebalance_plan_order (
                    id, plan_id, strategy_id, symbol, side, quantity, price, notional, estimated_fee, estimated_tax,
                    status, idempotency_key, remaining_quantity, precheck_summary, payload
                ) values (gen_random_uuid(), ?::uuid, ?::uuid, ?, ?, ?, ?, ?, ?, ?, 'planned', ?, ?, '{}'::jsonb, '{}'::jsonb)
                """.trimIndent(),
                planId,
                strategyId,
                order["symbol"],
                order["side"],
                order["quantity"],
                order["price"],
                order["notional"],
                order["estimated_fee"],
                order["estimated_tax"],
                "unique-idempotency-key",
                order["quantity"],
            )
        }

        assertThrows<DataIntegrityViolationException> {
            jdbcTemplate.update(
                """
                insert into strategy_rebalance_plan_order (
                    id, plan_id, strategy_id, symbol, side, quantity, price, notional, estimated_fee, estimated_tax,
                    status, idempotency_key, remaining_quantity, precheck_summary, payload
                ) values (gen_random_uuid(), ?::uuid, ?::uuid, 'BBB', ?, ?, ?, ?, ?, ?, 'planned', ?, ?, '{}'::jsonb, '{}'::jsonb)
                """.trimIndent(),
                planId,
                strategyId,
                order["side"],
                order["quantity"],
                order["price"],
                order["notional"],
                order["estimated_fee"],
                order["estimated_tax"],
                order["idempotency_key"],
                order["quantity"],
            )
        }
    }

    @Test
    fun `legacy risk update does not reset live gate or close policy`() {
        val strategyId = createStrategy("MVP Risk Compatibility")
        updateRisk(
            strategyId,
            mapOf(
                "strategyKillSwitchEnabled" to false,
                "liveTradingEnabled" to true,
                "minOrderNotional" to 1000.0,
                "closeUnfilledPolicy" to "keep",
            ),
        )

        updateRisk(strategyId, mapOf("strategyKillSwitchEnabled" to true))

        mockMvc
            .perform(get("/api/v1/strategies/$strategyId/risk"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.strategyKillSwitchEnabled").value(true))
            .andExpect(jsonPath("$.liveTradingEnabled").value(true))
            .andExpect(jsonPath("$.closeUnfilledPolicy").value("keep"))
    }

    @Test
    fun `rejects unsafe negative risk settings and inconsistent account snapshots`() {
        val strategyId = createStrategy("MVP Input Guard")

        mockMvc
            .perform(
                put("/api/v1/strategies/$strategyId/risk")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(mapOf("strategyKillSwitchEnabled" to false, "minOrderNotional" to -1.0))),
            ).andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.detail").value(containsString("minOrderNotional")))

        mockMvc
            .perform(
                post("/api/v1/strategies/$strategyId/rebalance/plans")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "mode" to "paper",
                                "accountSnapshot" to
                                    mapOf(
                                        "equity" to 100000.0,
                                        "cash" to 100000.0,
                                        "positions" to listOf(mapOf("symbol" to "AAA", "quantity" to 1, "price" to 1000.0, "availableQuantity" to 2)),
                                    ),
                                "targetWeights" to listOf(mapOf("symbol" to "AAA", "targetWeight" to 0.2, "price" to 1000.0)),
                            ),
                        ),
                    ),
            ).andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.detail").value(containsString("availableQuantity")))

        mockMvc
            .perform(
                post("/api/v1/strategies/$strategyId/rebalance/plans")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "mode" to "paper",
                                "accountSnapshot" to
                                    mapOf(
                                        "equity" to 100000.0,
                                        "cash" to 100000.0,
                                        "positions" to emptyList<Map<String, Any?>>(),
                                    ),
                                "targetWeights" to
                                    listOf(
                                        mapOf("symbol" to "AAA", "targetWeight" to 0.1, "price" to 1000.0),
                                        mapOf("symbol" to "AAA", "targetWeight" to 0.1, "price" to 1000.0),
                                    ),
                            ),
                        ),
                    ),
            ).andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.detail").value(containsString("Target symbols must be unique")))
    }

    @Test
    fun `blocks live send unless environment live gate is enabled even when approved and strategy live enabled`() {
        val strategyId = createStrategy("MVP Live Block")
        updateRisk(
            strategyId,
            mapOf(
                "strategyKillSwitchEnabled" to false,
                "liveTradingEnabled" to true,
                "minOrderNotional" to 1000.0,
            ),
        )
        val planId = createPlan(strategyId, singleTargetPayload(symbol = "AAA", mode = "live"))
        approvePlan(strategyId, planId, confirmLiveRisk = true)

        mockMvc
            .perform(post("/api/v1/strategies/$strategyId/rebalance/plans/$planId/send"))
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.detail").value(containsString("environment_live_not_enabled")))
    }

    @Test
    fun `timeout stores unknown without retry and duplicate open symbol blocks a later plan`() {
        val strategyId = createStrategy("MVP Unknown")
        updateRisk(strategyId, mapOf("strategyKillSwitchEnabled" to false, "minOrderNotional" to 100.0))
        val timeoutPlanId = createPlan(strategyId, singleTargetPayload(symbol = "TIMEOUT1", price = 100.0))
        approvePlan(strategyId, timeoutPlanId)

        mockMvc
            .perform(post("/api/v1/strategies/$strategyId/rebalance/plans/$timeoutPlanId/send"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.orders[0].status").value("unknown"))
            .andExpect(jsonPath("$.orders[0].brokerResponseCode").value("TIMEOUT"))

        val secondPlanId = createPlan(strategyId, singleTargetPayload(symbol = "TIMEOUT1", price = 100.0))
        approvePlan(strategyId, secondPlanId)
        mockMvc
            .perform(post("/api/v1/strategies/$strategyId/rebalance/plans/$secondPlanId/send"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.orders[0].status").value("rejected_precheck"))
            .andExpect(jsonPath("$.orders[0].precheckSummary.reasonCodes[0]").value("duplicate_open_symbol_order"))
    }

    @Test
    fun `precheck enforces kill switch account daily and symbol notional limits`() {
        val strategyId = createStrategy("MVP Precheck Limits")
        updateRisk(strategyId, mapOf("strategyKillSwitchEnabled" to false, "minOrderNotional" to 100.0))
        val planId = createPlan(strategyId, singleTargetPayload(symbol = "AAA", price = 100.0))
        approvePlan(strategyId, planId)
        updateRisk(
            strategyId,
            mapOf(
                "strategyKillSwitchEnabled" to true,
                "minOrderNotional" to 100.0,
                "accountMaxOrderNotional" to 500.0,
                "accountDailyMaxOrderNotional" to 500.0,
                "symbolMaxOrderNotional" to 500.0,
            ),
        )

        mockMvc
            .perform(post("/api/v1/strategies/$strategyId/rebalance/plans/$planId/send"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.orders[0].status").value("rejected_precheck"))
            .andExpect(jsonPath("$.orders[0].precheckSummary.reasonCodes[0]").value("strategy_kill_switch"))
            .andExpect(jsonPath("$.orders[0].precheckSummary.reasonCodes[1]").value("account_max_order_notional"))
            .andExpect(jsonPath("$.orders[0].precheckSummary.reasonCodes[2]").value("symbol_max_order_notional"))
            .andExpect(jsonPath("$.orders[0].precheckSummary.reasonCodes[3]").value("account_daily_max_order_notional"))
    }

    @Test
    fun `sync cancels unfilled orders at close and position mismatch enables kill switch`() {
        val strategyId = createStrategy("MVP Sync")
        updateRisk(strategyId, mapOf("strategyKillSwitchEnabled" to false, "minOrderNotional" to 1000.0, "closeUnfilledPolicy" to "cancel"))
        val planId = createPlan(strategyId, singleTargetPayload(symbol = "AAA"))
        approvePlan(strategyId, planId)
        mockMvc.perform(post("/api/v1/strategies/$strategyId/rebalance/plans/$planId/send")).andExpect(status().isOk)

        mockMvc
            .perform(
                post("/api/v1/strategies/$strategyId/rebalance/plans/$planId/sync")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "marketClosed" to true,
                                "brokerPositions" to listOf(mapOf("symbol" to "AAA", "quantity" to 99)),
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.orders[0].status").value("cancelled"))

        mockMvc
            .perform(get("/api/v1/system/risk"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.killSwitchEnabled").value(true))
    }

    @Test
    fun `unrecognized broker status is normalized to unknown with bounded quantities`() {
        val strategyId = createStrategy("MVP Bad Broker Status")
        updateRisk(strategyId, mapOf("strategyKillSwitchEnabled" to false, "minOrderNotional" to 100.0))
        val planId = createPlan(strategyId, singleTargetPayload(symbol = "BADSTATUS1", price = 100.0))
        approvePlan(strategyId, planId)
        mockMvc.perform(post("/api/v1/strategies/$strategyId/rebalance/plans/$planId/send")).andExpect(status().isOk)

        mockMvc
            .perform(
                post("/api/v1/strategies/$strategyId/rebalance/plans/$planId/sync")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(emptyMap<String, Any?>())),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("unknown"))
            .andExpect(jsonPath("$.orders[0].status").value("unknown"))
            .andExpect(jsonPath("$.orders[0].brokerResponseCode").value("UNKNOWN_STATUS"))
            .andExpect(jsonPath("$.orders[0].filledQuantity").value(199))
            .andExpect(jsonPath("$.orders[0].remainingQuantity").value(0))
    }

    @Test
    fun `consecutive broker API errors stop automation and enable kill switch`() {
        val strategyId = createStrategy("MVP Failure Stop")
        updateRisk(strategyId, mapOf("strategyKillSwitchEnabled" to false, "minOrderNotional" to 100.0))

        listOf("APIERR1", "APIERR2", "APIERR3").forEach { symbol ->
            val planId = createPlan(strategyId, singleTargetPayload(symbol = symbol, price = 100.0))
            approvePlan(strategyId, planId)
            mockMvc.perform(post("/api/v1/strategies/$strategyId/rebalance/plans/$planId/send")).andExpect(status().isOk)
        }

        mockMvc
            .perform(get("/api/v1/system/risk"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.killSwitchEnabled").value(true))

        mockMvc
            .perform(get("/api/v1/strategies/$strategyId/risk"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.strategyKillSwitchEnabled").value(true))
    }

    private fun createPlan(
        strategyId: String,
        payload: Map<String, Any?>,
    ): String =
        mockMvc
            .perform(
                post("/api/v1/strategies/$strategyId/rebalance/plans")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(payload)),
            ).andExpect(status().isOk)
            .andReturn()
            .response
            .contentAsString
            .let { objectMapper.readTree(it).get("id").asText() }

    private fun approvePlan(
        strategyId: String,
        planId: String,
        confirmLiveRisk: Boolean = false,
    ) {
        mockMvc
            .perform(
                post("/api/v1/strategies/$strategyId/rebalance/plans/$planId/approve")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(mapOf("approvedBy" to "owner", "confirmLiveRisk" to confirmLiveRisk))),
            ).andExpect(status().isOk)
    }

    private fun updateRisk(
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
                                "description" to "rebalance draft",
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

    private fun defaultPlanPayload(): Map<String, Any?> =
        mapOf(
            "mode" to "paper",
            "accountSnapshot" to
                mapOf(
                    "equity" to 100000.0,
                    "cash" to 50000.0,
                    "marketOpen" to true,
                    "holiday" to false,
                    "positions" to
                        listOf(
                            mapOf("symbol" to "AAA", "quantity" to 10, "price" to 1000.0, "availableQuantity" to 10),
                            mapOf("symbol" to "CCC", "quantity" to 20, "price" to 1000.0, "availableQuantity" to 20),
                        ),
                ),
            "targetWeights" to
                listOf(
                    mapOf("symbol" to "AAA", "targetWeight" to 0.2, "price" to 1000.0),
                    mapOf("symbol" to "BBB", "targetWeight" to 0.3, "price" to 2000.0),
                    mapOf("symbol" to "CCC", "targetWeight" to 0.0, "price" to 1000.0),
                ),
        )

    private fun singleTargetPayload(
        symbol: String,
        price: Double = 1000.0,
        mode: String = "paper",
    ): Map<String, Any?> =
        mapOf(
            "mode" to mode,
            "accountSnapshot" to
                mapOf(
                    "equity" to 100000.0,
                    "cash" to 100000.0,
                    "marketOpen" to true,
                    "holiday" to false,
                    "positions" to emptyList<Map<String, Any?>>(),
                ),
            "targetWeights" to listOf(mapOf("symbol" to symbol, "targetWeight" to 0.2, "price" to price)),
        )

    private fun validBuilderPayload(name: String) =
        mapOf(
            "builderState" to
                mapOf(
                    "metadata" to
                        mapOf(
                            "id" to name.lowercase().replace(" ", "_"),
                            "name" to name,
                            "description" to "rebalance draft",
                            "category" to "custom",
                            "author" to "OpenForge",
                            "tags" to listOf("rebalance"),
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

@TestPropertySource(
    properties = [
        "app.mode=live",
        "app.live-trading.enabled=true",
        "app.live-trading.mock-broker=true",
    ],
)
class LiveRebalanceTradingApiIntegrationTest : PostgresIntegrationTestSupport() {
    @Autowired
    lateinit var mockMvc: MockMvc

    private val objectMapper = JsonMapper.builder().findAndAddModules().build()

    @Test
    fun `sends live plan when environment admin approval and strategy live gates are all enabled`() {
        val strategyId = createStrategy("MVP Live Send")
        updateRisk(
            strategyId,
            mapOf(
                "strategyKillSwitchEnabled" to false,
                "liveTradingEnabled" to true,
                "minOrderNotional" to 1000.0,
            ),
        )
        val planId = createPlan(strategyId, singleTargetPayload(symbol = "AAA", mode = "live"))
        approvePlan(strategyId, planId, confirmLiveRisk = true)

        mockMvc
            .perform(post("/api/v1/strategies/$strategyId/rebalance/plans/$planId/send"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.mode").value("live"))
            .andExpect(jsonPath("$.orders[0].status").value("sent"))
            .andExpect(jsonPath("$.orders[0].brokerOrderNumber").value(containsString("MOCK-")))
    }

    @Test
    fun `live precheck blocks closed market insufficient cash and unavailable sell quantity`() {
        val buyStrategyId = createStrategy("MVP Live Cash")
        updateRisk(buyStrategyId, mapOf("strategyKillSwitchEnabled" to false, "liveTradingEnabled" to true, "minOrderNotional" to 100.0))
        val buyPlanId =
            createPlan(
                buyStrategyId,
                mapOf(
                    "mode" to "live",
                    "accountSnapshot" to
                        mapOf(
                            "equity" to 100000.0,
                            "cash" to 100000.0,
                            "marketOpen" to true,
                            "holiday" to false,
                            "positions" to emptyList<Map<String, Any?>>(),
                        ),
                    "targetWeights" to listOf(mapOf("symbol" to "AAA", "targetWeight" to 0.2, "price" to 100.0)),
                ),
            )
        approvePlan(buyStrategyId, buyPlanId, confirmLiveRisk = true)
        jdbcTemplate.update(
            "update strategy_rebalance_plan set account_snapshot = cast(? as jsonb) where id = ?::uuid",
            objectMapper.writeValueAsString(
                mapOf(
                    "equity" to 100000.0,
                    "cash" to 1.0,
                    "marketOpen" to false,
                    "holiday" to false,
                    "positions" to emptyList<Map<String, Any?>>(),
                ),
            ),
            buyPlanId,
        )
        mockMvc
            .perform(post("/api/v1/strategies/$buyStrategyId/rebalance/plans/$buyPlanId/send"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.orders[0].status").value("rejected_precheck"))
            .andExpect(jsonPath("$.orders[0].precheckSummary.reasonCodes[0]").value("live_market_closed"))
            .andExpect(jsonPath("$.orders[0].precheckSummary.reasonCodes[1]").value("cash_available"))

        val sellStrategyId = createStrategy("MVP Live Sell")
        updateRisk(sellStrategyId, mapOf("strategyKillSwitchEnabled" to false, "liveTradingEnabled" to true, "minOrderNotional" to 100.0))
        val sellPlanId =
            createPlan(
                sellStrategyId,
                mapOf(
                    "mode" to "live",
                    "accountSnapshot" to
                        mapOf(
                            "equity" to 100000.0,
                            "cash" to 10000.0,
                            "marketOpen" to true,
                            "holiday" to false,
                            "positions" to listOf(mapOf("symbol" to "AAA", "quantity" to 10, "price" to 1000.0, "availableQuantity" to 10)),
                        ),
                    "targetWeights" to listOf(mapOf("symbol" to "AAA", "targetWeight" to 0.0, "price" to 1000.0)),
                ),
            )
        approvePlan(sellStrategyId, sellPlanId, confirmLiveRisk = true)
        jdbcTemplate.update(
            "update strategy_rebalance_plan set account_snapshot = cast(? as jsonb) where id = ?::uuid",
            objectMapper.writeValueAsString(
                mapOf(
                    "equity" to 100000.0,
                    "cash" to 10000.0,
                    "marketOpen" to true,
                    "holiday" to false,
                    "positions" to listOf(mapOf("symbol" to "AAA", "quantity" to 10, "price" to 1000.0, "availableQuantity" to 0)),
                ),
            ),
            sellPlanId,
        )
        mockMvc
            .perform(post("/api/v1/strategies/$sellStrategyId/rebalance/plans/$sellPlanId/send"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.orders[0].status").value("rejected_precheck"))
            .andExpect(jsonPath("$.orders[0].precheckSummary.reasonCodes[0]").value("sell_available_quantity"))
    }

    private fun createPlan(
        strategyId: String,
        payload: Map<String, Any?>,
    ): String =
        mockMvc
            .perform(
                post("/api/v1/strategies/$strategyId/rebalance/plans")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(payload)),
            ).andExpect(status().isOk)
            .andReturn()
            .response
            .contentAsString
            .let { objectMapper.readTree(it).get("id").asText() }

    private fun approvePlan(
        strategyId: String,
        planId: String,
        confirmLiveRisk: Boolean,
    ) {
        mockMvc
            .perform(
                post("/api/v1/strategies/$strategyId/rebalance/plans/$planId/approve")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(mapOf("approvedBy" to "owner", "confirmLiveRisk" to confirmLiveRisk))),
            ).andExpect(status().isOk)
    }

    private fun updateRisk(
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
                                "description" to "rebalance draft",
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

    private fun singleTargetPayload(
        symbol: String,
        mode: String,
    ): Map<String, Any?> =
        mapOf(
            "mode" to mode,
            "accountSnapshot" to
                mapOf(
                    "equity" to 100000.0,
                    "cash" to 100000.0,
                    "marketOpen" to true,
                    "holiday" to false,
                    "positions" to emptyList<Map<String, Any?>>(),
                ),
            "targetWeights" to listOf(mapOf("symbol" to symbol, "targetWeight" to 0.2, "price" to 1000.0)),
        )

    private fun validBuilderPayload(name: String) =
        mapOf(
            "builderState" to
                mapOf(
                    "metadata" to
                        mapOf(
                            "id" to name.lowercase().replace(" ", "_"),
                            "name" to name,
                            "description" to "rebalance draft",
                            "category" to "custom",
                            "author" to "OpenForge",
                            "tags" to listOf("rebalance"),
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
