# 08 — System Design

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 08 — System Design |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | `04-feature-catalog` (all parts), `05-roles-and-permissions.md`, `07-business-logic.md` |
| **Feeds Into** | `09-system-architecture.md`, `10-database-design.md`, `11-api-contract.md`, `13-tech-stack.md`, `14-security-design.md`, `15-implementation-roadmap.md` |
| **Adds** | `BR-831` – `BR-892` · `DEC-16` – `DEC-22` |

---

## 1. Design Constraints

Every decision in this document is bounded by five hard facts.

| Constraint | Consequence |
|---|---|
| **2 vCPU** (`CON-03`) | CPU is the binding resource. No builds, no transcoding, no unbounded parallelism on the server. |
| **8 GB RAM** (`CON-03`) | Sufficient, but every container needs an explicit memory ceiling. |
| **One server** (`CON-09`) | Single point of failure. Off-server backups and external monitoring are mandatory. |
| **~$30/month** (`CON-02`) | Managed services only where self-hosting is impossible or dangerous. |
| **One person** (`CON-01`) | Operational complexity is a direct cost. Fewer moving parts wins over theoretical elegance. |

**Governing principle:** *the server serves requests; everything expensive happens elsewhere.*

---

## 2. System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                 │
│  Web (learner + admin)   ·   iOS   ·   Android                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                    ┌────────▼────────┐
                    │   Cloudflare    │  DNS · CDN · WAF · rate limit
                    └────────┬────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    HETZNER VPS (Frankfurt)                       │
│                    Ubuntu 24.04 + Coolify                        │
│                                                                  │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────────────┐  │
│   │ Traefik  │──▶│ Next.js  │   │ NestJS   │   │  Workers   │  │
│   │ (proxy)  │   │ web+admin│──▶│   API    │◀──│  (BullMQ)  │  │
│   └──────────┘   └──────────┘   └────┬─────┘   └─────┬──────┘  │
│                                       │                │         │
│                            ┌──────────▼────┐  ┌────────▼─────┐  │
│                            │  PostgreSQL   │  │    Redis     │  │
│                            │  + pgvector   │  │ cache+queue  │  │
│                            └───────────────┘  └──────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
        ┌──────────────┬───────┼────────┬──────────────┐
        ▼              ▼       ▼        ▼              ▼
  ┌──────────┐  ┌───────────┐ ┌──────┐ ┌────────┐ ┌─────────┐
  │  Bunny   │  │Cloudflare │ │Paymob│ │  AI    │ │ Resend  │
  │  Stream  │  │    R2     │ │Stripe│ │Providers││  email  │
  │  video   │  │  objects  │ │ pay  │ │ chat+  │ │         │
  └──────────┘  └───────────┘ └──────┘ │ embed  │ └─────────┘
                                        └────────┘
