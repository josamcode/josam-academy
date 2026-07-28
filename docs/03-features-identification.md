# 03 — Features Identification

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 03 — Features Identification |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | `01-problem-and-goals.md`, `02-target-users.md` |
| **Feeds Into** | `04-feature-catalog.md`, `05-roles-and-permissions.md`, `06-user-flows.md`, `10-database-design.md`, `11-api-contract.md`, `15-implementation-roadmap.md` |

---

## 1. Purpose & Reading Guide

This document is the **complete inventory** of everything the product does. It answers *what exists*, not *how it works* — behavioral detail belongs to `04-feature-catalog.md`.

**Feature ID format:** `FEAT-XXX` — stable and permanent. Once assigned, an ID is never reused, even if the feature is removed.

**Tier column** indicates dependency depth, not importance:

| Tier | Meaning |
|---|---|
| **T1** | Foundation — other features cannot exist without it |
| **T2** | Core experience — the product is not usable without it |
| **T3** | Differentiation — what makes Josam Academy different from a generic LMS |
| **T4** | Growth & optimization — increases retention, revenue, or efficiency |

Tiers inform sequencing in `15-implementation-roadmap.md`. **All tiers ship. Nothing is dropped.**

---

## 2. Resolved Decisions

All open questions from `01` and `02` are hereby closed. These decisions are binding on all downstream documents.

| ID | Resolves | Decision | Rationale |
|---|---|---|---|
| `DEC-01` | `OQ-01` | **Payment gateway abstraction from day one.** A `PaymentProvider` interface with Paymob and Stripe implementations. If commercial registration is unavailable, **Kashier** is the drop-in Egyptian fallback — no architectural change required. | Removes a business blocker from the critical path. The founder resolves registration in parallel with development. |
| `DEC-02` | `OQ-02` | **Embedding model: OpenAI `text-embedding-3-large` (3072 dims).** Stored in `pgvector`. Model identifier and dimension are recorded per embedding row so a future migration can re-index incrementally. | Strongest available Arabic semantic performance. Per-row model tagging converts a "permanent" decision into a recoverable one. |
| `DEC-03` | `OQ-03` | **Certificate: generated PDF, stored on R2, generated once.** Contains student name, course title, completion date, founder signature, academy logo, unique verification code, and a QR linking to the public verification page. | Avoids repeated PDF generation on a 2-vCPU server (`CON-03`). Shareable as a real file (`GOAL-08`). |
| `DEC-04` | `OQ-04` | **Device transfer policy: 2 automatic transfers per 30 days. The 3rd request requires manual approval. 5+ requests in 30 days raises an abuse flag.** All values editable in admin settings. | Honest students never reach the limit. Account sharers surface within the first month (`PRIN-04`). |
| `DEC-05` | `OQ-05` | **Reviews require verified purchase and ≥ 20% course progress. Reviews are hidden on the public page until a course has ≥ 5 approved reviews.** | Prevents spam and premature ratings. Empty or near-empty review sections reduce trust more than absent ones. |
| `DEC-06` | `OQ-06` | **Free registered users (`SEG-02`) receive 5 lifetime AI tutor messages.** After that, AI becomes a paid entitlement. Course purchases include a monthly AI quota; higher tiers include more. | Demonstrates value (the strongest conversion lever) while capping token spend against a $30/month budget (`CON-02`). |
| `DEC-07` | `OQ-07` | **Expired users (`SEG-06`) permanently retain:** progress history, personal notes, earned certificates, and Q&A history. **They lose:** video playback, resource downloads, AI access, and new quiz attempts. Lesson Notes for previously completed lessons remain readable. | Preserves the emotional investment that drives reactivation (`PRIN-02`). |
| `DEC-08` | `OQ-08` | **Free preview is per-lesson configurable** via an `is_preview` flag, with a default of "first lesson of the first section." | Different courses need different hooks. A fixed rule cannot serve both a 10-hour and a 30-hour course. |
| `DEC-09` | `OQ-09` | **Learning goals are editable at any time.** Changing the weekly commitment recalculates the projected date and records the change in history. No lock period. | Locking a goal contradicts `PRIN-02`. A student adjusting their plan is engaged, not failing. |

---

## 3. Module Map

