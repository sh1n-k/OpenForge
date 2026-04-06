package com.openforge.api.system.broker.ledger

import com.openforge.api.system.broker.BrokerConnectionCredentials
import com.openforge.api.system.broker.KisApiProperties
import org.springframework.stereotype.Component
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import java.math.BigDecimal
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.charset.StandardCharsets
import java.time.Duration
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneOffset

@Component
class BrokerLedgerKisClient(
    private val objectMapper: ObjectMapper,
    private val kisApiProperties: KisApiProperties,
) {
    internal fun fetchSyncPayload(
        credentials: BrokerConnectionCredentials,
        request: BrokerLedgerSyncRequest,
    ): BrokerLedgerSyncPayload {
        val accessToken = requestAccessToken(credentials)
        val now = OffsetDateTime.now(ZoneOffset.UTC)
        val trades = mutableListOf<BrokerLedgerTradeInput>()
        val balances = mutableListOf<BrokerLedgerBalanceInput>()
        val profits = mutableListOf<BrokerLedgerProfitInput>()

        if (request.markets.contains(BrokerLedgerMarket.DOMESTIC)) {
            trades += fetchDomesticTrades(credentials, accessToken, request.startDate, request.endDate, now)
            balances += fetchDomesticBalances(credentials, accessToken, now)
            profits += fetchDomesticProfits(credentials, accessToken, request.startDate, request.endDate, now)
        }

        if (request.markets.contains(BrokerLedgerMarket.OVERSEAS)) {
            val exchanges = if (request.overseasExchanges.isEmpty()) BrokerLedgerOverseasExchange.entries.toSet() else request.overseasExchanges
            exchanges.forEach { exchange ->
                trades += fetchOverseasTrades(credentials, accessToken, exchange, request.startDate, request.endDate, now)
                balances += fetchOverseasBalances(credentials, accessToken, exchange, now)
                profits += fetchOverseasProfits(credentials, accessToken, exchange, request.startDate, request.endDate, now)
            }
        }

        return BrokerLedgerSyncPayload(
            trades = trades,
            balances = balances,
            profits = profits,
        )
    }

    private fun fetchDomesticTrades(
        credentials: BrokerConnectionCredentials,
        accessToken: String,
        startDate: LocalDate,
        endDate: LocalDate,
        capturedAt: OffsetDateTime,
    ): List<BrokerLedgerTradeInput> {
        val pdDv = domesticPeriodDivider(startDate, endDate)
        val trId = if (pdDv == "before") "CTSC9215R" else "TTTC0081R"
        return fetchPagedResponses(
            baseUrl = credentials.baseUrl,
            path = "/uapi/domestic-stock/v1/trading/inquire-daily-ccld",
            token = accessToken,
            appKey = credentials.appKey,
            appSecret = credentials.appSecret,
            trId = trId,
            queryParams =
                mapOf(
                    "CANO" to credentials.accountNumber,
                    "ACNT_PRDT_CD" to credentials.productCode,
                    "INQR_STRT_DT" to startDate.toString().replace("-", ""),
                    "INQR_END_DT" to endDate.toString().replace("-", ""),
                    "SLL_BUY_DVSN_CD" to "00",
                    "PDNO" to "",
                    "CCLD_DVSN" to "00",
                    "INQR_DVSN" to "00",
                    "INQR_DVSN_3" to "00",
                    "ORD_GNO_BRNO" to "",
                    "ODNO" to "",
                    "INQR_DVSN_1" to "",
                    "CTX_AREA_FK100" to "",
                    "CTX_AREA_NK100" to "",
                    "EXCG_ID_DVSN_CD" to "ALL",
                    "PD_DV" to pdDv,
                ),
            pagination = PaginationSpec("CTX_AREA_FK100", "CTX_AREA_NK100", "ctx_area_fk100", "ctx_area_nk100"),
        ).flatMap { response ->
            mapRows(
                response = response,
                market = BrokerLedgerMarket.DOMESTIC,
                overseasExchange = null,
                sourceApi = "domestic-stock/v1/trading/inquire-daily-ccld",
                capturedAt = capturedAt,
                itemMapper = ::mapTradeItemRow,
                summaryMapper = ::mapTradeSummaryRow,
            )
        }
    }

    private fun fetchDomesticBalances(
        credentials: BrokerConnectionCredentials,
        accessToken: String,
        capturedAt: OffsetDateTime,
    ): List<BrokerLedgerBalanceInput> =
        fetchPagedResponses(
            baseUrl = credentials.baseUrl,
            path = "/uapi/domestic-stock/v1/trading/inquire-balance-rlz-pl",
            token = accessToken,
            appKey = credentials.appKey,
            appSecret = credentials.appSecret,
            trId = "TTTC8494R",
            queryParams =
                mapOf(
                    "CANO" to credentials.accountNumber,
                    "ACNT_PRDT_CD" to credentials.productCode,
                    "AFHR_FLPR_YN" to "N",
                    "OFL_YN" to "",
                    "INQR_DVSN" to "00",
                    "UNPR_DVSN" to "01",
                    "FUND_STTL_ICLD_YN" to "N",
                    "FNCG_AMT_AUTO_RDPT_YN" to "N",
                    "PRCS_DVSN" to "00",
                    "COST_ICLD_YN" to "",
                    "CTX_AREA_FK100" to "",
                    "CTX_AREA_NK100" to "",
                ),
            pagination = PaginationSpec("CTX_AREA_FK100", "CTX_AREA_NK100", "ctx_area_fk100", "ctx_area_nk100"),
        ).flatMap { response ->
            mapRows(
                response = response,
                market = BrokerLedgerMarket.DOMESTIC,
                overseasExchange = null,
                sourceApi = "domestic-stock/v1/trading/inquire-balance-rlz-pl",
                capturedAt = capturedAt,
                itemMapper = ::mapBalanceItemRow,
                summaryMapper = ::mapBalanceSummaryRow,
            )
        }

    private fun fetchDomesticProfits(
        credentials: BrokerConnectionCredentials,
        accessToken: String,
        startDate: LocalDate,
        endDate: LocalDate,
        capturedAt: OffsetDateTime,
    ): List<BrokerLedgerProfitInput> =
        fetchPagedResponses(
            baseUrl = credentials.baseUrl,
            path = "/uapi/domestic-stock/v1/trading/inquire-period-trade-profit",
            token = accessToken,
            appKey = credentials.appKey,
            appSecret = credentials.appSecret,
            trId = "TTTC8715R",
            queryParams =
                mapOf(
                    "CANO" to credentials.accountNumber,
                    "ACNT_PRDT_CD" to credentials.productCode,
                    "SORT_DVSN" to "00",
                    "INQR_STRT_DT" to startDate.toString().replace("-", ""),
                    "INQR_END_DT" to endDate.toString().replace("-", ""),
                    "CBLC_DVSN" to "00",
                    "PDNO" to "",
                    "CTX_AREA_FK100" to "",
                    "CTX_AREA_NK100" to "",
                ),
            pagination = PaginationSpec("CTX_AREA_FK100", "CTX_AREA_NK100", "ctx_area_fk100", "ctx_area_nk100"),
        ).flatMap { response ->
            mapRows(
                response = response,
                market = BrokerLedgerMarket.DOMESTIC,
                overseasExchange = null,
                sourceApi = "domestic-stock/v1/trading/inquire-period-trade-profit",
                capturedAt = capturedAt,
                itemMapper = ::mapProfitItemRow,
                summaryMapper = ::mapProfitSummaryRow,
            )
        }

    private fun fetchOverseasTrades(
        credentials: BrokerConnectionCredentials,
        accessToken: String,
        exchange: BrokerLedgerOverseasExchange,
        startDate: LocalDate,
        endDate: LocalDate,
        capturedAt: OffsetDateTime,
    ): List<BrokerLedgerTradeInput> =
        fetchPagedResponses(
            baseUrl = credentials.baseUrl,
            path = "/uapi/overseas-stock/v1/trading/inquire-ccnl",
            token = accessToken,
            appKey = credentials.appKey,
            appSecret = credentials.appSecret,
            trId = "TTTS3035R",
            queryParams =
                mapOf(
                    "CANO" to credentials.accountNumber,
                    "ACNT_PRDT_CD" to credentials.productCode,
                    "PDNO" to "%",
                    "ORD_STRT_DT" to startDate.toString().replace("-", ""),
                    "ORD_END_DT" to endDate.toString().replace("-", ""),
                    "SLL_BUY_DVSN" to "00",
                    "CCLD_NCCS_DVSN" to "00",
                    "OVRS_EXCG_CD" to exchange.value,
                    "SORT_SQN" to "DS",
                    "ORD_DT" to "",
                    "ORD_GNO_BRNO" to "",
                    "ODNO" to "",
                    "CTX_AREA_NK200" to "",
                    "CTX_AREA_FK200" to "",
                ),
            pagination = PaginationSpec("CTX_AREA_FK200", "CTX_AREA_NK200", "ctx_area_fk200", "ctx_area_nk200"),
        ).flatMap { response ->
            mapRows(
                response = response,
                market = BrokerLedgerMarket.OVERSEAS,
                overseasExchange = exchange,
                sourceApi = "overseas-stock/v1/trading/inquire-ccnl",
                capturedAt = capturedAt,
                itemMapper = ::mapTradeItemRow,
                summaryMapper = ::mapTradeSummaryRow,
                itemFieldName = "output",
                summaryFieldName = "output2",
            )
        }

    private fun fetchOverseasBalances(
        credentials: BrokerConnectionCredentials,
        accessToken: String,
        exchange: BrokerLedgerOverseasExchange,
        capturedAt: OffsetDateTime,
    ): List<BrokerLedgerBalanceInput> =
        fetchPagedResponses(
            baseUrl = credentials.baseUrl,
            path = "/uapi/overseas-stock/v1/trading/inquire-balance",
            token = accessToken,
            appKey = credentials.appKey,
            appSecret = credentials.appSecret,
            trId = "TTTS3012R",
            queryParams =
                mapOf(
                    "CANO" to credentials.accountNumber,
                    "ACNT_PRDT_CD" to credentials.productCode,
                    "OVRS_EXCG_CD" to exchange.value,
                    "TR_CRCY_CD" to exchange.currency,
                    "CTX_AREA_FK200" to "",
                    "CTX_AREA_NK200" to "",
                ),
            pagination = PaginationSpec("CTX_AREA_FK200", "CTX_AREA_NK200", "ctx_area_fk200", "ctx_area_nk200"),
        ).flatMap { response ->
            mapRows(
                response = response,
                market = BrokerLedgerMarket.OVERSEAS,
                overseasExchange = exchange,
                sourceApi = "overseas-stock/v1/trading/inquire-balance",
                capturedAt = capturedAt,
                itemMapper = ::mapBalanceItemRow,
                summaryMapper = ::mapBalanceSummaryRow,
            )
        }

    private fun fetchOverseasProfits(
        credentials: BrokerConnectionCredentials,
        accessToken: String,
        exchange: BrokerLedgerOverseasExchange,
        startDate: LocalDate,
        endDate: LocalDate,
        capturedAt: OffsetDateTime,
    ): List<BrokerLedgerProfitInput> =
        fetchPagedResponses(
            baseUrl = credentials.baseUrl,
            path = "/uapi/overseas-stock/v1/trading/inquire-period-profit",
            token = accessToken,
            appKey = credentials.appKey,
            appSecret = credentials.appSecret,
            trId = "TTTS3039R",
            queryParams =
                mapOf(
                    "CANO" to credentials.accountNumber,
                    "ACNT_PRDT_CD" to credentials.productCode,
                    "OVRS_EXCG_CD" to exchange.value,
                    "NATN_CD" to "",
                    "CRCY_CD" to exchange.currency,
                    "PDNO" to "",
                    "INQR_STRT_DT" to startDate.toString().replace("-", ""),
                    "INQR_END_DT" to endDate.toString().replace("-", ""),
                    "WCRC_FRCR_DVSN_CD" to "01",
                    "CTX_AREA_FK200" to "",
                    "CTX_AREA_NK200" to "",
                ),
            pagination = PaginationSpec("CTX_AREA_FK200", "CTX_AREA_NK200", "ctx_area_fk200", "ctx_area_nk200"),
        ).flatMap { response ->
            mapRows(
                response = response,
                market = BrokerLedgerMarket.OVERSEAS,
                overseasExchange = exchange,
                sourceApi = "overseas-stock/v1/trading/inquire-period-profit",
                capturedAt = capturedAt,
                itemMapper = ::mapProfitItemRow,
                summaryMapper = ::mapProfitSummaryRow,
            )
        }

    private fun requestAccessToken(credentials: BrokerConnectionCredentials): String {
        val request =
            HttpRequest
                .newBuilder()
                .uri(URI.create("${credentials.baseUrl}/oauth2/tokenP"))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .timeout(Duration.ofMillis(kisApiProperties.readTimeoutMillis))
                .POST(
                    HttpRequest.BodyPublishers.ofString(
                        objectMapper.writeValueAsString(
                            mapOf(
                                "grant_type" to "client_credentials",
                                "appkey" to credentials.appKey,
                                "appsecret" to credentials.appSecret,
                            ),
                        ),
                    ),
                ).build()

        val response = httpClient().send(request, HttpResponse.BodyHandlers.ofString())
        val body = objectMapper.readTree(response.body().ifBlank { "{}" })
        if (response.statusCode() !in 200..299) {
            throw IllegalStateException(body.path("msg1").asText("OAuth token request failed"))
        }
        val accessToken = body.path("access_token").asText()
        if (accessToken.isBlank()) {
            throw IllegalStateException(body.path("msg1").asText("KIS token response does not include access_token"))
        }
        return accessToken
    }

    private fun fetchPagedResponses(
        baseUrl: String,
        path: String,
        token: String,
        appKey: String,
        appSecret: String,
        trId: String,
        queryParams: Map<String, Any?>,
        pagination: PaginationSpec,
    ): List<JsonNode> {
        val responses = mutableListOf<JsonNode>()
        var nextQueryParams = queryParams.toMutableMap()
        var requestContinuation = ""

        while (true) {
            val response =
                getJson(
                    baseUrl = baseUrl,
                    path = path,
                    token = token,
                    appKey = appKey,
                    appSecret = appSecret,
                    trId = trId,
                    trCont = requestContinuation,
                    queryParams = nextQueryParams,
                )
            responses.add(response.payload)

            val continuation = response.trCont?.trim()?.uppercase()
            if (continuation !in setOf("M", "F")) {
                break
            }

            val nextFk =
                response.payload
                    .path(pagination.responseFkField)
                    .asText("")
                    .trim()
            val nextNk =
                response.payload
                    .path(pagination.responseNkField)
                    .asText("")
                    .trim()
            if (nextFk.isBlank() && nextNk.isBlank()) {
                break
            }

            nextQueryParams =
                nextQueryParams.toMutableMap().apply {
                    this[pagination.requestFkField] = nextFk
                    this[pagination.requestNkField] = nextNk
                }
            requestContinuation = "N"
        }

        return responses
    }

    private fun getJson(
        baseUrl: String,
        path: String,
        token: String,
        appKey: String,
        appSecret: String,
        trId: String,
        trCont: String,
        queryParams: Map<String, Any?>,
    ): KisHttpResponse {
        val query =
            queryParams.entries.joinToString("&") { (key, value) ->
                "${encode(key)}=${encode(value?.toString() ?: "")}"
            }
        val request =
            HttpRequest
                .newBuilder()
                .uri(URI.create("$baseUrl$path?$query"))
                .header("Accept", "application/json")
                .header("authorization", "Bearer $token")
                .header("appkey", appKey)
                .header("appsecret", appSecret)
                .header("tr_id", trId)
                .header("custtype", "P")
                .header("tr_cont", trCont)
                .timeout(Duration.ofMillis(kisApiProperties.readTimeoutMillis))
                .GET()
                .build()

        val response = httpClient().send(request, HttpResponse.BodyHandlers.ofString())
        val payload = objectMapper.readTree(response.body().ifBlank { "{}" })
        val rtCd = payload.path("rt_cd").asText("0")
        if (response.statusCode() !in 200..299 || (rtCd.isNotBlank() && rtCd != "0")) {
            throw IllegalStateException(payload.path("msg1").asText("KIS request failed for $path"))
        }
        return KisHttpResponse(
            payload = payload,
            trCont = response.headers().firstValue("tr_cont").orElse(null),
        )
    }

    private fun <T> mapRows(
        response: JsonNode,
        market: BrokerLedgerMarket,
        overseasExchange: BrokerLedgerOverseasExchange?,
        sourceApi: String,
        capturedAt: OffsetDateTime,
        itemMapper: (JsonNode, BrokerLedgerMarket, BrokerLedgerOverseasExchange?, String, OffsetDateTime) -> T,
        summaryMapper: (JsonNode, BrokerLedgerMarket, BrokerLedgerOverseasExchange?, String, OffsetDateTime) -> T,
        itemFieldName: String = "output1",
        summaryFieldName: String = "output2",
    ): List<T> {
        val items = mutableListOf<T>()
        items +=
            extractOutputNodes(response, itemFieldName).map { node ->
                itemMapper(node, market, overseasExchange, sourceApi, capturedAt)
            }
        items +=
            extractOutputNodes(response, summaryFieldName).map { node ->
                summaryMapper(node, market, overseasExchange, sourceApi, capturedAt)
            }
        return items
    }

    private fun extractOutputNodes(
        response: JsonNode,
        fieldName: String,
    ): List<JsonNode> {
        val node = response.get(fieldName) ?: return emptyList()
        return when {
            node.isArray -> node.toList()
            node.isObject -> listOf(node)
            node.isNull -> emptyList()
            else -> listOf(node)
        }
    }

    private fun mapTradeRow(
        node: JsonNode,
        market: BrokerLedgerMarket,
        overseasExchange: BrokerLedgerOverseasExchange?,
        sourceApi: String,
        capturedAt: OffsetDateTime,
        rowKind: BrokerLedgerRowKind,
    ): BrokerLedgerTradeInput =
        BrokerLedgerTradeInput(
            market = market,
            overseasExchange = overseasExchange,
            rowKind = rowKind,
            sourceApi = sourceApi,
            symbol = node.stringValue("pdno", "ovrs_pdno", "item_code", "stck_pdno"),
            symbolName = node.stringValue("prdt_name", "pdno_nm", "item_name", "item_nm"),
            side = normalizeSide(node.stringValue("sll_buy_dvsn", "sll_buy_dvsn_cd", "buysell_dvsn_cd", "ord_dvsn")),
            orderStatus = node.stringValue("ccld_nccs_dvsn", "ccld_dvsn", "status", "ord_dvsn"),
            orderNumber = node.stringValue("odno", "ord_no", "ordno"),
            executionNumber = node.stringValue("ccld_no", "exec_no", "ord_exec_no"),
            quantity = node.longValue("ord_qty", "qty", "ccld_qty", "tot_ccld_qty", "nccs_qty"),
            price = node.decimalValue("ord_unpr", "ord_prc", "avg_prc"),
            filledQuantity = node.longValue("ccld_qty", "tot_ccld_qty", "filled_qty"),
            remainingQuantity = node.longValue("rmn_qty", "nccs_qty", "remain_qty"),
            realizedPnl = node.decimalValue("rlzt_pnl", "realized_pnl", "pnl"),
            currency = node.stringValue("crcy_cd", "tr_crcy_cd", "currency"),
            capturedAt = capturedAt,
            rawPayload = node,
        )

    private fun mapBalanceRow(
        node: JsonNode,
        market: BrokerLedgerMarket,
        overseasExchange: BrokerLedgerOverseasExchange?,
        sourceApi: String,
        capturedAt: OffsetDateTime,
        rowKind: BrokerLedgerRowKind,
    ): BrokerLedgerBalanceInput =
        BrokerLedgerBalanceInput(
            market = market,
            overseasExchange = overseasExchange,
            rowKind = rowKind,
            sourceApi = sourceApi,
            symbol = node.stringValue("pdno", "ovrs_pdno", "item_code", "stck_pdno"),
            symbolName = node.stringValue("prdt_name", "pdno_nm", "item_name", "item_nm"),
            quantity = node.longValue("hldg_qty", "bal_qty", "nccs_qty", "qty"),
            averagePrice = node.decimalValue("pchs_avg_pric", "avg_pric", "avrg_pric"),
            currentPrice = node.decimalValue("cur_prc", "now_prc", "prc"),
            valuationAmount = node.decimalValue("evlu_amt", "valuation_amt", "bal_amt"),
            unrealizedPnl = node.decimalValue("unprf_pnl", "unrealized_pnl", "pnl"),
            realizedPnl = node.decimalValue("rlzt_pnl", "realized_pnl"),
            profitRate = node.decimalValue("evlu_pfls_rt", "pnl_rt", "rate"),
            currency = node.stringValue("crcy_cd", "tr_crcy_cd", "currency"),
            capturedAt = capturedAt,
            rawPayload = node,
        )

    private fun mapProfitRow(
        node: JsonNode,
        market: BrokerLedgerMarket,
        overseasExchange: BrokerLedgerOverseasExchange?,
        sourceApi: String,
        capturedAt: OffsetDateTime,
        rowKind: BrokerLedgerRowKind,
    ): BrokerLedgerProfitInput =
        BrokerLedgerProfitInput(
            market = market,
            overseasExchange = overseasExchange,
            rowKind = rowKind,
            sourceApi = sourceApi,
            symbol = node.stringValue("pdno", "ovrs_pdno", "item_code", "stck_pdno"),
            symbolName = node.stringValue("prdt_name", "pdno_nm", "item_name", "item_nm"),
            quantity = node.longValue("qty", "tot_qty", "ord_qty"),
            buyAmount = node.decimalValue("buy_amt", "buy_amount"),
            sellAmount = node.decimalValue("sell_amt", "sell_amount"),
            fees = node.decimalValue("fee", "commission", "cst"),
            taxes = node.decimalValue("tax", "tax_amt"),
            realizedPnl = node.decimalValue("rlzt_pnl", "profit", "pnl"),
            profitRate = node.decimalValue("pnl_rt", "rate"),
            currency = node.stringValue("crcy_cd", "currency"),
            capturedAt = capturedAt,
            rawPayload = node,
        )

    private fun domesticPeriodDivider(
        startDate: LocalDate,
        endDate: LocalDate,
    ): String =
        if (java.time.temporal.ChronoUnit.DAYS
                .between(startDate, endDate) > 92
        ) {
            "before"
        } else {
            "inner"
        }

    private fun mapTradeItemRow(
        node: JsonNode,
        market: BrokerLedgerMarket,
        overseasExchange: BrokerLedgerOverseasExchange?,
        sourceApi: String,
        capturedAt: OffsetDateTime,
    ): BrokerLedgerTradeInput = mapTradeRow(node, market, overseasExchange, sourceApi, capturedAt, BrokerLedgerRowKind.ITEM)

    private fun mapTradeSummaryRow(
        node: JsonNode,
        market: BrokerLedgerMarket,
        overseasExchange: BrokerLedgerOverseasExchange?,
        sourceApi: String,
        capturedAt: OffsetDateTime,
    ): BrokerLedgerTradeInput = mapTradeRow(node, market, overseasExchange, sourceApi, capturedAt, BrokerLedgerRowKind.SUMMARY)

    private fun mapBalanceItemRow(
        node: JsonNode,
        market: BrokerLedgerMarket,
        overseasExchange: BrokerLedgerOverseasExchange?,
        sourceApi: String,
        capturedAt: OffsetDateTime,
    ): BrokerLedgerBalanceInput = mapBalanceRow(node, market, overseasExchange, sourceApi, capturedAt, BrokerLedgerRowKind.ITEM)

    private fun mapBalanceSummaryRow(
        node: JsonNode,
        market: BrokerLedgerMarket,
        overseasExchange: BrokerLedgerOverseasExchange?,
        sourceApi: String,
        capturedAt: OffsetDateTime,
    ): BrokerLedgerBalanceInput = mapBalanceRow(node, market, overseasExchange, sourceApi, capturedAt, BrokerLedgerRowKind.SUMMARY)

    private fun mapProfitItemRow(
        node: JsonNode,
        market: BrokerLedgerMarket,
        overseasExchange: BrokerLedgerOverseasExchange?,
        sourceApi: String,
        capturedAt: OffsetDateTime,
    ): BrokerLedgerProfitInput = mapProfitRow(node, market, overseasExchange, sourceApi, capturedAt, BrokerLedgerRowKind.ITEM)

    private fun mapProfitSummaryRow(
        node: JsonNode,
        market: BrokerLedgerMarket,
        overseasExchange: BrokerLedgerOverseasExchange?,
        sourceApi: String,
        capturedAt: OffsetDateTime,
    ): BrokerLedgerProfitInput = mapProfitRow(node, market, overseasExchange, sourceApi, capturedAt, BrokerLedgerRowKind.SUMMARY)

    private fun JsonNode.stringValue(vararg keys: String): String? =
        keys.firstNotNullOfOrNull { key ->
            val value = path(key)
            if (value.isMissingNode || value.isNull) {
                null
            } else {
                value.asText().trim().takeIf { it.isNotBlank() }
            }
        }

    private fun JsonNode.longValue(vararg keys: String): Long? =
        keys.firstNotNullOfOrNull { key ->
            val value = path(key)
            if (value.isMissingNode || value.isNull) {
                null
            } else {
                value
                    .asText()
                    .trim()
                    .takeIf { it.isNotBlank() }
                    ?.toLongOrNull()
            }
        }

    private fun JsonNode.decimalValue(vararg keys: String): BigDecimal? =
        keys.firstNotNullOfOrNull { key ->
            val value = path(key)
            if (value.isMissingNode || value.isNull) {
                null
            } else {
                value
                    .asText()
                    .trim()
                    .takeIf { it.isNotBlank() }
                    ?.toBigDecimalOrNull()
            }
        }

    private fun normalizeSide(value: String?): String? {
        val normalized = value?.trim()?.lowercase() ?: return null
        return when {
            normalized.contains("buy") || normalized.endsWith("02") || normalized == "b" -> "buy"
            normalized.contains("sell") || normalized.endsWith("01") || normalized == "s" -> "sell"
            else -> value
        }
    }

    private fun httpClient(): HttpClient =
        HttpClient
            .newBuilder()
            .connectTimeout(Duration.ofMillis(kisApiProperties.connectTimeoutMillis))
            .build()

    private fun encode(value: String): String = URLEncoder.encode(value, StandardCharsets.UTF_8)

    private data class PaginationSpec(
        val requestFkField: String,
        val requestNkField: String,
        val responseFkField: String,
        val responseNkField: String,
    )

    private data class KisHttpResponse(
        val payload: JsonNode,
        val trCont: String?,
    )
}