```

**Rules:**
- `BR-831` — Video bytes never transit the VPS (`BR-136`). Upload goes browser → Bunny; playback goes Bunny CDN → client.
- `BR-832` — Cloudflare sits in front of everything as the first layer of caching, rate limiting, and DDoS protection at zero cost (`BR-634`).

---

## 3. Applications

### 3.1 Inventory

| App | Runtime | Purpose | Deployed as |
|---|---|---|---|
| **Web** | Next.js (App Router) | Public site, learner platform, **and admin** | Container |
| **API** | NestJS | All business logic, single source of truth | Container |
| **Workers** | NestJS (same image, worker mode) | Background jobs | Container |
| **Mobile** | React Native (Expo) | Full learning client | App stores |

### 3.2 `DEC-16` — Admin Ships Inside Web

Admin lives at `/admin` within the Next.js application, not as a separate deployment (`BR-461`, `CON-03`).

**Reasoning:** a separate admin app would add a second container, a second build pipeline, a second auth integration, and a second deployment target — for a surface carrying roughly 1% of traffic (`02` §1).

**Isolation is achieved through:**
- Route group separation: `app/(learner)` and `app/(admin)`
- Independent code splitting so learner bundles never load admin code (`BR-463`)
- Middleware gating on `admin:access` before any admin route renders
- Distinct visual treatment so the two are never confused

- `BR-833` — Admin routes are excluded from the sitemap, marked `noindex`, and never publicly linked (`BR-462`).

### 3.3 `DEC-17` — Rendering Strategy

| Surface | Strategy | Reason |
|---|---|---|
| Landing, catalog, course detail | **SSG + ISR** (revalidate 300s) | SEO-critical, rarely changes, near-zero CPU per request |
| Certificate verification | **SSR** | Must reflect live state |
| Blog / articles | **SSG + ISR** | SEO-critical |
| Dashboard, player, learning | **CSR** after auth | Personalized; SSR would burn CPU per request |
| Admin | **CSR** | No SEO value, no caching benefit |

- `BR-834` — Public pages are statically generated. On 2 vCPU, server-rendering every catalog visit is the fastest route to a saturated server.
- `BR-835` — Authenticated surfaces render client-side against the API. This keeps Next.js CPU usage proportional to public traffic only.

### 3.4 API Boundary

The API is the sole authority. Web, admin, and mobile are all clients of the same contract.

- `BR-836` — Next.js contains **no business logic and no direct database access**. It renders and proxies (`BR-705`).
- `BR-837` — Every client consumes identical endpoints. A capability available on web but not mobile is a client omission, never an API difference.

---

## 4. Backend Composition

### 4.1 Module Structure

The API is a modular monolith mirroring the catalog's module map (`BR-607`).

```
src/
├── modules/
│   ├── identity/          M01  auth, users, sessions, profiles
│   ├── access/            M02  roles, permissions, abilities
│   ├── commerce/          M03  products, orders, payments, subscriptions
│   ├── entitlements/      M04  grants, quotas, resolution
│   ├── content/           M05  courses, sections, lessons, notes, resources
│   ├── learning/          M06  progress, sessions, notes, unlock engine
│   ├── motivation/        M07  goals, streaks, projections, achievements
│   ├── assessment/        M08  quizzes, questions, attempts, grading
│   ├── certification/     M09  eligibility, issuance, verification
│   ├── ai/                M10  providers, RAG, conversations, quotas
│   ├── qa/                M11  questions, answers, escalation
│   ├── reviews/           M12  submission, moderation, aggregation
│   ├── protection/        M13  devices, transfers, tokens, audit
│   ├── messaging/         M14  notifications, email, push
│   ├── support/           M15  tickets, assignment, canned responses
│   ├── administration/    M16  settings, staff, audit log
│   └── analytics/         M17  reports, aggregation
├── shared/
│   ├── database/          Prisma client, query scoping decorators
│   ├── events/            Domain event bus
│   ├── queue/             BullMQ setup
│   ├── providers/         Payment, Video, AI, Storage, Email abstractions
│   ├── i18n/              Bilingual helpers
│   └── common/            Guards, interceptors, filters, decorators
└── main.ts
```

### 4.2 Module Boundaries

- `BR-838` — A module never queries another module's tables. Cross-module reads go through the owning module's service interface (`BR-605`).
- `BR-839` — Cross-module side effects flow through domain events, never direct calls (`BR-606`).
- `BR-840` — Each module exposes an explicit public interface. Everything else is internal.

### 4.3 Domain Events

```
order.paid              → grant entitlements · generate invoice · send confirmation
entitlement.granted     → invalidate access cache · notify
lesson.completed        → recalculate progress · evaluate unlocks
                          · update streak · check certificate eligibility
                          · check milestone
course.completed        → issue certificate · send email · recommend next
lesson_notes.published  → queue embedding job
question.escalated      → notify instructor · add to queue
payment.failed          → start grace · notify · schedule retry
device.transfer_requested → evaluate policy · auto-approve or queue
subscription.expired    → transition entitlements · notify · schedule win-back
```

- `BR-841` — Event handlers are idempotent. The same event delivered twice produces one outcome (`BR-828`).
- `BR-842` — Handler failure never rolls back the publisher. Failures are retried independently through the queue.

### 4.4 Request Pipeline

```
Request
  → Traefik (TLS termination)
  → Rate limit guard          (Redis sliding window, BR-632)
  → Auth guard                (JWT verification)
  → Permission guard          (CASL, BR-714)
  → Scope interceptor         (injects .own filters, BR-700)
  → Controller
  → Service (business logic)
  → Repository (Prisma, scoped)
  → Capability interceptor    (computes _can, BR-703)
  → Serializer                (strips internal fields, BR-687)