| Module | Name | Features | Primary Goals |
|---|---|---|---|
| `M01` | Identity & Access | 12 | `GOAL-06` |
| `M02` | Roles & Permissions | 8 | `GOAL-06` |
| `M03` | Commerce & Payments | 18 | `GOAL-05` |
| `M04` | Entitlements & Access Control | 8 | `GOAL-05` |
| `M05` | Content Management | 16 | `GOAL-01`, `GOAL-07` |
| `M06` | Learning Experience | 14 | `GOAL-01` |
| `M07` | Goals & Motivation | 12 | `GOAL-01`, `GOAL-02` |
| `M08` | Assessment | 11 | `GOAL-01`, `GOAL-08` |
| `M09` | Certificates & Verification | 6 | `GOAL-08` |
| `M10` | AI Tutor | 14 | `GOAL-03` |
| `M11` | Q&A & Discussions | 7 | `GOAL-03` |
| `M12` | Reviews & Social Proof | 6 | `GOAL-08` |
| `M13` | Content Protection | 11 | `GOAL-04` |
| `M14` | Notifications & Lifecycle Email | 10 | `GOAL-01`, `GOAL-06` |
| `M15` | Support & Ticketing | 8 | `GOAL-06` |
| `M16` | Admin & Operations | 13 | `GOAL-06` |
| `M17` | Analytics & Reporting | 9 | `GOAL-06` |
| `M18` | Localization & Theming | 8 | `GOAL-07` |
| `M19` | Mobile Application | 10 | `GOAL-07` |
| `M20` | Public Site & Acquisition | 9 | `GOAL-08` |
| `M21` | Platform & Infrastructure | 10 | `CON-09` |
| | **Total** | **220** | |

---

## `M01` — Identity & Access

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-001` | Email + password registration | Standard signup with verification email | All learners | T1 |
| `FEAT-002` | Google OAuth | One-tap signup and login via Google | All learners | T1 |
| `FEAT-003` | Phone + OTP authentication | SMS-based registration and login for users without email habits | `PERS-01`, `PERS-02` | T1 |
| `FEAT-004` | Account linking | Merge Google, email, and phone identities into one account | All learners | T2 |
| `FEAT-005` | Email verification | Confirm ownership before granting full access | All | T1 |
| `FEAT-006` | Password reset | Token-based recovery flow | All | T1 |
| `FEAT-007` | JWT session management | Access + refresh token pair with rotation | All | T1 |
| `FEAT-008` | Active session list | User sees and revokes their own logged-in sessions | All | T2 |
| `FEAT-009` | Profile management | Name, avatar, bio, language preference, timezone | All | T2 |
| `FEAT-010` | Account settings | Password change, notification preferences, theme mode | All | T2 |
| `FEAT-011` | Account deletion request | GDPR-style deletion with retention of financial records | All | T4 |
| `FEAT-012` | Login activity log | Timestamped login history visible to the user | All | T4 |

---

## `M02` — Roles & Permissions

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-013` | Database-driven roles | Roles are rows, not hardcoded constants — new roles created from admin | `PERS-10` | T1 |
| `FEAT-014` | Granular permission registry | `model:action.scope` permissions (e.g. `course:update.own`) | `PERS-10` | T1 |
| `FEAT-015` | Role–permission assignment UI | Visual matrix for granting and revoking permissions per role | `PERS-10` | T2 |
| `FEAT-016` | Per-user permission overrides | Grant or revoke an individual permission outside their role | `PERS-10` | T2 |
| `FEAT-017` | Capability map in API responses | Every response carries `_can` so the UI renders only permitted actions (`PRIN-01`) | All staff | T1 |
| `FEAT-018` | Shared ability definitions | One CASL rule set consumed by backend, web, and mobile | All staff | T1 |
| `FEAT-019` | Ownership scoping | `.own` / `.any` scope resolution for instructor-owned resources | `PERS-11` | T1 |
| `FEAT-020` | Permission audit trail | Records who changed which permission and when | `PERS-10` | T4 |

---

