package com.openforge.api.config

import com.openforge.api.auth.JwtAuthenticationFilter
import com.openforge.api.auth.JwtService
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.provisioning.InMemoryUserDetailsManager
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter

@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val jwtService: JwtService,
    private val applicationProperties: ApplicationProperties,
) {

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .cors { }

        if (applicationProperties.auth.password.isBlank()) {
            http.authorizeHttpRequests { it.anyRequest().permitAll() }
        } else {
            http
                .authorizeHttpRequests { auth ->
                    auth
                        .requestMatchers("/api/v1/health").permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .anyRequest().authenticated()
                }
                .addFilterBefore(
                    JwtAuthenticationFilter(jwtService),
                    UsernamePasswordAuthenticationFilter::class.java,
                )
                .exceptionHandling { ex ->
                    ex.authenticationEntryPoint { _, response, _ ->
                        response.status = 401
                        response.contentType = "application/json"
                        response.writer.write("""{"status":401,"title":"Unauthorized","detail":"Authentication required"}""")
                    }
                }
        }

        return http.build()
    }

    @Bean
    fun userDetailsService(): UserDetailsService =
        InMemoryUserDetailsManager(
            User.withUsername("unused")
                .password("{noop}unused")
                .authorities(emptyList())
                .build(),
        )
}
