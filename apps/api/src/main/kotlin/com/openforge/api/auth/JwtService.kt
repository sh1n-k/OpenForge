package com.openforge.api.auth

import com.openforge.api.config.ApplicationProperties
import io.jsonwebtoken.Jwts
import org.springframework.stereotype.Service
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.util.Date
import javax.crypto.SecretKey
import javax.crypto.spec.SecretKeySpec

@Service
class JwtService(
    private val applicationProperties: ApplicationProperties,
) {

    fun generateAccessToken(): String {
        val now = System.currentTimeMillis()
        val expiryMillis = applicationProperties.auth.tokenExpiryHours * 3600 * 1000
        return Jwts.builder()
            .subject("owner")
            .claim("type", "access")
            .issuedAt(Date(now))
            .expiration(Date(now + expiryMillis))
            .signWith(secretKey())
            .compact()
    }

    fun generateRefreshToken(): String {
        val now = System.currentTimeMillis()
        val expiryMillis = applicationProperties.auth.refreshExpiryDays * 86400 * 1000
        return Jwts.builder()
            .subject("owner")
            .claim("type", "refresh")
            .issuedAt(Date(now))
            .expiration(Date(now + expiryMillis))
            .signWith(secretKey())
            .compact()
    }

    fun validateToken(token: String): Boolean = runCatching {
        Jwts.parser()
            .verifyWith(secretKey())
            .build()
            .parseSignedClaims(token)
        true
    }.getOrDefault(false)

    fun isRefreshToken(token: String): Boolean = runCatching {
        val claims = Jwts.parser()
            .verifyWith(secretKey())
            .build()
            .parseSignedClaims(token)
            .payload
        claims["type"] == "refresh"
    }.getOrDefault(false)

    private fun secretKey(): SecretKey {
        val secret = applicationProperties.auth.jwtSecret.ifBlank { "default-dev-secret" }
        val digest = MessageDigest.getInstance("SHA-256")
            .digest(secret.toByteArray(StandardCharsets.UTF_8))
        return SecretKeySpec(digest, "HmacSHA256")
    }
}
