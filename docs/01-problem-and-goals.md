# 01 — Problem & Goal Definition

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 01 — Problem & Goal Definition |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | — (root document) |
| **Feeds Into** | `02-target-users.md`, `03-features-identification.md`, `04-feature-catalog.md`, `07-business-logic.md`, `15-implementation-roadmap.md` |

---

## 1. Problem Statement

### 1.1 The Real Problem

The bottleneck in online education is **not access to content**. Content is abundant and mostly free.

The bottleneck is that **people buy courses and never finish them**.

Industry completion rates for self-paced online courses sit between **3% and 15%**. This means that for every 100 students who pay, 85–97 never reach the outcome they paid for. They do not blame the content — they blame themselves, they stop trusting paid learning, and they never come back for a second purchase.

This creates a compounding failure for both sides:

- **The student** loses money, time, and confidence. The skill they wanted remains out of reach.
- **The academy** loses repeat revenue, referrals, testimonials, and reputation — because a student who never finished has no result to talk about.

### 1.2 The Founder's Problem

The founder is a single instructor with real teaching value. That value currently does not scale:

- **Guidance does not scale.** The founder cannot personally mentor every student. The moment a student gets stuck, the learning stops — and the founder is not there.
- **Content is unprotected.** Video and materials leak into WhatsApp groups and Telegram channels, destroying the price of the product.
- **Delivery is fragmented.** Drive links, YouTube unlisted videos, WhatsApp groups, and manual payment confirmation do not form a product. They form maintenance work.
- **Progress is invisible.** There is no way to know who is stuck, who is about to quit, or who is close to finishing.

### 1.3 The Student's Problem

From the student's side, the experience of most learning platforms is:

- **No direction.** A list of videos is not a path. The student must self-navigate, self-motivate, and self-assess.
- **No reason to return tomorrow.** Nothing on the platform reminds them why they started.
- **No one to ask.** Getting stuck at 11 PM means waiting days for a reply, or quitting.
- **No proof of progress.** Effort produces no visible, shareable, credible result.

### 1.4 Problem Summary

> Students do not fail because content is missing.
> They fail because **structure, guidance, and motivation** are missing.

Josam Academy is built to supply exactly those three things.

---

## 2. Why Existing Solutions Fail

| Solution | Why it does not solve the problem |
|---|---|
| **YouTube** | Free, unstructured, no accountability, no revenue, no protection, no progress tracking. Algorithm competes for the student's attention mid-lesson. |
| **Udemy / Coursera** | Marketplace economics. Heavy price competition, low perceived value, no brand ownership, no student relationship, no control over pricing or presentation. Commission on every sale. |
| **Google Drive + WhatsApp** | Zero protection, zero structure, zero automation. Every operation is manual. Does not scale past a few dozen students. |
| **Generic LMS (Moodle, Teachable)** | Built for content delivery, not for learner motivation. English-first with weak Arabic/RTL support. No integrated AI guidance. Limited or no per-model permission control. |
| **Generic AI chatbots (ChatGPT etc.)** | Answer from general world knowledge, not from *this* curriculum. No awareness of the student's level, goal, or position in the course. Frequently contradict the instructor. |

**The gap:** No existing product combines *Arabic-first structured learning*, *serious content protection*, *curriculum-grounded AI mentorship*, and *goal-driven motivation* in a single owned platform.

---

## 3. Product Vision

> **Josam Academy is not a course platform. It is a guided learning journey.**
>
> A student arrives with a goal, is given a clear path toward it, is guided at every step by an AI mentor trained on the instructor's own material, and is continuously shown how close that goal has become — until they finish, prove it, and go back for the next one.

Every product decision in the following documents must be testable against this vision. If a feature does not help a student **start**, **continue**, or **finish**, it is a candidate for the Non-Goals list.

---

## 4. Core Goals

Each goal carries a stable ID. All features in `04-feature-catalog.md` must map to at least one goal.

### `GOAL-01` — Make students finish what they started
Raise course completion far above industry baseline through structured paths, sequential unlocking, visible progress, streaks, and re-engagement messaging.
**Primary metric:** `MET-01`

### `GOAL-02` — Give every student a goal, and keep it visible
Capture the student's personal goal, current level, and weekly time commitment at onboarding. Convert that into a projected completion date and surface the distance to that goal on every visit.
**Primary metric:** `MET-02`

### `GOAL-03` — Replace the instructor's presence with an AI mentor
Provide an AI tutor grounded strictly in the academy's own curriculum, aware of the student's goal, level, and position, capable of resolving the majority of questions without founder involvement.
**Primary metric:** `MET-03`

### `GOAL-04` — Protect content without punishing honest students
Apply layered protection (signed URLs, dynamic watermarking, single-device binding with a controlled transfer request flow, capture blocking on mobile) that makes leaking traceable and costly, while keeping the legitimate student experience frictionless.
**Primary metric:** `MET-04`