## `M03` — Commerce & Payments

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-021` | Product abstraction | A sellable unit decoupled from content (`PRIN-05`) | `PERS-10` | T1 |
| `FEAT-022` | One-time purchase products | Single payment granting permanent or time-boxed access | All learners | T1 |
| `FEAT-023` | Subscription products | Recurring monthly or annual billing | `SEG-04` | T2 |
| `FEAT-024` | Bundle products | Multiple courses sold as one product | All learners | T2 |
| `FEAT-025` | Membership products | Access tier bundling content plus feature entitlements | `SEG-05` | T2 |
| `FEAT-026` | Feature add-on products | Sell a capability alone (e.g. extra AI quota) | `PERS-04` | T3 |
| `FEAT-027` | Multi-currency pricing | EGP, SAR, AED, USD with per-currency price overrides | Gulf + Egypt | T2 |
| `FEAT-028` | Paymob integration | Cards, mobile wallets, Fawry, installments (Egypt) | Egypt | T1 |
| `FEAT-029` | Stripe integration | International cards and subscriptions | Gulf, international | T2 |
| `FEAT-030` | Payment provider abstraction | `PaymentProvider` interface enabling gateway swap (`DEC-01`) | `PERS-10` | T1 |
| `FEAT-031` | Checkout flow | Cart-free direct checkout with order summary | All learners | T1 |
| `FEAT-032` | Coupons & discount codes | Percentage or fixed, usage-limited, expiring, product-scoped | `PERS-10` | T2 |
| `FEAT-033` | Time-limited launch pricing | Scheduled price windows without manual intervention | `PERS-10` | T4 |
| `FEAT-034` | Order & transaction records | Immutable financial history | `PERS-10` | T1 |
| `FEAT-035` | Invoice generation | PDF invoice per successful order | All learners | T2 |
| `FEAT-036` | Refund request workflow | Support requests, founder approves (`ROLE-04` → `ROLE-01`) | `PERS-13` | T2 |
| `FEAT-037` | Subscription lifecycle management | Renewal, failed payment retry, cancellation, grace period | `SEG-04` | T2 |
| `FEAT-038` | Payment webhook handling | Idempotent gateway callback processing | System | T1 |

---

## `M04` — Entitlements & Access Control

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-039` | Entitlement engine | Grants, expiry, and revocation of access rights | All learners | T1 |
| `FEAT-040` | Content entitlements | `access:course:{id}` with optional duration | All learners | T1 |
| `FEAT-041` | Feature entitlements | `feature:ai_tutor`, `feature:certificate`, `feature:priority_support` | All learners | T2 |
| `FEAT-042` | Quota entitlements | Metered rights such as AI messages per month (`DEC-06`) | `PERS-04` | T2 |
| `FEAT-043` | Product → entitlement mapping | Admin composes which rights a product grants | `PERS-10` | T1 |
| `FEAT-044` | Entitlement expiry & grace | Scheduled expiry with a configurable grace window | `SEG-06` | T2 |
| `FEAT-045` | Manual entitlement grant | Founder grants access without a purchase (gifts, support cases) | `PERS-10` | T2 |
| `FEAT-046` | Entitlement audit log | Full history of grants, expiries, and revocations | `PERS-10` | T4 |

---

