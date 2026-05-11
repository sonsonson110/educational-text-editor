# API Testing — Spring Boot

## Philosophy

Tests in this project are **API-level integration tests**, not unit tests.

Each test makes a real HTTP call through the full Spring Security filter chain, hits a real PostgreSQL database (spun up via `compose.yaml`), and asserts on the HTTP response. There are no mocks, no H2 in-memory databases, and no partial-context slices.

This approach is chosen deliberately:

- **LLM-generated code is tested at the boundary it actually matters** — the HTTP contract. Internal refactors (renaming a service method, extracting a helper) do not break tests.
- **The full filter chain runs** — security misconfiguration, missing `@Valid`, incorrect status codes are all caught.
- **No H2 dialect drift** — H2 silently accepts SQL that Postgres rejects. Real Postgres catches real bugs.
- **Minimal setup** — `spring-boot-starter-test` is already on the classpath. No extra dependencies.

---

## Stack

| Concern | Tool |
|---|---|
| Test runner | JUnit 5 (bundled with `spring-boot-starter-test`) |
| HTTP layer | `MockMvc` with `@AutoConfigureMockMvc` |
| Context | `@SpringBootTest` (full application context) |
| Database | Real PostgreSQL via Spring Boot Docker Compose integration |
| Isolation | `@Transactional` on the test class — auto-rollback after each test |
| Assertions | `MockMvcResultMatchers` (`status()`, `jsonPath()`) |

---

## File Structure

Test files live next to their feature package, mirroring the main source tree:

```
src/test/java/com/collab/api/
  auth/
    AuthControllerTest.java
  room/
    RoomControllerTest.java
  shared/
    GlobalExceptionHandlerTest.java   ← optional, for edge-case error shapes
```

One test class per controller. No shared base classes unless a helper method is genuinely reused across multiple test classes.

---

## Test Class Anatomy

```java
@SpringBootTest                  // boots the full application context
@AutoConfigureMockMvc            // wires MockMvc automatically
@Transactional                   // rolls back after every @Test method
class AuthControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper json;  // Jackson — serialises request bodies

    // ── helpers ──────────────────────────────────────────────────────────

    /**
     * Registers a user and returns the auth token.
     * Reused by tests that need an authenticated state.
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

    // ── tests ─────────────────────────────────────────────────────────────

    @Test
    void register_happyPath_returnsCreatedWithToken() throws Exception { ... }

    @Test
    void register_duplicateEmail_returnsConflict() throws Exception { ... }

    @Test
    void register_blankEmail_returns400WithFieldError() throws Exception { ... }

    @Test
    void login_wrongPassword_returnsUnauthorized() throws Exception { ... }
}
```

---

## Isolation Strategy

`@Transactional` on the test class wraps every `@Test` method in a transaction that is **always rolled back**, never committed. This means:

- Tests run in any order without interfering.
- No `@Sql` cleanup scripts needed.
- No `@BeforeEach` truncation boilerplate.

**One known limitation:** `@Transactional` rollback hides side effects that only fire after commit — specifically, `@TransactionalEventListener(phase = AFTER_COMMIT)` listeners (e.g. a welcome email) will not execute in tests. This is usually desirable: email sending should not fire during testing. When you need to test a post-commit listener explicitly, remove `@Transactional` from that specific test and clean up manually with `@Sql` or `@AfterEach`.

---

## Naming Convention

Test method names follow the pattern:

```
<action>_<condition>_<expectedOutcome>
```

Examples:

```
register_happyPath_returnsCreatedWithToken
register_duplicateEmail_returnsConflict
register_blankEmail_returns400WithFieldError
login_wrongPassword_returnsUnauthorized
createRoom_unauthenticated_returns401
listRooms_authenticated_returnsOnlyMemberRooms
```

This makes the failure message immediately readable without opening the test body.

---

## What Every Endpoint Must Cover

For every new controller method, tests must cover these four scenarios at minimum:

**1. Happy path** — valid input, authenticated if required, correct status and response shape.

**2. Validation failure** — missing or malformed required field, expect `400` with `fieldErrors` array.

**3. Auth guard** — call the endpoint with no token (or a bad token), expect `401`.

**4. Domain error** — trigger a known `ApiException` (e.g. duplicate email → `409`, not found → `404`).

---

## Full Example — AuthControllerTest

