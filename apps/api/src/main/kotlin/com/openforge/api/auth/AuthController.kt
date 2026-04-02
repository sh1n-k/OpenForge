package com.openforge.api.auth

import com.openforge.api.config.ApplicationProperties
import jakarta.servlet.http.Cookie
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.nio.charset.StandardCharsets
import java.security.MessageDigest

@RestController
@RequestMapping("/api/v1/auth")
class AuthController(
    private val jwtService: JwtService,
    private val applicationProperties: ApplicationProperties,
) {
    @PostMapping("/login")
    fun login(
        @RequestBody request: LoginRequest,
        response: HttpServletResponse,
    ): AuthStatusResponse {
        val configured = applicationProperties.auth.password
        if (configured.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Authentication is not configured")
        }
        if (!timingSafeEquals(hashSha256(request.password), hashSha256(configured))) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid password")
        }

        val accessToken = jwtService.generateAccessToken()
        val refreshToken = jwtService.generateRefreshToken()
        val secure = applicationProperties.environment != "local"

        response.addCookie(
            buildCookie(
                name = ACCESS_TOKEN_COOKIE,
                value = accessToken,
                maxAge = (applicationProperties.auth.tokenExpiryHours * 3600).toInt(),
                path = "/",
                secure = secure,
            ),
        )
        response.addCookie(
            buildCookie(
                name = REFRESH_TOKEN_COOKIE,
                value = refreshToken,
                maxAge = (applicationProperties.auth.refreshExpiryDays * 86400).toInt(),
                path = "/api/v1/auth",
                secure = secure,
            ),
        )

        return AuthStatusResponse(authenticated = true)
    }

    @PostMapping("/logout")
    fun logout(response: HttpServletResponse): AuthStatusResponse {
        val secure = applicationProperties.environment != "local"
        response.addCookie(buildCookie(ACCESS_TOKEN_COOKIE, "", 0, "/", secure))
        response.addCookie(buildCookie(REFRESH_TOKEN_COOKIE, "", 0, "/api/v1/auth", secure))
        return AuthStatusResponse(authenticated = false)
    }

    @PostMapping("/refresh")
    fun refresh(
        request: HttpServletRequest,
        response: HttpServletResponse,
    ): AuthStatusResponse {
        val refreshToken =
            request.cookies
                ?.firstOrNull { it.name == REFRESH_TOKEN_COOKIE }
                ?.value
                ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token not found")

        if (!jwtService.validateToken(refreshToken) || !jwtService.isRefreshToken(refreshToken)) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token")
        }

        val accessToken = jwtService.generateAccessToken()
        val secure = applicationProperties.environment != "local"
        response.addCookie(
            buildCookie(
                name = ACCESS_TOKEN_COOKIE,
                value = accessToken,
                maxAge = (applicationProperties.auth.tokenExpiryHours * 3600).toInt(),
                path = "/",
                secure = secure,
            ),
        )

        return AuthStatusResponse(authenticated = true)
    }

    @GetMapping("/status")
    fun status(request: HttpServletRequest): AuthStatusResponse {
        val configured = applicationProperties.auth.password
        if (configured.isBlank()) {
            return AuthStatusResponse(authenticated = true, authRequired = false)
        }
        val token =
            request.cookies
                ?.firstOrNull { it.name == ACCESS_TOKEN_COOKIE }
                ?.value
        val authenticated = token != null && jwtService.validateToken(token) && !jwtService.isRefreshToken(token)
        return AuthStatusResponse(authenticated = authenticated, authRequired = true)
    }

    private fun buildCookie(
        name: String,
        value: String,
        maxAge: Int,
        path: String,
        secure: Boolean,
    ): Cookie {
        val cookie = Cookie(name, value)
        cookie.isHttpOnly = true
        cookie.secure = secure
        cookie.path = path
        cookie.maxAge = maxAge
        cookie.setAttribute("SameSite", "Lax")
        return cookie
    }

    private fun hashSha256(input: String): ByteArray = MessageDigest.getInstance("SHA-256").digest(input.toByteArray(StandardCharsets.UTF_8))

    private fun timingSafeEquals(
        a: ByteArray,
        b: ByteArray,
    ): Boolean = MessageDigest.isEqual(a, b)

    companion object {
        const val ACCESS_TOKEN_COOKIE = "of_access_token"
        const val REFRESH_TOKEN_COOKIE = "of_refresh_token"
    }
}

data class LoginRequest(
    val password: String,
)

data class AuthStatusResponse(
    val authenticated: Boolean,
    val authRequired: Boolean = true,
)
