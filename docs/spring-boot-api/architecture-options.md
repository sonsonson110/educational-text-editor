# Spring Boot API Server — Architecture Options

> **Context:** Spring Boot 3.x · Java 17 · Spring Data JPA · Spring Security · PostgreSQL
> The project is a collaborative text-editor platform. The roadmap adds Auth, RBAC, OAuth2, Yjs snapshot persistence, and eventually cross-cutting concerns like email notifications, audit events, and potentially payments.

---

## The Core Problem You Already Identified

Classic layered architecture (`controller → service → repository`) breaks down when you add cross-cutting features because **every new concern bleeds into `UserService` or `RoomService`**:

```
UserService.register()
  └─ save user                     ← persistence
  └─ sendWelcomeEmail()            ← email concern
  └─ publishUserRegisteredEvent()  ← event concern
  └─ createFreeTrial()             ← payment concern
  └─ auditLog()                    ← audit concern
```

Each option below addresses this differently.

---

## Option A — Classic Layered (What You Know)

```
com.collab.api
├── controller/
│   ├── AuthController.java
│   └── RoomController.java
├── service/
│   ├── AuthService.java
│   └── RoomService.java
├── repository/
│   ├── UserRepository.java
│   └── RoomRepository.java
├── entity/
│   ├── User.java
│   └── Room.java
├── dto/
│   ├── request/
│   └── response/
└── config/
    └── SecurityConfig.java
```

**How cross-cutting concerns get added (the problem):**
- Email → injected into `AuthService`, `RoomService`, etc.
- Events → scattered across multiple services
- Payments → another injected dependency into multiple services

| ✅ Pros | ❌ Cons |
|---|---|
| Familiar from ASP.NET Core | Services become God objects |
| Minimal boilerplate | Poor separation of concerns at scale |
| Easy to find files | Hard to test individual concerns in isolation |
| Works fine for CRUD | Cross-cutting concerns cause tight coupling |

**Verdict:** Fine as a starting point, collapses under complexity. Not recommended if you want the codebase to stay clean beyond Phase 3.

---

## Option B — Feature-Sliced / Vertical Slice ⭐ Recommended

Organize by **business feature (domain module)** first, layers second. Each feature is self-contained.

```
com.collab.api
├── auth/
│   ├── AuthController.java
│   ├── AuthService.java
│   ├── AuthRepository.java          (or reuse user/)
│   ├── dto/
│   │   ├── LoginRequest.java
│   │   └── TokenResponse.java
│   └── event/
│       └── UserRegisteredEvent.java
├── room/
│   ├── RoomController.java
│   ├── RoomService.java
│   ├── RoomRepository.java
│   ├── RoomMemberRepository.java
│   ├── entity/
│   │   ├── Room.java
│   │   └── RoomMember.java
│   └── dto/
├── user/
│   ├── UserService.java             ← only user identity concerns
│   ├── UserRepository.java
│   └── entity/
│       └── User.java
├── notification/                    ← isolated cross-cutting module
│   ├── EmailService.java
│   └── template/
├── snapshot/                        ← Yjs persistence (Phase 5)
│   ├── SnapshotController.java
│   ├── SnapshotService.java
│   └── entity/
│       └── RoomSnapshot.java
└── shared/                          ← truly shared utilities
    ├── config/
    │   └── SecurityConfig.java
    ├── exception/
    │   └── GlobalExceptionHandler.java
    └── security/
        └── JwtFilter.java
```

**How cross-cutting concerns are added (the solution):**

Cross-cutting features become **their own module** + **Spring Application Events** decouple them:

```java
// In AuthService — only knows about auth, publishes an event
@Service
public class AuthService {
    private final ApplicationEventPublisher eventPublisher;

    public TokenResponse register(RegisterRequest req) {
        User user = /* save user */;
        eventPublisher.publishEvent(new UserRegisteredEvent(user.getId(), user.getEmail()));
        return /* token */;
    }
}

// In NotificationService — listens, completely decoupled
@Component
public class NotificationEventListener {

    @EventListener          // sync, same transaction
    // @TransactionalEventListener(phase = AFTER_COMMIT)  // async, after commit
    public void onUserRegistered(UserRegisteredEvent event) {
        emailService.sendWelcome(event.email());
    }
}

// In AuditService — another listener, AuthService never knows it exists
@Component
public class AuditEventListener {
    @TransactionalEventListener(phase = AFTER_COMMIT)
    public void onUserRegistered(UserRegisteredEvent event) {
        auditRepository.log("USER_REGISTERED", event.userId());
    }
}
```

This is the **Spring-idiomatic** way to handle this. `ApplicationEventPublisher` is built into the framework — no extra dependencies.

| ✅ Pros | ❌ Cons |
|---|---|
| Features are self-contained | Slightly more directories upfront |
| Cross-cutting concerns fully decoupled via events | Requires discipline in what goes in `shared/` |
| Easy to delete/extract a module | Event-driven flow can be harder to trace (use logging) |
| Services stay lean | — |
| Natural fit for Spring's `@EventListener` | — |
| Scales to microservices (extract a feature = a service) | — |

---

## Option C — Hexagonal Architecture (Ports & Adapters)

The most strict separation. Used at scale or when you anticipate swapping infrastructure (e.g., switching from JPA to MongoDB, or from REST to gRPC).

