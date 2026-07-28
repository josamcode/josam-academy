# 09 — System Architecture

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 09 — System Architecture |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | `07-business-logic.md`, `08-system-design.md` |
| **Feeds Into** | `10-database-design.md`, `11-api-contract.md`, `13-tech-stack.md`, `15-implementation-roadmap.md`, `16-task-breakdown.md` |
| **Adds** | `BR-894` – `BR-948` · `DEC-23` – `DEC-28` |

---

## 1. Architectural Style

### 1.1 Decision: Modular Monolith

One deployable backend, internally partitioned into domain modules with enforced boundaries.

**Why not microservices:**

| Factor | Reality |
|---|---|
| Team size | One person (`CON-01`). Distributed systems require distributed operations. |
| Hardware | 2 vCPU (`CON-03`). Service overhead would consume more CPU than application work. |
| Budget | $30/month (`CON-02`). Service meshes, message brokers, and multiple databases each carry cost. |
| Traffic | ~100–500 learners. A single process handles this with wide margin. |
| Failure surface | Every network hop is a new failure mode to handle and debug alone. |

**Why not a plain monolith:**
Without enforced boundaries, a codebase of 220 features becomes a dependency tangle within a year. Every change then risks unrelated breakage, and extraction later requires a rewrite.

The modular monolith gets single-process simplicity **and** the option to extract later.

### 1.2 When to Revisit

Documented so the decision is revisited on evidence, not instinct.

| Signal | Threshold | Response |
|---|---|---|
| Sustained CPU | > 80% for a week at normal load | Vertical scale first (4 vCPU) |
| Concurrent learners | > 2,000 | Separate the Next.js and API containers onto distinct hosts |
| AI workload | Embedding or inference saturating the queue | Extract `ai` to its own service (§10) |
| Deploy risk | Unrelated features breaking on each release | Investigate boundary violations before splitting |
| Team size | > 3 engineers | Reconsider service boundaries |

- `BR-894` — Architecture is not changed on aesthetic preference. Each threshold above requires measured evidence before acting.

---

## 2. Layering

### 2.1 Backend Layers

```
┌──────────────────────────────────────────────┐
│ HTTP LAYER                                   │
│ Controllers · DTOs · Guards · Interceptors   │
│ Knows: HTTP. Knows nothing about persistence.│
├──────────────────────────────────────────────┤
│ APPLICATION LAYER                            │
│ Services · Use cases · Orchestration         │
│ Knows: business rules. Knows nothing of HTTP.│
├──────────────────────────────────────────────┤
│ DOMAIN LAYER                                 │
│ Entities · Value objects · Domain rules      │
│ Knows: the business. Knows nothing else.     │
├──────────────────────────────────────────────┤
│ INFRASTRUCTURE LAYER                         │
│ Repositories · Provider adapters · Queue     │
│ Knows: the outside world.                    │
└──────────────────────────────────────────────┘
```

**Direction of dependency: downward only.**

| Rule | ID |
|---|---|
| Controllers never access repositories directly | `BR-895` |
| Services never import HTTP types (`Request`, `Response`) | `BR-896` |
| Domain entities never import Prisma or any ORM type | `BR-897` |
| Repositories never contain business rules | `BR-898` |
| Provider adapters are the only code importing vendor SDKs | `BR-899` |

### 2.2 Prohibited Patterns

| Anti-pattern | Why prohibited |
|---|---|
| Business logic in a controller | Untestable without HTTP; duplicated across endpoints |
| Prisma client in a service | Couples business rules to the ORM; blocks scope enforcement |
| Cross-module table access | Breaks the boundary that makes extraction possible (`BR-838`) |
| Circular module dependency | Makes reasoning and extraction impossible |
| Business logic in Next.js | Duplicates rules across two runtimes; drifts immediately (`BR-836`) |
| Permission checks in the frontend | Client checks are advisory only (`BR-843`) |
| Direct SDK import outside `providers/` | Blocks vendor replacement (`BR-851`) |

- `BR-900` — These patterns are enforced by automated checks (§11), not by review discipline alone. Discipline fails under deadline pressure.