## `M05` — Content Management

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-047` | Course CRUD | Create, edit, archive courses with bilingual fields (`CON-07`) | `PERS-10`, `PERS-11` | T1 |
| `FEAT-048` | Section / module structure | Ordered grouping of lessons within a course | Staff | T1 |
| `FEAT-049` | Lesson CRUD | Video, text, quiz, or assignment lesson types | Staff | T1 |
| `FEAT-050` | Drag-and-drop curriculum builder | Reorder sections and lessons visually | `PERS-12` | T2 |
| `FEAT-051` | Video upload to Bunny Stream | Direct-to-provider upload bypassing the VPS (`CON-03`) | Staff | T1 |
| `FEAT-052` | Video provider abstraction | `VideoProvider` interface for future DRM migration (`CON-04`) | System | T1 |
| `FEAT-053` | Lesson Notes editor | Block-based, timestamped instructor-authored content (`NG-07`) | Staff | T2 |
| `FEAT-054` | Timestamp-linked note blocks | Each block optionally binds to a video time range | Staff | T2 |
| `FEAT-055` | Auto-generated chapter markers | Player chapters derived from Lesson Note timestamps | All learners | T3 |
| `FEAT-056` | Resource attachments | `file`, `link`, `code`, `note`, `embed` types | `PERS-02` | T2 |
| `FEAT-057` | Resource timestamp binding | Resource surfaces at a specific moment during playback | `PERS-02` | T3 |
| `FEAT-058` | Resource-level entitlements | Individual resources gated independently of the lesson | `PERS-10` | T3 |
| `FEAT-059` | Draft / published states | Content invisible to learners until published | Staff | T1 |
| `FEAT-060` | Publish approval workflow | Instructors request; founder approves (`PERS-11`) | `PERS-10` | T2 |
| `FEAT-061` | Content versioning | Track edits with the ability to view prior versions | Staff | T4 |
| `FEAT-062` | Bulk media library | Central browsable store of uploaded files and images | `PERS-12` | T4 |

---

## `M06` — Learning Experience

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-063` | Custom video player | Built in-house on the provider's playback layer | All learners | T2 |
| `FEAT-064` | Playback controls | Speed, quality, captions, fullscreen, keyboard shortcuts | All learners | T2 |
| `FEAT-065` | Resume-to-second accuracy | Playback position persisted continuously | `PERS-03` | T2 |
| `FEAT-066` | Lesson completion tracking | Auto-complete at a watch threshold, plus manual marking | All learners | T2 |
| `FEAT-067` | Course progress calculation | Percentage across lessons, sections, and quizzes | All learners | T2 |
| `FEAT-068` | Continue Learning | Single prominent action resuming the exact stopping point | All learners | T2 |
| `FEAT-069` | Unlock rule engine | Composable conditions: prior lesson, quiz score, drip delay, manual (`PRIN-03`) | All learners | T3 |
| `FEAT-070` | Visible locked state | Locked items show title and explicit unlock condition | All learners | T3 |
| `FEAT-071` | Per-course sequential toggle | Locking disableable for reference-style courses (`PERS-03`) | `PERS-10` | T3 |
| `FEAT-072` | Timestamped personal notes | Student notes bound to a moment in the video | All learners | T3 |
| `FEAT-073` | Notes hub | All notes across all courses, each jumping to its source moment | All learners | T3 |
| `FEAT-074` | Lesson bookmarks | Quick-mark a lesson for later return | All learners | T4 |
| `FEAT-075` | In-course search | Search lesson titles and Lesson Notes within a course | `PERS-03` | T4 |
| `FEAT-076` | Learning session tracking | Records duration and lessons touched per session | System | T3 |

---

## `M07` — Goals & Motivation

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-077` | Post-registration onboarding | Goal, level, weekly commitment, interest capture | All learners | T2 |
| `FEAT-078` | Learning goal storage | Persistent goal linked to the user and optionally to a course | All learners | T2 |
| `FEAT-079` | Weekly commitment capture | Hours-per-week input driving all projections | All learners | T2 |
| `FEAT-080` | Projected completion date | Computed from remaining content and weekly commitment | `PERS-01` | T3 |
| `FEAT-081` | Goal editing & history | Changes recalculate projections and are recorded (`DEC-09`) | All learners | T3 |
| `FEAT-082` | Motivation dashboard | Greeting, streak, Continue, goal card, week status, next up, wins | All learners | T2 |
| `FEAT-083` | Distance-to-goal indicator | "X days remaining toward your target" on every visit (`GOAL-02`) | `PERS-01` | T3 |
| `FEAT-084` | Learning streaks | Consecutive-day counter with a freeze allowance | All learners | T3 |
| `FEAT-085` | Weekly progress vs commitment | "3 of 5 hours this week" comparison | All learners | T3 |
| `FEAT-086` | Behind-schedule recovery messaging | Encouraging recalibration, never guilt (`PRIN-02`) | All learners | T3 |
| `FEAT-087` | Milestone celebrations | Section completion, first quiz passed, halfway point, course finished | All learners | T3 |
| `FEAT-088` | Next-step recommendations | Suggests the next course based on goal and completion history | `PERS-01` | T4 |

---

## `M08` — Assessment

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-089` | Quiz builder | Create quizzes attached to lessons, sections, or courses | Staff | T3 |
| `FEAT-090` | Multiple choice — single answer | Standard MCQ | All learners | T3 |
| `FEAT-091` | Multiple choice — multiple answers | Partial or all-or-nothing scoring | All learners | T3 |
| `FEAT-092` | True / false questions | Binary question type | All learners | T3 |
| `FEAT-093` | Fill-in-the-blank | Text matching with configurable tolerance | All learners | T3 |
| `FEAT-094` | Essay questions | Long-form answers requiring grading | All learners | T3 |
| `FEAT-095` | AI-assisted essay scoring | AI proposes a score; human confirms (`NG-10`) | `PERS-10` | T4 |
| `FEAT-096` | Quiz configuration | Pass mark, attempt limit, timer, shuffle, answer reveal policy | Staff | T3 |
| `FEAT-097` | Attempt tracking & history | All attempts stored with answers and scores | All learners | T3 |
| `FEAT-098` | Encouraging result screens | Failure framed as retry, never as rejection (`PRIN-02`) | All learners | T3 |
| `FEAT-099` | Question bank | Reusable questions across quizzes with random selection | Staff | T4 |

