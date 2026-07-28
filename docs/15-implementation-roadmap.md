# 15 — Implementation Roadmap

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 15 — Implementation Roadmap |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | All prior documents |
| **Feeds Into** | `16-task-breakdown.md` |
| **Adds** | `BR-1719` – `BR-1760` · `DEC-56` – `DEC-60` |

---

## 1. Sequencing Principles

- `BR-1719` — **Nothing is cut.** All 220 features and 134 components ship. The roadmap orders them; it does not reduce them (`PRIN-06`).
- `BR-1720` — Every phase ends in **production, working**. No phase depends on a later phase to become usable.
- `BR-1721` — Dependency order is not negotiable. A feature cannot precede what it reads from.
- `BR-1722` — Revenue capability is reached as early as the dependency graph allows. Everything after that is built while the platform earns.
- `BR-1723` — A phase is not complete until its exit criteria pass in production, not in development.

---

## 2. Phase Overview

| Phase | Name | Features | Components | Duration | Cumulative |
|---|---|---:|---:|---|---|
| **0** | Foundation | 18 | 69 | 3 weeks | 3 |
| **1** | Identity & Commerce | 46 | +18 | 5 weeks | 8 |
| **2** | Content & Learning | 41 | +26 | 6 weeks | 14 |
| **3** | Operations & Launch | 34 | +16 | 4 weeks | **18** ← **revenue** |
| **4** | Motivation & Proof | 29 | +6 | 4 weeks | 22 |
| **5** | AI Mentor | 21 | +6 | 4 weeks | 26 |
| **6** | Mobile | 10 | — | 5 weeks | 31 |
| **7** | Growth | 21 | — | 3 weeks | **34** |
| | **Total** | **220** | **134** | **~34 weeks** | **~8 months** |

**Durations assume the founder working with AI assistance at a sustained pace, not a sprint.** They include review, testing against `§18`, and deployment — not just writing code.

- `BR-1724` — `DEC-56` — Durations are estimates to be recalibrated after Phase 0 completes. Phase 0 is the measurement that makes the rest of the plan honest.

---

## Phase 0 — Foundation

**Goal:** a deployable skeleton with the standards enforced, before any feature exists.

**Duration:** 3 weeks · **Ships:** a health endpoint at `josamacademy.com`, a Storybook, and a green CI

### Contents

| Group | Items |
|---|---|
| **Infrastructure** | `FEAT-211` – `FEAT-220` (modular monolith, CI builds, queue, scheduler, backups, monitoring, logging, error tracking, rate limiting, storage) |
| **Localization** | `FEAT-184` – `FEAT-191` (bilingual, RTL, `jsonb` fields, mixed typography, language switcher, themes, tokens, locale formatting) |
| **Components** | Wave 1 — 69 components (`12 §20.12`) |

### Work

```
Week 1  monorepo · Turborepo · pnpm · tsconfig · ESLint · Stylelint · Prettier
        CI pipeline · Docker images → ghcr.io · Coolify deploy
        VPS hardening (14 §12) · Cloudflare · TLS · health endpoint
        Postgres + pgvector + Redis containers with memory limits

Week 2  packages/tokens (both themes) · packages/i18n (AR/EN + plurals)
        Storybook with theme + direction toolbars
        Primitives: Text · Heading · Stack · Grid · Box · Icon · Surface
        Architectural: T · Bidi · Money · Num · When · CopyableId

Week 3  Forms: Form · FormField · all 24 field components
        Layout: AppShell · PageHeader · navigation · SkipLink
        Feedback: Toast · Dialog · Confirm · states · banners
        Buttons · ProgressBar · ProgressRing
        Backup job + restore verification + uptime monitoring + alerts
```

### Exit Criteria

