# Architecture Roadmap: Spring Boot + Node Yjs

## Phase 1: Spring Boot Foundation (REST API & Persistence)

* **Goal:** Establish the Java backend and migrate user/room identity out of memory.
* **Tasks:**
  * Initialize the Spring Boot project with Spring Web, Spring Data JPA, and PostgreSQL drivers.
  * Define core JPA Entities: `User`, `Room`, and `RoomMember`.
  * Create standard REST endpoints: `POST /auth/register`, `POST /auth/login`, `GET /rooms`, `POST /rooms`.
  * Implement basic password authentication using Spring Security and BCrypt hashing.

## Phase 2: Stateless Authentication & Integration (JWT)

* **Goal:** Bridge the Spring server and the Node WebSocket server securely.
* **Tasks:**
  * Implement a `OncePerRequestFilter` in Spring to issue and validate JSON Web Tokens (JWTs) upon login.
  * Configure short-lived guest sessions (e.g., tokens with `role=GUEST` that require no database record).
  * Update the Node server to accept JWTs during the initial WebSocket upgrade handshake.
  * Share a symmetric signing secret between Spring and Node so Node can locally verify token authenticity and permissions without making HTTP calls to Spring.

## Phase 3: OAuth2 Integration

* **Goal:** Allow users to authenticate via third-party providers.
* **Tasks:**
  * Integrate Spring Security OAuth2 Client for providers like Google or GitHub.
  * Handle the OAuth2 callback flow within Spring.
  * Design a strategy to link incoming OAuth2 identities to your existing `User` entity records to prevent duplicate accounts.

## Phase 4: Granular Authorization & Permissions

* **Goal:** Enforce document-level access control.
* **Tasks:**
  * Implement a role-based access control (RBAC) model: `VIEWER`, `EDITOR`, `OWNER`.
  * Secure Spring endpoints using method-level security (e.g., `@PreAuthorize("@roomService.canEdit(#roomId, authentication)")`).
  * Create a mechanism to generate and validate signed, expiring share links.
  * Ensure the Node server respects these roles (e.g., opening a read-only Yjs connection for a `VIEWER`).

## Phase 5: Hybrid State Persistence

* **Goal:** Persist Yjs document state to the PostgreSQL database via Spring.
* **Tasks:**
  * Create a `RoomSnapshot` entity in Spring with a `BYTEA` column to store binary data.
  * Configure the Node server to periodically encode the Yjs document state (`Y.encodeStateAsUpdate()`) and POST it to a Spring REST endpoint.
  * On room initialization, have Node fetch the latest binary snapshot from Spring to hydrate the in-memory Yjs document before accepting WebSocket connections.

## Phase 6: Infrastructure & Deployment

* **Goal:** Package the multi-service application for production.
* **Tasks:**
  * Write `Dockerfile` configurations for the React frontend, Node WebSocket server, and Spring Boot application.
  * Orchestrate the services using Docker Compose, including a PostgreSQL container.
  * Expose the application securely using Cloudflare Tunnels to route external traffic to your isolated local network services, eliminating the need for complex port-forwarding while handling HTTPS automatically.