---

## 3. Module Dependency Graph

### 3.1 Tiers

Modules are assigned tiers. **A module may only depend on modules in a lower tier.** This makes cycles structurally impossible.

```
TIER 0 — PLATFORM KERNEL (no domain knowledge)
┌────────────────────────────────────────────────────────┐
│ common · database · events · queue · providers ·       │
│ i18n · settings · audit                                │
└────────────────────────────────────────────────────────┘
                          ▲
TIER 1 — IDENTITY         │
┌─────────────────────────┴──────────────────────────────┐
│ identity (M01)  ──▶  access (M02)                      │
└────────────────────────────────────────────────────────┘
                          ▲
TIER 2 — ENTITLEMENTS     │
┌─────────────────────────┴──────────────────────────────┐
│ entitlements (M04)                                     │
└────────────────────────────────────────────────────────┘
                          ▲
TIER 3 — CONTENT & COMMERCE                              │
┌─────────────────────────┴──────────────────────────────┐
│ content (M05)      commerce (M03)      protection (M13)│
└────────────────────────────────────────────────────────┘
                          ▲
TIER 4 — LEARNING         │
┌─────────────────────────┴──────────────────────────────┐
│ learning (M06)  ·  assessment (M08)  ·  ai (M10)       │
└────────────────────────────────────────────────────────┘
                          ▲
TIER 5 — DERIVED          │
┌─────────────────────────┴──────────────────────────────┐
│ motivation (M07) · certification (M09) · qa (M11) ·    │
│ reviews (M12)                                          │
└────────────────────────────────────────────────────────┘
                          ▲
TIER 6 — COMPOSITION      │
┌─────────────────────────┴──────────────────────────────┐
│ support (M15) · administration (M16)                   │
└────────────────────────────────────────────────────────┘

TIER ∞ — EVENT CONSUMERS (depend on nothing, listen to everything)
┌────────────────────────────────────────────────────────┐
│ messaging (M14)  ·  analytics (M17)                    │
└────────────────────────────────────────────────────────┘
```

### 3.2 Explicit Dependency Matrix

| Module | May depend on |
|---|---|
| `identity` | Tier 0 |
| `access` | Tier 0, `identity` |
| `entitlements` | Tier 0, `identity` |
| `content` | Tier 0, `identity` (ownership only) |
| `commerce` | Tier 0, `identity`, `entitlements` |
| `protection` | Tier 0, `identity`, `entitlements`, `content` |
| `learning` | Tier 0, `identity`, `entitlements`, `content` |
| `assessment` | Tier 0, `identity`, `content`, `learning` |
| `ai` | Tier 0, `identity`, `entitlements`, `content`, `learning` |
| `motivation` | Tier 0, `identity`, `learning` |
| `certification` | Tier 0, `identity`, `entitlements`, `learning`, `assessment` |
| `qa` | Tier 0, `identity`, `content`, `ai` |
| `reviews` | Tier 0, `identity`, `entitlements`, `learning` |
| `support` | Tier 0, `identity`, `entitlements`, `commerce`, `protection` |
| `administration` | Tier 0, all modules (composition layer) |
| `messaging` | Tier 0 **only** — consumes events |
| `analytics` | Tier 0 **only** — consumes events |

- `BR-901` — A module importing from a module not listed in its row is a build failure, enforced automatically (§11).
- `BR-902` — `administration` is the only module permitted to depend broadly. It composes; it owns no domain logic of its own.

### 3.3 `DEC-23` — Analytics Reads Nothing

`analytics` (M17) does **not** query other modules' tables, and does not call their services on the request path.

Instead it maintains **its own read-model tables**, populated two ways:

```
1. EVENT PROJECTION  (real-time)
   order.paid          → revenue_daily
   lesson.completed    → completion_daily, dropoff_lesson
   session.recorded    → engagement_daily
   ai.request_completed→ ai_usage_daily

2. SCHEDULED AGGREGATION  (batch, off-peak)
   Nightly jobs call module public interfaces to reconcile
   projections against source data (BR-877).
```