```
☐ Push to main deploys to production in under 2 minutes, no build on server
☐ Rollback by image tag verified working
☐ Daily backup runs, uploads to R2, and restore-verifies
☐ Uptime monitor alerts by push when the server is stopped (tested)
☐ All 69 Wave 1 components in Storybook, every state
☐ Every story passes axe in both themes and both directions
☐ Fitness functions active: boundaries · tokens · logical properties
    · hardcoded strings · prohibited copy terms
☐ A raw hex color in a component fails the build (verified)
☐ Health endpoint reports database, Redis, queue, storage, last backup
```

- `BR-1725` — Phase 0 does not end until a deliberate rule violation is confirmed to fail the build. Enforcement that has never been tested is not enforcement.
- `BR-1726` — `DEC-57` — Backups and monitoring ship in Phase 0, before any real data exists. Adding them after data exists means the window where loss is unrecoverable was real (`CON-09`).

**Risk:** this phase produces no visible product, which is psychologically hard. It is also the phase that determines whether the following seven are fast or painful.

---

## Phase 1 — Identity & Commerce

**Goal:** a person can register, buy, and hold an entitlement. No content yet.

**Duration:** 5 weeks · **Ships:** working registration and a real payment that grants a real entitlement

### Contents

`M01` Identity (12) · `M02` Access (8) · `M03` Commerce (18) · `M04` Entitlements (8) — **46 features**

Components: +18 (auth forms, checkout, permission matrix, entitlement composer)

### Work

```
Week 1  users · identities · sessions · refresh rotation · Argon2id
        email registration + verification + password reset
        Google OAuth

Week 2  roles · permissions registry · startup sync · role-permission UI
        CASL abilities package · capability interceptor · scope decorator
        generated permission tests (DEC-28)

Week 3  entitlement engine · resolution · caching · expiry · quotas
        products · prices · product→entitlement mapping
        admin: product editor + entitlement composer

Week 4  PaymentProvider abstraction · Stripe integration
        checkout flow · orders · transactions · webhooks (idempotent)
        invoices (queued PDF)

Week 5  Paymob integration incl. Fawry deferred flow + reconciliation job
        coupons · refund request workflow · subscription lifecycle
        SmsProvider + phone OTP behind a feature flag (DEC-45)
```

### Exit Criteria

```
☐ Register by email, Google, and phone; identities link correctly
☐ A real card payment grants an entitlement end to end
☐ A Fawry reference completes hours later and still grants correctly
☐ Duplicate webhooks produce exactly one entitlement (verified)
☐ Every endpoint has a passing permission test for every role
☐ _can appears on every response and drives every rendered action
☐ A refund revokes the entitlement and preserves progress data
☐ Entitlement resolution under 20 ms at p95
```

- `BR-1727` — Phase 1 exit requires a **real payment with real money**, refunded afterward. Sandbox success is not evidence.
- `BR-1728` — Permission tests must be green before Phase 2 begins. Retrofitting authorization is how it gets missed.

**Risk:** `OQ-01` (commercial registration for Paymob). Mitigated by `DEC-01` — Stripe ships first, Paymob or Kashier follows without architectural change.

---

## Phase 2 — Content & Learning

**Goal:** an entitled learner watches protected video, reads notes, and progresses.

**Duration:** 6 weeks · **Ships:** the actual learning experience — the largest phase

### Contents

`M05` Content (16) · `M06` Learning (14) · `M13` Protection (11) — **41 features**

Components: +26 (curriculum tree, block editor, player, rail, learning cards)

### Work

```
Week 1  courses · sections · lessons · bilingual jsonb · draft/published
        admin: course editor + drag-and-drop curriculum builder

Week 2  VideoProvider abstraction · Bunny integration
        direct-to-provider upload · transcoding webhooks
        block editor for Lesson Notes + timestamp capture

Week 3  resources (5 types) · timestamp binding · resource entitlements
        signed R2 URLs · media library · content versioning

Week 4  custom player · hls.js · controls · resume-to-second
        chapter rail from heading blocks · synced notes display

Week 5  device binding · signed playback tokens · watermarking
        transfer requests + automatic policy · concurrent stream limit
        playback and download logging

Week 6  progress tracking · completion · course progress
        unlock rule engine · visible locked states · Continue Learning
        learner notes · bookmarks · in-course search
```

