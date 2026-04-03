package com.openforge.api.symbol

import com.openforge.api.support.PostgresIntegrationTestSupport
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

class SymbolMasterApiIntegrationTest : PostgresIntegrationTestSupport() {
    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var symbolMasterRepository: SymbolMasterRepository

    @Test
    fun `status reads lowercase legacy market scope rows`() {
        jdbcTemplate.update(
            """
            insert into symbol_master_status (market_scope, collected_at)
            values (?, now()), (?, now())
            """.trimIndent(),
            "domestic",
            "us",
        )

        mockMvc
            .perform(get("/api/v1/symbols/status"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.markets.length()").value(2))
            .andExpect(jsonPath("$.markets[0].marketScope").value("domestic"))
            .andExpect(jsonPath("$.markets[0].needsUpdate").value(false))
            .andExpect(jsonPath("$.markets[1].marketScope").value("us"))
            .andExpect(jsonPath("$.markets[1].needsUpdate").value(false))
    }

    @Test
    fun `status returns initial state when never collected`() {
        mockMvc
            .perform(get("/api/v1/symbols/status"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.markets.length()").value(2))
            .andExpect(jsonPath("$.markets[0].marketScope").value("domestic"))
            .andExpect(jsonPath("$.markets[0].totalCount").value(0))
            .andExpect(jsonPath("$.markets[0].needsUpdate").value(true))
            .andExpect(jsonPath("$.markets[1].marketScope").value("us"))
            .andExpect(jsonPath("$.markets[1].totalCount").value(0))
            .andExpect(jsonPath("$.markets[1].needsUpdate").value(true))
    }

    @Test
    fun `search returns matching symbols`() {
        symbolMasterRepository.saveAll(
            listOf(
                SymbolMasterEntity(marketScope = "domestic", code = "005930", name = "삼성전자", exchange = "kospi"),
                SymbolMasterEntity(marketScope = "domestic", code = "000660", name = "SK하이닉스", exchange = "kospi"),
                SymbolMasterEntity(marketScope = "domestic", code = "035420", name = "NAVER", exchange = "kospi"),
                SymbolMasterEntity(marketScope = "domestic", code = "035720", name = "카카오", exchange = "kospi"),
                SymbolMasterEntity(marketScope = "domestic", code = "247540", name = "에코프로비엠", exchange = "kosdaq"),
                SymbolMasterEntity(marketScope = "us", code = "AAPL", name = "Apple", exchange = "nasdaq"),
            ),
        )

        mockMvc
            .perform(get("/api/v1/symbols/search").param("q", "삼성"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].code").value("005930"))
            .andExpect(jsonPath("$.items[0].name").value("삼성전자"))
            .andExpect(jsonPath("$.items[0].marketScope").value("domestic"))

        mockMvc
            .perform(get("/api/v1/symbols/search").param("q", "005930"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].code").value("005930"))
    }

    @Test
    fun `search filters by exchange`() {
        symbolMasterRepository.saveAll(
            listOf(
                SymbolMasterEntity(marketScope = "domestic", code = "005930", name = "삼성전자", exchange = "kospi"),
                SymbolMasterEntity(marketScope = "domestic", code = "247540", name = "에코프로비엠", exchange = "kosdaq"),
            ),
        )

        mockMvc
            .perform(
                get("/api/v1/symbols/search")
                    .param("q", "에코")
                    .param("marketScope", "domestic")
                    .param("exchange", "kosdaq"),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].exchange").value("kosdaq"))

        mockMvc
            .perform(
                get("/api/v1/symbols/search")
                    .param("q", "에코")
                    .param("marketScope", "domestic")
                    .param("exchange", "kospi"),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(0))
    }

    @Test
    fun `search filters by market scope`() {
        symbolMasterRepository.saveAll(
            listOf(
                SymbolMasterEntity(marketScope = "domestic", code = "005930", name = "삼성전자", exchange = "kospi"),
                SymbolMasterEntity(marketScope = "us", code = "AAPL", name = "Apple", exchange = "nasdaq"),
            ),
        )

        mockMvc
            .perform(
                get("/api/v1/symbols/search")
                    .param("q", "a")
                    .param("marketScope", "us"),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].code").value("AAPL"))
            .andExpect(jsonPath("$.items[0].marketScope").value("us"))

        mockMvc
            .perform(
                get("/api/v1/symbols/search")
                    .param("q", "a")
                    .param("marketScope", "domestic"),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(0))
    }

    @Test
    fun `search respects limit parameter`() {
        symbolMasterRepository.saveAll(
            (1..30).map {
                SymbolMasterEntity(
                    marketScope = "domestic",
                    code = String.format("%06d", it),
                    name = "종목$it",
                    exchange = "kospi",
                )
            },
        )

        mockMvc
            .perform(
                get("/api/v1/symbols/search")
                    .param("q", "종목")
                    .param("marketScope", "domestic")
                    .param("limit", "5"),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(5))
    }
}