**Why:** analytics is the module most tempted to reach across boundaries, because reporting naturally spans domains. Allowing it would make every other boundary meaningless.

- `BR-903` — Analytics never joins across another module's tables. Its queries touch only its own read models.
- `BR-904` — Read models are eventually consistent by design. Reports are dated ("as of 14:00") rather than pretending to be live.
- `BR-905` — Read models are fully rebuildable from source data. A projection bug is a re-run, not a data-loss event.

### 3.4 `DEC-24` — Messaging Is Purely Reactive

`messaging` (M14) has **zero inbound dependencies from other modules**. No module calls "send email."

```
WRONG:  commerce.service → messaging.sendPurchaseEmail()
RIGHT:  commerce.service → events.publish('order.paid')
                              ↓
                         messaging listens → sends
```

**Why:** it inverts the dependency. Adding a new notification requires touching only `messaging`. Removing one never breaks the publisher.

- `BR-906` — No module imports `messaging`. Communication is exclusively via domain events (`BR-839`).
- `BR-907` — A messaging failure never fails the originating operation. A purchase succeeds even if the confirmation email fails (`BR-842`).

---

## 4. Communication Patterns

### 4.1 Choosing Between Synchronous and Event

| Use synchronous interface call | Use domain event |
|---|---|
| The caller needs the result to proceed | The caller does not care about the outcome |
| It is a query | It is a notification of something that happened |
| It must be transactional | Eventual consistency is acceptable |
| The dependency is downward in tier | The consumer is at a higher or equal tier |

**Examples:**

```
SYNCHRONOUS (downward, result needed)
  learning → entitlements.hasAccess(userId, courseId)
  learning → content.getLessonStructure(courseId)
  ai       → entitlements.consumeQuota(userId, 1)

EVENT (upward or lateral, fire and forget)
  learning  publishes  lesson.completed
    → motivation   updates streak, evaluates milestone
    → certification checks eligibility
    → analytics    projects completion metrics
    → messaging    may send a milestone notification
```

- `BR-908` — A module never calls upward in tier. If it needs to, the direction is wrong and an event is the correct mechanism.
- `BR-909` — Domain events carry identifiers and a minimal payload, never full entities. Consumers fetch what they need through public interfaces.

### 4.2 Event Contract

```ts
interface DomainEvent<T> {
  id: string;            // idempotency key
  name: string;          // 'order.paid'
  occurredAt: Date;
  actorId: string | null;
  payload: T;            // ids + minimal scalars
  version: number;       // schema version
}
```

- `BR-910` — Every event carries a unique `id` used by consumers for idempotency (`BR-841`).
- `BR-911` — Events are versioned. A payload change increments the version; consumers handle both until migration completes.
- `BR-912` — Events are persisted before dispatch. An in-memory-only event bus loses work on restart.

### 4.3 Transactional Boundaries

```
Database transaction wraps:
  ├─ the state change
  └─ the event record insert         ← same transaction (outbox pattern)

After commit:
  └─ dispatcher publishes to the queue
```

- `BR-913` — Events use the transactional outbox pattern. Publishing outside the transaction produces events for state changes that later roll back.
- `BR-914` — A transaction never spans modules. Cross-module consistency is achieved through events, not distributed transactions.

---

## 5. Data Flow Patterns

### 5.1 Read Path (Learner Views a Lesson)

```
GET /api/lessons/:id
  │
  ├─ AuthGuard            → resolve actor
  ├─ PermissionGuard      → lesson:read
  ├─ ScopeInterceptor     → apply .own filters if applicable
  │
  ├─ LessonController.findOne()
  │    └─ LearningService.getLessonForLearner(lessonId, actor)
  │         ├─ content.getLesson(lessonId)              [Tier 3, sync]
  │         ├─ entitlements.resolve(actor.id)           [Tier 2, sync, cached]
  │         ├─ unlockEngine.evaluate(lesson, progress)  [internal]
  │         └─ progress.getPosition(actor.id, lessonId) [internal]
  │
  ├─ CapabilityInterceptor → compute _can + _reason      (BR-844)
  └─ Serializer            → strip internal fields
```

