package com.openforge.api.system.broker

import com.openforge.api.config.ApplicationProperties
import com.openforge.api.strategy.domain.OrderMode
import jakarta.transaction.Transactional
import org.springframework.core.env.Environment
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import tools.jackson.databind.ObjectMapper
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.ByteBuffer
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.security.SecureRandom
import java.sql.Timestamp
import java.time.Duration
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Base64
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

@Service
@Transactional
class BrokerConnectionService(
    private val jdbcTemplate: JdbcTemplate,
    private val objectMapper: ObjectMapper,
    private val applicationProperties: ApplicationProperties,
    private val kisApiProperties: KisApiProperties,
    private val environment: Environment,
) {
    private val secureRandom = SecureRandom()

    fun getStatus(): SystemBrokerStatusResponse {
        val currentMode = currentSystemMode()
        val paper = toResponse(findConfig(OrderMode.PAPER), OrderMode.PAPER)
        val live = toResponse(findConfig(OrderMode.LIVE), OrderMode.LIVE)
        return SystemBrokerStatusResponse(
            currentSystemMode = currentMode,
            paper = paper,
            live = live,
            hasPaperConfig = paper.isConfigured,
            hasLiveConfig = live.isConfigured,
            isCurrentModeConfigured =
                when (currentMode) {
                    OrderMode.PAPER -> paper.isConfigured
                    OrderMode.LIVE -> live.isConfigured
                },
        )
    }

    fun updateConfig(request: UpdateBrokerConnectionRequest): BrokerConnectionResponse {
        val existing = findConfig(request.targetMode)
        val merged = mergeConfig(existing, request)
        requireConfigured(merged)

        jdbcTemplate.update(
            """
            insert into broker_connection_config (
                id,
                broker_type,
                target_mode,
                app_key_ciphertext,
                app_secret_ciphertext,
                account_number_ciphertext,
                product_code_ciphertext,
                base_url,
                enabled,
                last_connection_test_at,
                last_connection_test_status,
                last_connection_test_message,
                created_at,
                updated_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now())
            on conflict (broker_type, target_mode) do update set
                app_key_ciphertext = excluded.app_key_ciphertext,
                app_secret_ciphertext = excluded.app_secret_ciphertext,
                account_number_ciphertext = excluded.account_number_ciphertext,
                product_code_ciphertext = excluded.product_code_ciphertext,
                base_url = excluded.base_url,
                enabled = excluded.enabled,
                updated_at = now()
            """.trimIndent(),
            merged.id,
            BROKER_TYPE,
            merged.targetMode.name,
            merged.appKeyCiphertext,
            merged.appSecretCiphertext,
            merged.accountNumberCiphertext,
            merged.productCodeCiphertext,
            merged.baseUrl,
            merged.enabled,
            merged.lastConnectionTestAt?.toTimestamp(),
            merged.lastConnectionTestStatus?.value,
            merged.lastConnectionTestMessage,
        )

        val response = toResponse(merged, request.targetMode)
        appendEvent(
            targetMode = request.targetMode,
            eventType = BrokerConnectionEventType.CONFIG_SAVED,
            message = "${request.targetMode.value} KIS 연결 설정 저장",
            payload =
                mapOf(
                    "enabled" to request.enabled,
                    "isConfigured" to response.isConfigured,
                    "maskedAppKey" to response.maskedAppKey,
                    "maskedAccountNumber" to response.maskedAccountNumber,
                    "maskedProductCode" to response.maskedProductCode,
                ),
        )
        if (existing?.enabled != null && existing.enabled != request.enabled) {
            appendEvent(
                targetMode = request.targetMode,
                eventType = BrokerConnectionEventType.ENABLED_CHANGED,
                message =
                    if (request.enabled) {
                        "${request.targetMode.value} 브로커 연결 활성화"
                    } else {
                        "${request.targetMode.value} 브로커 연결 비활성화"
                    },
                payload = mapOf("enabled" to request.enabled),
            )
        }
        return response
    }

    fun testConnection(request: TestBrokerConnectionRequest): BrokerConnectionResponse {
        val config =
            findConfig(request.targetMode)
                ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Broker config is not registered for ${request.targetMode.value}")
        requireConfigured(config)

        val result =
            runCatching { performConnectionTest(config) }
                .getOrElse { throwable ->
                    val message = throwable.message ?: "KIS connection test failed"
                    val failed =
                        config.copy(
                            lastConnectionTestAt = OffsetDateTime.now(ZoneOffset.UTC),
                            lastConnectionTestStatus = BrokerConnectionTestStatus.FAILED,
                            lastConnectionTestMessage = message,
                        )
                    persistTestResult(failed)
                    appendEvent(
                        targetMode = request.targetMode,
                        eventType = BrokerConnectionEventType.CONNECTION_TEST_FAILED,
                        message = message,
                        payload = mapOf("status" to BrokerConnectionTestStatus.FAILED.value),
                    )
                    return toResponse(failed, request.targetMode)
                }

        val updated =
            config.copy(
                lastConnectionTestAt = OffsetDateTime.now(ZoneOffset.UTC),
                lastConnectionTestStatus = BrokerConnectionTestStatus.SUCCESS,
                lastConnectionTestMessage = result.message,
            )
        persistTestResult(updated)
        appendEvent(
            targetMode = request.targetMode,
            eventType = BrokerConnectionEventType.CONNECTION_TEST_SUCCEEDED,
            message = result.message,
            payload = mapOf("status" to BrokerConnectionTestStatus.SUCCESS.value),
        )
        return toResponse(updated, request.targetMode)
    }

    fun listEvents(limit: Int): List<BrokerConnectionEventResponse> =
        jdbcTemplate.query(
            """
            select id, target_mode, event_type, message, payload::text as payload_text, occurred_at
            from broker_connection_event
            order by occurred_at desc
            limit ?
            """.trimIndent(),
            { rs, _ ->
                BrokerConnectionEventResponse(
                    id = UUID.fromString(rs.getString("id")),
                    targetMode = OrderMode.valueOf(rs.getString("target_mode")),
                    eventType = BrokerConnectionEventType.fromValue(rs.getString("event_type")),
                    message = rs.getString("message"),
                    payload = objectMapper.readValue(rs.getString("payload_text"), Map::class.java) as Map<String, Any?>,
                    occurredAt = rs.getTimestamp("occurred_at").toOffsetDateTimeUtc(),
                )
            },
            normalizeLimit(limit, 20),
        )

    fun loadCredentials(targetMode: OrderMode): BrokerConnectionCredentials {
        val config =
            findConfig(targetMode)
                ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Broker config is not registered for ${targetMode.value}")
        requireConfigured(config)
        if (!config.enabled) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Broker config is disabled for ${targetMode.value}")
        }

        return BrokerConnectionCredentials(
            targetMode = targetMode,
            appKey = decrypt(config.appKeyCiphertext!!),
            appSecret = decrypt(config.appSecretCiphertext!!),
            accountNumber = decrypt(config.accountNumberCiphertext!!),
            productCode = decrypt(config.productCodeCiphertext!!),
            baseUrl = config.baseUrl,
        )
    }

    fun hasEnabledConfig(targetMode: OrderMode): Boolean =
        findConfig(targetMode)?.let { isConfigured(it) && it.enabled } ?: false

    private fun performConnectionTest(config: StoredBrokerConfig): ConnectionTestResult {
        val appKey = decrypt(config.appKeyCiphertext!!)
        val appSecret = decrypt(config.appSecretCiphertext!!)
        val accountNumber = decrypt(config.accountNumberCiphertext!!)
        val productCode = decrypt(config.productCodeCiphertext!!)
        val accessToken = requestAccessToken(config.baseUrl, appKey, appSecret)
        verifyAccount(config, accessToken, appKey, appSecret, accountNumber, productCode)
        return ConnectionTestResult("OAuth 토큰 발급 및 계좌 조회 성공")
    }

    private fun requestAccessToken(
        baseUrl: String,
        appKey: String,
        appSecret: String,
    ): String {
        val request =
            HttpRequest
                .newBuilder()
                .uri(URI.create("$baseUrl/oauth2/tokenP"))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .timeout(Duration.ofMillis(kisApiProperties.readTimeoutMillis))
                .POST(
                    HttpRequest.BodyPublishers.ofString(
                        objectMapper.writeValueAsString(
                            mapOf(
                                "grant_type" to "client_credentials",
                                "appkey" to appKey,
                                "appsecret" to appSecret,
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

    private fun verifyAccount(
        config: StoredBrokerConfig,
        accessToken: String,
        appKey: String,
        appSecret: String,
        accountNumber: String,
        productCode: String,
    ) {
        val query =
            listOf(
                "CANO" to accountNumber,
                "ACNT_PRDT_CD" to productCode,
                "AFHR_FLPR_YN" to "N",
                "OFL_YN" to "",
                "INQR_DVSN" to "02",
                "UNPR_DVSN" to "01",
                "FUND_STTL_ICLD_YN" to "N",
                "FNCG_AMT_AUTO_RDPT_YN" to "N",
                "PRCS_DVSN" to "00",
                "CTX_AREA_FK100" to "",
                "CTX_AREA_NK100" to "",
            ).joinToString("&") { (key, value) ->
                "${encode(key)}=${encode(value)}"
            }
        val trId = if (config.targetMode == OrderMode.PAPER) "VTTC8434R" else "TTTC8434R"
        val request =
            HttpRequest
                .newBuilder()
                .uri(URI.create("${config.baseUrl}/uapi/domestic-stock/v1/trading/inquire-balance?$query"))
                .header("Accept", "application/json")
                .header("authorization", "Bearer $accessToken")
                .header("appkey", appKey)
                .header("appsecret", appSecret)
                .header("tr_id", trId)
                .header("custtype", "P")
                .timeout(Duration.ofMillis(kisApiProperties.readTimeoutMillis))
                .GET()
                .build()
        val response = httpClient().send(request, HttpResponse.BodyHandlers.ofString())
        val body = objectMapper.readTree(response.body().ifBlank { "{}" })
        if (response.statusCode() !in 200..299 || body.path("rt_cd").asText() != "0") {
            throw IllegalStateException(body.path("msg1").asText("KIS account inquiry failed"))
        }
    }

    private fun persistTestResult(config: StoredBrokerConfig) {
        jdbcTemplate.update(
            """
            update broker_connection_config
            set last_connection_test_at = ?,
                last_connection_test_status = ?,
                last_connection_test_message = ?,
                updated_at = now()
            where broker_type = ? and target_mode = ?
            """.trimIndent(),
            config.lastConnectionTestAt?.toTimestamp(),
            config.lastConnectionTestStatus?.value,
            config.lastConnectionTestMessage,
            BROKER_TYPE,
            config.targetMode.name,
        )
    }

    private fun mergeConfig(
        existing: StoredBrokerConfig?,
        request: UpdateBrokerConnectionRequest,
    ): StoredBrokerConfig {
        val now = OffsetDateTime.now(ZoneOffset.UTC)
        return StoredBrokerConfig(
            id = existing?.id ?: UUID.randomUUID(),
            targetMode = request.targetMode,
            appKeyCiphertext = mergeSecret(existing?.appKeyCiphertext, request.appKey),
            appSecretCiphertext = mergeSecret(existing?.appSecretCiphertext, request.appSecret),
            accountNumberCiphertext = mergeSecret(existing?.accountNumberCiphertext, request.accountNumber),
            productCodeCiphertext = mergeSecret(existing?.productCodeCiphertext, request.productCode),
            baseUrl = baseUrlFor(request.targetMode),
            enabled = request.enabled,
            lastConnectionTestAt = existing?.lastConnectionTestAt,
            lastConnectionTestStatus = existing?.lastConnectionTestStatus,
            lastConnectionTestMessage = existing?.lastConnectionTestMessage,
            createdAt = existing?.createdAt ?: now,
            updatedAt = now,
        )
    }

    private fun mergeSecret(
        existingCiphertext: String?,
        newValue: String?,
    ): String? {
        val normalized = newValue?.trim()?.takeIf { it.isNotEmpty() }
        return normalized?.let(::encrypt) ?: existingCiphertext
    }

    private fun requireConfigured(config: StoredBrokerConfig) {
        if (
            config.appKeyCiphertext.isNullOrBlank() ||
            config.appSecretCiphertext.isNullOrBlank() ||
            config.accountNumberCiphertext.isNullOrBlank() ||
            config.productCodeCiphertext.isNullOrBlank()
        ) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Provide appKey, appSecret, accountNumber, and productCode before enabling KIS connectivity",
            )
        }
    }

    private fun toResponse(
        config: StoredBrokerConfig?,
        targetMode: OrderMode,
    ): BrokerConnectionResponse {
        if (config == null) {
            return BrokerConnectionResponse(
                brokerType = BROKER_TYPE,
                targetMode = targetMode,
                enabled = false,
                isConfigured = false,
                maskedAppKey = null,
                maskedAccountNumber = null,
                maskedProductCode = null,
                lastConnectionTestAt = null,
                lastConnectionTestStatus = null,
                lastConnectionTestMessage = null,
            )
        }
        return BrokerConnectionResponse(
            brokerType = BROKER_TYPE,
            targetMode = config.targetMode,
            enabled = config.enabled,
            isConfigured = isConfigured(config),
            maskedAppKey = config.appKeyCiphertext?.let(::decrypt)?.let { mask(it, visiblePrefix = 4, visibleSuffix = 3) },
            maskedAccountNumber = config.accountNumberCiphertext?.let(::decrypt)?.let { mask(it, visiblePrefix = 2, visibleSuffix = 2) },
            maskedProductCode = config.productCodeCiphertext?.let(::decrypt),
            lastConnectionTestAt = config.lastConnectionTestAt,
            lastConnectionTestStatus = config.lastConnectionTestStatus,
            lastConnectionTestMessage = config.lastConnectionTestMessage,
        )
    }

    private fun findConfig(targetMode: OrderMode): StoredBrokerConfig? =
        jdbcTemplate
            .query(
                """
                select id, target_mode, app_key_ciphertext, app_secret_ciphertext, account_number_ciphertext,
                       product_code_ciphertext, base_url, enabled, last_connection_test_at,
                       last_connection_test_status, last_connection_test_message, created_at, updated_at
                from broker_connection_config
                where broker_type = ? and target_mode = ?
                """.trimIndent(),
                { rs, _ ->
                    StoredBrokerConfig(
                        id = UUID.fromString(rs.getString("id")),
                        targetMode = OrderMode.valueOf(rs.getString("target_mode")),
                        appKeyCiphertext = rs.getString("app_key_ciphertext"),
                        appSecretCiphertext = rs.getString("app_secret_ciphertext"),
                        accountNumberCiphertext = rs.getString("account_number_ciphertext"),
                        productCodeCiphertext = rs.getString("product_code_ciphertext"),
                        baseUrl = rs.getString("base_url"),
                        enabled = rs.getBoolean("enabled"),
                        lastConnectionTestAt = rs.getTimestamp("last_connection_test_at")?.toOffsetDateTimeUtc(),
                        lastConnectionTestStatus =
                            rs
                                .getString("last_connection_test_status")
                                ?.takeIf { it.isNotBlank() }
                                ?.let(BrokerConnectionTestStatus::fromValue),
                        lastConnectionTestMessage = rs.getString("last_connection_test_message"),
                        createdAt = rs.getTimestamp("created_at").toOffsetDateTimeUtc(),
                        updatedAt = rs.getTimestamp("updated_at").toOffsetDateTimeUtc(),
                    )
                },
                BROKER_TYPE,
                targetMode.name,
            ).firstOrNull()

    private fun appendEvent(
        targetMode: OrderMode,
        eventType: BrokerConnectionEventType,
        message: String,
        payload: Map<String, Any?>,
    ) {
        jdbcTemplate.update(
            """
            insert into broker_connection_event (
                id, target_mode, event_type, message, payload, occurred_at, created_at, updated_at
            ) values (?, ?, ?, ?, cast(? as jsonb), now(), now(), now())
            """.trimIndent(),
            UUID.randomUUID(),
            targetMode.name,
            eventType.value,
            message,
            objectMapper.writeValueAsString(payload),
        )
    }

    private fun encrypt(plainText: String): String {
        val iv = ByteArray(12).also(secureRandom::nextBytes)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, secretKey(), GCMParameterSpec(128, iv))
        val encrypted = cipher.doFinal(plainText.toByteArray(StandardCharsets.UTF_8))
        val combined =
            ByteBuffer
                .allocate(iv.size + encrypted.size)
                .put(iv)
                .put(encrypted)
                .array()
        return Base64.getEncoder().encodeToString(combined)
    }

    private fun decrypt(cipherText: String): String {
        val combined = Base64.getDecoder().decode(cipherText)
        val iv = combined.copyOfRange(0, 12)
        val payload = combined.copyOfRange(12, combined.size)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(128, iv))
        return String(cipher.doFinal(payload), StandardCharsets.UTF_8)
    }

    private fun secretKey(): SecretKeySpec {
        val raw =
            environment.getProperty("app.secret-key")
                ?: environment.getProperty(SECRET_ENV_KEY)
                ?: System.getenv(SECRET_ENV_KEY)
                ?: System.getProperty(SECRET_ENV_KEY)
                ?: throw IllegalStateException("$SECRET_ENV_KEY must be configured for broker secret encryption")
        val digest = MessageDigest.getInstance("SHA-256").digest(raw.toByteArray(StandardCharsets.UTF_8))
        return SecretKeySpec(digest.copyOf(32), "AES")
    }

    private fun mask(
        value: String,
        visiblePrefix: Int,
        visibleSuffix: Int,
    ): String {
        if (value.length <= visiblePrefix + visibleSuffix) {
            return "*".repeat(value.length.coerceAtLeast(1))
        }
        val maskedLength = (value.length - visiblePrefix - visibleSuffix).coerceAtLeast(1)
        return buildString {
            append(value.take(visiblePrefix))
            append("*".repeat(maskedLength))
            append(value.takeLast(visibleSuffix))
        }
    }

    private fun baseUrlFor(mode: OrderMode): String =
        when (mode) {
            OrderMode.PAPER -> kisApiProperties.paperBaseUrl
            OrderMode.LIVE -> kisApiProperties.liveBaseUrl
        }

    private fun currentSystemMode(): OrderMode =
        runCatching { OrderMode.fromValue(applicationProperties.mode.lowercase()) }
            .getOrElse { OrderMode.PAPER }

    private fun isConfigured(config: StoredBrokerConfig): Boolean =
        !config.appKeyCiphertext.isNullOrBlank() &&
            !config.appSecretCiphertext.isNullOrBlank() &&
            !config.accountNumberCiphertext.isNullOrBlank() &&
            !config.productCodeCiphertext.isNullOrBlank()

    private fun httpClient(): HttpClient =
        HttpClient
            .newBuilder()
            .connectTimeout(Duration.ofMillis(kisApiProperties.connectTimeoutMillis))
            .build()

    private fun encode(value: String): String = URLEncoder.encode(value, StandardCharsets.UTF_8)

    private fun normalizeLimit(
        value: Int,
        defaultValue: Int,
    ): Int = value.coerceIn(1, 100).takeIf { it > 0 } ?: defaultValue

    private fun Timestamp.toOffsetDateTimeUtc(): OffsetDateTime = toInstant().atOffset(ZoneOffset.UTC)

    private fun OffsetDateTime.toTimestamp(): Timestamp = Timestamp.from(toInstant())

    companion object {
        private const val BROKER_TYPE = "kis"
        private const val SECRET_ENV_KEY = "OPENFORGE_SECRET_KEY"
    }
}

private data class StoredBrokerConfig(
    val id: UUID,
    val targetMode: OrderMode,
    val appKeyCiphertext: String?,
    val appSecretCiphertext: String?,
    val accountNumberCiphertext: String?,
    val productCodeCiphertext: String?,
    val baseUrl: String,
    val enabled: Boolean,
    val lastConnectionTestAt: OffsetDateTime?,
    val lastConnectionTestStatus: BrokerConnectionTestStatus?,
    val lastConnectionTestMessage: String?,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime,
)

private data class ConnectionTestResult(
    val message: String,
)