Response
```

- `BR-843` — The scope interceptor applies ownership filters at the query layer, so a forgotten `where` clause in a new endpoint cannot leak data (`BR-700`).
- `BR-844` — The capability interceptor runs on every response. `_can` is never hand-written per endpoint.

---

## 5. Data Stores

### 5.1 PostgreSQL 16 + pgvector

Single database, single instance. Holds everything relational plus vector embeddings.

**`DEC-18` — No separate vector database.** `pgvector` inside the existing PostgreSQL avoids a second service, a second backup target, and a second failure mode — on a server with 2 vCPU and one instructor's worth of content.

**Extensions:**

| Extension | Purpose |
|---|---|
| `pgvector` | Embedding storage and similarity search |
| `pg_trgm` | Fuzzy text matching for admin search |
| `unaccent` | Arabic diacritic normalization (`BR-256`) |
| `uuid-ossp` | Identifier generation |

**Configuration for 8 GB / 2 vCPU:**

```
shared_buffers              = 2GB
effective_cache_size        = 4GB
work_mem                    = 16MB
maintenance_work_mem        = 256MB
max_connections             = 60
random_page_cost            = 1.1        # SSD
effective_io_concurrency    = 200
max_parallel_workers        = 2
max_parallel_workers_per_gather = 1      # 2 vCPU — parallelism costs more than it gains
```

- `BR-845` — Connection pooling is mandatory. The API uses a pool of 20, workers 10, leaving headroom for maintenance (`max_connections = 60`).
- `BR-846` — Full-text search uses `arabic` and `english` configurations with `unaccent` (`BR-204`, `BR-532`).
- `BR-847` — Vector index: HNSW with `m=16, ef_construction=64`. At the expected corpus size (a few thousand chunks) this is well within resource budget.

### 5.2 Redis

Single instance serving three distinct roles.

| Role | Usage | Eviction |
|---|---|---|
| **Cache** | Permission sets, entitlements, dashboard aggregates, settings | `allkeys-lru` |
| **Queue** | BullMQ job storage | Never evicted (separate DB index) |
| **Rate limiting** | Sliding window counters | TTL-based |

```
maxmemory        = 384mb
maxmemory-policy = allkeys-lru
appendonly       = yes          # queue durability
databases        = 4            # 0=cache 1=queue 2=ratelimit 3=sessions
```

- `BR-848` — Queue data lives in a separate database index from cache and is never subject to LRU eviction. Evicting a job is losing a purchase confirmation.
- `BR-849` — Redis is a cache, not a store. Every cached value is reconstructible from PostgreSQL. Losing Redis degrades performance, never correctness.

### 5.3 Caching Strategy

| Data | TTL | Invalidation |
|---|---|---|
| Resolved permissions | 1 hour | `permission_version` bump (`BR-718`) |
| User entitlements | 15 min | On any entitlement change |
| Settings registry | 5 min | On settings update |
| Course structure | 30 min | On content publish |
| Dashboard aggregate | 60 sec | Time-based only |
| Public catalog | ISR 300 sec | On publish |
| Capability maps | **Never cached** | Computed per request (`BR-703`) |

- `BR-850` — Capability maps are never cached across users under any circumstance. This is a security boundary, not a performance decision.

---

## 6. External Providers

Every external dependency sits behind an abstraction so it can be replaced without touching business logic.

### 6.1 Provider Map

| Concern | Provider | Abstraction | Fallback |
|---|---|---|---|
| Video | Bunny Stream | `VideoProvider` (`FEAT-052`) | VdoCipher (post-revenue) |
| Object storage | Cloudflare R2 | `StorageProvider` (`FEAT-220`) | Any S3-compatible |
| Payment (Egypt) | Paymob | `PaymentProvider` (`FEAT-030`) | Kashier (`DEC-01`) |
| Payment (international) | Stripe | `PaymentProvider` | — |
| AI chat | Configurable | `AIProvider` (`FEAT-106`) | Automatic failover (`BR-293`) |
| AI embeddings | OpenAI | `AIProvider` | Fixed (`DEC-02`) |
| Email | Resend | `EmailProvider` | Any SMTP |
| Push | Expo Push | `PushProvider` | FCM/APNs direct |
| SMS/OTP | Regional provider | `SmsProvider` | — |

- `BR-851` — No business-logic module imports a vendor SDK. All access is through the abstraction (`BR-140`, `BR-291`).
- `BR-852` — Provider selection is configuration, not code (`BR-072`).

### 6.2 Failure Isolation

| Provider down | Degradation | Learner impact |
|---|---|---|
| Bunny | Video unavailable | Notes, AI, Q&A, quizzes still work |
| R2 | Downloads unavailable | Everything else works |
| Paymob / Stripe | Purchases blocked | Existing learners unaffected |
| AI provider | Automatic failover; if all fail, AI disabled | Escalation to instructor still available |
| Resend | Email queued for retry | In-app notifications still delivered |
| Push | Silent | Email fallback re-enabled |

- `BR-853` — No single provider outage takes the platform down. Every integration degrades to a reduced but functional state.
- `BR-854` — Provider outages surface a specific, honest message ("video is temporarily unavailable"), never a generic error (`BR-817`).

---

## 7. Authentication & Sessions

### 7.1 Token Design

```
Access token   JWT, 15 min, RS256
               claims: sub, role, permission_version, jti