---

## `M09` — Certificates & Verification

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-100` | Certificate eligibility rules | Completion percentage plus final assessment requirement | System | T3 |
| `FEAT-101` | Automatic issuance | Certificate generated the moment criteria are met | All learners | T3 |
| `FEAT-102` | PDF generation & storage | Rendered once, stored on R2 (`DEC-03`) | All learners | T3 |
| `FEAT-103` | Unique verification code | Non-sequential, non-guessable identifier per certificate | System | T3 |
| `FEAT-104` | Public verification page | Code lookup returning valid details or a clear "not found" | `SEG-01` | T3 |
| `FEAT-105` | Certificate sharing | LinkedIn, direct link, and download actions | All learners | T4 |

---

## `M10` — AI Tutor

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-106` | AI provider abstraction | Vendor-agnostic `chat`, `stream`, `embed` interface (`CON-06`) | System | T3 |
| `FEAT-107` | Per-task model configuration | Different provider/model per task, switchable without deployment | `PERS-10` | T3 |
| `FEAT-108` | Content embedding pipeline | Lesson Notes chunked and vectorized into `pgvector` (`DEC-02`) | System | T3 |
| `FEAT-109` | RAG retrieval | Semantic search returning the most relevant curriculum passages | System | T3 |
| `FEAT-110` | Curriculum-grounded answers | Responses constrained to academy content with source citation | All learners | T3 |
| `FEAT-111` | Timestamp jump from AI answer | Citation links jump the player to the referenced moment | All learners | T3 |
| `FEAT-112` | Student context injection | AI receives goal, level, progress, and current position (`GOAL-03`) | `PERS-01` | T3 |
| `FEAT-113` | Conversation history | Persistent threads scoped per course | All learners | T3 |
| `FEAT-114` | AI quota enforcement | Message limits by entitlement tier (`DEC-06`) | System | T3 |
| `FEAT-115` | Out-of-scope handling | Politely redirects questions outside the curriculum | All learners | T3 |
| `FEAT-116` | Escalation to instructor | "Ask the instructor" converts the thread into a Q&A item | All learners | T3 |
| `FEAT-117` | Model comparison tool | Same prompt across two models, results side by side | `PERS-10` | T4 |
| `FEAT-118` | AI cost tracking | Token and cost accounting per provider, model, and user | `PERS-10` | T4 |
| `FEAT-119` | Answer feedback | Thumbs up/down feeding quality review | `PERS-10` | T4 |

---

## `M11` — Q&A & Discussions

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-120` | Lesson-scoped questions | Questions bound to a specific lesson, never a global forum (`NG-03`) | All learners | T3 |
| `FEAT-121` | AI-first response | AI attempts an answer before human escalation | All learners | T3 |
| `FEAT-122` | Instructor answers | Founder or instructor responds to escalated questions | `PERS-10`, `PERS-11` | T3 |
| `FEAT-123` | Question resolution state | Open / answered / resolved lifecycle | All learners | T3 |
| `FEAT-124` | Public question visibility | Answered questions visible to other students on that lesson | All learners | T3 |
| `FEAT-125` | Question upvoting | Surfaces the most common blockers | All learners | T4 |
| `FEAT-126` | Q&A moderation | Hide, edit, or remove inappropriate content | `PERS-13` | T4 |

---

## `M12` — Reviews & Social Proof

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-127` | Eligibility gating | Verified purchase and ≥ 20% progress required (`DEC-05`) | System | T4 |
| `FEAT-128` | Star rating + written review | 1–5 stars with optional text | All learners | T4 |
| `FEAT-129` | Approval workflow | Reviews pending until approved | `PERS-10` | T4 |
| `FEAT-130` | Instructor reply | Public response attached to a review | `PERS-10` | T4 |
| `FEAT-131` | Threshold-based display | Hidden until ≥ 5 approved reviews exist (`DEC-05`) | `SEG-01` | T4 |
| `FEAT-132` | Aggregate rating | Average score and distribution on the course page | `SEG-01` | T4 |