### `GOAL-05` — Sell flexibly without engineering work
Decouple products from content through an entitlement layer, so that subscriptions, one-time purchases, bundles, memberships, and feature-level access can be composed entirely from the admin panel.
**Primary metric:** `MET-05`

### `GOAL-06` — Operate the academy with minimal manual work
Automate enrollment, access granting, device transfer policy, certificate issuance, support ticketing, and lifecycle email — so the founder's time goes to teaching, not administration.
**Primary metric:** `MET-06`

### `GOAL-07` — Deliver a premium, Arabic-first experience
Full Arabic and English interface with correct RTL/LTR handling, light and dark modes, and a visual identity that signals professional value — across web, mobile, and admin.
**Primary metric:** `MET-07`

### `GOAL-08` — Prove outcomes credibly
Issue verifiable certificates with unique verification codes and a public verification page, turning student results into shareable social proof and a acquisition channel.
**Primary metric:** `MET-08`

---

## 5. Success Metrics

Baselines are set at launch. Targets are evaluated at **6 months** and **12 months** post-launch.

| ID | Metric | Definition | 6-Month Target | 12-Month Target |
|---|---|---|---|---|
| `MET-01` | **Course Completion Rate** | Enrolled students reaching 100% of a course | ≥ 35% | ≥ 45% |
| `MET-02` | **Goal Set Rate** | Registered users who complete onboarding and set a learning goal | ≥ 70% | ≥ 80% |
| `MET-03` | **AI Deflection Rate** | Student questions resolved by AI without escalation to instructor | ≥ 60% | ≥ 75% |
| `MET-04` | **Content Leak Incidents** | Confirmed leaks traced via watermark per quarter | ≤ 2 | ≤ 2 |
| `MET-05` | **Time to Launch an Offer** | Admin time to create a new product/bundle without code changes | < 15 min | < 10 min |
| `MET-06` | **Manual Ops Load** | Founder hours per week spent on non-teaching operations | < 3 hrs | < 2 hrs |
| `MET-07` | **Mobile Session Share** | Share of learning sessions originating from mobile app | ≥ 30% | ≥ 45% |
| `MET-08` | **Certificate Issuance Rate** | Completing students who receive a certificate | ≥ 90% | ≥ 95% |
| `MET-09` | **7-Day Activation** | New students completing at least one lesson within 7 days of purchase | ≥ 65% | ≥ 75% |
| `MET-10` | **Repeat Purchase Rate** | Students purchasing a second product within 6 months | ≥ 20% | ≥ 30% |
| `MET-11` | **Weekly Active Learners** | Students with ≥ 1 learning session per week | ≥ 40% | ≥ 50% |
| `MET-12` | **Support Resolution Time** | Median time from ticket creation to resolution | < 12 hrs | < 6 hrs |

> **Note:** `MET-01` and `MET-09` are the two metrics that validate the entire product thesis. If completion and activation do not beat industry baseline, the motivation system is not working and must be revisited before scaling content.

---

## 6. Non-Goals

Explicitly **out of scope**. Any request to add these must be treated as a scope change and re-evaluated against `GOAL-01`–`GOAL-08`.

| ID | Non-Goal | Rationale |
|---|---|---|
| `NG-01` | **Public marketplace for external instructors** | Josam Academy is a branded academy, not a marketplace. Content quality is the brand. Instructor roles exist for controlled, invited teaching staff only. |
| `NG-02` | **Live streaming / live classes at launch** | Significant infrastructure cost and operational load. May be reconsidered post-launch as a separate module. |
| `NG-03` | **Social network features** | No public profiles, follows, feeds, or student-to-student messaging. Increases moderation load and distracts from `GOAL-01`. Q&A is scoped strictly to lessons. |
| `NG-04` | **Heavy gamification** | No points economy, no leaderboards, no badge inflation. Streaks, progress, and certificates only. Excessive gamification cheapens professional technical content. |
| `NG-05` | **In-app purchases on mobile** | Purchases occur on web only, to avoid 30% platform commission and store policy restrictions. Mobile is a full learning client, not a sales channel. |
| `NG-06` | **100% unbreakable DRM at launch** | True hardware DRM (Widevine/FairPlay) exceeds current budget. Layered protection is the launch strategy; DRM is a post-revenue upgrade behind a provider abstraction. |
| `NG-07` | **Automatic AI transcription of videos** | Lesson content is authored manually by the instructor as structured, timestamped Lesson Notes — producing higher quality, student-facing, SEO-indexable material. ASR remains a disabled optional path. |
| `NG-08` | **Multi-tenant / white-label SaaS** | The system serves one academy. Multi-tenancy would add architectural cost with no near-term return. |
| `NG-09` | **Offline video download** | Substantially weakens the content protection model. Reconsider only if DRM is adopted. |
| `NG-10` | **Automated AI grading as final authority** | AI may assist in scoring essay answers, but final grades affecting certification require human confirmation. |

---

## 7. Key Constraints

