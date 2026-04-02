package com.openforge.api.auth

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.filter.OncePerRequestFilter

class JwtAuthenticationFilter(
    private val jwtService: JwtService,
) : OncePerRequestFilter() {
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        val token =
            request.cookies
                ?.firstOrNull { it.name == COOKIE_NAME }
                ?.value

        if (token != null && jwtService.validateToken(token) && !jwtService.isRefreshToken(token)) {
            val authentication =
                UsernamePasswordAuthenticationToken(
                    "owner",
                    null,
                    listOf(SimpleGrantedAuthority("ROLE_OWNER")),
                )
            SecurityContextHolder.getContext().authentication = authentication
        }

        filterChain.doFilter(request, response)
    }

    companion object {
        const val COOKIE_NAME = "of_access_token"
    }
}