### Exit Criteria

```
☐ Upload a 30-minute video without the VPS exceeding 40% CPU
☐ Watermark shows learner identity and is unremovable from the client
☐ Playback from a second device is blocked with a working transfer path
☐ Automatic transfer completes in under 5 seconds
☐ Everything except playback works from any device (verified)
☐ Resume position accurate to the second across web reload
☐ Locked lessons show title, duration, and condition — never hidden
☐ Unlock engine handles all five rule types
☐ Deleting a rule target fails open, not closed (verified)
☐ Full course flow works: enroll → watch → complete → next unlocks
```

- `BR-1729` — Phase 2 exit requires a full real course uploaded, with real Lesson Notes, watched end to end. Test data does not surface authoring friction.
- `BR-1730` — `DEC-58` — The founder authors one complete course during Phase 2, not after it. Authoring reveals editor problems that no amount of testing will.

**Risk:** the largest phase, and the player is the most intricate component. If it slips, it slips here.

---

## Phase 3 — Operations & Launch

**Goal:** the platform runs itself well enough to sell publicly.

**Duration:** 4 weeks · **Ships:** 🚀 **public launch — the platform earns**

### Contents

`M20` Public Site (9) · `M16` Admin (13) · `M15` Support (8) · `M14` transactional email (4) — **34 features**

Components: +16 (data table, filters, queues, evidence panel, public site)

### Work

```
Week 1  landing · catalog · course detail · free previews · SEO
        legal pages · contact form

Week 2  admin shell · operations dashboard · student directory
        device transfer queue · publish approvals · audit log

Week 3  settings registry · staff management · manual entitlement grants
        impersonation (read-only) · abuse flag queue

Week 4  support tickets · threading · assignment · canned responses
        transactional email (all templates, bilingual, RTL-correct)
        launch hardening · load test · final security review
```

### Exit Criteria

```
☐ A stranger can find, evaluate, buy, and start a course unaided
☐ Free preview plays without registration
☐ Operations dashboard shows every attention item, each one-click
☐ Daily operations routine (FLOW-30) completes in under 25 minutes
☐ All transactional email delivers, renders RTL-correctly, and links to
    the first lesson
☐ Load test: dashboard and playback-token endpoints under 500 ms at p95
    with 50 concurrent learners
☐ Security review complete: headers, CSP, rate limits, VPS hardening
☐ Backup restore rehearsed end to end from a clean server
```

- `BR-1731` — Launch requires the disaster-recovery rehearsal to have actually been performed, not planned (`BR-893`).
- `BR-1732` — `DEC-59` — Launch is soft: a limited cohort first, then public. The first real learners surface what no test does, and a small cohort is recoverable.

**Milestone:** from here, every subsequent phase is built while the platform generates revenue.

---

## Phase 4 — Motivation & Proof

**Goal:** the product thesis becomes testable — do learners finish?

**Duration:** 4 weeks · **Ships:** onboarding, goals, streaks, quizzes, certificates

### Contents

`M07` Motivation (12) · `M08` Assessment (11) · `M09` Certification (6) — **29 features**

### Work

```
Week 1  onboarding flow · learning goals · weekly commitment
        projected completion date · goal editing and history

Week 2  motivation dashboard · distance-to-goal · streaks with freezes
        weekly progress · milestones · recovery messaging

Week 3  quiz builder · 5 question types · configuration · attempts
        encouraging result screens · question bank

Week 4  certificate eligibility · issuance · PDF generation (off-peak queue)
        verification code · public verification page · sharing
```

### Exit Criteria

