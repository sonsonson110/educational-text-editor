# Architecture Roadmap: Spring Boot + Node Yjs

## Architecture Decision: Feature-Sliced (Vertical Slice)

> Full option comparison: [architecture-options.md](./architecture-options.md)

### What Was Chosen

Packages are organized **by business feature first, layers second**. Each feature (`auth/`, `room/`, `user/`, `snapshot/`, etc.) is self-contained and owns its controllers, services, repositories, entities, and DTOs. Shared infrastructure lives in a minimal `shared/` package.

```
com.collab.api/
├── auth/          ← AuthController, AuthService, dto/, event/
├── user/          ← User entity, UserRepository, UserService
├── room/          ← Room, RoomMember, RoomController, RoomService, dto/
├── notification/  ← EmailService, NotificationEventListener
├── snapshot/      ← RoomSnapshot entity, SnapshotController (Phase 5)
└── shared/        ← SecurityConfig, JwtFilter, GlobalExceptionHandler
```

### Why Not Classic Layered

Classic layered (`controller/ service/ repository/` at the top level) is familiar from ASP.NET Core MVC, but it breaks down once cross-cutting features are added. When email, audit logging, or payments are required, every new concern gets injected directly into `AuthService` or `RoomService`, turning them into God objects. The roadmap includes Auth, RBAC, OAuth2, Yjs snapshots, and notifications — the services would become unmanageable under a flat-layer approach.

### Why Not Hexagonal

Full hexagonal (Ports & Adapters) offers maximum infrastructure isolation via inbound/outbound port interfaces, but it demands mastering domain modeling, use-case layers, adapter wiring, and entity-to-domain mapping simultaneously. The overhead slows down learning Spring itself. Hexagonal principles (interface-backed dependencies, domain events) will be adopted selectively as the codebase grows, not enforced from the start.

### How Cross-Cutting Concerns Stay Isolated

Spring's built-in `ApplicationEventPublisher` + `@EventListener` (equivalent to MediatR's `IPublisher`/`INotificationHandler<T>` in .NET) decouples producers from consumers at zero infrastructure cost:

- A feature service **publishes** a typed domain event (e.g., `UserRegisteredEvent`) when something meaningful happens.
- Separate listener components in `notification/`, `audit/`, or `payment/` **subscribe** to those events independently.
- The publishing service has no import or dependency on any listener — new concerns can be added without touching existing code.

For side effects that must only fire after the database transaction commits (e.g., sending email), `@TransactionalEventListener(phase = AFTER_COMMIT)` is used instead of plain `@EventListener`.

### Extensibility Rules

- **Adding a new cross-cutting feature** (email, audit, payment): create a new top-level package, wire it via domain events. Do not inject it into existing services.
- **`shared/` must stay minimal**: only move code there when two or more features genuinely depend on the same thing.
- **Hexagonal port interfaces** can be introduced incrementally for individual features when infrastructure swap becomes a real requirement (e.g., `SnapshotPersistencePort` in Phase 5).

---

## Phase 1: Spring Boot Foundation (REST API & Persistence)

> Detailed iteration plan: [phase-1.md](./phase-1.md)

* **Goal:** Establish the Java backend and migrate user/room identity out of memory.
* **Tasks:**
  * Set up the Feature-Sliced package structure under `com.collab.api`.
  * Define core JPA entities: `User`, `Room`, and `RoomMember`.
  * Implement `POST /auth/register` and `POST /auth/login` with BCrypt password hashing via Spring Security.
  * Implement `GET /rooms`, `POST /rooms`, `GET /rooms/{id}` with basic auth-guard.
  * Wire centralized error handling with `@ControllerAdvice`.
  * Write integration tests for each endpoint.

## Phase 2: Stateless Authentication & Integration (JWT)

> Detailed iteration plan: [phase-2.md](./phase-2.md)

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