Refresh token  Opaque random, 30 days, stored hashed
               rotated on every use, family-tracked (BR-016)
```

**Storage:**

| Client | Access token | Refresh token |
|---|---|---|
| Web | Memory | httpOnly Secure SameSite=Lax cookie |
| Mobile | Memory | Keychain / EncryptedSharedPreferences (`BR-554`) |

- `BR-855` — Refresh tokens are never in `localStorage` on web or `AsyncStorage` on mobile. XSS-readable refresh tokens are full account compromise.
- `BR-856` — Refresh token reuse revokes the entire token family and forces re-login (`BR-016`).
- `BR-857` — Access tokens carry `permission_version`; a stale version triggers refresh rather than rejection (`BR-017`).

### 7.2 Identity Providers

| Method | Flow |
|---|---|
| Email + password | Argon2id, `memory=64MB, iterations=3, parallelism=4` |
| Google | OAuth 2.0 authorization code + PKCE |
| Phone | OTP, 6 digits, 5-minute TTL, hashed at rest (`BR-006`) |

- `BR-858` — OTP codes are stored hashed. A database read must not reveal a live code.
- `BR-859` — Argon2id parameters are tuned so hashing costs ~100 ms on 2 vCPU — strong enough to resist offline attack, cheap enough not to become a login bottleneck.

---

## 8. Media Pipeline

### 8.1 Video

```
UPLOAD
  Admin requests upload authorization
    → API calls Bunny, returns single-use signed credentials (BR-138)
    → Browser uploads DIRECTLY to Bunny (chunked, resumable)
    → Bunny transcodes to adaptive bitrate ladder
    → Bunny webhook → lesson status: processing → ready (BR-137)

PLAYBACK
  Client requests playback token
    → API validates: entitlement → unlock rules → device binding
                     → concurrent stream → quota (§6.2 of doc 07)
    → API requests a signed token from Bunny with watermark payload
    → Client plays via Bunny CDN, never touching the VPS
```

- `BR-860` — The VPS never receives, stores, or serves a video byte (`BR-831`).
- `BR-861` — The watermark payload is constructed server-side from the authenticated learner. It is never client-supplied (`BR-374`).

### 8.2 Files & Documents

```
UPLOAD
  Client requests a presigned R2 upload URL
    → validated for content type and size (BR-637)
    → uploads directly to R2
    → API records metadata

DOWNLOAD
  Client requests a download
    → entitlement validated
    → 5-minute presigned URL issued (BR-401)
    → download logged (BR-154)
```

**R2 layout:**

```
josam-media/
├── avatars/{user_id}/
├── thumbnails/{course_id}/
├── resources/{lesson_id}/
├── certificates/{certificate_id}.pdf
├── invoices/{order_id}.pdf
├── tickets/{ticket_id}/
└── backups/{YYYY-MM-DD}/
```

- `BR-862` — All buckets are private. No object is publicly readable except assets under an explicit `public/` prefix (`BR-635`).
- `BR-863` — Lifecycle rules purge temporary uploads after 24 hours and ticket attachments after 12 months (`BR-458`).

---

## 9. AI Subsystem

The most technically involved component, and the primary differentiator (`GOAL-03`).

### 9.1 Indexing Pipeline

```
Lesson Notes published/edited
  → embedding job queued (BR-145, BR-764)
  → existing chunks for that lesson deleted
  → blocks chunked:
      target ~400 tokens, respecting block boundaries (BR-297)
      heading context prepended to each chunk
      metadata attached: course_id, lesson_id, section_id, block_id,
                         start_time, language, heading_path
  → embedded via configured model (DEC-02)
  → stored in pgvector with model_id and dimension (BR-298)
