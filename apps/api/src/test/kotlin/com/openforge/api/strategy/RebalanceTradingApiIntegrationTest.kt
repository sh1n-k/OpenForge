package com.openforge.api.strategy

import com.openforge.api.strategy.application.KisOrderStatusMapper
import com.openforge.api.support.PostgresIntegrationTestSupport
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpHandler
import com.sun.net.httpserver.HttpServer
import org.assertj.core.api.Assertions.assertThat
import org.hamcrest.Matchers.containsString
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.MediaType
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.context.TestPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import tools.jackson.databind.json.JsonMapper
import java.net.InetSocketAddress
import java.nio.charset.StandardCharsets

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

        mockMvc
            .perform(get("/api/v1/strategies/$strategyId/rebalance/plans/$planId"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("blocked"))
            .andExpect(jsonPath("$.failureReason").value(containsString("live_broker_not_allowed")))
    }

    @Test
    fun `live approval requires checklist and exact confirmation phrase`() {
        val strategyId = createStrategy("MVP Live Approval Phrase")
        updateRisk(strategyId, mapOf("strategyKillSwitchEnabled" to false, "liveTradingEnabled" to true, "minOrderNotional" to 1000.0))
        val planId = createPlan(strategyId, singleTargetPayload(symbol = "AAA", mode = "live"))

        mockMvc
            .perform(
                post("/api/v1/strategies/$strategyId/rebalance/plans/$planId/approve")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "approvedBy" to "owner",
                                "confirmLiveRisk" to true,
                                "liveChecklistAccepted" to false,
                                "liveConfirmationPhrase" to "wrong",
                            ),
                        ),
                    ),
            ).andExpect(status().isConflict)
            .andExpect(jsonPath("$.detail").value(containsString("live_checklist_required")))
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

    @Test
    fun `creates rebalance plan from latest broker ledger balance snapshot`() {
        val strategyId = createStrategy("MVP Ledger Plan")
        updateRisk(strategyId, mapOf("strategyKillSwitchEnabled" to false, "minOrderNotional" to 100.0))
        val syncRunId = insertDomesticLedgerSnapshot()

        mockMvc
            .perform(
                post("/api/v1/strategies/$strategyId/rebalance/plans/from-ledger")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "mode" to "paper",
                                "maxSnapshotAgeMinutes" to 60,
                                "targetWeights" to
                                    listOf(
                                        mapOf("symbol" to "AAA", "targetWeight" to 0.0),
                                        mapOf("symbol" to "BBB", "targetWeight" to 0.5, "price" to 1000.0),
                                    ),
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("planned"))
            .andExpect(jsonPath("$.accountSnapshot.source").value("broker_ledger"))
            .andExpect(jsonPath("$.accountSnapshot.sourceSyncRunId").value(syncRunId))
            .andExpect(jsonPath("$.accountSnapshot.cash").value(90000.0))
            .andExpect(jsonPath("$.orders", hasSize<Any>(2)))
            .andExpect(jsonPath("$.orders[0].symbol").value("AAA"))
            .andExpect(jsonPath("$.orders[0].side").value("sell"))
            .andExpect(jsonPath("$.orders[1].symbol").value("BBB"))
            .andExpect(jsonPath("$.orders[1].side").value("buy"))
    }

    @Test
    fun `ledger rebalance requires an actual domestic balance snapshot even with cash override`() {
        val strategyId = createStrategy("MVP Ledger Empty")
        val syncRunId =
            java.util.UUID
                .randomUUID()
                .toString()
        jdbcTemplate.update(
            """
            insert into broker_ledger_sync_run (
                id, broker_type, status, markets, overseas_exchanges, start_date, end_date,
                trade_count, balance_count, profit_count, requested_at, started_at, completed_at,
                error_message, created_at, updated_at
            ) values (?::uuid, 'kis', 'succeeded', 'domestic', '', current_date, current_date, 0, 0, 0, now(), now(), now(), null, now(), now())
            """.trimIndent(),
            syncRunId,
        )

        mockMvc
            .perform(
                post("/api/v1/strategies/$strategyId/rebalance/plans/from-ledger")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "mode" to "paper",
                                "syncRunId" to syncRunId,
                                "cashOverride" to 100000.0,
                                "targetWeights" to listOf(mapOf("symbol" to "BBB", "targetWeight" to 0.5, "price" to 1000.0)),
                            ),
                        ),
                    ),
            ).andExpect(status().isConflict)
            .andExpect(jsonPath("$.detail").value(containsString("No domestic broker ledger balance snapshot exists")))
    }

    @Test
    fun `maps KIS paper order status rows into safe internal statuses`() {
        assertThat(
            KisOrderStatusMapper
                .map(
                    mapOf("tot_ccld_qty" to "3", "rmn_qty" to "2", "ord_stat_name" to "접수"),
                    5,
                ).status,
        ).isEqualTo("partially_filled")
        assertThat(
            KisOrderStatusMapper
                .map(
                    mapOf("tot_ccld_qty" to "5", "rmn_qty" to "0", "ord_stat_name" to "체결"),
                    5,
                ).status,
        ).isEqualTo("filled")
        assertThat(
            KisOrderStatusMapper
                .map(
                    mapOf("tot_ccld_qty" to "0", "rmn_qty" to "5", "ord_stat_name" to "취소"),
                    5,
                ).status,
        ).isEqualTo("cancelled")
        assertThat(
            KisOrderStatusMapper
                .map(
                    mapOf("tot_ccld_qty" to "0", "rmn_qty" to "5", "ord_stat_name" to "거부"),
                    5,
                ).status,
        ).isEqualTo("rejected")
        assertThat(
            KisOrderStatusMapper
                .map(
                    mapOf("tot_ccld_qty" to "0", "rmn_qty" to "5", "ord_stat_name" to "unexpected"),
                    5,
                ).status,
        ).isEqualTo("unknown")
    }

    private fun insertDomesticLedgerSnapshot(): String {
        val syncRunId =
            java.util.UUID
                .randomUUID()
                .toString()
        jdbcTemplate.update(
            """
            insert into broker_ledger_sync_run (
                id, broker_type, status, markets, overseas_exchanges, start_date, end_date,
                trade_count, balance_count, profit_count, requested_at, started_at, completed_at,
                error_message, created_at, updated_at
            ) values (?::uuid, 'kis', 'succeeded', 'domestic', '', current_date, current_date, 0, 1, 0, now(), now(), now(), null, now(), now())
            """.trimIndent(),
            syncRunId,
        )
        jdbcTemplate.update(
            """
            insert into broker_ledger_balance_snapshot (
                id, sync_run_id, market, row_kind, source_api, symbol, symbol_name,
                quantity, average_price, current_price, valuation_amount, raw_payload, captured_at
            ) values (gen_random_uuid(), ?::uuid, 'domestic', 'item', 'test', 'AAA', 'AAA Corp',
                10, 900, 1000, 10000, '{}'::jsonb, now())
            """.trimIndent(),
            syncRunId,
        )
        jdbcTemplate.update(
            """
            insert into broker_ledger_balance_snapshot (
                id, sync_run_id, market, row_kind, source_api, valuation_amount, raw_payload, captured_at
            ) values (gen_random_uuid(), ?::uuid, 'domestic', 'summary', 'test', 100000, cast(? as jsonb), now())
            """.trimIndent(),
            syncRunId,
            objectMapper.writeValueAsString(
                mapOf(
                    "dnca_tot_amt" to "90000",
                    "tot_evlu_amt" to "100000",
                ),
            ),
        )
        return syncRunId
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
                    .content(
                        objectMapper.writeValueAsBytes(
                            buildMap<String, Any?> {
                                put("approvedBy", "owner")
                                put("confirmLiveRisk", confirmLiveRisk)
                                if (confirmLiveRisk) {
                                    put("liveChecklistAccepted", true)
                                    put("liveConfirmationPhrase", "LIVE 리밸런싱 위험 확인")
                                }
                            },
                        ),
                    ),
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
        "app.live-trading.mock-broker=false",
    ],
)
class KisPaperRebalanceTradingApiIntegrationTest : PostgresIntegrationTestSupport() {
    @Autowired
    lateinit var mockMvc: MockMvc

