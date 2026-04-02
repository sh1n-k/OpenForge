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
    fun `status returns initial state when never collected`() {
        mockMvc
            .perform(get("/api/v1/symbols/status"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.totalCount").value(0))
            .andExpect(jsonPath("$.needsUpdate").value(true))
            .andExpect(jsonPath("$.collectedAt").isEmpty)
    }

    @Test
    fun `search returns matching symbols`() {
        symbolMasterRepository.saveAll(
            listOf(
                SymbolMasterEntity(code = "005930", name = "삼성전자", exchange = "kospi"),
                SymbolMasterEntity(code = "000660", name = "SK하이닉스", exchange = "kospi"),
                SymbolMasterEntity(code = "035420", name = "NAVER", exchange = "kospi"),
                SymbolMasterEntity(code = "035720", name = "카카오", exchange = "kospi"),
                SymbolMasterEntity(code = "247540", name = "에코프로비엠", exchange = "kosdaq"),
            ),
        )

        mockMvc
            .perform(get("/api/v1/symbols/search").param("q", "삼성"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].code").value("005930"))
            .andExpect(jsonPath("$.items[0].name").value("삼성전자"))

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
                SymbolMasterEntity(code = "005930", name = "삼성전자", exchange = "kospi"),
                SymbolMasterEntity(code = "247540", name = "에코프로비엠", exchange = "kosdaq"),
            ),
        )

        mockMvc
            .perform(
                get("/api/v1/symbols/search")
                    .param("q", "에코")
                    .param("exchange", "kosdaq"),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].exchange").value("kosdaq"))

        mockMvc
            .perform(
                get("/api/v1/symbols/search")
                    .param("q", "에코")
                    .param("exchange", "kospi"),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(0))
    }

    @Test
    fun `search respects limit parameter`() {
        symbolMasterRepository.saveAll(
            (1..30).map {
                SymbolMasterEntity(
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
                    .param("limit", "5"),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(5))
    }
}
