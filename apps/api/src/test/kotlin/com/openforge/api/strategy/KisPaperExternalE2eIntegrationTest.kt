package com.openforge.api.strategy

import com.openforge.api.support.PostgresIntegrationTestSupport
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.context.TestPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import tools.jackson.databind.json.JsonMapper

@TestPropertySource(
    properties = [
        "app.live-trading.mock-broker=false",
    ],
)
class KisPaperExternalE2eIntegrationTest : PostgresIntegrationTestSupport() {
    @Autowired
    lateinit var mockMvc: MockMvc

    private val objectMapper = JsonMapper.builder().findAndAddModules().build()

    @Test
    fun `verifies real KIS paper rebalance order send and status sync when explicitly enabled`() {
        val env = ExternalKisPaperEnv.loadOrSkip()
        savePaperBrokerConfig(env)
        val strategyId = createStrategy("KIS Paper External E2E")
        updateRisk(strategyId, mapOf("strategyKillSwitchEnabled" to false, "minOrderNotional" to 1.0))
        val planId = createPlan(strategyId, env)
        approvePlan(strategyId, planId)

        val sent = sendPlan(strategyId, planId)
        val firstOrder = sent["orders"][0]
        assertThat(firstOrder["status"].asText()).isEqualTo("sent")
        assertThat(firstOrder["brokerOrderNumber"].asText()).isNotBlank()
        assertThat(firstOrder["brokerResponseCode"].asText()).isEqualTo("0")

        val synced = syncPlan(strategyId, planId)
        val syncedStatus = synced["orders"][0]["status"].asText()
        assertThat(syncedStatus).isIn("sent", "accepted", "partially_filled", "filled", "cancelled", "rejected", "unknown")
    }

    private fun savePaperBrokerConfig(env: ExternalKisPaperEnv) {
        mockMvc
            .perform(
                put("/api/v1/system/broker/config")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "targetMode" to "paper",
                                "appKey" to env.appKey,
                                "appSecret" to env.appSecret,
                                "accountNumber" to env.accountNumber,
                                "productCode" to env.productCode,
                                "enabled" to true,
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
    }

    private fun createPlan(
        strategyId: String,
        env: ExternalKisPaperEnv,
    ): String =
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
                                        "equity" to env.equity,
                                        "cash" to env.cash,
                                        "marketOpen" to true,
                                        "holiday" to false,
                                        "positions" to emptyList<Map<String, Any?>>(),
                                    ),
                                "targetWeights" to listOf(mapOf("symbol" to env.symbol, "targetWeight" to env.targetWeight, "price" to env.price)),
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
                    .content(objectMapper.writeValueAsBytes(mapOf("approvedBy" to "paper-e2e"))),
            ).andExpect(status().isOk)
    }

    private fun sendPlan(
        strategyId: String,
        planId: String,
    ) = mockMvc
        .perform(post("/api/v1/strategies/$strategyId/rebalance/plans/$planId/send"))
        .andExpect(status().isOk)
        .andReturn()
        .response
        .contentAsString
        .let(objectMapper::readTree)

    private fun syncPlan(
        strategyId: String,
        planId: String,
    ) = mockMvc
        .perform(
            post("/api/v1/strategies/$strategyId/rebalance/plans/$planId/sync")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(emptyMap<String, Any?>())),
        ).andExpect(status().isOk)
        .andReturn()
        .response
        .contentAsString
        .let(objectMapper::readTree)

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
                                "description" to "kis paper external e2e",
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
                            "description" to "kis paper external e2e",
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
        @JvmStatic
        @DynamicPropertySource
        fun registerKisBaseUrl(registry: DynamicPropertyRegistry) {
            env("KIS_BASE_URL")?.let { baseUrl ->
                registry.add("app.kis.paper-base-url") { baseUrl }
            }
        }
    }
}

private data class ExternalKisPaperEnv(
    val appKey: String,
    val appSecret: String,
    val accountNumber: String,
    val productCode: String,
    val symbol: String,
    val price: Double,
    val equity: Double,
    val cash: Double,
    val targetWeight: Double,
) {
    companion object {
        fun loadOrSkip(): ExternalKisPaperEnv {
            assumeTrue(env("RUN_KIS_PAPER_E2E") == "true", "RUN_KIS_PAPER_E2E=true is required")
            val required =
                listOf(
                    "KIS_APP_KEY",
                    "KIS_APP_SECRET",
                    "KIS_ACCOUNT_NUMBER",
                    "KIS_PRODUCT_CODE",
                    "KIS_PAPER_SYMBOL",
                    "KIS_PAPER_PRICE",
                    "KIS_PAPER_EQUITY",
                    "KIS_PAPER_CASH",
                )
            val missing = required.filter { env(it).isNullOrBlank() }
            assumeTrue(missing.isEmpty(), "Missing KIS paper e2e env vars: ${missing.joinToString(",")}")

            val price = env("KIS_PAPER_PRICE")!!.toDouble()
            val equity = env("KIS_PAPER_EQUITY")!!.toDouble()
            val targetWeight = env("KIS_PAPER_TARGET_WEIGHT")?.toDouble() ?: 1.0
            val maxNotional = env("KIS_PAPER_MAX_NOTIONAL")?.toDouble() ?: 100_000.0
            assumeTrue(price > 0.0 && equity > 0.0 && targetWeight > 0.0, "KIS paper e2e numeric values must be positive")
            assumeTrue(equity * targetWeight <= maxNotional, "KIS paper e2e notional exceeds KIS_PAPER_MAX_NOTIONAL")

            return ExternalKisPaperEnv(
                appKey = env("KIS_APP_KEY")!!,
                appSecret = env("KIS_APP_SECRET")!!,
                accountNumber = env("KIS_ACCOUNT_NUMBER")!!,
                productCode = env("KIS_PRODUCT_CODE")!!,
                symbol = env("KIS_PAPER_SYMBOL")!!,
                price = price,
                equity = equity,
                cash = env("KIS_PAPER_CASH")!!.toDouble(),
                targetWeight = targetWeight,
            )
        }
    }
}

private fun env(name: String): String? = System.getenv(name)?.trim()?.takeIf { it.isNotBlank() }