```

- `BR-864` — A chunk never spans lessons (`BR-297`).
- `BR-865` — Chunks inherit their source block's timestamp, making every retrieval citable to a video moment (`BR-299`).
- `BR-866` — Arabic and English blocks are embedded separately and language-tagged (`BR-300`).
- `BR-867` — Embedding jobs run at low queue priority with strict concurrency limits. Indexing must never compete with request serving for CPU (`BR-612`).

### 9.2 Retrieval Pipeline

```
Learner question
  ↓
1. SCOPE: resolve entitled course IDs (BR-303)
  ↓
2. PARALLEL RETRIEVAL
   ├─ Vector: cosine similarity over pgvector, top 20, scoped
   └─ Lexical: PostgreSQL FTS (arabic + english), top 20, scoped
  ↓
3. MERGE + RERANK
   score = 0.6 × vector_similarity
         + 0.3 × lexical_rank
         + 0.1 × current_lesson_proximity_boost
  ↓
4. THRESHOLD
   if best_score < rag_relevance_threshold (0.62)
       → out-of-scope handling (BR-305, FEAT-115)
  ↓
5. TOP-K selection (rag_top_k = 8)
  ↓
6. CONTEXT ASSEMBLY
   ├─ System prompt (grounding constraints, BR-307)
   ├─ Retrieved chunks with metadata
   ├─ Student context: goal, level, progress, current lesson (FEAT-112)
   ├─ Spoiler boundary: exclude chunks beyond learner's position (BR-313)
   └─ Conversation: rolling summary + last 6 turns (BR-317)
  ↓
7. GENERATE (streaming)
  ↓
8. CITATIONS built from chunk metadata, NEVER from model output (BR-312)
  ↓
9. Quota consumed on success only (BR-799)
```

- `BR-868` — Hybrid retrieval is mandatory. Pure vector search fails on exact technical terms; pure lexical fails on conceptual Arabic questions (`BR-304`).
- `BR-869` — Entitlement scoping is applied **before** retrieval, not as a post-filter. Post-filtering leaks content through relevance scores and result counts.
- `BR-870` — Reranking weights are configurable and expected to be tuned against real Arabic queries after launch.

### 9.3 Cost Control

```
Per request:  quota check → generate → record tokens → compute cost
Per day:      aggregate by model, provider, user
Per month:    project spend; at 80% → alert; optionally switch to
              cheaper fallback model (BR-334)