```
☐ Onboarding completion ≥ 70% among new registrations (MET-02)
☐ Projected date is plausible against real session data
☐ Streak freezes apply silently and are reported afterward
☐ No screen in this phase contains a prohibited copy term (BR-1365)
☐ Quiz results link every wrong answer to its lesson and timestamp
☐ Certificate issues within seconds; PDF follows without a wait state
☐ Verification page returns valid, revoked, and not-found correctly
☐ PDF generation does not exceed 60% CPU during off-peak batch
```

- `BR-1733` — Phase 4 begins the measurement of `MET-01` and `MET-09`. These validate the entire product thesis (`01 §5`).
- `BR-1734` — If completion among goal-setters does not exceed non-setters measurably by month 3, the motivation system is revisited before scaling content (`BR-1195`).

---

## Phase 5 — AI Mentor

**Goal:** the founder's presence scales.

**Duration:** 4 weeks · **Ships:** curriculum-grounded AI tutor and lesson Q&A

### Contents

`M10` AI (14) · `M11` Q&A (7) — **21 features**

### Work

```
Week 1  AIProvider abstraction · per-task configuration · cost tracking
        admin AI configuration panel · model cost table

Week 2  chunking pipeline · embeddings · pgvector storage
        hybrid retrieval (vector + Arabic FTS) · reranking · thresholds

Week 3  grounded answers · citations from metadata · timestamp jumps
        student context injection · spoiler boundaries
        conversation history · quota enforcement · streaming

Week 4  lesson Q&A · AI-first response · escalation to instructor
        knowledge-base promotion loop · moderation
        model comparison tool · content gap report
```

### Exit Criteria

```
☐ Retrieval never returns content the learner has no entitlement to
    (verified by attempting it)
☐ Answers cite real lessons and timestamps; jumping works
☐ AI never reveals content beyond the learner's position in a
    sequential course
☐ Prompt injection attempts embedded in Lesson Notes are ignored
    (verified with deliberate test content)
☐ Quota consumed only on successful completion
☐ Arabic answer quality reviewed on 50 real questions before launch
☐ Monthly cost projection stays within budget at expected volume
```

- `BR-1735` — Arabic retrieval quality is manually reviewed on real learner questions before this phase is considered complete. Automated metrics do not capture Arabic semantic relevance well (`BR-870`).
- `BR-1736` — Prompt injection defenses are verified with deliberately adversarial Lesson Notes content, not assumed (`DEC-52`).

**Risk:** retrieval quality in Arabic is the largest unknown in the project. `BR-1735` exists specifically to surface it before learners do.

---

## Phase 6 — Mobile

**Goal:** a full learning client on iOS and Android.

**Duration:** 5 weeks · **Ships:** apps in both stores

### Contents

`M19` Mobile (10) — **10 features**

### Work

```
Week 1  Expo project · shared packages · navigation · secure token storage
        authentication (Google, email, phone)

Week 2  dashboard · course list · lesson list · rail components on native

Week 3  video playback · watermarking · device binding
        FLAG_SECURE (Android) · capture detection (iOS)

Week 4  notes · Q&A · AI tutor · quizzes · offline queue · sync

Week 5  push notifications · deep links · store assets
        review submission · policy compliance verification (OQ-10)
```

### Exit Criteria

```
☐ Progress syncs seamlessly between web and mobile mid-lesson
☐ Screen recording produces a black frame on Android
☐ Capture detection pauses playback on iOS with an informational message
☐ No price and no purchase action appears anywhere in the app (BR-572)
☐ Locked content shows title and state without commercial language
☐ Push permission requested after the first completed lesson, not at launch
☐ Both apps approved by their stores
```

- `BR-1737` — Store policy is re-verified against current guidelines immediately before submission (`BR-575`, `OQ-10`).
- `BR-1738` — Rejection by a store is expected at least once. Two weeks of buffer are assumed inside the five.

---

## Phase 7 — Growth

**Goal:** compound retention and revenue from the existing base.

**Duration:** 3 weeks · **Ships:** reviews, lifecycle email, analytics

### Contents

`M12` Reviews (6) · `M14` remaining messaging (6) · `M17` Analytics (9) — **21 features**

