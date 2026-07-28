# 02 — Target Users

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 02 — Target Users |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | `01-problem-and-goals.md` |
| **Feeds Into** | `03-features-identification.md`, `04-feature-catalog.md`, `05-roles-and-permissions.md`, `06-user-flows.md`, `07-business-logic.md`, `12-ui-ux-design.md` |

---

## 1. User Landscape

The system serves **three distinct populations**. Each has different volume, different needs, and different interface surfaces.

| Group | Population | Volume (Year 1) | Primary Surface |
|---|---|---|---|
| **Learners** | Paying and free students | ~100–500 | Web + Mobile |
| **Staff** | Founder, instructors, assistants, support | 1–6 | Admin (inside web) |
| **Visitors** | Unauthenticated public | High | Public web only |

> **Design consequence:** Learner-facing surfaces carry ~99% of traffic and must be optimized for motivation and speed. Staff surfaces carry ~1% of traffic and must be optimized for control and clarity, not polish.

---

## 2. Learner Personas

Each persona maps to a selectable goal in the onboarding flow (`FLOW` in `06-user-flows.md`), which drives dashboard copy, course recommendations, projected completion dates, and AI tutor context.

---

### `PERS-01` — The Career Switcher

| Attribute | Value |
|---|---|
| **Onboarding goal** | "Change my field" |
| **Age range** | 22–32 |
| **Level** | Beginner to basic |
| **Weekly commitment** | 8–15 hours |
| **Location** | Egypt, Gulf |
| **Language** | Arabic primary, reads English technical terms |
| **Device** | Laptop for practice, phone for review |
| **Priority** | **Highest** — largest segment, highest motivation, highest lifetime value |

**Motivation:** Currently in an unrelated or low-paying job. Wants a defined path into tech with a visible end date. Emotionally invested — this is a life decision, not a hobby.

**Fears:**
- Wasting months on the wrong path
- Not being good enough
- Buying another course and abandoning it like the last one

**What makes them finish:** A projected completion date, weekly structure, and visible proof they are closer than last week.

**What makes them quit:** Getting stuck with no one to ask. Silence after a payment.

**Depends on:** `GOAL-01`, `GOAL-02`, `GOAL-03`, `GOAL-08`

---

### `PERS-02` — The Aspiring Freelancer

| Attribute | Value |
|---|---|
| **Onboarding goal** | "Work as a freelancer" |
| **Age range** | 20–30 |
| **Level** | Basic to intermediate |
| **Weekly commitment** | 10–20 hours |
| **Language** | Arabic primary |
| **Device** | Laptop-heavy |
| **Priority** | **High** — strong word-of-mouth generator |

**Motivation:** Wants income, not credentials. Measures every lesson against "can I sell this?" Impatient with theory.

**Fears:** Learning something outdated or unmarketable. Finishing a course and still not knowing how to get a first client.

**What makes them finish:** Practical, project-based output. Downloadable project files. Real code they can show.

**What makes them quit:** Long theoretical sections with no deliverable.

**Design implication:** Resources (`file`, `code`, `embed` types) matter more for this persona than for any other. Project files must be first-class, not attachments.

**Depends on:** `GOAL-01`, `GOAL-03`, `GOAL-05`

---

### `PERS-03` — The Working Professional

| Attribute | Value |
|---|---|
| **Onboarding goal** | "Grow in my current job" |
| **Age range** | 26–40 |
| **Level** | Intermediate to advanced |
| **Weekly commitment** | 3–5 hours |
| **Language** | Comfortable in both Arabic and English |
| **Device** | Phone during commute, laptop at night |
| **Priority** | **Medium-High** — lowest churn, highest repeat purchase rate |

**Motivation:** Filling specific knowledge gaps. Does not want a full beginner path — wants the two modules that matter.

**Fears:** Wasting limited time on content below their level.

**What makes them finish:** Short sessions that resume exactly where they stopped. Ability to skip ahead when the sequential lock is disabled for reference courses.

**What makes them quit:** Being forced through beginner material. Being unable to find a specific topic.

