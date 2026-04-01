package com.openforge.api.system.broker

import com.openforge.api.support.PostgresIntegrationTestSupport
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpHandler
import com.sun.net.httpserver.HttpServer
import org.hamcrest.Matchers.containsString
import org.hamcrest.Matchers.hasSize
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

class BrokerConnectionApiIntegrationTest : PostgresIntegrationTestSupport() {

    @Autowired
    lateinit var mockMvc: MockMvc

    private val objectMapper = JsonMapper.builder().findAndAddModules().build()

    @Test
    fun `saving paper credentials stores ciphertext only and returns masked values`() {
        mockMvc.perform(
            put("/api/v1/system/broker/config")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsBytes(
                        mapOf(
                            "targetMode" to "paper",
                            "appKey" to "paper-app-key-123",
                            "appSecret" to "paper-secret-123",
                            "accountNumber" to "12345678",
                            "productCode" to "01",
                            "enabled" to true,
                        ),
                    ),
                ),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.targetMode").value("paper"))
            .andExpect(jsonPath("$.enabled").value(true))
            .andExpect(jsonPath("$.isConfigured").value(true))
            .andExpect(jsonPath("$.maskedAppKey").value("pape**********123"))
            .andExpect(jsonPath("$.maskedAccountNumber").value("12****78"))
            .andExpect(jsonPath("$.maskedProductCode").value("01"))

        val row = jdbcTemplate.queryForMap(
            """
                select app_key_ciphertext, app_secret_ciphertext, account_number_ciphertext, product_code_ciphertext
                from broker_connection_config
                where broker_type = 'kis' and target_mode = 'PAPER'
            """.trimIndent(),
        )
        check(row["app_key_ciphertext"] != "paper-app-key-123")
        check(row["app_secret_ciphertext"] != "paper-secret-123")
        check(row["account_number_ciphertext"] != "12345678")
        check(row["product_code_ciphertext"] != "01")

        mockMvc.perform(get("/api/v1/system/broker"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.currentSystemMode").value("paper"))
            .andExpect(jsonPath("$.hasPaperConfig").value(true))
            .andExpect(jsonPath("$.hasLiveConfig").value(false))
            .andExpect(jsonPath("$.isCurrentModeConfigured").value(true))
            .andExpect(jsonPath("$.paper.maskedAppKey").value("pape**********123"))
            .andExpect(content().string(org.hamcrest.Matchers.not(containsString("paper-secret-123"))))
    }

    @Test
    fun `live credentials are stored separately and do not overwrite paper config`() {
        saveBrokerConfig(
            targetMode = "paper",
            appKey = "paper-app-key-123",
            appSecret = "paper-secret-123",
            accountNumber = "12345678",
            productCode = "01",
            enabled = true,
        )
        saveBrokerConfig(
            targetMode = "live",
            appKey = "live-app-key-789",
            appSecret = "live-secret-789",
            accountNumber = "87654321",
            productCode = "01",
            enabled = false,
        )

        mockMvc.perform(get("/api/v1/system/broker"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.paper.maskedAccountNumber").value("12****78"))
            .andExpect(jsonPath("$.live.maskedAccountNumber").value("87****21"))
            .andExpect(jsonPath("$.paper.enabled").value(true))
            .andExpect(jsonPath("$.live.enabled").value(false))
    }

    @Test
    fun `connection test success updates status and appends success event`() {
        saveBrokerConfig(
            targetMode = "paper",
            appKey = "paper-app-key-123",
            appSecret = "paper-secret-123",
            accountNumber = "12345678",
            productCode = "01",
            enabled = true,
        )

        mockMvc.perform(
            post("/api/v1/system/broker/test")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(mapOf("targetMode" to "paper"))),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.lastConnectionTestStatus").value("success"))
            .andExpect(jsonPath("$.lastConnectionTestMessage").value("OAuth 토큰 발급 및 계좌 조회 성공"))

        mockMvc.perform(get("/api/v1/system/broker/events?limit=20"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(2)))
            .andExpect(jsonPath("$[0].eventType").value("connection_test_succeeded"))
    }

    @Test
    fun `connection test failure keeps secrets masked and records failed status`() {
        saveBrokerConfig(
            targetMode = "paper",
            appKey = "bad-paper-app-key",
            appSecret = "bad-paper-secret",
            accountNumber = "99999999",
            productCode = "99",
            enabled = true,
        )

        mockMvc.perform(
            post("/api/v1/system/broker/test")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(mapOf("targetMode" to "paper"))),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.lastConnectionTestStatus").value("failed"))
            .andExpect(jsonPath("$.lastConnectionTestMessage").value(containsString("invalid credentials")))

        mockMvc.perform(get("/api/v1/system/broker/events?limit=20"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].eventType").value("connection_test_failed"))
            .andExpect(jsonPath("$[0].message").value(containsString("invalid credentials")))

        mockMvc.perform(get("/api/v1/system/broker"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.paper.maskedAppKey").exists())
            .andExpect(content().string(org.hamcrest.Matchers.not(containsString("bad-paper-secret"))))
    }

    private fun saveBrokerConfig(
        targetMode: String,
        appKey: String,
        appSecret: String,
        accountNumber: String,
        productCode: String,
        enabled: Boolean,
    ) {
        mockMvc.perform(
            put("/api/v1/system/broker/config")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsBytes(
                        mapOf(
                            "targetMode" to targetMode,
                            "appKey" to appKey,
                            "appSecret" to appSecret,
                            "accountNumber" to accountNumber,
                            "productCode" to productCode,
                            "enabled" to enabled,
                        ),
                    ),
                ),
        )
            .andExpect(status().isOk)
    }

    companion object {
        private val kisStubServer = KisStubServer.start()

        @JvmStatic
        @DynamicPropertySource
        fun registerBrokerProperties(registry: DynamicPropertyRegistry) {
            registry.add("app.kis.paper-base-url") { kisStubServer.baseUrl }
            registry.add("app.kis.live-base-url") { kisStubServer.baseUrl }
        }
    }
}

private class KisStubServer private constructor(
    private val server: HttpServer,
) {
    val baseUrl: String = "http://127.0.0.1:${server.address.port}"

    companion object {
        fun start(): KisStubServer {
            val server = HttpServer.create(InetSocketAddress(0), 0)
            server.createContext("/oauth2/tokenP", TokenHandler())
            server.createContext(
                "/uapi/domestic-stock/v1/trading/inquire-balance",
                BalanceHandler(),
            )
            server.start()
            return KisStubServer(server)
        }
    }
}

private class TokenHandler : HttpHandler {
    private val objectMapper = JsonMapper.builder().findAndAddModules().build()

    override fun handle(exchange: HttpExchange) {
        val body = String(exchange.requestBody.readAllBytes(), StandardCharsets.UTF_8)
        val payload = objectMapper.readTree(body)
        val appKey = payload.path("appkey").asText()
        val appSecret = payload.path("appsecret").asText()
        if (appKey.contains("bad") || appSecret.contains("bad")) {
            exchange.sendJson(
                status = 401,
                body = """{"msg1":"invalid credentials"}""",
            )
        } else {
            exchange.sendJson(
                status = 200,
                body = """{"access_token":"stub-access-token","access_token_token_expired":"2099-01-01 00:00:00"}""",
            )
        }
    }
}

private class BalanceHandler : HttpHandler {
    override fun handle(exchange: HttpExchange) {
        val query = parseQuery(exchange.requestURI)
        if (
            exchange.requestHeaders.getFirst("authorization") != "Bearer stub-access-token" ||
            query["CANO"] == "99999999" ||
            query["ACNT_PRDT_CD"] == "99"
        ) {
            exchange.sendJson(
                status = 200,
                body = """{"rt_cd":"1","msg1":"account lookup failed"}""",
            )
        } else {
            exchange.sendJson(
                status = 200,
                body = """{"rt_cd":"0","msg1":"ok","output1":[],"output2":[]}""",
            )
        }
    }

    private fun parseQuery(uri: URI): Map<String, String> = uri.rawQuery
        ?.split("&")
        ?.mapNotNull { part ->
            val index = part.indexOf('=')
            if (index < 0) {
                null
            } else {
                part.substring(0, index) to java.net.URLDecoder.decode(
                    part.substring(index + 1),
                    StandardCharsets.UTF_8,
                )
            }
        }
        ?.toMap()
        ?: emptyMap()
}

private fun HttpExchange.sendJson(status: Int, body: String) {
    responseHeaders.add("Content-Type", "application/json")
    sendResponseHeaders(status, body.toByteArray(StandardCharsets.UTF_8).size.toLong())
    responseBody.use { it.write(body.toByteArray(StandardCharsets.UTF_8)) }
}