```

- `BR-871` — Every AI call records input tokens, output tokens, model, latency, and computed cost before returning (`FEAT-118`).
- `BR-872` — Embedding cost is bounded by construction: content is indexed once per edit, not per query.

---

## 10. Background Jobs

### 10.1 Queue Topology

| Queue | Concurrency | Priority | Jobs |
|---|---:|---|---|
| `critical` | 3 | Highest | Payment webhooks, entitlement grants |
| `email` | 2 | High | Transactional and lifecycle email |
| `media` | 1 | Normal | PDF generation, image processing |
| `ai` | 1 | Low | Embeddings, re-indexing |
| `analytics` | 1 | Lowest | Aggregation, reports, exports |

**Total worker concurrency capped at 8** across all queues (`BR-612`).

- `BR-873` — Queues are separated by workload so a slow embedding batch never delays a purchase confirmation (`BR-611`).
- `BR-874` — Every job is idempotent, retried with exponential backoff, and lands in a dead-letter queue on final failure (`BR-613`, `BR-614`).
- `BR-875` — `analytics` and `ai` queues pause automatically when system load exceeds a threshold. Request serving always wins.

### 10.2 Scheduled Tasks

| Task | Schedule | Queue |
|---|---|---|
| Pending payment reconciliation | */15 min | `critical` |
| Entitlement expiry evaluation | Hourly | `critical` |
| Streak evaluation | Hourly, per timezone bucket | `analytics` |
| Inactivity evaluation | Daily 09:00 per timezone | `email` |
| Subscription renewal reminders | Daily | `email` |
| Quota period resets | Daily 00:00 per timezone | `critical` |
| Database backup | Daily 04:00 UTC | `critical` |
| Analytics aggregation | Hourly | `analytics` |
| Session cleanup | Hourly | `analytics` |
| Backup restore verification | Weekly | `critical` |

- `BR-876` — Timezone-sensitive tasks run per timezone bucket, never once at server midnight (`BR-616`).
- `BR-877` — Heavy aggregation runs 04:00–07:00 local, away from the 20:00–01:00 learning peak (`BR-617`).

---

## 11. VPS Resource Allocation

**`DEC-19` — Explicit memory ceilings on every container.** Without limits, one runaway process takes down the entire platform. There is no second server to fail over to.

### 11.1 Memory Budget (8 GB)

| Component | Limit | Notes |
|---|---:|---|
| OS + Docker daemon | 700 MB | Ubuntu 24.04 baseline |
| Coolify | 400 MB | Management plane |
| Traefik | 150 MB | Reverse proxy |
| PostgreSQL | 2.5 GB | `shared_buffers` 2 GB + overhead |
| Redis | 450 MB | `maxmemory` 384 MB + overhead |
| NestJS API | 900 MB | `--max-old-space-size=768` |
| Workers | 600 MB | `--max-old-space-size=512` |
| Next.js | 1.2 GB | `--max-old-space-size=1024` |
| **Allocated** | **6.9 GB** | |
| **Headroom** | **1.1 GB** | Page cache, spikes, maintenance |

- `BR-878` — Every container declares an explicit memory limit. An unbounded container is a scheduled outage.
- `BR-879` — Node heap sizes are set below container limits so the process fails predictably rather than being OOM-killed by the kernel.

### 11.2 CPU Budget (2 vCPU)

| Component | Typical | Ceiling |
|---|---:|---:|
| PostgreSQL | 0.4 | 1.0 |
| NestJS API | 0.5 | 1.0 |
| Next.js | 0.3 | 0.8 |
| Workers | 0.3 | 0.6 |
| Redis + proxy + OS | 0.2 | 0.4 |

- `BR-880` — Worker CPU is capped so background processing can never starve request serving (`BR-875`).
- `BR-881` — PostgreSQL parallel query workers are limited to 1 per gather. On 2 vCPU, parallelism costs more in contention than it returns.
- `BR-882` — **No builds, no video transcoding, no PDF batch rendering during peak hours.** These are the three operations capable of saturating 2 vCPU (`BR-608`).

### 11.3 Disk Budget (100 GB)

| Use | Allocation |
|---|---:|
| OS + system | 15 GB |
| Docker images and layers | 25 GB |
| PostgreSQL data | 20 GB |
| Redis persistence | 2 GB |
| Logs (rotated) | 5 GB |
| Temp and build cache | 10 GB |
| **Free buffer** | **23 GB** |

- `BR-883` — Docker image pruning runs weekly. Accumulated layers are the most common cause of disk exhaustion on single-server deployments.
- `BR-884` — Log rotation is mandatory and bounded (`BR-628`). Media never lands on local disk (`CON-05`).

---

## 12. Deployment

### 12.1 Pipeline

```
git push (main)
  → GitHub Actions:
      lint → typecheck → test → build Docker images
      → push to ghcr.io tagged by commit SHA
  → webhook → Coolify
  → Coolify: pull image → run migrations → rolling restart
  → health check → traffic switched