- `BR-915` — Capability computation is a single interceptor applied to every response, never written per endpoint.
- `BR-916` — Entitlement resolution is cached in Redis with a 15-minute TTL, invalidated on change (`BR-849`).

### 5.2 Write Path (Purchase Completes)

```
POST /api/webhooks/paymob
  │
  ├─ Signature verification                         (BR-838 family)
  ├─ Idempotency check on event id                  (BR-096)
  ├─ Enqueue to `critical` queue → respond 200 immediately
  │
  └─ WORKER
       └─ TRANSACTION:
            ├─ order.status = paid
            ├─ transaction record written
            └─ outbox: order.paid                   (BR-913)
          COMMIT
            ↓
       DISPATCH order.paid
            ├─ entitlements  → grant (idempotent)
            ├─ commerce      → generate invoice
            ├─ messaging     → confirmation email
            └─ analytics     → project revenue
```

- `BR-917` — Webhooks acknowledge immediately and process asynchronously. A slow handler causes gateway retries and duplicate processing.

### 5.3 Query Scoping

Scoping is applied by a repository decorator, not by controllers.

```ts
@Scoped('course')
async findMany(actor: Actor, filters: CourseFilters) {
  // decorator injects:
  //   actor has course:read.any  → no filter
  //   actor has course:read.own  → { ownerId: actor.id }
  //   actor has neither          → returns []
}
```

- `BR-918` — Every repository method touching an ownable resource carries the scope decorator. A method without it fails an automated check (§11).
- `BR-919` — A scoped query returning nothing produces an empty state, never a `403` (`BR-699`).

---

## 6. Shared Kernel

The set of code every module may import. Kept deliberately small — a large shared kernel is a monolith wearing a modular costume.

| Package | Contents | May contain business logic? |
|---|---|---|
| `common` | Result types, errors, guards, decorators, utilities | ✘ |
| `database` | Prisma client, scope decorators, transaction helpers | ✘ |
| `events` | Event bus, outbox, base types | ✘ |
| `queue` | BullMQ setup, job base classes | ✘ |
| `providers` | Payment, Video, AI, Storage, Email, SMS interfaces | ✘ |
| `i18n` | Bilingual field helpers, locale utilities | ✘ |
| `settings` | Settings registry reader with caching | ✘ |
| `audit` | Audit log writer | ✘ |

- `BR-920` — The shared kernel contains **no domain logic**. Anything expressing a business rule belongs to a module.
- `BR-921` — Adding to the shared kernel is a deliberate decision. The default answer is "put it in the module that needs it."

---

## 7. Frontend Architecture

### 7.1 Next.js Structure

```
apps/web/
├── app/
│   ├── (public)/          landing · catalog · course · verify · legal
│   ├── (auth)/            login · register · onboarding
│   ├── (learner)/         dashboard · course · lesson · notes · settings
│   ├── (admin)/           admin surfaces, gated by admin:access
│   └── api/               BFF proxy only — no business logic
├── components/
│   ├── ui/                primitives built on design tokens
│   ├── learner/           dashboard, player, notes, AI panel
│   └── admin/             tables, forms, queues
├── lib/
│   ├── api/               typed client generated from the API contract
│   ├── auth/              session handling
│   └── i18n/              translation loading, direction
└── styles/                token consumption, global styles
```

- `BR-922` — `app/api/` is a thin proxy for cookie handling and nothing else. It never contains business rules (`BR-836`).
- `BR-923` — Route groups are code-split so learner bundles never include admin code (`BR-463`).

### 7.2 State Management

| State type | Mechanism |
|---|---|
| Server data | TanStack Query — caching, invalidation, optimistic updates |
| UI state | React local state |
| Global preferences (theme, language) | Context, hydrated server-side |
| Forms | React Hook Form + Zod, schemas shared with the API |
| Player state | Dedicated context scoped to the player |

