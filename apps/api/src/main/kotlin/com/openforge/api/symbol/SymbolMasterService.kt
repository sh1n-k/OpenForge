package com.openforge.api.symbol

import com.openforge.api.strategy.domain.MarketType
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.client.RestClient
import java.io.ByteArrayInputStream
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.concurrent.atomic.AtomicBoolean
import java.util.zip.ZipInputStream

@Service
class SymbolMasterPersistence(
    private val symbolMasterRepository: SymbolMasterRepository,
    private val statusRepository: SymbolMasterStatusRepository,
) {
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun replaceExchange(
        marketScope: MarketType,
        exchange: String,
        symbols: List<SymbolMasterEntity>,
    ): Int {
        symbolMasterRepository.deleteByMarketScopeAndExchange(marketScope.value, exchange)
        symbolMasterRepository.flush()
        symbolMasterRepository.saveAll(symbols)
        return symbols.size
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun updateStatus(marketScope: MarketType) {
        val status =
            statusRepository
                .findById(marketScope.value)
                .orElse(SymbolMasterStatusEntity(marketScope = marketScope.value))
        status.collectedAt = OffsetDateTime.now()
        statusRepository.save(status)
    }
}

@Service
class SymbolMasterService(
    private val symbolMasterRepository: SymbolMasterRepository,
    private val statusRepository: SymbolMasterStatusRepository,
    private val persistence: SymbolMasterPersistence,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val collecting = AtomicBoolean(false)

    private val marketConfigurations =
        mapOf(
            MarketType.DOMESTIC to
                linkedMapOf(
                    "kospi" to "https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip",
                    "kosdaq" to "https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip",
                ),
            MarketType.US to
                linkedMapOf(
                    "nasdaq" to "https://new.real.download.dws.co.kr/common/master/nasmst.cod.zip",
                    "nyse" to "https://new.real.download.dws.co.kr/common/master/nysmst.cod.zip",
                    "amex" to "https://new.real.download.dws.co.kr/common/master/amsmst.cod.zip",
                ),
        )

    private val restClient =
        RestClient
            .builder()
            .requestFactory(
                SimpleClientHttpRequestFactory().apply {
                    setConnectTimeout(java.time.Duration.ofSeconds(10))
                    setReadTimeout(java.time.Duration.ofSeconds(30))
                },
            ).build()

    fun search(
        query: String,
        marketScope: MarketType,
        exchange: String?,
        limit: Int,
    ): SymbolSearchResponse {
        val results =
            symbolMasterRepository.search(
                query = query,
                marketScope = marketScope.value,
                exchange = exchange,
                limit = PageRequest.of(0, limit),
            )
        return SymbolSearchResponse(
            query = query,
            total = results.size,
            items =
                results.map {
                    SymbolSearchItemResponse(
                        code = it.code,
                        name = it.name,
                        exchange = it.exchange,
                        marketScope = MarketType.fromValue(it.marketScope),
                    )
                },
        )
    }

    fun getStatus(): SymbolMasterStatusResponse =
        SymbolMasterStatusResponse(
            markets =
                listOf(MarketType.DOMESTIC, MarketType.US).map { marketScope ->
                    val exchangeCodes = marketConfigurations[marketScope].orEmpty().keys.toList()
                    val exchangeCounts =
                        exchangeCodes.map { exchange ->
                            SymbolMasterExchangeCountResponse(
                                exchange = exchange,
                                count = symbolMasterRepository.countByMarketScopeAndExchange(marketScope.value, exchange),
                            )
                        }
                    val totalCount = symbolMasterRepository.countByMarketScope(marketScope.value)
                    val status =
                        statusRepository
                            .findById(marketScope.value)
                            .orElse(SymbolMasterStatusEntity(marketScope = marketScope.value))
                    SymbolMasterMarketStatusResponse(
                        marketScope = marketScope,
                        exchangeCounts = exchangeCounts,
                        totalCount = totalCount,
                        collectedAt = status.collectedAt,
                        needsUpdate =
                            status.collectedAt == null ||
                                status.collectedAt!!.toLocalDate() < LocalDate.now(),
                    )
                },
        )

    fun collect(marketScope: MarketType): SymbolCollectResponse {
        if (!collecting.compareAndSet(false, true)) {
            return SymbolCollectResponse(
                marketScope = marketScope,
                success = false,
                exchangeCounts = emptyList(),
                totalCount = 0,
                errors = listOf("수집이 이미 진행 중입니다."),
            )
        }

        try {
            val marketMasterUrls =
                marketConfigurations[marketScope]
                    ?: throw IllegalArgumentException("Unsupported marketScope: ${marketScope.value}")

            val errors = mutableListOf<String>()
            val exchangeCounts = mutableListOf<SymbolMasterExchangeCountResponse>()

            for ((exchange, url) in marketMasterUrls) {
                try {
                    val symbols = downloadAndParse(url, marketScope, exchange)
                    persistence.replaceExchange(marketScope, exchange, symbols)
                    exchangeCounts += SymbolMasterExchangeCountResponse(exchange = exchange, count = symbols.size)
                    log.info("마스터파일 수집 완료: {} / {} - {}건", marketScope.value, exchange, symbols.size)
                } catch (e: Exception) {
                    log.error("마스터파일 수집 실패: {} / {} - {}", marketScope.value, exchange, e.message)
                    errors.add("$exchange: ${e.message}")
                    exchangeCounts +=
                        SymbolMasterExchangeCountResponse(
                            exchange = exchange,
                            count = symbolMasterRepository.countByMarketScopeAndExchange(marketScope.value, exchange),
                        )
                }
            }

            val count = symbolMasterRepository.countByMarketScope(marketScope.value)
            persistence.updateStatus(marketScope)

            return SymbolCollectResponse(
                marketScope = marketScope,
                success = errors.isEmpty(),
                exchangeCounts = exchangeCounts,
                totalCount = count,
                errors = errors,
            )
        } finally {
            collecting.set(false)
        }
    }

    private fun downloadAndParse(
        url: String,
        marketScope: MarketType,
        exchange: String,
    ): List<SymbolMasterEntity> {
        val zipBytes =
            restClient
                .get()
                .uri(url)
                .retrieve()
                .body(ByteArray::class.java)
                ?: throw IllegalStateException("마스터파일 다운로드 실패: ${marketScope.value} / $exchange")

        val mstBytes = unzip(zipBytes)
        return when (marketScope) {
            MarketType.DOMESTIC -> parseDomesticMst(mstBytes, exchange, marketScope)
            MarketType.US -> parseOverseasMst(mstBytes, exchange, marketScope)
        }
    }

    private fun unzip(zipBytes: ByteArray): ByteArray {
        ZipInputStream(ByteArrayInputStream(zipBytes)).use { zis ->
            val entry = zis.nextEntry ?: throw IllegalStateException("ZIP 엔트리 없음")
            val content = zis.readBytes()
            zis.closeEntry()
            return content
        }
    }

    private fun parseDomesticMst(
        content: ByteArray,
        exchange: String,
        marketScope: MarketType,
    ): List<SymbolMasterEntity> {
        val euckr = charset("EUC-KR")
        val lines = String(content, euckr).lines()

        return lines.mapNotNull { line ->
            val lineBytes = line.toByteArray(euckr)
            if (lineBytes.size < 250) return@mapNotNull null

            val code = String(lineBytes, 0, 9, euckr).trim().takeLast(6)
            val nameEnd = lineBytes.size - 228
            val name = String(lineBytes, 21, nameEnd - 21, euckr).trim()

            if (code.isBlank() || name.isBlank()) return@mapNotNull null

            SymbolMasterEntity(
                marketScope = marketScope.value,
                code = code,
                exchange = exchange,
                name = name,
            )
        }
    }

    private fun parseOverseasMst(
        content: ByteArray,
        exchange: String,
        marketScope: MarketType,
    ): List<SymbolMasterEntity> {
        val cp949 = charset("CP949")
        val lines = String(content, cp949).lines()

        return lines.mapNotNull { line ->
            if (line.isBlank()) return@mapNotNull null

            val columns = line.split('\t')
            if (columns.size < 9) return@mapNotNull null

            val symbol = columns.getOrNull(4)?.trim().orEmpty()
            val koreaName = columns.getOrNull(6)?.trim().orEmpty()
            val englishName = columns.getOrNull(7)?.trim().orEmpty()
            val securityType = columns.getOrNull(8)?.trim().orEmpty()

            if (symbol.isBlank() || securityType != "2") return@mapNotNull null

            val name = koreaName.ifBlank { englishName }
            if (name.isBlank()) return@mapNotNull null

            SymbolMasterEntity(
                marketScope = marketScope.value,
                code = symbol.uppercase(),
                exchange = exchange,
                name = name,
            )
        }
    }
}