### Work

```
Week 1  reviews: eligibility · submission · moderation · display threshold
        aggregate ratings · instructor replies

Week 2  notification center · push · lifecycle sequences
        email priority governance · preferences

Week 3  analytics read models · event projections · all reports
        at-risk learners · content gaps · data export
```

### Exit Criteria

```
☐ Inactivity sequence fires correctly at 3, 7, 14, 30 days and stops
☐ Email budget governance verified: P0 sends when P3 is exhausted
☐ Push suppresses the equivalent email
☐ Completion report segments by goal-set — the GOAL-02 validation
☐ Analytics read models rebuild correctly from source
☐ Every report answers a stated metric question
```

- `BR-1739` — Analytics is last deliberately. Reports built before there is data to report are guesses about what will matter.

---

## 3. Dependency Graph

```
Phase 0  Foundation
   │
   ├──▶ Phase 1  Identity → Permissions → Entitlements → Commerce
   │        │
   │        ├──▶ Phase 2  Content → Learning → Protection
   │        │        │
   │        │        ├──▶ Phase 3  Public Site · Admin · Support  ── LAUNCH
   │        │        │        │
   │        │        │        ├──▶ Phase 4  Motivation · Assessment · Certificates
   │        │        │        │        │
   │        │        │        │        └──▶ Phase 5  AI · Q&A
   │        │        │        │                 │
   │        │        │        │                 └──▶ Phase 6  Mobile
   │        │        │        │
   │        │        │        └──▶ Phase 7  Reviews · Email · Analytics
```

**Hard dependencies:**

| This | Requires | Because |
|---|---|---|
| Any content access | Entitlements | Every check resolves through it (`BR-823`) |
| Admin | Permissions | The panel renders from `_can` |
| Certificates | Assessment + Progress | Eligibility depends on both |
| AI | Lesson Notes | It is the sole knowledge source (`BR-142`) |
| Mobile | Stable API | Building on a moving contract wastes work |
| Analytics | Data | Reports need history |

- `BR-1740` — Phases 6 and 7 may run in either order after Phase 5. Everything before is strictly sequential.

---

## 4. Critical Path

```
Foundation → Identity → Entitlements → Content → Player → Protection → Launch
                                                                        ▲
                                                              18 weeks, revenue
```

The single longest dependency chain. Any slip here slips the launch date directly.

- `BR-1741` — The critical path is protected. Work outside it is deferred when the path is at risk.
- `BR-1742` — The player (`FEAT-063`) is the highest-complexity item on the critical path and is scheduled with a full week of buffer inside Phase 2.

---

## 5. Milestones

| # | Milestone | End of | Meaning |
|---|---|---|---|
| **M1** | Deployable skeleton | Phase 0 | Standards enforced, infrastructure survivable |
| **M2** | First real payment | Phase 1 | Commerce works end to end |
| **M3** | First lesson watched | Phase 2 | The product exists |
| **M4** | 🚀 **Public launch** | Phase 3 | **Revenue begins** |
| **M5** | First certificate issued | Phase 4 | The full journey completes |
| **M6** | AI answers without the founder | Phase 5 | Presence scales (`MET-03`) |
| **M7** | Apps live in stores | Phase 6 | Mobile-first learners served |
| **M8** | Feature complete | Phase 7 | All 220 features shipped |

- `BR-1743` — Each milestone is announced to the founder as a checkpoint for recalibration, not celebration alone.

---

## 6. Risk Register