- `BR-924` — No global state store (Redux/Zustand) for server data. Server state belongs to the query layer; duplicating it into a store creates two sources of truth.
- `BR-925` — Validation schemas are shared between frontend and API from a monorepo package. Divergent validation is a guaranteed defect class.

### 7.3 Capability-Driven Rendering

```tsx
// Correct — renders from the server-computed capability map
{course._can.publish && <PublishButton />}

// Prohibited — client-side permission reasoning
{user.role === 'instructor' && <PublishButton />}
```

- `BR-926` — Components never reason about roles. They read `_can` (`BR-705`).
- `BR-927` — `_reason` drives the message shown for a `false` capability; `PERMISSION_ABSENT` renders nothing (`BR-707`).

---

## 8. Mobile Architecture

```
apps/mobile/
├── app/                   Expo Router — file-based routing
├── components/            mirrors web component taxonomy
├── lib/
│   ├── api/               same generated client as web
│   ├── auth/              secure token storage
│   ├── offline/           action queue for reconnection replay
│   └── player/            native playback + protection bindings
└── native/                FLAG_SECURE, capture detection, push
```

- `BR-928` — Mobile consumes the same generated API client and the same shared packages as web (`BR-551`).
- `BR-929` — Platform-specific code is confined to `native/`. Business logic is never duplicated per platform (`BR-552`).
- `BR-930` — The offline queue replays actions on reconnection; completion remains monotonic (`BR-563`).

---

## 9. Monorepo Structure

```
josam-academy/
├── apps/
│   ├── api/               NestJS
│   ├── web/               Next.js (learner + admin)
│   └── mobile/            React Native
├── packages/
│   ├── contracts/         API types, DTOs, Zod schemas
│   ├── abilities/         CASL definitions (BR-708)
│   ├── ui/                component library (BR-1524, BR-1575)
│   ├── tokens/            design tokens (BR-545)
│   ├── i18n/              shared translation catalogs
│   └── config/            shared tsconfig, eslint, stylelint, prettier
├── docs/                  this documentation set
└── .github/workflows/     CI (BR-885)
```

**`DEC-25` — Turborepo with pnpm workspaces.** Chosen for build caching and dependency deduplication; on a single-developer project the deciding factor is that shared packages update everywhere at once, with no publish step.

- `BR-931` — `packages/contracts` is the single source of truth for API types. Both API and clients derive from it; neither hand-writes types.
- `BR-932` — CI builds all apps from the monorepo. A change to a shared package triggers rebuilds of everything depending on it.

---

## 10. Extraction Path

If a module must become a separate service, this is how it happens without a rewrite. The boundaries in §3 exist specifically to make this possible.

### 10.1 Extraction Order

| Order | Module | Why it extracts first |
|---|---|---|
| 1 | `ai` | Heaviest CPU and I/O; few inbound dependencies; naturally asynchronous |
| 2 | `analytics` | Already event-fed with its own tables (`DEC-23`); zero inbound dependencies |
| 3 | `messaging` | Purely reactive (`DEC-24`); zero inbound dependencies |
| 4 | `content` + media | Only if authoring volume grows dramatically |

**`DEC-26` — Nothing is extracted before the thresholds in §1.2 are measured.** Premature extraction adds operational cost with no benefit.

### 10.2 Extraction Steps

```
1. The module already communicates only via its public interface and events
2. Replace the in-process interface with an HTTP or gRPC client
   → the calling code does not change; only the implementation behind the
     interface does
3. Move the module's tables to its own database
   → possible only because no other module queries them (BR-838)
4. Deploy separately
5. Events already flow through the queue — no change required
```

- `BR-933` — If extraction would require changing calling code, a boundary has been violated. That is the signal to fix the boundary, not to abandon extraction.

---

## 11. Architectural Fitness Functions

`DEC-27` — Boundaries are enforced by automated checks in CI, not by review discipline (`BR-900`).