```

- `BR-885` — No build step executes on the production server (`BR-608`).
- `BR-886` — Images are tagged by commit SHA; rollback is redeploying a previous tag (`BR-609`).
- `BR-887` — Migrations run before the new image goes live and must be backward compatible with the previous release (`BR-610`).

### 12.2 `DEC-20` — Migration Discipline

Every schema change follows expand-then-contract:

```
Release N   : add new column (nullable), write to both, read from old
Release N+1 : backfill, read from new
Release N+2 : drop old column
```

- `BR-888` — No migration drops or renames a column in the same release that stops using it. This is what makes rollback survivable on a single server.

### 12.3 Environments

| Environment | Location | Purpose |
|---|---|---|
| Local | Developer machine | Docker Compose, full stack |
| Preview | Vercel free tier (frontend only) | UI review against production API |
| Production | VPS | Live |

**`DEC-21` — No separate staging server.** A second VPS doubles the infrastructure cost against a $30/month budget. Risk is managed through migration discipline (`DEC-20`), feature flags, and the ability to roll back by tag.

- `BR-889` — Risky changes ship behind a feature flag toggled from settings, allowing disablement without redeployment.

---

## 13. Observability

| Concern | Tool | Cost |
|---|---|---|
| Uptime | External monitor (UptimeRobot free) | $0 |
| Errors | Sentry free tier | $0 |
| Logs | Structured JSON to stdout, Docker rotation | $0 |
| Metrics | Application-level, surfaced in admin | $0 |
| Alerts | Push via ntfy or Telegram bot | $0 |

- `BR-890` — Monitoring is external. A monitor running on the monitored server cannot report that server is down (`BR-623`).
- `BR-891` — Critical alerts (backup failure, site down) reach the founder by push, never by email alone (`BR-625`).

**Health endpoint** returns component-level status:

```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "queue": { "status": "ok", "depth": 3 },
    "storage": "ok",
    "lastBackup": "2026-07-28T04:00:12Z"
  }
}
```

- `BR-892` — The health check verifies real dependencies, not just process liveness (`BR-624`).

---

## 14. Failure Modes

**`DEC-22` — Documented degradation, not silent failure.** Every dependency has a defined reduced-functionality state.

| Failure | Detection | Behavior | Recovery |
|---|---|---|---|
| PostgreSQL down | Health check | Platform unavailable, honest status page | Restart; restore from backup if corrupt |
| Redis down | Health check | Cache misses hit DB; **queue paused** | Restart; jobs resume from AOF |
| Queue backed up | Depth alert | Emails delayed; core learning unaffected | Investigate; temporarily raise concurrency |
| Disk > 85% | Monitor | Alert | Prune images and logs |
| Memory pressure | Monitor | Container restart by limit | Investigate leak |
| Bunny outage | Playback errors | Video unavailable; everything else works | Wait; notify learners honestly |
| AI provider outage | Request failures | Automatic failover; then AI disabled with escalation offered | Automatic |
| Payment gateway outage | Webhook failures | Purchases fail with retry guidance | Reconciliation job recovers pending orders |
| **VPS total loss** | External monitor | Platform down | Provision new VPS, restore from R2 backup |

**Recovery objectives:**

| Metric | Target |
|---|---|
| RPO (max data loss) | 24 hours — daily backup (`BR-618`) |
| RTO (time to restore) | 4 hours — manual rebuild from image + backup |

- `BR-893` — The restore procedure is documented and tested weekly (`BR-621`). An untested backup is an assumption.

---

## 15. Open Questions

| ID | Question | Blocking | Owner |
|---|---|---|---|
| `OQ-17` | SMS/OTP provider for Egypt and Gulf — pricing and deliverability must be evaluated. Options: Twilio (expensive, reliable), regional aggregators (cheaper, variable). | `13-tech-stack`, Phase 1 | Joint |
| `OQ-18` | Should RPO be tightened below 24 hours? Continuous WAL archiving to R2 would reduce it to minutes at a modest cost increase. | `15-implementation-roadmap` | Founder |

---

## 16. Approval

| Item | Status |
|---|---|
| Admin inside the web app (`DEC-16`) is accepted | ☐ Approved |
| Rendering strategy — static public, client-side authenticated (`DEC-17`) | ☐ Approved |
| Modular monolith structure and module boundaries are correct | ☐ Approved |
| Domain event model is correct | ☐ Approved |
| `pgvector` instead of a separate vector database (`DEC-18`) is accepted | ☐ Approved |
| PostgreSQL and Redis configurations are appropriate for 8 GB / 2 vCPU | ☐ Approved |
| Provider abstractions and failure isolation are correct | ☐ Approved |
| Token design and storage rules are correct | ☐ Approved |
| Media pipeline — nothing transits the VPS — is correct | ☐ Approved |
| RAG pipeline design is correct | ☐ Approved |
| Queue topology and concurrency caps are appropriate | ☐ Approved |
| Resource allocation leaves adequate headroom (`DEC-19`) | ☐ Approved |
| Expand-then-contract migration discipline (`DEC-20`) is accepted | ☐ Approved |
| No staging server (`DEC-21`) is accepted | ☐ Approved |
| Failure modes and 24h RPO / 4h RTO are accepted | ☐ Approved |

**Next document:** `09-system-architecture.md` — architectural style, module dependency graph, layering rules, data flow patterns, and the extraction path if any module ever needs to become a separate service.

---
