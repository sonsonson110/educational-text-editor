package com.collab.api.shared.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Central Spring Security configuration for the REST API.
 *
 * <p>Design goals for this baseline (Phase 1):
 * <ul>
 *   <li>Stateless session — no server-side session state; every request must
 *       carry its own credentials. This is the prerequisite for JWT in Phase 2.</li>
 *   <li>CSRF disabled — CSRF protection is only needed for cookie-based browser
 *       sessions. A stateless token API has no cookies to protect.</li>
 *   <li>Additive structure — Phase 2 will call
 *       {@code .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)}
 *       on this same chain without rewriting it.</li>
 * </ul>
 *
 * <p>{@code @EnableMethodSecurity} activates {@code @PreAuthorize} / {@code @PostAuthorize}
 * so individual service methods can be secured by role in Phase 4 without any
 * further configuration change here.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    /**
     * Defines the HTTP security filter chain applied to every incoming request.
     *
     * <p>Public routes are limited to the minimum needed right now. All other
     * routes require an authenticated principal — even if authentication
     * currently does nothing (no JWT filter yet), this ensures new endpoints
     * are secure by default and must be explicitly opted out.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Stateless REST API — disable CSRF and server-side sessions
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth
                        // Auth endpoints must be reachable before a token exists
                        .requestMatchers(HttpMethod.POST, "/api/auth/register").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        // Deny everything else by default — explicit opt-in per route
                        .anyRequest().authenticated()
                );

        // Phase 2 hook: jwt filter will be added here via:
        // .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)

        return http.build();
    }

    /**
     * Registers BCrypt as the application-wide password hashing strategy.
     *
     * <p>Declaring this as a {@code @Bean} lets Spring inject {@link PasswordEncoder}
     * anywhere (e.g. {@code AuthService}) without creating a new instance per call.
     * BCrypt's default cost factor (10) is a deliberate performance tradeoff that
     * makes brute-force attacks expensive.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