| Check | Tool | Enforces |
|---|---|---|
| Module import boundaries | `eslint-plugin-boundaries` | `BR-901` |
| No circular dependencies | `dependency-cruiser` | Tier model |
| Layer direction | `dependency-cruiser` | `BR-895`–`BR-898` |
| No vendor SDK outside `providers/` | ESLint no-restricted-imports | `BR-899` |
| No Prisma outside repositories | ESLint no-restricted-imports | `BR-897` |
| Scope decorator present | Custom lint rule | `BR-918` |
| No hardcoded user-facing strings | Custom lint rule | `BR-523` |
| No raw color values in components | Stylelint | `BR-545` |
| No physical CSS direction properties | Stylelint | `BR-527` |
| Prohibited copy terms | Custom check on i18n catalogs | `BR-811` |
| No `localStorage` for tokens | ESLint no-restricted-syntax | `BR-855` |
| Migration is expand-only | Custom migration check | `BR-888` |

**Example boundary configuration:**

```js
// .eslintrc — boundaries
{
  "settings": {
    "boundaries/elements": [
      { "type": "kernel",       "pattern": "src/shared/*" },
      { "type": "identity",     "pattern": "src/modules/identity" },
      { "type": "entitlements", "pattern": "src/modules/entitlements" },
      { "type": "content",      "pattern": "src/modules/content" },
      { "type": "learning",     "pattern": "src/modules/learning" }
    ]
  },
  "rules": {
    "boundaries/element-types": ["error", {
      "default": "disallow",
      "rules": [
        { "from": "learning", "allow": ["kernel", "identity", "entitlements", "content"] },
        { "from": "content",  "allow": ["kernel", "identity"] },
        { "from": "messaging","allow": ["kernel"] },
        { "from": "analytics","allow": ["kernel"] }
      ]
    }]
  }
}
```

- `BR-934` — A boundary violation fails the build. It is not a warning.
- `BR-935` — Fitness functions are written in the same phase as the module they protect, not retrofitted later.

---

## 12. Testing Architecture

| Level | Scope | Where |
|---|---|---|
| Unit | Domain logic, formulas, state machines | Pure functions, no I/O |
| Integration | Module public interface + database | Test container |
| Contract | API responses match `packages/contracts` | Generated from the contract |
| Permission | Every endpoint under every role | Automated matrix |
| E2E | Critical flows only | `FLOW-01`, `04`, `06`, `09`, `13` |

**`DEC-28` — Permission tests are generated, not hand-written.**

For each endpoint, a matrix test asserts, for every role:
- the correct HTTP status
- that `_can` reports the expected value
- that scoped queries return only permitted rows

- `BR-936` — Every endpoint has a permission test asserting `403` without the required permission and `_can: false` (`BR-719`).
- `BR-937` — Every business rule with an ID that expresses a calculation or state transition has a unit test referencing that ID in its name. This makes the documentation set directly traceable to tests.
- `BR-938` — E2E coverage is limited to five critical flows. Broad E2E suites are slow, brittle, and consume CI budget without proportional value.

---

## 13. Error Handling Architecture

```
Domain layer      → throws typed domain errors (EntitlementRequiredError)
Application layer → catches, enriches with context, rethrows or returns Result
HTTP layer        → maps domain errors to status codes + localized messages
Global filter     → catches unmapped errors → 500 + generic message + Sentry
```

| Domain error | Status | Learner sees |
|---|---|---|
| `EntitlementRequiredError` | 403 | What grants access (`NO_ENTITLEMENT`) |
| `LessonLockedError` | 403 | The unlock condition (`LESSON_LOCKED`) |
| `QuotaExhaustedError` | 429 | Reset date + add-on (`QUOTA_EXHAUSTED`) |
| `DeviceMismatchError` | 403 | Transfer option (`DEVICE_MISMATCH`) |
| `PermissionDeniedError` | 403 | **Nothing** — the UI never reached this state (`BR-707`) |
| `ValidationError` | 422 | Field-level guidance |

- `BR-939` — Domain errors carry a reason code from the fixed enumeration (`BR-706`).
- `BR-940` — Internal error details never reach the client (`BR-631`). They go to the error tracker with a correlation ID (`BR-630`).

---

## 14. Configuration & Secrets