**Design implication:**
- **Continue Learning must be precise to the second.** This persona has 20-minute windows.
- **Mobile is not optional for them** — it is their primary consumption device (`MET-07`).
- Sequential locking must be **per-course disableable** (`PRIN-03` still applies: locks are visible, not hidden).

**Depends on:** `GOAL-01`, `GOAL-07`, `MET-10`, `MET-11`

---

### `PERS-04` — The Project Builder

| Attribute | Value |
|---|---|
| **Onboarding goal** | "Build my own product" |
| **Age range** | 24–38 |
| **Level** | Basic to intermediate |
| **Weekly commitment** | 10–20 hours, irregular |
| **Language** | Arabic primary |
| **Device** | Laptop |
| **Priority** | **Medium** — heaviest AI tutor user |

**Motivation:** Has a specific idea and is learning only what unblocks it. Learns non-linearly by necessity.

**Fears:** Building something broken or insecure without knowing it.

**What makes them finish:** An AI mentor that answers *their* specific case, grounded in the instructor's material rather than generic internet advice.

**What makes them quit:** Generic answers that contradict the lessons.

**Design implication:** This persona will consume disproportionate AI tokens. Confirms the decision to make AI access an **entitlement with quotas** (`GOAL-05`, `CON-02`).

**Depends on:** `GOAL-03`, `GOAL-05`

---

### `PERS-05` — The Casual Learner

| Attribute | Value |
|---|---|
| **Onboarding goal** | "Learn out of interest" |
| **Weekly commitment** | 1–3 hours, inconsistent |
| **Priority** | **Low** — served, not optimized for |

**Motivation:** Curiosity. No deadline, no external pressure.

**Reality check:** This persona has the highest abandonment rate and the lowest willingness to pay. The platform serves them through free courses, but **no feature is designed specifically for them**. They are the primary target of free-tier content acting as a funnel toward `PERS-01`–`PERS-04`.

---

## 3. Learner Segments by Access Type

Independent of persona, every learner falls into one of these commercial states at any moment. These map directly to the entitlement layer (`GOAL-05`).

| ID | Segment | Description | Access |
|---|---|---|---|
| `SEG-01` | **Visitor** | Not registered | Public pages, free previews, certificate verification |
| `SEG-02` | **Free Registered** | Account, no purchase | Free courses, limited or no AI, progress tracking |
| `SEG-03` | **Course Owner** | Bought one or more courses | Owned course content + attached feature entitlements |
| `SEG-04` | **Subscriber** | Active recurring subscription | All content in the subscription tier while active |
| `SEG-05` | **Member** | Membership product | Content + bundled feature entitlements (AI, priority support, extras) |
| `SEG-06` | **Expired** | Previously had access, now lapsed | Sees own progress and history; content locked with a **re-activation invitation**, never a punishment screen (`PRIN-02`) |

> **Critical rule:** `SEG-06` users must never lose their progress data, notes, or certificates. Losing history is the single fastest way to guarantee they never return.

---

## 4. Staff Personas

Detailed permission matrices belong to `05-roles-and-permissions.md`. This section defines **who they are and what they actually do daily**.

---

### `PERS-10` — Super Admin (Founder)

| Attribute | Value |
|---|---|
| **Count** | 1 |
| **Technical level** | High |
| **Role ID** | `ROLE-01` |

**Daily reality:** Teaching, recording, writing Lesson Notes, answering escalated questions, checking revenue.

**Needs from the system:**
- A single operations screen: today's revenue, new students, pending device transfer requests, open tickets, questions the AI could not answer
- Ability to create any commercial offer without a deployment (`PRIN-05`)
- Full visibility into AI cost per provider and per model (`CON-06`)
- Confidence that backups exist and the server is alive (`CON-09`)

**Explicit design constraint:** The founder's non-teaching time is capped at **under 3 hours per week** (`MET-06`). Any admin workflow requiring more than a few clicks per occurrence is a design failure.

---

### `PERS-11` — Instructor

| Attribute | Value |
|---|---|
| **Count** | 0 today — designed for future |
| **Role ID** | `ROLE-02` |

**Scope:** Owns their own courses only. Creates content, uploads video, writes Lesson Notes, builds quizzes, answers escalated Q&A on their lessons, sees enrolled student progress.