```java
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper json;

    // ── helpers ──────────────────────────────────────────────────────────

    private String registerAndGetToken(String email) throws Exception {
        var body = json.writeValueAsString(
            new RegisterRequest(email, "password123", "Test User"));
        var result = mockMvc.perform(post("/api/auth/register")
                .contentType(APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andReturn();
        return json.readTree(result.getResponse().getContentAsString())
            .get("token").asText();
    }

    // ── register ─────────────────────────────────────────────────────────

    @Test
    void register_happyPath_returnsCreatedWithToken() throws Exception {
        var body = json.writeValueAsString(
            new RegisterRequest("alice@example.com", "password123", "Alice"));

        mockMvc.perform(post("/api/auth/register")
                .contentType(APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andExpect(jsonPath("$.userId").isNotEmpty())
            .andExpect(jsonPath("$.displayName").value("Alice"));
    }

    @Test
    void register_duplicateEmail_returnsConflict() throws Exception {
        var body = json.writeValueAsString(
            new RegisterRequest("alice@example.com", "password123", "Alice"));

        mockMvc.perform(post("/api/auth/register")
                .contentType(APPLICATION_JSON).content(body))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/register")
                .contentType(APPLICATION_JSON).content(body))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error").value("CONFLICT"))
            .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void register_blankEmail_returns400WithFieldError() throws Exception {
        var body = json.writeValueAsString(
            new RegisterRequest("", "password123", "Alice"));

        mockMvc.perform(post("/api/auth/register")
                .contentType(APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.fieldErrors[0].field").value("email"));
    }

    @Test
    void register_shortPassword_returns400() throws Exception {
        var body = json.writeValueAsString(
            new RegisterRequest("alice@example.com", "short", "Alice"));

        mockMvc.perform(post("/api/auth/register")
                .contentType(APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.fieldErrors[0].field").value("password"));
    }

    // ── login ─────────────────────────────────────────────────────────────

    @Test
    void login_happyPath_returnsOkWithToken() throws Exception {
        registerAndGetToken("bob@example.com");

        var body = json.writeValueAsString(
            new LoginRequest("bob@example.com", "password123"));

        mockMvc.perform(post("/api/auth/login")
                .contentType(APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void login_wrongPassword_returnsUnauthorized() throws Exception {
        registerAndGetToken("bob@example.com");

        var body = json.writeValueAsString(
            new LoginRequest("bob@example.com", "wrongpassword"));

        mockMvc.perform(post("/api/auth/login")
                .contentType(APPLICATION_JSON).content(body))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
    }

    @Test
    void login_unknownEmail_returnsUnauthorized() throws Exception {
        var body = json.writeValueAsString(
            new LoginRequest("ghost@example.com", "password123"));

        mockMvc.perform(post("/api/auth/login")
                .contentType(APPLICATION_JSON).content(body))
            .andExpect(status().isUnauthorized());
    }
}
```

---

## Full Example — RoomControllerTest

```java
package com.collab.api.room;

import com.collab.api.auth.dto.RegisterRequest;
import com.collab.api.room.dto.CreateRoomRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RoomControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper json;

    private String registerAndGetToken(String email) throws Exception {
        var body = json.writeValueAsString(
            new RegisterRequest(email, "password123", "Test User"));
        var result = mockMvc.perform(post("/api/auth/register")
                .contentType(APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andReturn();
        return json.readTree(result.getResponse().getContentAsString())
            .get("token").asText();
    }

    // ── create room ───────────────────────────────────────────────────────

    @Test
    void createRoom_authenticated_returnsCreated() throws Exception {
        var token = registerAndGetToken("alice@example.com");
        var body = json.writeValueAsString(new CreateRoomRequest("Design Room"));

        mockMvc.perform(post("/api/rooms")
                .contentType(APPLICATION_JSON).content(body)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").isNotEmpty())
            .andExpect(jsonPath("$.name").value("Design Room"));
    }

    @Test
    void createRoom_unauthenticated_returns401() throws Exception {
        var body = json.writeValueAsString(new CreateRoomRequest("Design Room"));

        mockMvc.perform(post("/api/rooms")
                .contentType(APPLICATION_JSON).content(body))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void createRoom_blankName_returns400() throws Exception {
        var token = registerAndGetToken("alice@example.com");
        var body = json.writeValueAsString(new CreateRoomRequest(""));

        mockMvc.perform(post("/api/rooms")
                .contentType(APPLICATION_JSON).content(body)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.fieldErrors[0].field").value("name"));
    }

    // ── list rooms ────────────────────────────────────────────────────────

    @Test
    void listRooms_returnsOnlyRoomsUserIsMemberOf() throws Exception {
        var aliceToken = registerAndGetToken("alice@example.com");
        var bobToken = registerAndGetToken("bob@example.com");

        // Alice creates a room; Bob creates a room
        var aliceRoomBody = json.writeValueAsString(new CreateRoomRequest("Alice Room"));
        var bobRoomBody = json.writeValueAsString(new CreateRoomRequest("Bob Room"));

        mockMvc.perform(post("/api/rooms").contentType(APPLICATION_JSON)
                .content(aliceRoomBody).header("Authorization", "Bearer " + aliceToken))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/rooms").contentType(APPLICATION_JSON)
                .content(bobRoomBody).header("Authorization", "Bearer " + bobToken))
            .andExpect(status().isCreated());

        // Alice should only see her own room
        mockMvc.perform(get("/api/rooms")
                .header("Authorization", "Bearer " + aliceToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].name").value("Alice Room"));
    }

    @Test
    void listRooms_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/rooms"))
            .andExpect(status().isUnauthorized());
    }
}
```

---

## Running Tests

```bash
# From the api-server package directory
./mvnw test

# Run a single test class
./mvnw test -Dtest=AuthControllerTest

# Run a single test method
./mvnw test -Dtest=AuthControllerTest#register_duplicateEmail_returnsConflict
```

The Docker Compose Postgres container is started automatically by Spring Boot's Docker Compose integration when the tests boot the application context. No manual `docker compose up` is needed.

---

## What NOT to Test Here

- Internal service method logic in isolation — the API test covers it end-to-end.
- Repository query correctness in isolation — verified by the integration test hitting real Postgres.
- React/frontend components — those belong in the Vitest suite under `packages/client`.
- `@TransactionalEventListener` side effects (email, audit) — test those by removing `@Transactional` from a dedicated test and asserting on the side effect directly.