| Type | Storage | Changed by |
|---|---|---|
| Secrets (API keys, DB URL, JWT keys) | Environment variables via Coolify | Deployment |
| Business settings (§8 of doc 07) | Database, cached in Redis | Admin UI |
| Feature flags | Database settings | Admin UI |
| Build-time config | Committed config files | Code change |

- `BR-941` — Secrets never appear in the database, in logs, in error payloads, or in client bundles (`BR-626`, `BR-483`).
- `BR-942` — Business thresholds are never environment variables. They belong in the settings registry so they are editable without a deploy (`BR-818`).
- `BR-943` — The application fails fast at startup if a required secret is missing, rather than failing at first use in production.

---

## 15. Architecture Decision Summary

| ID | Decision | Reversibility |
|---|---|---|
| `DEC-23` | Analytics owns read models, reads nothing | Easy |
| `DEC-24` | Messaging is purely event-driven | Easy |
| `DEC-25` | Turborepo + pnpm workspaces | Moderate |
| `DEC-26` | No extraction before measured thresholds | Easy |
| `DEC-27` | Boundaries enforced by CI, not review | Easy |
| `DEC-28` | Permission tests are generated | Easy |

- `BR-944` — Every architectural decision records its reversibility. High-cost-to-reverse decisions warrant proportionally more scrutiny.

---

## 16. Prohibited Architecture

Explicitly ruled out, with reasons, to prevent re-litigation.

| Pattern | Why not |
|---|---|
| Microservices | `CON-01`, `CON-02`, `CON-03` — cost without benefit at this scale |
| Serverless functions | Cold starts, vendor lock-in, and cost unpredictability against a fixed VPS |
| GraphQL | Query complexity control and caching become a project in themselves; REST is sufficient for a known set of clients |
| Separate admin application | `DEC-16` — doubles infrastructure for 1% of traffic |
| Separate vector database | `DEC-18` — `pgvector` is sufficient at this corpus size |
| Event sourcing | Enormous complexity for a domain that does not require full temporal reconstruction |
| CQRS across the whole system | Applied only in `analytics` (`DEC-23`), where it is justified |
| Shared database across services | Would destroy every boundary this document establishes |

- `BR-945` — Reintroducing a prohibited pattern requires documented evidence that the original reasoning no longer holds.

---

## 17. Open Questions

| ID | Question | Blocking | Owner |
|---|---|---|---|
| `OQ-19` | Should `packages/contracts` be hand-authored or generated from the NestJS OpenAPI spec? Generation guarantees accuracy; hand-authoring gives cleaner types. | `11-api-contract` | Joint |
| `OQ-20` | Should the outbox dispatcher be a polling worker or use PostgreSQL `LISTEN/NOTIFY`? Polling is simpler; `LISTEN/NOTIFY` is lower latency. | `16-task-breakdown` | Joint |

---

## 18. Approval

| Item | Status |
|---|---|
| Modular monolith with documented revisit thresholds is accepted | ☐ Approved |
| Layering rules and prohibited patterns are correct | ☐ Approved |
| Tier model and dependency matrix are correct | ☐ Approved |
| Analytics owning read models (`DEC-23`) is accepted | ☐ Approved |
| Messaging as purely reactive (`DEC-24`) is accepted | ☐ Approved |
| Synchronous vs event decision criteria are correct | ☐ Approved |
| Transactional outbox pattern is accepted | ☐ Approved |
| Shared kernel scope is appropriately minimal | ☐ Approved |
| Frontend capability-driven rendering is correct | ☐ Approved |
| Monorepo structure is correct | ☐ Approved |
| Extraction path and ordering are correct | ☐ Approved |
| CI-enforced fitness functions (`DEC-27`) are accepted | ☐ Approved |
| Generated permission tests (`DEC-28`) are accepted | ☐ Approved |
| Prohibited architecture list is accepted | ☐ Approved |

**Next document:** `10-database-design.md` — complete schema: every table, column, type, index, constraint, and relationship, with the bilingual `jsonb` model, `pgvector` storage, and the migration strategy.

---
