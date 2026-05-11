---
trigger: always_on
---

# Spring Boot API Testing

Every new controller endpoint must have a corresponding `@SpringBootTest` + `MockMvc` integration test before the work is considered complete. The rules below are non-negotiable.

## Test stack — never deviate from this

- `@SpringBootTest` — full application context, no slices (`@WebMvcTest` is forbidden)
- `@AutoConfigureMockMvc` — wires `MockMvc` automatically
- `@Transactional` on the test class — every `@Test` auto-rolls back, no cleanup scripts needed
- Real PostgreSQL via Spring Boot Docker Compose integration — no H2, no in-memory databases
- `MockMvc` + `jsonPath()` for assertions — no `RestTemplate`, no `WebTestClient`

## Minimum coverage per endpoint

Every controller method must have tests for all four of these scenarios:

1. **Happy path** — valid input, authenticated if required, asserts correct HTTP status and response fields
2. **Validation failure** — blank or malformed required field → `400` with `fieldErrors` array in body
3. **Auth guard** — no `Authorization` header → `401`
4. **Domain error** — trigger the relevant `ApiException` (duplicate → `409`, not found → `404`, etc.)

If any of the four is not applicable (e.g. a public endpoint has no auth guard), explicitly note why in a comment rather than silently omitting it.

## File placement

```
src/test/java/com/collab/api/
  auth/
    AuthControllerTest.java        ← one file per controller
  room/
    RoomControllerTest.java
```

One test class per controller. No shared abstract base classes.

## Naming convention

```
<action>_<condition>_<expectedOutcome>
```

Examples:
- `register_happyPath_returnsCreatedWithToken`
- `register_duplicateEmail_returnsConflict`
- `createRoom_unauthenticated_returns401`
- `listRooms_authenticated_returnsOnlyMemberRooms`

## Boilerplate every test class must include

```java
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class XxxControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper json;

    // Helper — register a user and return the auth token.
    // Every test class that needs authentication copies this method.
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
}
```

## Passing auth to protected endpoints

```java
mockMvc.perform(post("/api/rooms")
        .contentType(APPLICATION_JSON)
        .content(body)
        .header("Authorization", "Bearer " + token))
    .andExpect(status().isCreated());
```

## What is NOT permitted

- `@WebMvcTest` — skips the security filter chain, misses auth bugs
- H2 or any in-memory database — dialect differences hide real Postgres bugs
- Mocking the service layer with `@MockBean` inside these tests — defeats the purpose of integration testing; if you need to test a service method in isolation, write a separate plain JUnit test with no Spring context
- Skipping the `@Transactional` annotation and manually truncating tables — fragile and order-dependent
- `@BeforeEach` database seeding shared across tests — each test must set up only what it needs

## The @Transactional caveat

`@Transactional` on the test class prevents `@TransactionalEventListener(phase = AFTER_COMMIT)` listeners from firing (they listen for commits that never happen). This is intentional — welcome emails and audit events should not fire during tests. When you specifically need to test a post-commit listener, remove `@Transactional` from that test method only and clean up with `@Sql` or `@AfterEach`.

## Running tests

```bash
./mvnw test                                              # all tests
./mvnw test -Dtest=AuthControllerTest                    # single class
./mvnw test -Dtest=AuthControllerTest#register_*         # method pattern
```

## Reference

Full documentation and worked examples: `docs/spring-boot-api/testing.md`