```
com.collab.api
└── room/
    ├── domain/
    │   ├── Room.java                        ← pure domain object (no JPA annotations)
    │   └── RoomService.java                 ← domain logic, no framework imports
    ├── application/
    │   ├── port/
    │   │   ├── in/
    │   │   │   └── CreateRoomUseCase.java   ← interface (inbound port)
    │   │   └── out/
    │   │       └── RoomPersistencePort.java ← interface (outbound port)
    │   └── RoomApplicationService.java      ← implements use case, calls ports
    └── adapter/
        ├── in/
        │   └── web/
        │       └── RoomController.java      ← REST adapter
        └── out/
            └── persistence/
                ├── RoomJpaRepository.java
                ├── RoomEntity.java          ← JPA entity (separate from domain)
                └── RoomPersistenceAdapter.java
```

| ✅ Pros | ❌ Cons |
|---|---|
| Maximum isolation of domain logic | Significant boilerplate (mappers, adapters, interfaces everywhere) |
| Infrastructure fully swappable | Steep learning curve if new to Spring |
| Domain is framework-agnostic | Can feel over-engineered for this scale |
| Textbook testability | — |

**Verdict:** Excellent architecture to *learn*, but overkill for this project right now. Better to adopt its principles gradually inside Option B.

---

## Recommendation: Option B (Feature-Sliced) with Hexagonal Principles Where It Counts

### Why B over A
Your roadmap already has 6 phases adding auth, OAuth, RBAC, snapshots, email, and events. Classic layered will accumulate coupling fast. Feature-sliced keeps each phase self-contained.

### Why B over C
You're learning Spring. Full hexagonal requires mastering domain modeling, use cases, ports, adapters, and mapping layers simultaneously. You'll spend more time on boilerplate than learning Spring itself. Start with B, apply hexagonal thinking selectively (e.g., introduce a `SnapshotPersistencePort` interface when you add the snapshot feature).

### Key Spring Mechanisms to Learn Along the Way

| Mechanism | Purpose | When You'll Need It |
|---|---|---|
| `ApplicationEventPublisher` + `@EventListener` | Decouple cross-cutting concerns | Email, audit, Yjs events |
| `@TransactionalEventListener` | Fire events only after DB commit succeeds | Any event that triggers side effects |
| `@Async` + `ThreadPoolTaskExecutor` | Run non-critical work (email) off the main thread | Notification module |
| Spring Security `@PreAuthorize` | Method-level RBAC | Phase 4 |
| `OncePerRequestFilter` | JWT validation per request | Phase 2 |
| Spring Data Projections / DTOs | Avoid leaking entities to the API | All phases |
| `@ControllerAdvice` / `@ExceptionHandler` | Centralised error responses | Phase 1 |
| `@ConfigurationProperties` | Type-safe config binding (JWT secret, mail host, etc.) | Phase 2+ |

---

## Proposed Package Layout to Start With (Phase 1–2)

```
src/main/java/com/collab/api/
├── auth/
│   ├── AuthController.java
│   ├── AuthService.java
│   ├── dto/
│   │   ├── LoginRequest.java
│   │   ├── RegisterRequest.java
│   │   └── TokenResponse.java
│   └── event/
│       └── UserRegisteredEvent.java        ← record, published on register
├── user/
│   ├── User.java                           ← JPA entity
│   ├── UserRepository.java
│   └── UserService.java                    ← find/update user profile only
├── room/
│   ├── Room.java
│   ├── RoomMember.java
│   ├── RoomRepository.java
│   ├── RoomMemberRepository.java
│   ├── RoomController.java
│   ├── RoomService.java
│   └── dto/
├── notification/                           ← add this before Phase 3 OAuth
│   ├── EmailService.java
│   └── NotificationEventListener.java
└── shared/
    ├── config/
    │   ├── SecurityConfig.java
    │   └── AsyncConfig.java
    ├── exception/
    │   ├── ApiException.java
    │   └── GlobalExceptionHandler.java
    └── security/
        ├── JwtFilter.java
        ├── JwtService.java
        └── JwtProperties.java             ← @ConfigurationProperties
```

> [!TIP]
> The `shared/` package should be **minimal and stable**. If something is only used by one feature, keep it inside that feature's package. Only move to `shared/` when two or more features genuinely need it.

> [!IMPORTANT]
> **ASP.NET Core mapping:** `@ControllerAdvice` ≈ global exception middleware · `@ConfigurationProperties` ≈ `IOptions<T>` · `@EventListener` ≈ `INotificationHandler<T>` (MediatR) · `ApplicationEventPublisher` ≈ `IPublisher` (MediatR) · Spring's `JpaRepository` ≈ EF Core's `DbSet<T>` with repository abstraction.

---

## When to Revisit This Architecture

| Trigger | Action |
|---|---|
| A service imports from 3+ other feature packages | Consider introducing domain events between them |
| Email/audit logic appears inside feature services | Move to dedicated listeners in `notification/` |
| You need to swap PostgreSQL for another store | Introduce a persistence port interface for that feature |
| You want to add a payment feature | Add `payment/` as a self-contained module, wire via events |
| The app needs to scale horizontally | Replace in-process `ApplicationEventPublisher` with Spring for RabbitMQ or Kafka |