    private val objectMapper = JsonMapper.builder().findAndAddModules().build()

    @Test
    fun `sends paper rebalance order through KIS paper adapter and syncs accepted status`() {
        savePaperBrokerConfig()
        val strategyId = createStrategy("KIS Paper Rebalance")
        updateRisk(strategyId, mapOf("strategyKillSwitchEnabled" to false, "minOrderNotional" to 100.0))
        val planId = createPlan(strategyId)
        approvePlan(strategyId, planId)

        mockMvc
            .perform(post("/api/v1/strategies/$strategyId/rebalance/plans/$planId/send"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.orders[0].status").value("sent"))
            .andExpect(jsonPath("$.orders[0].brokerOrderNumber").value("PAPER-ORDER-1"))
            .andExpect(jsonPath("$.orders[0].brokerResponseCode").value("0"))

        mockMvc
            .perform(
                post("/api/v1/strategies/$strategyId/rebalance/plans/$planId/sync")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(emptyMap<String, Any?>())),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.orders[0].status").value("accepted"))
            .andExpect(jsonPath("$.orders[0].remainingQuantity").value(19))
    }

    private fun savePaperBrokerConfig() {
        mockMvc
            .perform(
                put("/api/v1/system/broker/config")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "targetMode" to "paper",
                                "appKey" to "paper-app-key",
                                "appSecret" to "paper-app-secret",
                                "accountNumber" to "12345678",
                                "productCode" to "01",
                                "enabled" to true,
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
    }

    private fun createPlan(strategyId: String): String =
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
                                        "marketOpen" to true,
                                        "holiday" to false,
                                        "positions" to emptyList<Map<String, Any?>>(),
                                    ),
                                "targetWeights" to listOf(mapOf("symbol" to "AAA", "targetWeight" to 0.2, "price" to 1000.0)),
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
            .andReturn()
            .response
            .contentAsString
            .let { objectMapper.readTree(it).get("id").asText() }

    private fun approvePlan(
        strategyId: String,
        planId: String,
    ) {
        mockMvc
            .perform(
                post("/api/v1/strategies/$strategyId/rebalance/plans/$planId/approve")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(mapOf("approvedBy" to "owner"))),
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
                                "description" to "kis paper draft",
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
                            "description" to "kis paper draft",
                            "category" to "custom",
                            "author" to "OpenForge",
                            "tags" to listOf("rebalance"),
                        ),
                    "indicators" to listOf(mapOf("indicatorId" to "sma", "alias" to "sma_fast", "params" to mapOf("period" to 2), "output" to "value")),
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

    companion object {
        private val kisStubServer = KisPaperOrderStubServer.start()

        @JvmStatic
        @DynamicPropertySource
        fun registerProperties(registry: DynamicPropertyRegistry) {
            registry.add("app.kis.paper-base-url") { kisStubServer.baseUrl }
        }
    }
}

@TestPropertySource(
    properties = [
        "app.mode=live",
        "app.live-trading.enabled=true",
        "app.live-trading.allow-live-broker=true",
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

    @Test
    fun `live precheck blocks orders above default live notional limit`() {
        val strategyId = createStrategy("MVP Live Default Limit")
        updateRisk(strategyId, mapOf("strategyKillSwitchEnabled" to false, "liveTradingEnabled" to true, "minOrderNotional" to 100.0))
        val planId =
            createPlan(
                strategyId,
                mapOf(
                    "mode" to "live",
                    "accountSnapshot" to
                        mapOf(
                            "equity" to 200000.0,
                            "cash" to 200000.0,
                            "marketOpen" to true,
                            "holiday" to false,
                            "positions" to emptyList<Map<String, Any?>>(),
                        ),
                    "targetWeights" to listOf(mapOf("symbol" to "AAA", "targetWeight" to 1.0, "price" to 1000.0)),
                ),
            )
        approvePlan(strategyId, planId, confirmLiveRisk = true)

        mockMvc
            .perform(post("/api/v1/strategies/$strategyId/rebalance/plans/$planId/send"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.orders[0].status").value("rejected_precheck"))
            .andExpect(jsonPath("$.orders[0].precheckSummary.reasonCodes[0]").value("live_default_order_notional"))
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
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "approvedBy" to "owner",
                                "confirmLiveRisk" to confirmLiveRisk,
                                "liveChecklistAccepted" to confirmLiveRisk,
                                "liveConfirmationPhrase" to if (confirmLiveRisk) "LIVE 리밸런싱 위험 확인" else "",
                            ),
                        ),
                    ),
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

private class KisPaperOrderStubServer(
    private val server: HttpServer,
) {
    val baseUrl: String = "http://127.0.0.1:${server.address.port}"

    companion object {
        fun start(): KisPaperOrderStubServer {
            val server = HttpServer.create(InetSocketAddress(0), 0)
            server.createContext("/oauth2/tokenP", JsonHandler("""{"access_token":"paper-token"}"""))
            server.createContext("/uapi/hashkey", JsonHandler("""{"HASH":"paper-hash"}"""))
            server.createContext(
                "/uapi/domestic-stock/v1/trading/order-cash",
                JsonHandler("""{"rt_cd":"0","msg1":"paper order accepted","output":{"ODNO":"PAPER-ORDER-1"}}"""),
            )
            server.createContext(
                "/uapi/domestic-stock/v1/trading/inquire-ccnl",
                JsonHandler(
                    """
                    {
                      "rt_cd": "0",
                      "msg1": "paper order status",
                      "output1": [
                        {
                          "odno": "PAPER-ORDER-1",
                          "tot_ccld_qty": "0",
                          "rmn_qty": "20",
                          "ord_stat_name": "접수"
                        }
                      ]
                    }
                    """.trimIndent(),
                ),
            )
            server.start()
            return KisPaperOrderStubServer(server)
        }
    }
}

private class JsonHandler(
    private val body: String,
) : HttpHandler {
    override fun handle(exchange: HttpExchange) {
        val response = body.toByteArray(StandardCharsets.UTF_8)
        exchange.responseHeaders.add("Content-Type", "application/json")
        exchange.sendResponseHeaders(200, response.size.toLong())
        exchange.responseBody.use { it.write(response) }
    }
}
