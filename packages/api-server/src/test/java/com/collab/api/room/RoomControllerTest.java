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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for {@link RoomController}.
 *
 * <p>Each test boots the full Spring context, goes through the Security filter
 * chain, and hits a real PostgreSQL database. {@code @Transactional} rolls back
 * every test automatically — no cleanup scripts needed.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RoomControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper json;

    // ── helpers ───────────────────────────────────────────────────────────────

    /** Registers a fresh user and returns their bearer token. */
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

    // ── POST /api/rooms ───────────────────────────────────────────────────────

    @Test
    void createRoom_authenticated_returnsCreated() throws Exception {
        var token = registerAndGetToken("alice@example.com");
        var body = json.writeValueAsString(new CreateRoomRequest("Design Room"));

        mockMvc.perform(post("/api/rooms")
                        .contentType(APPLICATION_JSON)
                        .content(body)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.name").value("Design Room"))
                .andExpect(jsonPath("$.ownerId").isNotEmpty());
    }

    @Test
    void createRoom_unauthenticated_returns401() throws Exception {
        var body = json.writeValueAsString(new CreateRoomRequest("Design Room"));

        // No Authorization header — security filter chain must reject this
        mockMvc.perform(post("/api/rooms")
                        .contentType(APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createRoom_blankName_returns400WithFieldError() throws Exception {
        var token = registerAndGetToken("alice@example.com");
        var body = json.writeValueAsString(new CreateRoomRequest(""));

        mockMvc.perform(post("/api/rooms")
                        .contentType(APPLICATION_JSON)
                        .content(body)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("name"));
    }

    // ── GET /api/rooms ────────────────────────────────────────────────────────

    @Test
    void listRooms_returnsOnlyRoomsUserIsMemberOf() throws Exception {
        var aliceToken = registerAndGetToken("alice@example.com");
        var bobToken = registerAndGetToken("bob@example.com");

        // Alice creates her room
        mockMvc.perform(post("/api/rooms")
                        .contentType(APPLICATION_JSON)
                        .content(json.writeValueAsString(new CreateRoomRequest("Alice Room")))
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isCreated());

        // Bob creates his room
        mockMvc.perform(post("/api/rooms")
                        .contentType(APPLICATION_JSON)
                        .content(json.writeValueAsString(new CreateRoomRequest("Bob Room")))
                        .header("Authorization", "Bearer " + bobToken))
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

    // ── GET /api/rooms/{id} ───────────────────────────────────────────────────

    @Test
    void getRoomById_memberCanAccess_returnsOk() throws Exception {
        var token = registerAndGetToken("alice@example.com");

        // Create a room and capture its ID
        var createResult = mockMvc.perform(post("/api/rooms")
                        .contentType(APPLICATION_JSON)
                        .content(json.writeValueAsString(new CreateRoomRequest("Alice Room")))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andReturn();
        var roomId = json.readTree(createResult.getResponse().getContentAsString())
                .get("id").asText();

        mockMvc.perform(get("/api/rooms/" + roomId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(roomId))
                .andExpect(jsonPath("$.name").value("Alice Room"));
    }

    @Test
    void getRoomById_nonMemberGetsForbidd() throws Exception {
        var aliceToken = registerAndGetToken("alice@example.com");
        var bobToken = registerAndGetToken("bob@example.com");

        // Alice creates a room
        var createResult = mockMvc.perform(post("/api/rooms")
                        .contentType(APPLICATION_JSON)
                        .content(json.writeValueAsString(new CreateRoomRequest("Alice Room")))
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isCreated())
                .andReturn();
        var roomId = json.readTree(createResult.getResponse().getContentAsString())
                .get("id").asText();

        // Bob (not a member) should get 403
        mockMvc.perform(get("/api/rooms/" + roomId)
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void getRoomById_unknownRoom_returns404() throws Exception {
        var token = registerAndGetToken("alice@example.com");

        mockMvc.perform(get("/api/rooms/00000000-0000-0000-0000-000000000000")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void getRoomById_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/rooms/00000000-0000-0000-0000-000000000000"))
                .andExpect(status().isUnauthorized());
    }
}