| ID | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| `RSK-01` | Paymob registration blocked (`OQ-01`) | Egyptian sales delayed | Medium | `DEC-01` — Stripe first, Kashier fallback |
| `RSK-02` | Arabic RAG quality below expectation | AI value undermined | **Medium-High** | `BR-1735` manual review before launch; hybrid retrieval; tunable weights |
| `RSK-03` | App Store rejection over purchase policy | Mobile delayed | Medium | `BR-572` conservative approach; `BR-1738` buffer |
| `RSK-04` | 2 vCPU saturation earlier than expected | Degraded experience | Medium | Budgets enforced from Phase 0; vertical scale is one click |
| `RSK-05` | Founder authoring capacity | Content lags platform | **High** | `DEC-58` — author during Phase 2, not after |
| `RSK-06` | Scope expansion mid-build | Timeline slips | **High** | `NG-01`–`NG-10` and change discipline (`§17.27`) |
| `RSK-07` | Video costs exceed projection | Budget pressure | Low-Medium | Usage-proportional; Bunny is the cheapest viable tier |
| `RSK-08` | Burnout on a 34-week solo build | Everything | **High** | Phase-end pauses; revenue at week 18 changes the psychology |

- `BR-1744` — `RSK-05` and `RSK-08` are the two most likely causes of failure, and neither is technical. Both are addressed by reaching revenue at week 18 rather than at week 34.
- `BR-1745` — `DEC-60` — After each phase, the roadmap is recalibrated against actual velocity. A plan that is never adjusted is a plan that is being ignored.

---

## 7. Parallelization

Solo work is mostly sequential, but three things can proceed alongside development:

| Track | Runs during | Owner |
|---|---|---|
| Commercial registration and Paymob onboarding (`OQ-01`) | Phase 0–1 | Founder |
| Course content authoring | Phase 2 onward | Founder |
| Brand assets, certificate template, legal copy | Phase 1–2 | Founder |

- `BR-1746` — Content authoring begins in Phase 2 and continues throughout. A platform with no content at launch is a launch that does not matter.

---

## 8. Definition of "Phase Complete"

```
☐ Every feature in the phase implemented and merged
☐ Every screen passes the Definition of Done (12 §18)
☐ Every new component has a Storybook story, all states
☐ Permission tests green for every new endpoint
☐ Deployed to production and verified there
☐ Phase exit criteria all passing
☐ Documentation updated where behavior diverged from the plan
☐ Roadmap recalibrated against actual duration (BR-1745)
```

- `BR-1747` — A phase is complete in production, never in development (`BR-1723`).
- `BR-1748` — Divergence from the documents is recorded. Documentation that no longer matches the system is worse than none.

---

## 9. Open Questions

| ID | Question | Blocking | Owner |
|---|---|---|---|
| `OQ-27` | Should the soft launch cohort (`DEC-59`) be free, discounted, or full price? Free removes payment validation from the test; full price validates everything but risks the first impression. | Phase 3 | Founder |
| `OQ-28` | Should Phase 6 (Mobile) precede Phase 7 (Growth)? Mobile serves `PERS-03`; growth features compound existing revenue. Current order favors mobile. | Phase 5 exit | Founder |

---

## 10. Approval

| Item | Status |
|---|---|
| Nothing is cut — the roadmap orders, it does not reduce (`BR-1719`) | ☐ Approved |
| Eight-phase structure and ordering are correct | ☐ Approved |
| Revenue at week 18 (end of Phase 3) is the right target | ☐ Approved |
| Phase 0 producing no visible product is accepted | ☐ Approved |
| Backups and monitoring before any data (`DEC-57`) | ☐ Approved |
| Real payment required for Phase 1 exit (`BR-1727`) | ☐ Approved |
| Founder authors a full course during Phase 2 (`DEC-58`) | ☐ Approved |
| Soft launch before public launch (`DEC-59`) | ☐ Approved |
| Manual Arabic RAG review before Phase 5 exit (`BR-1735`) | ☐ Approved |
| Risk register is accurate, including the non-technical risks | ☐ Approved |
| Recalibration after every phase (`DEC-60`) | ☐ Approved |
| ~34 weeks / ~8 months is a realistic and acceptable timeline | ☐ Approved |

**Next document:** `16-task-breakdown.md` — every phase decomposed into executable tasks with IDs, dependencies, acceptance criteria, and estimates.

---
