package com.openforge.api.symbol

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
        exchange: String,
        symbols: List<SymbolMasterEntity>,
    ): Int {
        symbolMasterRepository.deleteByExchange(exchange)
        symbolMasterRepository.flush()
        symbolMasterRepository.saveAll(symbols)
        return symbols.size
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun updateStatus(
        kospiCount: Int,
        kosdaqCount: Int,
    ) {
        val status = statusRepository.findById("singleton").orElse(SymbolMasterStatusEntity())
        status.kospiCount = kospiCount
        status.kosdaqCount = kosdaqCount
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

    private val masterUrls =
        mapOf(
            "kospi" to "https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip",
            "kosdaq" to "https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip",
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
        exchange: String?,
        limit: Int,
    ): SymbolSearchResponse {
        val results =
            symbolMasterRepository.search(
                query = query,
                exchange = exchange,
                limit = PageRequest.of(0, limit),
            )
        return SymbolSearchResponse(
            query = query,
            total = results.size,
            items = results.map { SymbolSearchItemResponse(it.code, it.name, it.exchange) },
        )
    }

    fun getStatus(): SymbolMasterStatusResponse {
        val status = statusRepository.findById("singleton").orElse(SymbolMasterStatusEntity())
        return SymbolMasterStatusResponse(
            kospiCount = status.kospiCount,
            kosdaqCount = status.kosdaqCount,
            totalCount = status.kospiCount + status.kosdaqCount,
            collectedAt = status.collectedAt,
            needsUpdate =
                status.collectedAt == null ||
                    status.collectedAt!!.toLocalDate() < LocalDate.now(),
        )
    }

    fun collect(): SymbolCollectResponse {
        if (!collecting.compareAndSet(false, true)) {
            return SymbolCollectResponse(
                success = false,
                kospiCount = 0,
                kosdaqCount = 0,
                totalCount = 0,
                errors = listOf("수집이 이미 진행 중입니다."),
            )
        }

        try {
            val errors = mutableListOf<String>()
            var kospiCount = 0
            var kosdaqCount = 0

            for ((exchange, url) in masterUrls) {
                try {
                    val symbols = downloadAndParse(url, exchange)
                    val count = persistence.replaceExchange(exchange, symbols)
                    when (exchange) {
                        "kospi" -> kospiCount = count
                        "kosdaq" -> kosdaqCount = count
                    }
                    log.info("마스터파일 수집 완료: {} — {}건", exchange, count)
                } catch (e: Exception) {
                    log.error("마스터파일 수집 실패: {} — {}", exchange, e.message)
                    errors.add("$exchange: ${e.message}")
                }
            }

            persistence.updateStatus(kospiCount, kosdaqCount)

            return SymbolCollectResponse(
                success = errors.isEmpty(),
                kospiCount = kospiCount,
                kosdaqCount = kosdaqCount,
                totalCount = kospiCount + kosdaqCount,
                errors = errors,
            )
        } finally {
            collecting.set(false)
        }
    }

    private fun downloadAndParse(
        url: String,
        exchange: String,
    ): List<SymbolMasterEntity> {
        val zipBytes =
            restClient
                .get()
                .uri(url)
                .retrieve()
                .body(ByteArray::class.java)
                ?: throw IllegalStateException("마스터파일 다운로드 실패: $exchange")

        val mstBytes = unzip(zipBytes)
        return parseMst(mstBytes, exchange)
    }

    private fun unzip(zipBytes: ByteArray): ByteArray {
        ZipInputStream(ByteArrayInputStream(zipBytes)).use { zis ->
            val entry = zis.nextEntry ?: throw IllegalStateException("ZIP 엔트리 없음")
            val content = zis.readBytes()
            zis.closeEntry()
            return content
        }
    }

    private fun parseMst(
        content: ByteArray,
        exchange: String,
    ): List<SymbolMasterEntity> {
        val euckr = charset("EUC-KR")
        val lines = String(content, euckr).lines()

        return lines.mapNotNull { line ->
            val lineBytes = line.toByteArray(euckr)
            // KIS MST: 종목코드(9) + 표준코드(12) + 종목명(가변) + 통계필드(228)
            if (lineBytes.size < 250) return@mapNotNull null

            val code = String(lineBytes, 0, 9, euckr).trim().takeLast(6)
            val nameEnd = lineBytes.size - 228
            val name = String(lineBytes, 21, nameEnd - 21, euckr).trim()

            if (code.isBlank() || name.isBlank()) return@mapNotNull null

            SymbolMasterEntity(code = code, name = name, exchange = exchange)
        }
    }
}