**Boundaries:**
- **Cannot publish directly** — submits for approval (`course:publish.request` → founder approves). The academy carries the founder's name; content quality is brand risk.
- **Cannot see student email, phone, or payment data.** Name, progress, and quiz results only.
- **Cannot see revenue.**

> **Build note:** Permissions and data scoping for `ROLE-02` are implemented from day one. Instructor-specific admin screens are deferred until a real instructor exists — the role works through the standard admin with scoped visibility.

---

### `PERS-12` — Content Assistant

| Attribute | Value |
|---|---|
| **Count** | 0–1 |
| **Technical level** | Low to medium |
| **Role ID** | `ROLE-03` |

**Scope:** Writes and edits lesson notes, uploads video and resources, arranges sections, prepares descriptions and thumbnails, drafts quizzes.

**Boundaries:** Cannot publish. Cannot see students, revenue, or any personal data. Cannot delete published content.

**Design implication:** This is the **least technical user of the admin panel**. Their screens must be the most forgiving: clear labels, undo where possible, no destructive action without confirmation, and — per `PRIN-01` — actions they cannot perform simply do not render.

---

### `PERS-13` — Support Agent

| Attribute | Value |
|---|---|
| **Count** | 0–1 |
| **Role ID** | `ROLE-04` |

**Daily reality:** Handles tickets, approves or rejects device transfer requests, checks whether a student's access is active, escalates payment problems.

**Needs:** A single student lookup screen showing purchases, entitlements, active device, progress, and ticket history — without exposing full payment instruments.

**Boundaries:**
- Can **request** a refund; cannot approve one. `refund:request` → founder holds `refund:approve`.
- Can see subscription status; cannot see card data or full transaction details.
- Can approve device transfers **within policy limits**; requests exceeding the abuse threshold escalate to the founder (`OQ-04`).

---

## 5. Visitors (Unauthenticated)

`SEG-01` deserves explicit design attention because it is the **entire acquisition surface**.

| Need | Surface |
|---|---|
| Understand what the academy teaches | Landing page, course catalog |
| Evaluate before paying | Free preview lessons, curriculum outline, reviews |
| Trust the outcome | Public certificate verification page (`GOAL-08`) |
| Find the academy at all | SEO-indexed course pages and public Lesson Notes excerpts |

> **Strategic note:** The public certificate verification page is simultaneously a trust mechanism and an acquisition channel. Every certificate a student shares on LinkedIn creates an indexed, branded entry point back to the platform.

---

## 6. Anti-Personas

Users the platform explicitly does **not** optimize for. Documented to prevent scope drift.

| ID | Anti-Persona | Rationale |
|---|---|---|
| `ANTI-01` | **The bargain hunter** | Seeks the lowest price and shares logins. The single-device binding model (`GOAL-04`) intentionally makes this segment unprofitable to serve. |
| `ANTI-02` | **The enterprise L&D buyer** | Requires seat management, SSO, invoicing, SLAs, and reporting. Out of scope — see `NG-08`. |
| `ANTI-03` | **The external instructor** | Wants to publish and monetize their own content on the platform. Out of scope — see `NG-01`. |
| `ANTI-04` | **The offline consumer** | Wants downloadable video. Conflicts directly with `GOAL-04` — see `NG-09`. |
| `ANTI-05` | **The certificate collector** | Wants credentials without completing work. Certificates require verified completion and passing assessment; there is no shortcut path. |

---

## 7. Usage Context

Real-world conditions that constrain design decisions.

| Dimension | Reality | Design Consequence |
|---|---|---|
| **Language** | Arabic-dominant learners; mixed Arabic explanation with English technical terms in the same sentence | Bilingual typography must render mixed-direction text cleanly (`PRIN-07`, `CON-07`) |
| **Device split** | Laptop for practice, phone for review and repeat viewing | Mobile must be a full learning client, not a viewer (`MET-07`) |
| **Peak hours** | Evenings (20:00–01:00 local) and weekends | Support expectations are asynchronous; the AI tutor carries the night shift (`GOAL-03`) |
| **Connectivity** | Variable mobile data quality across Egypt and the Gulf | Adaptive bitrate is mandatory; CDN delivery is non-negotiable (`CON-04`) |
| **Payment habits** | Cards are not universal; wallets, Fawry, and installments are common in Egypt | Paymob must cover local methods; Stripe covers Gulf and international (`CON-08`) |
| **Trust baseline** | Low trust in Arabic online courses due to prior bad experiences | Free previews, visible curriculum, verified reviews, and refund clarity are trust infrastructure, not extras |