---

## `M13` — Content Protection

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-133` | Signed video URLs | Short-lived, session-bound playback tokens | System | T1 |
| `FEAT-134` | Dynamic watermarking | Student name and identifier overlaid and moving during playback | System | T2 |
| `FEAT-135` | Single-device binding | One active playback device per account (`PRIN-04`) | System | T2 |
| `FEAT-136` | Device fingerprinting | Stable device identification with a human-readable label | System | T2 |
| `FEAT-137` | Device transfer request | Student-initiated switch request | All learners | T2 |
| `FEAT-138` | Automatic transfer policy | 2 auto-approvals per 30 days, then manual (`DEC-04`) | System | T2 |
| `FEAT-139` | Abuse flagging | Excessive transfer requests raise a review flag | `PERS-10` | T3 |
| `FEAT-140` | Concurrent stream limit | One active stream per account | System | T2 |
| `FEAT-141` | Mobile capture blocking | `FLAG_SECURE` on Android; capture detection and pause on iOS | System | T3 |
| `FEAT-142` | Signed resource URLs | Time-limited download links for R2-stored files | System | T2 |
| `FEAT-143` | Playback audit log | Who watched what, when, from which device | `PERS-10` | T3 |

---

## `M14` — Notifications & Lifecycle Email

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-144` | Transactional email | Verification, purchase confirmation, password reset, certificate delivery | All | T1 |
| `FEAT-145` | In-app notification center | Persistent notification feed with read state | All learners | T3 |
| `FEAT-146` | Push notifications (mobile) | Device push for reminders and replies | Mobile users | T4 |
| `FEAT-147` | Inactivity re-engagement | Triggered at 3 and 7 days of inactivity (`PRIN-02`) | All learners | T3 |
| `FEAT-148` | Streak reminders | Optional daily nudge respecting user preferences | All learners | T4 |
| `FEAT-149` | Milestone emails | Section complete, halfway, course complete | All learners | T3 |
| `FEAT-150` | Certificate delivery email | Certificate PDF with sharing prompts | All learners | T3 |
| `FEAT-151` | Subscription lifecycle email | Renewal notice, payment failure, expiry warning | `SEG-04` | T2 |
| `FEAT-152` | Notification preferences | Per-channel and per-category opt-out | All learners | T3 |
| `FEAT-153` | Email rate governance | Prioritization and throttling under the 3,000/month cap (`CON-10`) | System | T2 |

---

## `M15` — Support & Ticketing

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-154` | Ticket creation | Student-submitted support request with category | All learners | T3 |
| `FEAT-155` | Ticket threading | Message history between student and staff | All | T3 |
| `FEAT-156` | Ticket assignment | Route tickets to a specific staff member | `PERS-13` | T3 |
| `FEAT-157` | Ticket status workflow | Open / in progress / waiting / resolved / closed | `PERS-13` | T3 |
| `FEAT-158` | Priority levels | Elevated priority for entitled tiers (`SEG-05`) | `PERS-13` | T4 |
| `FEAT-159` | Canned responses | Reusable replies for recurring issues | `PERS-13` | T4 |
| `FEAT-160` | Attachment support | Screenshots and files on tickets | All | T3 |
| `FEAT-161` | Resolution time tracking | Measures `MET-12` | `PERS-10` | T4 |

---

## `M16` — Admin & Operations

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-162` | Unified admin shell | Admin routes inside the web application (`CON-03`) | Staff | T1 |
| `FEAT-163` | Operations dashboard | Revenue, new students, pending transfers, open tickets, AI escalations | `PERS-10` | T2 |
| `FEAT-164` | Student directory & lookup | Search with purchases, entitlements, device, progress, tickets | `PERS-13` | T2 |
| `FEAT-165` | Manual enrollment | Grant course access without payment | `PERS-10` | T2 |
| `FEAT-166` | Device transfer queue | Review and act on pending requests | `PERS-13` | T2 |
| `FEAT-167` | Product & pricing management | Compose offers without deployment (`PRIN-05`) | `PERS-10` | T1 |
| `FEAT-168` | Coupon management | Create and monitor discount codes | `PERS-10` | T2 |
| `FEAT-169` | AI configuration panel | Provider, model, temperature, and quota settings per task | `PERS-10` | T3 |
| `FEAT-170` | System settings | Branding, policies, thresholds, feature toggles | `PERS-10` | T2 |
| `FEAT-171` | Staff user management | Invite staff, assign roles, deactivate accounts | `PERS-10` | T2 |
| `FEAT-172` | Global audit log | Immutable record of all sensitive administrative actions | `PERS-10` | T3 |
| `FEAT-173` | Content approval queue | Pending publish requests awaiting review | `PERS-10` | T2 |
| `FEAT-174` | Impersonation (read-only) | View the platform as a specific student for debugging | `PERS-10` | T4 |

