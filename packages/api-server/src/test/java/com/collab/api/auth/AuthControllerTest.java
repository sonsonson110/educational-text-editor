package com.collab.api.auth;

import com.collab.api.auth.dto.LoginRequest;
import com.collab.api.auth.dto.RegisterRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for {@link AuthController}.
 *
 * <p>Each test boots the full Spring context, goes through the Security filter
 * chain, and hits a real PostgreSQL database. {@code @Transactional} rolls back
 * every test automatically — no cleanup scripts needed.
 *
 * <p>Auth guard tests are not applicable here because both endpoints are public
 * ({@code /api/auth/register} and {@code /api/auth/login} are open by design).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper json;

    // ── helpers ───────────────────────────────────────────────────────────────

    /**
     * Registers a user and returns the auth token from the response body.
     * Reused by tests that need an authenticated state before asserting.
     */
    private String registerAndGetToken(String email) throws Exception {
        var body = json.writeValueAsString(
                new RegisterRequest(email, "password123", "Test User"));
        var result = mockMvc.perform(post("/api/auth/register")
                        .contentType(APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();
        return json.readTree(result.getResponse().getContentAsString())
                .get("token").asText();
    }

    // ── register ──────────────────────────────────────────────────────────────

    @Test
    void register_happyPath_returnsCreatedWithToken() throws Exception {
        var body = json.writeValueAsString(
                new RegisterRequest("alice@example.com", "password123", "Alice"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.userId").isNotEmpty())
                .andExpect(jsonPath("$.displayName").value("Alice"));
    }

    @Test
    void register_duplicateEmail_returnsConflict() throws Exception {
        var body = json.writeValueAsString(
                new RegisterRequest("alice@example.com", "password123", "Alice"));

        // First registration succeeds
        mockMvc.perform(post("/api/auth/register")
                        .contentType(APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        // Second registration with the same email is rejected
        mockMvc.perform(post("/api/auth/register")
                        .contentType(APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("CONFLICT"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void register_blankEmail_returns400WithFieldError() throws Exception {
        var body = json.writeValueAsString(
                new RegisterRequest("", "password123", "Alice"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("email"));
    }

    @Test
    void register_shortPassword_returns400WithFieldError() throws Exception {
        var body = json.writeValueAsString(
                new RegisterRequest("alice@example.com", "short", "Alice"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("password"));
    }

    // ── login ─────────────────────────────────────────────────────────────────

    @Test
    void login_happyPath_returnsOkWithToken() throws Exception {
        registerAndGetToken("bob@example.com");

        var body = json.writeValueAsString(
                new LoginRequest("bob@example.com", "password123"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.displayName").value("Test User"));
    }

    @Test
    void login_wrongPassword_returnsUnauthorized() throws Exception {
        registerAndGetToken("bob@example.com");

        var body = json.writeValueAsString(
                new LoginRequest("bob@example.com", "wrongpassword"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
    }

    @Test
    void login_unknownEmail_returnsUnauthorized() throws Exception {
        var body = json.writeValueAsString(
                new LoginRequest("ghost@example.com", "password123"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
    }
}