| ID | Constraint | Impact on Design |
|---|---|---|
| `CON-01` | **Single-person team** (founder + AI assistance) | Favor a modular monolith over microservices. Avoid operational complexity. Automate aggressively. |
| `CON-02` | **Infrastructure budget ≈ $30/month** | Self-hosted VPS. Managed services only where unavoidable (video CDN, object storage, email). |
| `CON-03` | **VPS: 2 vCPU / 8 GB RAM / 100 GB / 8 TB** (Hetzner-class, Frankfurt, Coolify) | RAM is sufficient; **CPU is the binding constraint**. No on-server builds — CI builds images externally. No video transcoding on server. Admin ships inside the web app, not as a separate service. |
| `CON-04` | **Video delivery via Bunny Stream** | Transcoding, CDN, dynamic watermarking, and token authentication are provider-supplied. Must be wrapped in a `VideoProvider` abstraction to allow future migration. |
| `CON-05` | **Object storage via Cloudflare R2** | Zero egress cost. Used for documents, images, certificates, and database backups. All private files served via short-lived signed URLs. |
| `CON-06` | **AI provider must be swappable** | No hard dependency on any single AI vendor. Chat/completion models switchable per-task from admin. **Embedding model is a semi-permanent decision** — changing it requires full re-indexing. |
| `CON-07` | **Bilingual content model (AR/EN)** | All user-facing text fields must be `jsonb` multilingual from day one. Retrofitting is prohibitively expensive. |
| `CON-08` | **Egyptian + Gulf payment coverage** | Paymob (Egypt: cards, wallets, Fawry, installments) and Stripe (international). Merchant account requirements must be resolved before Phase 1 completion. |
| `CON-09` | **Single point of failure (one VPS)** | Mandatory from day one: automated daily off-server database backups to R2 with 30-day retention, plus uptime monitoring with push alerts. |
| `CON-10` | **Email volume ≤ 3,000/month** (Resend free tier) | Lifecycle email must be prioritized and rate-limited. Transactional email takes precedence over marketing sends. |

---

## 8. Guiding Principles

Non-negotiable rules that govern every downstream document.

### `PRIN-01` — Capability over rejection
The system never tells a user "you don't have permission." Unavailable actions are **absent**, not blocked. Every API response carries a capability map (`_can`) that the UI builds itself from. Hard `403` responses exist only as a security backstop against direct API manipulation.

### `PRIN-02` — Every message encourages or informs. Never guilts.
Applies universally: emails, notifications, locked-lesson states, failed quiz results, expired access screens. A student who falls behind is invited back, never scolded. This principle is enforced as concrete copy rules in `07-business-logic.md`.

### `PRIN-03` — Show the path, don't hide it
Locked content remains **visible** with its title and an explicit unlock condition. Students must always see where they are going. Hiding the path removes motivation.

### `PRIN-04` — Protection must be invisible to honest students
Security measures must not degrade the legitimate experience. Device binding applies to **video playback only** — browsing, notes, AI, Q&A, and progress remain accessible from any device.

### `PRIN-05` — Sell configuration, not code
Every commercial construct — course, bundle, membership, subscription, feature unlock — is composed from existing primitives in the admin panel. New offers must never require a deployment.

### `PRIN-06` — Ship working slices
The full product is built without omission, but delivered in sequential phases that each reach production in working condition. No phase waits on a later phase to become usable.

### `PRIN-07` — Arabic is first-class, not translated
The platform is designed Arabic-first with correct RTL, Arabic typography, and Arabic-native copy — with English as a complete parallel, not an afterthought.

---

## 9. Open Questions

Items requiring resolution before or during the referenced document.

| ID | Question | Blocking | Owner |
|---|---|---|---|
| `OQ-01` | Does the founder hold a commercial registration required for a Paymob merchant account? If not, alternative gateway (Kashier / Fawry) must be selected. | `13-tech-stack`, Phase 1 | Founder |
| `OQ-02` | Final embedding model selection for Arabic RAG — semi-permanent decision. | `08-system-design` | Joint |
| `OQ-03` | Certificate template design and required fields (logo, signature, QR to verification page). | `12-ui-ux-design` | Joint |
| `OQ-04` | Default device transfer policy values (auto-approvals per period, manual threshold, abuse flag threshold). | `07-business-logic` | Founder |
| `OQ-05` | Minimum review count before public display, and minimum course progress required to submit a review. | `07-business-logic` | Founder |

---

## 10. Approval

| Item | Status |
|---|---|
| Problem statement accurately reflects the founder's situation | ☐ Approved |
| Vision statement is correct and complete | ☐ Approved |
| Goals `GOAL-01`–`GOAL-08` are correct and complete | ☐ Approved |
| Success metrics and targets are realistic | ☐ Approved |
| Non-Goals list is accepted | ☐ Approved |
| Guiding principles are binding | ☐ Approved |

**Next document:** `02-target-users.md` — personas, roles, motivations, and usage contexts for every user type the system serves.

---