---

## `M17` — Analytics & Reporting

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-175` | Revenue reporting | By period, product, currency, and gateway | `PERS-10` | T2 |
| `FEAT-176` | Enrollment analytics | Signups, purchases, conversion rates | `PERS-10` | T3 |
| `FEAT-177` | Completion analytics | Per-course completion measuring `MET-01` | `PERS-10` | T3 |
| `FEAT-178` | Drop-off analysis | Identifies the lesson where students most often stop | `PERS-10` | T3 |
| `FEAT-179` | Engagement metrics | Weekly active learners, session length, streak distribution | `PERS-10` | T4 |
| `FEAT-180` | AI usage & cost reporting | Volume, deflection rate, and spend measuring `MET-03` | `PERS-10` | T4 |
| `FEAT-181` | Student progress reports | Individual learner detail view | `PERS-11` | T3 |
| `FEAT-182` | Quiz performance analytics | Question-level difficulty and failure patterns | `PERS-11` | T4 |
| `FEAT-183` | Data export | CSV export of key reports | `PERS-10` | T4 |

---

## `M18` — Localization & Theming

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-184` | Bilingual interface | Complete Arabic and English UI strings (`PRIN-07`) | All | T1 |
| `FEAT-185` | RTL / LTR layout system | Direction-aware layout across all surfaces | All | T1 |
| `FEAT-186` | Bilingual content fields | `jsonb` multilingual storage for all user-facing content (`CON-07`) | Staff | T1 |
| `FEAT-187` | Mixed-direction typography | Correct rendering of Arabic text containing English technical terms | All | T2 |
| `FEAT-188` | Language switcher | User-selectable interface language, persisted to profile | All | T1 |
| `FEAT-189` | Light / Dark / System modes | Three independently designed theme states | All | T2 |
| `FEAT-190` | Semantic design tokens | Shared token layer consumed by web, mobile, and admin | System | T1 |
| `FEAT-191` | Locale formatting | Dates, numbers, and currency formatted per locale | All | T2 |

---

## `M19` — Mobile Application

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-192` | Cross-platform app | iOS and Android from one codebase | `PERS-03` | T4 |
| `FEAT-193` | Mobile authentication | Google, email, and phone login with secure token storage | All learners | T4 |
| `FEAT-194` | Mobile video playback | Protected playback with watermarking and device binding | All learners | T4 |
| `FEAT-195` | Cross-device progress sync | Progress continues seamlessly between web and mobile | `PERS-03` | T4 |
| `FEAT-196` | Mobile dashboard | Full motivation dashboard parity | All learners | T4 |
| `FEAT-197` | Mobile AI tutor | Complete AI access from the app | All learners | T4 |
| `FEAT-198` | Mobile quizzes | Full assessment capability | All learners | T4 |
| `FEAT-199` | Mobile notes & Q&A | Note-taking and question submission | All learners | T4 |
| `FEAT-200` | Purchase redirection | Directs to web for purchases, no in-app payment (`NG-05`) | System | T4 |
| `FEAT-201` | Push notification handling | Receives and routes push messages to the right screen | All learners | T4 |

---

## `M20` — Public Site & Acquisition

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-202` | Landing page | Brand positioning and primary conversion surface | `SEG-01` | T2 |
| `FEAT-203` | Course catalog | Browsable, filterable public course listing | `SEG-01` | T2 |
| `FEAT-204` | Course detail page | Curriculum, outcomes, instructor, pricing, reviews | `SEG-01` | T2 |
| `FEAT-205` | Free preview lessons | Configurable per-lesson preview access (`DEC-08`) | `SEG-01` | T2 |
| `FEAT-206` | SEO optimization | Metadata, structured data, sitemap, indexable Lesson Note excerpts | `SEG-01` | T3 |
| `FEAT-207` | Public certificate verification | Verification code lookup page (`GOAL-08`) | `SEG-01` | T3 |
| `FEAT-208` | Blog / articles | Long-form content for organic acquisition | `SEG-01` | T4 |
| `FEAT-209` | Legal pages | Terms, privacy policy, refund policy | All | T2 |
| `FEAT-210` | Contact & inquiry form | Pre-purchase questions from visitors | `SEG-01` | T3 |

