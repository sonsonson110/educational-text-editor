package com.collab.api.shared.config;

import com.collab.api.shared.security.BearerTokenFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
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
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Central Spring Security configuration for the REST API.
 *
 * <p>Design goals for this baseline (Phase 1):
 * <ul>
 *   <li>Stateless session — no server-side session state; every request must
 *       carry its own credentials. This is the prerequisite for JWT in Phase 2.</li>
 *   <li>CSRF disabled — CSRF protection is only needed for cookie-based browser
 *       sessions. A stateless token API has no cookies to protect.</li>
 *   <li>Additive structure — Phase 2 will swap {@link BearerTokenFilter} for a
 *       {@code JwtAuthenticationFilter} at the same chain position.</li>
 * </ul>
 *
 * <p>{@code @EnableMethodSecurity} activates {@code @PreAuthorize} /
 * {@code @PostAuthorize} so individual service methods can be secured by role
 * in Phase 4 without any further configuration change here.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final BearerTokenFilter bearerTokenFilter;

    public SecurityConfig(BearerTokenFilter bearerTokenFilter) {
        this.bearerTokenFilter = bearerTokenFilter;
    }

    /**
     * Defines the HTTP security filter chain applied to every incoming request.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/auth/register").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .anyRequest().authenticated()
                )

                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, authException) ->
                                response.sendError(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized"))
                )

                // Phase 1: DB-backed UUID token filter.
                // Phase 2: replace with .addFilterBefore(jwtFilter, ...)
                .addFilterBefore(bearerTokenFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Prevents Spring Boot from auto-registering {@link BearerTokenFilter} in
     * the servlet filter chain a second time (it is already registered inside
     * the Spring Security filter chain above).
     */
    @Bean
    public FilterRegistrationBean<BearerTokenFilter> bearerTokenFilterRegistration() {
        FilterRegistrationBean<BearerTokenFilter> registration =
                new FilterRegistrationBean<>(bearerTokenFilter);
        registration.setEnabled(false);
        return registration;
    }

    /**
     * Registers BCrypt as the application-wide password hashing strategy.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
