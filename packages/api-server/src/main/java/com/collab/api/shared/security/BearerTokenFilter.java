package com.collab.api.shared.security;

import com.collab.api.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * Phase-1 authentication filter.
 *
 * <p>Reads the {@code Authorization: Bearer <token>} header, looks up the
 * matching user in the database, and populates the {@link SecurityContextHolder}
 * so that downstream {@code anyRequest().authenticated()} checks pass.
 *
 * <p>The principal name is set to the user's {@code UUID} string so that
 * controllers can extract it via {@code authentication.getName()}.
 *
 * <p><b>Phase 2 replacement:</b> This filter will be replaced by a
 * {@code JwtAuthenticationFilter} that validates a signed JWT locally without
 * any database lookup per request.
 */
@Component
public class BearerTokenFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final UserRepository userRepository;

    public BearerTokenFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length());

            userRepository.findBySessionToken(token).ifPresent(user -> {
                // No credentials or authorities needed for Phase 1 —
                // the presence of a valid token is the only requirement.
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                user.getId().toString(),
                                null,
                                Collections.emptyList()
                        );
                SecurityContextHolder.getContext().setAuthentication(authentication);
            });
        }

        filterChain.doFilter(request, response);
    }
}