---

## `M21` — Platform & Infrastructure

| ID | Feature | Description | Serves | Tier |
|---|---|---|---|:--:|
| `FEAT-211` | Modular monolith structure | Domain-separated modules in a single deployable (`CON-01`) | System | T1 |
| `FEAT-212` | External CI image builds | Images built off-server and pulled by Coolify (`CON-03`) | System | T1 |
| `FEAT-213` | Background job queue | Redis-backed processing for email, PDF, and embeddings | System | T1 |
| `FEAT-214` | Scheduled task runner | Cron-driven expiry checks, streak resets, digests | System | T2 |
| `FEAT-215` | Automated off-server backups | Daily database dumps to R2 with 30-day retention (`CON-09`) | System | T1 |
| `FEAT-216` | Uptime monitoring & alerting | Health checks with push alerts to the founder | System | T1 |
| `FEAT-217` | Structured logging | Queryable application logs with request correlation | System | T2 |
| `FEAT-218` | Error tracking | Centralized exception capture and grouping | System | T2 |
| `FEAT-219` | Rate limiting | Per-endpoint and per-user throttling | System | T1 |
| `FEAT-220` | Object storage abstraction | R2 access wrapped for signed URL generation and lifecycle rules | System | T1 |

---

## 4. Tier Distribution

| Tier | Count | Share |
|---|---:|---:|
| **T1** — Foundation | 46 | 21% |
| **T2** — Core experience | 74 | 34% |
| **T3** — Differentiation | 62 | 28% |
| **T4** — Growth & optimization | 38 | 17% |
| **Total** | **220** | |

> **Interpretation:** The platform becomes commercially operational once T1 and T2 are complete (120 features). T3 delivers the competitive differentiation that justifies the price. T4 compounds retention and revenue over time. `15-implementation-roadmap.md` sequences these into phases; **no feature is deferred out of the build.**

---

## 5. Coverage Verification

Every goal in `01-problem-and-goals.md` is served by at least one module.

| Goal | Covering Modules |
|---|---|
| `GOAL-01` Finish what they started | `M05`, `M06`, `M07`, `M08`, `M14` |
| `GOAL-02` Visible goal | `M07` |
| `GOAL-03` AI mentor | `M10`, `M11` |
| `GOAL-04` Content protection | `M13` |
| `GOAL-05` Flexible selling | `M03`, `M04` |
| `GOAL-06` Minimal manual ops | `M02`, `M14`, `M15`, `M16`, `M21` |
| `GOAL-07` Premium Arabic UX | `M18`, `M19`, `M06` |
| `GOAL-08` Credible proof | `M09`, `M12`, `M20` |

No orphan modules. No uncovered goals.

---

## 6. Approval

| Item | Status |
|---|---|
| Resolved decisions `DEC-01`–`DEC-09` are accepted | ☐ Approved |
| Module structure `M01`–`M21` is correct | ☐ Approved |
| Feature inventory is complete — nothing missing | ☐ Approved |
| No feature in the list should be removed | ☐ Approved |
| Tier assignments are reasonable | ☐ Approved |

**Next document:** `04-feature-catalog.md` — behavioral specification of every feature: what it does, who uses it, why it exists, its rules, and its edge cases.

---
