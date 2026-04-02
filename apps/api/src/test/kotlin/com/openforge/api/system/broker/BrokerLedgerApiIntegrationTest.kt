package com.openforge.api.system.broker

import com.openforge.api.strategy.domain.OrderMode
import com.openforge.api.system.broker.ledger.BrokerLedgerService
import com.openforge.api.support.PostgresIntegrationTestSupport
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpHandler
import com.sun.net.httpserver.HttpServer
import org.assertj.core.api.Assertions.assertThat
import org.hamcrest.Matchers.containsString
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import tools.jackson.databind.json.JsonMapper
import java.net.InetSocketAddress
import java.net.URI
import java.nio.charset.StandardCharsets
import java.util.UUID

class BrokerLedgerApiIntegrationTest : PostgresIntegrationTestSupport() {
    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var brokerLedgerService: BrokerLedgerService

    private val objectMapper = JsonMapper.builder().findAndAddModules().build()

    @Test
    fun `sync run succeeds and stores trades balances and profits`() {
        saveLiveBrokerConfig()

        val syncRunId = triggerSync("2026-01-01", "2026-01-05", listOf("NASD"))
        awaitSyncRunStatus(syncRunId, "succeeded")

        mockMvc
            .perform(get("/api/v1/system/broker/ledger/status"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.liveConfigured").value(true))
            .andExpect(jsonPath("$.latestSuccessfulSyncRun.id").value(syncRunId))
            .andExpect(jsonPath("$.latestSuccessfulSyncRun.status").value("succeeded"))
            .andExpect(jsonPath("$.latestSuccessfulSyncRun.tradeCount").value(3))
            .andExpect(jsonPath("$.latestSuccessfulSyncRun.balanceCount").value(2))
            .andExpect(jsonPath("$.latestSuccessfulSyncRun.profitCount").value(2))

        mockMvc
            .perform(get("/api/v1/system/broker/ledger/sync-runs?limit=20"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].id").value(syncRunId))
            .andExpect(jsonPath("$[0].status").value("succeeded"))

        mockMvc
            .perform(get("/api/v1/system/broker/ledger/trades?limit=50"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(3))
            .andExpect(content().string(containsString("\"overseasExchange\":\"NASD\"")))

        mockMvc
            .perform(get("/api/v1/system/broker/ledger/balances?limit=50"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(2))

        mockMvc
            .perform(get("/api/v1/system/broker/ledger/profits?limit=50"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(2))

        assertThat(
            jdbcTemplate.queryForObject(
                "select count(*) from broker_ledger_trade_entry where sync_run_id = ?::uuid and row_kind = 'summary'",
                Int::class.java,
                syncRunId,
            ),
        ).isEqualTo(2)
        assertThat(
            jdbcTemplate.queryForObject(
                "select count(*) from broker_ledger_balance_snapshot where sync_run_id = ?::uuid and row_kind = 'summary'",
                Int::class.java,
                syncRunId,
            ),
        ).isEqualTo(2)
        assertThat(
            jdbcTemplate.queryForObject(
                "select count(*) from broker_ledger_profit_snapshot where sync_run_id = ?::uuid and row_kind = 'summary'",
                Int::class.java,
                syncRunId,
            ),
        ).isEqualTo(2)
    }

    @Test
    fun `sync run failure marks run failed and rolls back stored rows`() {
        saveLiveBrokerConfig()

        val syncRunId = triggerSync("2026-01-01", "2026-01-05", listOf("AMEX"))
        awaitSyncRunStatus(syncRunId, "failed")

        mockMvc
            .perform(get("/api/v1/system/broker/ledger/status"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.latestSyncRun.id").value(syncRunId))
            .andExpect(jsonPath("$.latestSyncRun.status").value("failed"))
            .andExpect(jsonPath("$.latestSuccessfulSyncRun").doesNotExist())

        mockMvc
            .perform(get("/api/v1/system/broker/ledger/trades?syncRunId=$syncRunId"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(0))

        mockMvc
            .perform(get("/api/v1/system/broker/ledger/balances?syncRunId=$syncRunId"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(0))

        mockMvc
            .perform(get("/api/v1/system/broker/ledger/profits?syncRunId=$syncRunId"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(0))
    }

    @Test
    fun `stale running sync runs are marked interrupted on recovery`() {
        jdbcTemplate.update(
            """
            insert into broker_ledger_sync_run (
                id, broker_type, status, markets, overseas_exchanges, start_date, end_date,
                trade_count, balance_count, profit_count, requested_at, started_at, completed_at,
                error_message, created_at, updated_at
            ) values (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, now(), now(), null, null, now(), now())
            """.trimIndent(),
            UUID.randomUUID(),
            "kis",
            "running",
            "domestic,overseas",
            "NASD",
            java.sql.Date.valueOf("2026-01-01"),
            java.sql.Date.valueOf("2026-01-05"),
        )

        brokerLedgerService.recoverInterruptedSyncRuns()

        mockMvc
            .perform(get("/api/v1/system/broker/ledger/sync-runs?limit=20"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].status").value("failed"))
            .andExpect(jsonPath("$[0].errorMessage").value("interrupted"))
    }

    private fun saveLiveBrokerConfig() {
        mockMvc
            .perform(
                put("/api/v1/system/broker/config")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "targetMode" to OrderMode.LIVE,
                                "appKey" to "ledger-live-app-key",
                                "appSecret" to "ledger-live-app-secret",
                                "accountNumber" to "12345678",
                                "productCode" to "01",
                                "enabled" to true,
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
    }

    private fun triggerSync(
        startDate: String,
        endDate: String,
        overseasExchanges: List<String>,
    ): String =
        mockMvc
            .perform(
                post("/api/v1/system/broker/ledger/sync")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsBytes(
                            mapOf(
                                "startDate" to startDate,
                                "endDate" to endDate,
                                "markets" to listOf("domestic", "overseas"),
                                "overseasExchanges" to overseasExchanges,
                            ),
                        ),
                    ),
            ).andExpect(status().isOk)
            .andReturn()
            .response
            .contentAsString
            .let { objectMapper.readTree(it)["id"].asText() }

    private fun awaitSyncRunStatus(
        runId: String,
        targetStatus: String,
    ) {
        repeat(60) {
            val status =
                jdbcTemplate.queryForObject(
                    "select status from broker_ledger_sync_run where id = ?::uuid",
                    String::class.java,
                    runId,
                )
            if (status == targetStatus) {
                return
            }
            Thread.sleep(100)
        }
        throw AssertionError("sync run $runId did not reach $targetStatus")
    }

    companion object {
        private val kisStubServer = KisLedgerStubServer.start()

        @JvmStatic
        @DynamicPropertySource
        fun registerProperties(registry: DynamicPropertyRegistry) {
            registry.add("app.kis.live-base-url") { kisStubServer.baseUrl }
            registry.add("app.kis.paper-base-url") { kisStubServer.baseUrl }
        }
    }
}

private class KisLedgerStubServer private constructor(
    private val server: HttpServer,
) {
    val baseUrl: String = "http://127.0.0.1:${server.address.port}"

    companion object {
        fun start(): KisLedgerStubServer {
            val server = HttpServer.create(InetSocketAddress(0), 0)
            server.createContext("/oauth2/tokenP", LedgerTokenHandler())
            server.createContext("/uapi/domestic-stock/v1/trading/inquire-daily-ccld", DomesticTradeHandler())
            server.createContext("/uapi/domestic-stock/v1/trading/inquire-balance-rlz-pl", DomesticBalanceHandler())
            server.createContext("/uapi/domestic-stock/v1/trading/inquire-period-trade-profit", DomesticProfitHandler())
            server.createContext("/uapi/overseas-stock/v1/trading/inquire-ccnl", OverseasTradeHandler())
            server.createContext("/uapi/overseas-stock/v1/trading/inquire-balance", OverseasBalanceHandler())
            server.createContext("/uapi/overseas-stock/v1/trading/inquire-period-profit", OverseasProfitHandler())
            server.start()
            return KisLedgerStubServer(server)
        }
    }
}

private class LedgerTokenHandler : HttpHandler {
    private val objectMapper = JsonMapper.builder().findAndAddModules().build()

    override fun handle(exchange: HttpExchange) {
        if (exchange.requestMethod != "POST") {
            exchange.sendJson(405, """{"msg1":"method not allowed"}""")
            return
        }
        val body = String(exchange.requestBody.readAllBytes(), StandardCharsets.UTF_8)
        val payload = objectMapper.readTree(body)
        val appKey = payload.path("appkey").asText()
        val appSecret = payload.path("appsecret").asText()
        if (appKey.contains("bad") || appSecret.contains("bad")) {
            exchange.sendJson(401, """{"msg1":"invalid credentials"}""")
        } else {
            exchange.sendJson(200, """{"access_token":"stub-access-token","access_token_token_expired":"2099-01-01 00:00:00"}""")
        }
    }
}

private class DomesticTradeHandler : LedgerHandler() {
    override fun successBody(exchange: HttpExchange): String =
        if (exchange.queryParam("CTX_AREA_FK100") == "NEXT-1") {
            """{
                "rt_cd":"0",
                "output1":[
                  {"pdno":"000660","prdt_name":"SK Hynix","sll_buy_dvsn_cd":"01","ccld_nccs_dvsn":"01","odno":"D-002","ord_qty":"5","ord_unpr":"180000","ccld_qty":"5","rmn_qty":"0","rlzt_pnl":"900","crcy_cd":"KRW"}
                ],
                "output2":{"pdno":"TOTAL","prdt_name":"Domestic Summary","sll_buy_dvsn_cd":"02","ccld_nccs_dvsn":"01","odno":"D-SUM-2","ord_qty":"15","ord_unpr":"0","ccld_qty":"15","rmn_qty":"0","rlzt_pnl":"2100","crcy_cd":"KRW"},
                "ctx_area_fk100":"",
                "ctx_area_nk100":""
            }"""
        } else {
            """{
                "rt_cd":"0",
                "output1":[
                  {"pdno":"005930","prdt_name":"Samsung","sll_buy_dvsn_cd":"02","ccld_nccs_dvsn":"01","odno":"D-001","ord_qty":"10","ord_unpr":"70000","ccld_qty":"10","rmn_qty":"0","rlzt_pnl":"1200","crcy_cd":"KRW"}
                ],
                "output2":{"pdno":"TOTAL","prdt_name":"Domestic Summary","sll_buy_dvsn_cd":"02","ccld_nccs_dvsn":"01","odno":"D-SUM-1","ord_qty":"10","ord_unpr":"0","ccld_qty":"10","rmn_qty":"0","rlzt_pnl":"1200","crcy_cd":"KRW"},
                "ctx_area_fk100":"NEXT-1",
                "ctx_area_nk100":"NEXT-1"
            }"""
        }

    override fun responseHeaders(exchange: HttpExchange): Map<String, String> =
        if (exchange.queryParam("CTX_AREA_FK100") == "NEXT-1") {
            emptyMap()
        } else {
            mapOf("tr_cont" to "M")
        }
}

private class DomesticBalanceHandler : LedgerHandler() {
    override fun successBody(exchange: HttpExchange): String =
        """{
            "rt_cd":"0",
            "output1":[
              {"pdno":"005930","prdt_name":"Samsung","hldg_qty":"10","pchs_avg_pric":"68000","cur_prc":"70000","evlu_amt":"700000","unprf_pnl":"20000","rlzt_pnl":"1200","evlu_pfls_rt":"2.94","crcy_cd":"KRW"}
            ],
            "output2":{"pdno":"005930","prdt_name":"Samsung Summary","hldg_qty":"10","pchs_avg_pric":"68000","cur_prc":"70000","evlu_amt":"700000","unprf_pnl":"20000","rlzt_pnl":"1200","evlu_pfls_rt":"2.94","crcy_cd":"KRW"}
        }"""
}

private class DomesticProfitHandler : LedgerHandler() {
    override fun successBody(exchange: HttpExchange): String =
        """{
            "rt_cd":"0",
            "output1":[
              {"pdno":"005930","prdt_name":"Samsung","qty":"10","buy_amt":"680000","sell_amt":"700000","fee":"100","tax":"10","rlzt_pnl":"18900","pnl_rt":"2.78","crcy_cd":"KRW"}
            ],
            "output2":{"pdno":"005930","prdt_name":"Samsung Summary","qty":"10","buy_amt":"680000","sell_amt":"700000","fee":"100","tax":"10","rlzt_pnl":"18900","pnl_rt":"2.78","crcy_cd":"KRW"}
        }"""
}

private class OverseasTradeHandler : LedgerHandler() {
    override fun successBody(exchange: HttpExchange): String {
        val code = exchange.queryParam("OVRS_EXCG_CD")
        return if (code == "AMEX") {
            """{"rt_cd":"1","msg1":"overseas failure"}"""
        } else {
            """{
                "rt_cd":"0",
                "output":[
                  {"pdno":"AAPL","prdt_name":"Apple","sll_buy_dvsn":"02","ccld_nccs_dvsn":"01","odno":"O-001","ord_qty":"2","ord_unpr":"190","ccld_qty":"2","rmn_qty":"0","rlzt_pnl":"35","crcy_cd":"USD"}
                ]
            }"""
        }
    }
}

private class OverseasBalanceHandler : LedgerHandler() {
    override fun successBody(exchange: HttpExchange): String {
        val code = exchange.queryParam("OVRS_EXCG_CD")
        return if (code == "AMEX") {
            """{"rt_cd":"1","msg1":"overseas failure"}"""
        } else {
            """{
                "rt_cd":"0",
                "output1":[
                  {"pdno":"AAPL","prdt_name":"Apple","hldg_qty":"2","pchs_avg_pric":"185","cur_prc":"190","evlu_amt":"380","unprf_pnl":"10","rlzt_pnl":"35","evlu_pfls_rt":"2.7","crcy_cd":"USD"}
                ],
                "output2":{"pdno":"AAPL","prdt_name":"Apple Summary","hldg_qty":"2","pchs_avg_pric":"185","cur_prc":"190","evlu_amt":"380","unprf_pnl":"10","rlzt_pnl":"35","evlu_pfls_rt":"2.7","crcy_cd":"USD"}
            }"""
        }
    }
}

private class OverseasProfitHandler : LedgerHandler() {
    override fun successBody(exchange: HttpExchange): String {
        val code = exchange.queryParam("OVRS_EXCG_CD")
        return if (code == "AMEX") {
            """{"rt_cd":"1","msg1":"overseas failure"}"""
        } else {
            """{
                "rt_cd":"0",
                "output1":[
                  {"pdno":"AAPL","prdt_name":"Apple","qty":"2","buy_amt":"370","sell_amt":"400","fee":"2","tax":"1","rlzt_pnl":"27","pnl_rt":"7.2","crcy_cd":"USD"}
                ],
                "output2":{"pdno":"AAPL","prdt_name":"Apple Summary","qty":"2","buy_amt":"370","sell_amt":"400","fee":"2","tax":"1","rlzt_pnl":"27","pnl_rt":"7.2","crcy_cd":"USD"}
            }"""
        }
    }
}

private abstract class LedgerHandler : HttpHandler {
    override fun handle(exchange: HttpExchange) {
        if (exchange.requestMethod != "GET") {
            exchange.sendJson(405, """{"msg1":"method not allowed"}""")
            return
        }
        val authorization = exchange.requestHeaders.getFirst("authorization")
        if (authorization != "Bearer stub-access-token") {
            exchange.sendJson(401, """{"msg1":"missing token"}""")
            return
        }
        exchange.sendJson(200, successBody(exchange), responseHeaders(exchange))
    }

    abstract fun successBody(exchange: HttpExchange): String

    open fun responseHeaders(exchange: HttpExchange): Map<String, String> = emptyMap()
}

private fun HttpExchange.sendJson(
    status: Int,
    body: String,
    headers: Map<String, String> = emptyMap(),
) {
    responseHeaders.add("Content-Type", "application/json")
    headers.forEach { (key, value) -> responseHeaders.add(key, value) }
    sendResponseHeaders(status, body.toByteArray(StandardCharsets.UTF_8).size.toLong())
    responseBody.use { it.write(body.toByteArray(StandardCharsets.UTF_8)) }
}

private fun HttpExchange.queryParam(key: String): String? =
    requestURI.rawQuery
        ?.split("&")
        ?.mapNotNull { token ->
            val parts = token.split("=", limit = 2)
            val name = parts.getOrNull(0)
            if (name == key) {
                java.net.URLDecoder.decode(parts.getOrNull(1).orEmpty(), StandardCharsets.UTF_8)
            } else {
                null
            }
        }?.firstOrNull()