---

## 8. Persona → Goal Coverage Matrix

Validates that every goal from `01-problem-and-goals.md` serves a real user.

| Goal | `PERS-01` | `PERS-02` | `PERS-03` | `PERS-04` | `PERS-10` | `PERS-13` |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `GOAL-01` Finish what they started | ●●● | ●●● | ●● | ●● | ●● | — |
| `GOAL-02` Visible goal | ●●● | ●● | ● | ●● | — | — |
| `GOAL-03` AI mentor | ●●● | ●● | ● | ●●● | ●●● | ●● |
| `GOAL-04` Content protection | — | — | — | — | ●●● | ●● |
| `GOAL-05` Flexible selling | ● | ●● | ●● | ●● | ●●● | — |
| `GOAL-06` Minimal manual ops | — | — | — | — | ●●● | ●●● |
| `GOAL-07` Premium Arabic UX | ●●● | ●● | ●●● | ●● | ● | ● |
| `GOAL-08` Credible proof | ●●● | ●●● | ●● | ● | ●● | — |

`●●●` critical · `●●` important · `●` useful · `—` not applicable

> **Reading the matrix:** `PERS-01` (Career Switcher) is the strongest persona across the most goals. When a design trade-off arises between personas, **resolve in favor of `PERS-01`.**

---

## 9. Design Implications Summary

Binding conclusions carried into `03` and `04`.

1. **Onboarding is not optional infrastructure.** The goal, level, and weekly commitment captured at signup power the dashboard, projected dates, email timing, recommendations, and AI context. Without it, four other systems degrade.
2. **The dashboard is the most important screen in the product** — more important than the course page or the player. It is where motivation is manufactured.
3. **Mobile must be a full client.** `PERS-03` consumes primarily on mobile. A viewer-only app fails a core persona.
4. **AI cost is driven by `PERS-04`.** Quotas and entitlement gating are financial necessities, not upsell tactics.
5. **`SEG-06` (Expired) must be treated as a returning friend**, not a locked-out stranger. Progress, notes, and certificates persist permanently.
6. **Instructor permissions are built now; instructor screens are built later.** The data model must not assume a single instructor.
7. **The content assistant is the least technical admin user.** Admin usability is calibrated to them, not to the founder.

---

## 10. Open Questions

| ID | Question | Blocking | Owner |
|---|---|---|---|
| `OQ-06` | Do free registered users (`SEG-02`) get any AI tutor access, or is AI strictly a paid entitlement? | `04-feature-catalog`, `07-business-logic` | Founder |
| `OQ-07` | What exactly can `SEG-06` (Expired) still see — full progress history and notes only, or also previously completed lesson notes as read-only? | `07-business-logic` | Founder |
| `OQ-08` | Are free preview lessons per-course configurable, or a fixed rule (e.g. first lesson of each course)? | `04-feature-catalog` | Founder |
| `OQ-09` | Should the onboarding goal be changeable at any time, or locked for a period to preserve the projected date's meaning? | `06-user-flows` | Joint |

---

## 11. Approval

| Item | Status |
|---|---|
| Learner personas `PERS-01`–`PERS-05` are accurate | ☐ Approved |
| `PERS-01` is confirmed as the priority persona for trade-offs | ☐ Approved |
| Access segments `SEG-01`–`SEG-06` are complete | ☐ Approved |
| Staff personas and their boundaries are correct | ☐ Approved |
| Anti-personas are accepted | ☐ Approved |
| Design implications are binding | ☐ Approved |

**Next document:** `03-features-identification.md` — the complete inventory of every feature in the product, grouped by module, each mapped to the goals and personas it serves.

---
