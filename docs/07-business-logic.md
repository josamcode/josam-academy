# 07 — Business Logic

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 07 — Business Logic |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | `04-feature-catalog` (all parts), `05-roles-and-permissions.md`, `06-user-flows.md` |
| **Feeds Into** | `08-system-design.md`, `10-database-design.md`, `11-api-contract.md`, `12-ui-ux-design.md`, `16-task-breakdown.md` |
| **Consolidates** | `BR-001` – `BR-772` · Adds `BR-773` – `BR-830` |

---

## 1. Purpose

The feature catalog defined **what** each part of the system does. This document defines **when** things happen, **how** values are calculated, and **what words** the system uses.

It is organized as five reference sections an implementer opens directly:

| § | Section | Answers |
|---|---|---|
| 3 | State Machines | What states exist and which transitions are legal |
| 4 | Formulas | How every computed number is derived |
| 5 | Timing & Triggers | When each notification fires, on which channel |
| 6 | Decision Tables | How access, playback, and eligibility resolve |
| 7 | Copy Specification | The exact language rules enforcing `PRIN-02` |
| 8 | Settings Registry | Every configurable number in one table |

---

## 2. Resolved Decisions

| ID | Resolves | Decision |
|---|---|---|
| `DEC-10` | `OQ-15` | **The review prompt threshold is a platform setting** (`review_prompt_progress_threshold`), default 30%. Eligibility remains a separate setting (`review_eligibility_progress`), default 20%. The prompt appears at most twice: once at the threshold, once at completion. |
| `DEC-11` | `OQ-16` | **Pause is reason-gated, not universal.** Cancellation asks the reason first, then offers only the remedy that fits it. A maximum of one retention offer is made, and the cancel action remains visible throughout. |
| `DEC-12` | `OQ-11` | **Gregorian dates only**, with Hijri as an optional per-user display preference disabled by default. Adding a dual-calendar system to every date surface is disproportionate to demand. |
| `DEC-13` | `OQ-12` | **Blog (`FEAT-208`) ships after first revenue.** It is a growth feature with no dependency on the core product, and it competes for authoring time with course content. |
| `DEC-14` | `OQ-13` | **Content Assistant edits all courses.** Per-course assignment is deferred until more than one instructor exists; the permission model already supports narrowing it later without migration. |
| `DEC-15` | `OQ-14` | **Support sees no monetary values in any form**, including aggregates or customer-value labels. A single, clean boundary is more maintainable than a partial one. |

**Rules:**
- `BR-773` — `DEC-11` prohibits presenting more than one retention offer. Repeated offers constitute a dark pattern and contradict the trust posture the brand depends on.
- `BR-774` — The cancellation action remains visible and enabled on every screen of the cancellation flow.

---

## 3. State Machines

### 3.1 Order

```
                  ┌──────────────┐
   created ──────▶│pending_payment│
                  └───────┬──────┘
                          │
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
      ┌────────┐    ┌──────────┐    ┌───────────┐
      │  paid  │    │  failed  │    │ abandoned │
      └───┬────┘    └──────────┘    └───────────┘
          │              (retryable)   (72h timeout, BR-069)
          ▼
   ┌──────────────────┐
   │partially_refunded│──────▶│ refunded │
   └──────────────────┘       └──────────┘
```

| Transition | Trigger | Side effects |
|---|---|---|
| → `pending_payment` | Checkout initiated | Price and product snapshot frozen (`BR-084`) |
| → `paid` | Verified webhook | Entitlements granted, invoice generated, confirmation email |
| → `failed` | Gateway decline | Retry offered; order retained |
| → `abandoned` | 72h without payment | Friendly retry invitation (`BR-730`) |
| → `refunded` | `refund:approve` executed | Entitlement revoked, **progress preserved** (`BR-091`) |

- `BR-775` — Orders are immutable once `paid`. Corrections create new records (`BR-083`).
- `BR-776` — `pending_payment` → `paid` is idempotent. Duplicate webhooks produce exactly one grant (`BR-096`).

---

### 3.2 Subscription

```
   ┌────────┐   charge ok   ┌────────┐
   │trialing│──────────────▶│ active │◀────────┐
   └────────┘               └───┬────┘         │
                                │              │ payment recovered
                    charge fails│              │
                                ▼              │
                          ┌──────────┐         │
                          │ past_due │─────────┘
                          └────┬─────┘
                     grace ends│
                               ▼
        ┌──────────┐     ┌──────────┐     ┌────────┐
        │ paused   │     │ expired  │◀────│cancelled│
        └────┬─────┘     └────┬─────┘     └────────┘
             │                │            (access until period end)
             └────────────────┴──────▶ reactivation → active
```

| State | Access | Duration |
|---|---|---|
| `active` | Full | While paid |
| `past_due` | **Full** (grace) | 7 days, 3 retries (`BR-055`) |
| `cancelled` | **Full until period end** (`BR-054`) | To period end |
| `paused` | None | Up to 3 months (`BR-094`) |
| `expired` | `SEG-06` retention set (`DEC-07`) | Indefinite |

- `BR-777` — `past_due` retains full access. Cutting access at the first failed charge converts a card problem into a churn event.
- `BR-778` — Reactivation within 60 days restores the previous price (`BR-095`).

---

### 3.3 Entitlement

```
   granted ──▶ active ──┬──▶ expiring (within notice window)
                        │         │
                        │         ▼
                        │      grace ──▶ expired ──▶ (reactivation) ──▶ active
                        │
                        └──▶ revoked   (refund or manual)
```

- `BR-779` — Expiry is evaluated at read time, never by a nightly job (`BR-102`).
- `BR-780` — `expired` never deletes data. Progress, notes, certificates, and Q&A persist permanently (`DEC-07`).

---

### 3.4 Lesson Progress

```
   not_started ──▶ in_progress ──▶ completed
                        ▲              │
                        └──────────────┘
                        (manual un-complete permitted, BR-177)
```

- `BR-781` — `first_completed_at` is written once and never overwritten by later toggles (`BR-178`).
- `BR-782` — Completion is monotonic across sync. A stale device sync can never un-complete (`BR-563`).

---

### 3.5 Quiz Attempt

```
   started ──▶ submitted ──┬──▶ graded (auto)
                           │
                           └──▶ pending_review ──▶ graded (human confirmed)
                                                        │
                                              ┌─────────┴─────────┐
                                              ▼                   ▼
                                           passed              not_passed
                                                                  │
                                                          retry available?
                                                          ├─ yes → new attempt
                                                          └─ no  → instructor review (BR-264)
```

- `BR-783` — `not_passed` is a state name, never a user-facing word (`BR-269`).
- `BR-784` — The highest-scoring attempt determines progress and eligibility (`BR-267`).

---

### 3.6 Certificate

```
   eligible ──▶ issued ──▶ pdf_ready
                   │
                   └──▶ revoked  (reissue or founder action)
```

- `BR-785` — The record and verification code are created synchronously; only PDF rendering is asynchronous (`BR-277`).
- `BR-786` — `revoked` returns an explicit revoked state on verification, never "not found" (`BR-285`).

---

### 3.7 Support Ticket

```
   open ──▶ in_progress ──▶ waiting_on_customer ──▶ resolved ──▶ closed
     ▲            ▲                  │                  │
     └────────────┴──────────────────┴──────────────────┘
                    (customer reply reopens, BR-448)
```

- `BR-787` — Time in `waiting_on_customer` is excluded from `MET-12` (`BR-451`).
- `BR-788` — `closed` remains reopenable for 30 days (`BR-452`).

---

### 3.8 Q&A Question

```
   open ──▶ ai_answered ──┬──▶ resolved
                          │
                          └──▶ escalated ──▶ instructor_answered ──▶ resolved
                                                      │
                                            (auto-resolve after 7 days)
```

- `BR-789` — Only `instructor_answered` questions become publicly visible (`BR-349`).

---

### 3.9 Review

```
   submitted ──▶ pending ──┬──▶ approved ──▶ (published once course ≥ 5 approved)
                           │
                           ├──▶ rejected   (spam / abuse only, BR-362)
                           │
                           └──▶ auto_approved (7 days unmoderated, BR-364)
                                       │
                                       └──▶ hidden (moderation or refund, BR-358)
```

---

### 3.10 Device Binding

```
   unbound ──▶ bound ──┬──▶ transfer_requested ──┬──▶ bound (new device)
                       │                          │
                       │                          └──▶ declined (stays bound)
                       │
                       └──▶ released (manual unbind by staff)
```

- `BR-790` — A transfer request never releases the current binding until it is approved. A pending request must not leave the learner with no playable device.

---

### 3.11 Content Publication

```
   draft ──▶ pending_review ──┬──▶ published ──▶ archived
     ▲                        │
     └────────────────────────┘
        (returned with required feedback, BR-497)
```

- `BR-791` — Parent state dominates. A published lesson inside a draft course remains invisible (`BR-159`).

---

## 4. Formulas

### 4.1 Course Progress

```
required_items   = required lessons + required quizzes
completed_items  = required items with status = completed

progress_percent = round( completed_items / required_items × 100 )
```

- Optional items are excluded entirely (`BR-179`).
- Item-count based, never duration-weighted (`BR-180`).
- 100% requires every required item; no rounding up (`BR-182`).

---

### 4.2 Projected Completion Date

**Stage 1 — no session history** (`BR-221`):

```
remaining_minutes = Σ duration of incomplete required items
weekly_minutes    = weekly_commitment_hours × 60
effective_minutes = weekly_minutes × EFFICIENCY_FACTOR      // default 0.65

weeks_remaining   = remaining_minutes / effective_minutes
projected_date    = today + ceil(weeks_remaining) weeks
```

**Stage 2 — with ≥ 2 weeks of session data:**

```
actual_weekly_minutes = mean(active session minutes per week, last 4 weeks)

blend_weight = 0.5   if 2–4 weeks of data
             = 0.8   if > 4 weeks of data

effective_minutes = (actual_weekly_minutes × blend_weight)
                  + (weekly_minutes × EFFICIENCY_FACTOR × (1 − blend_weight))
```

**Rules:**
- `BR-792` — `EFFICIENCY_FACTOR` defaults to 0.65 and is configurable. A stated study hour is not an hour of video consumed; practice, re-watching, and assessment consume the remainder.
- `BR-793` — The projection is always phrased approximately ("around 15 September"), never as a deadline (`BR-218`).
- `BR-794` — The projection moves by at most ±7 days per recalculation. A single unusual week must not swing the date dramatically (`BR-219`).
- `BR-795` — When actual pace falls below 50% of the stated commitment for 3 consecutive weeks, the system offers to adjust the commitment rather than continuing to project an unreachable date (`BR-220`).

---

### 4.3 Streak

```
qualifying_day = a day (in the learner's timezone) containing either
                 ≥ 5 minutes of active session time
                 OR ≥ 1 completed lesson

current_streak = consecutive qualifying days, counting back from today
                 (freeze days count as qualifying)

freezes_available = 2 per rolling 30 days
```

**Evaluation** runs daily per timezone bucket (`BR-616`):

```
if yesterday was NOT qualifying:
    if freezes_available > 0:
        consume 1 freeze
        streak continues
        notify AFTER the fact: "we protected your streak" (BR-232)
    else:
        best_streak = max(best_streak, current_streak)
        current_streak = 0
        message: "New streak started — your best is {best} days" (BR-233)
```

- `BR-796` — Freezes apply silently and are never offered as a choice in advance. Asking reminds the learner they fell short.
- `BR-797` — `best_streak` is permanent and never resets.

---

### 4.4 Quota Consumption

```
effective_quota = Σ quota entitlements from all active sources   (BR-100, BR-061)
remaining       = effective_quota − consumed_this_period

consume(n):
    ATOMIC:
        if remaining >= n:
            consumed += n
            return allowed
        else:
            return exhausted
```

- `BR-798` — Consumption is atomic. Concurrent requests can never exceed the limit (`BR-109`).
- `BR-799` — Consumption occurs **after** a successful response. Failed requests never consume (`BR-112`).
- `BR-800` — Purchased add-on quota is additive to the current period and does not reset it (`BR-063`).

Notification points: **80%** consumed (`BR-110`), and **100%** with reset date plus add-on option (`BR-111`).

---

### 4.5 Partial Credit (Multiple Answers)

```
score = max( 0, (correct_selected − incorrect_selected) / total_correct )
```

Selecting every option scores 0 (`BR-251`).

---

### 4.6 Email Priority Allocation

```
MONTHLY_CAP = 3000                                    // CON-10

P0 transactional          → unlimited, never throttled
P1 subscription lifecycle → never throttled
P2 milestones             → ~20% of remaining, deferred if exceeded
P3 re-engagement          → ~40% of remaining, deferred to next month
P4 announcements          → ~25% of remaining, dropped

per_learner_cap = 6 non-transactional per month        // BR-441
```

**Dispatch check** (evaluated at send time, not enqueue time, `BR-439`):

```
1. Is this P0 or P1?                        → send
2. Learner opted out of this category?      → suppress
3. Push available and enabled?              → send push, suppress email (BR-419)
4. Learner at per_learner_cap?              → convert to in-app (BR-442)
5. Tier budget exhausted?                   → defer (P2/P3) or drop (P4)
6. Otherwise                                → send
```

- `BR-801` — Alerts fire at 70% and 90% of the monthly cap (`BR-443`).

---

### 4.7 Abuse Score (Device Sharing)

```
score = (transfers_30d × 15)
      + (max_geo_distance_km > 500 ? 20 : 0)
      + (concurrent_attempts_30d × 10)
      + (distinct_fingerprint_families_30d × 12)
      + (daily_watch_hours > 10 ? 15 : 0)

score ≥ 60  → review flag raised
```

- `BR-802` — The score raises a flag for **human review only**. It never triggers automatic action (`BR-393`).
- `BR-803` — Score components and weights are configurable. Defaults are a starting hypothesis to be tuned against real data, not a fixed truth.

---

### 4.8 Refund Eligibility

```
within_window   = days_since_purchase <= refund_window_days      // default 14
progress_ok     = course_progress <= refund_progress_threshold   // default 30%

auto_eligible   = within_window AND progress_ok
override_needed = within_window AND NOT progress_ok              // BR-090
exception       = NOT within_window                              // still submittable
```

- `BR-804` — Requests outside the window are always submittable and reviewed as exceptions. A hard block generates chargebacks, which are worse than refunds.

---

### 4.9 Aggregate Rating

```
average = Σ approved review stars / count(approved)
display = count(approved) >= review_display_threshold             // default 5
```

Only approved reviews count (`BR-369`).

---

## 5. Timing & Triggers

Complete notification schedule. **Channel priority: in-app → push → email**, per `BR-413`.

### 5.1 Learning Lifecycle

| Trigger | Timing | Channel | Priority |
|---|---|---|---|
| Welcome | On registration | Email | P0 |
| Email verification | On registration | Email | P0 |
| First lesson not started | 24h after purchase | In-app | — |
| Inactivity | Day 3 | In-app / push | — |
| Inactivity | Day 7 | Email | P3 |
| Inactivity | Day 14 | Email | P3 |
| Inactivity | Day 30 (final) | Email | P3 |
| Streak reminder | Learner-set time | Push only | — |
| Streak protected | After freeze applied | In-app | — |
| Streak milestone (7/30/100) | On reaching | In-app + push | — |
| Section completed | On completion | In-app | — |
| 50% of course | On reaching | Email | P2 |
| Course completed | On completion | Email | P2 |
| New content added | On publish | In-app | — |

### 5.2 Commercial

| Trigger | Timing | Channel | Priority |
|---|---|---|---|
| Purchase confirmed | Immediate | Email | P0 |
| Invoice ready | Immediate | Email | P0 |
| Fawry code issued | Immediate | Email + in-app | P0 |
| Fawry unpaid reminder | 24h, 60h | In-app / push | — |
| Fawry expired | 72h | Email | P1 |
| Payment failed | Immediate | Email | P0 |
| Renewal reminder | 3 days before | Email | P1 |
| Grace period ending | 2 days before | Email | P1 |
| Access paused | On transition | Email | P1 |
| Win-back | 30 days after expiry (once) | Email | P4 |
| Entitlement expiring | 7 days before | Email + in-app | P1 |
| Entitlement expiring | 1 day before | In-app | — |
| Refund processed | Immediate | Email | P0 |

### 5.3 Interaction

| Trigger | Timing | Channel | Priority |
|---|---|---|---|
| AI quota at 80% | On crossing | In-app | — |
| AI quota exhausted | On crossing | In-app | — |
| Q&A answered by instructor | Immediate | In-app + push | — |
| Essay graded | Immediate | In-app + push | — |
| Ticket replied | Immediate | Email + in-app | P0 |
| Device transfer approved | Immediate | In-app + push | — |
| Device transfer needs review | Immediate | In-app | — |
| Certificate issued | Immediate | Email | P0 |
| Review approved | Immediate | In-app | — |
| New country login | Immediate | Email | P0 |

### 5.4 Staff Alerts

| Trigger | Timing | Channel |
|---|---|---|
| Device transfer pending | Immediate | Dashboard + push |
| Q&A escalated | Immediate | Dashboard |
| Q&A unanswered 48h | On threshold | Dashboard + push |
| Ticket unanswered 24h | On threshold | Dashboard |
| Publish request pending 48h | On threshold | Dashboard |
| Abuse flag raised | Immediate | Dashboard |
| Backup failed | Immediate | **Push** (`BR-620`) |
| Site down | Immediate | **Push** (`BR-625`) |
| AI spend at 80% | On crossing | Dashboard + email |
| Email budget at 70% / 90% | On crossing | Dashboard + push |
| Job failed after retries | On final failure | Dashboard |

**Rules:**
- `BR-805` — Non-transactional messages are never sent between 22:00 and 08:00 in the learner's timezone (`BR-418`).
- `BR-806` — Staff alerts ignore quiet hours. A failed backup at 03:00 must wake the founder.
- `BR-807` — Every automated learner message carries exactly one primary action (`BR-238`).

---

## 6. Decision Tables

### 6.1 Content Access Resolution

Evaluated in order; the first match determines the outcome.

| # | Condition | Result | Reason code |
|---|---|---|---|
| 1 | Lesson `is_preview` | **Allow** | — |
| 2 | Not authenticated | Deny | `NO_ENTITLEMENT` → register |
| 3 | No matching entitlement | Deny | `NO_ENTITLEMENT` |
| 4 | Entitlement expired (past grace) | Deny | `ENTITLEMENT_EXPIRED` |
| 5 | Course sequential locking off | **Allow** | — |
| 6 | Unlock rules unsatisfied | Deny | `LESSON_LOCKED` + condition |
| 7 | Otherwise | **Allow** | — |

- `BR-808` — Denial at every step returns a `_reason` with a localized message and a concrete action (`BR-704`). No step returns a bare failure.

---

### 6.2 Playback Authorization

Evaluated after content access passes.

| # | Condition | Result | Reason code |
|---|---|---|---|
| 1 | Content access denied | Deny | (from §6.1) |
| 2 | Email unverified and content is paid | Deny | `EMAIL_UNVERIFIED` |
| 3 | No device bound | **Allow** + bind this device | — |
| 4 | Device matches binding | **Allow** | — |
| 5 | Concurrent stream active | Deny | `CONCURRENT_STREAM` + takeover |
| 6 | Device mismatch, auto-transfers remaining | **Allow** + transfer | — |
| 7 | Device mismatch, no auto-transfers | Deny | `DEVICE_MISMATCH` + request |
| 8 | Account restricted | Deny | Support contact path |

---

### 6.3 Certificate Eligibility

All conditions must hold (`BR-273`):

| Condition | Default | Configurable |
|---|---|---|
| Required items complete | 100% | ✔ per course |
| Final assessment passed | Required | ✔ per course |
| Assessment score | ≥ 70% | ✔ per course |
| Entitlement active at issuance | Required | ✘ |
| Certificate feature entitlement | Required if course is gated | ✔ per product |

---

### 6.4 Review Eligibility

| Condition | Default | Setting key |
|---|---|---|
| Verified purchase entitlement | Required | — |
| Course progress | ≥ 20% | `review_eligibility_progress` |
| Prompt appears at | 30% and completion | `review_prompt_progress_threshold` |
| Not previously reviewed | Required | — |
| Not refunded | Required | — |

---

### 6.5 Cancellation Remedy Routing (`DEC-11`)

| Stated reason | Remedy offered | Rationale |
|---|---|---|
| No time right now | **Pause** (up to 3 months) | Exactly the circumstance pause exists for |
| Too expensive | **Pause**, or switch to one-time purchase | Financial timing, not dissatisfaction |
| Finished what I needed | **None** — congratulate, surface certificate | Success, not churn |
| Content didn't meet expectations | **None** — route to feedback / support | A product signal, not a retention case |
| Technical problems | **None** — route to support first | Fix the problem, then revisit |
| Other / prefer not to say | **Pause** | Neutral default |

- `BR-809` — Exactly one remedy is offered, once (`BR-773`).
- `BR-810` — "Content didn't meet expectations" is routed to the founder as a product signal, never treated as a retention opportunity.

---

## 7. Copy Specification

The concrete enforcement of `PRIN-02`: **every message encourages or informs. Never guilts.**

### 7.1 Prohibited Language

Never appears on any learner-facing surface, in any language:

| Category | Prohibited | Reason |
|---|---|---|
| Failure | failed · رسبت · فشلت | Confirms `PERS-01`'s core fear |
| Deficit | you're behind · أنت متأخر · فاتك | Discourages exactly when engagement is fragile |
| Absence | inactive · غير نشط · مش بتدخل | Reads as surveillance |
| Denial | denied · forbidden · no permission · ممنوع · مش مسموح | Contradicts `PRIN-01` |
| Blame | you should have · كان لازم · للأسف إنت | Assigns fault |
| Loss | you lost · انتهى · خسرت | Frames a recoverable state as permanent |

- `BR-811` — These terms are checked in review of every user-facing string. A violation is a defect, not a style preference.

### 7.2 Required Patterns

| Situation | Pattern | Arabic | English |
|---|---|---|---|
| Locked content | Name the condition + offer the action | أكمل درس "المكونات الأساسية" لفتح هذا الدرس | Complete "Core Components" to unlock this lesson |
| Quiz not passed | Proximity + specific next step | قريب جدًا — ٦٥٪. راجع ٣ نقاط وجرّب تاني | So close — 65%. Review these 3 points and try again |
| Behind schedule | Recovery, with a number | درسين الأسبوع ده وترجع على المسار | Two lessons this week puts you back on track |
| Long absence | Goal + one small action | هدفك لسه مستنيك. ابدأ من الدرس ٧ — ١٢ دقيقة | Your goal is still here. Pick up at lesson 7 — 12 minutes |
| Access expired | Lead with what is retained | تقدمك وملاحظاتك وشهاداتك كلها هنا | Your progress, notes, and certificates are all still here |
| Quota exhausted | Reset date + option | رصيدك يتجدد ١ سبتمبر — أو أضف رصيد دلوقتي | Your balance renews 1 September — or add more now |
| Device mismatch | State + action, no accusation | التشغيل مربوط بجهاز تاني. تحب تنقله لهنا؟ | Playback is on another device. Switch it here? |
| Streak broken | Best preserved | بدأت تتابع جديد — أطول تتابع ليك ٢٣ يوم | New streak started — your best is 23 days |
| Payment failed | Cause + fix | الدفع مكملش. جرّب تاني أو غيّر طريقة الدفع | The payment didn't go through. Try again or use another method |
| Staff lacks permission | **Render nothing** | — | — |

- `BR-812` — Every message states one concrete next action with a specific object (a named lesson, a date, a number). Generic encouragement is measurably ignored (`BR-420`).
- `BR-813` — Numbers are always specific: "12 minutes," "2 lessons," "3 points" — never "a little more."

### 7.3 Tone Parameters

| Dimension | Setting |
|---|---|
| Person | Second person, direct ("أنت" / "you") |
| Formality (Arabic) | Modern Standard Arabic, accessible register — not classical, not heavy dialect |
| Length | One or two sentences. Learners do not read paragraphs in notifications |
| Emoji | Sparingly, and only for celebration. Never in error or system states |
| Exclamation | Maximum one per message |
| Instructor voice | Present in AI answers and milestone copy — encouraging, direct, never corporate |

- `BR-814` — Arabic copy is authored natively, never translated from English (`PRIN-07`). Translated Arabic reads as foreign to this audience and undermines the brand.
- `BR-815` — English copy is a parallel authoring, not a literal translation of the Arabic.

### 7.4 Error Messages

| Error type | Pattern |
|---|---|
| Validation | What is wrong + how to fix it |
| Network | "Connection issue — retrying" + manual retry |
| Server | "Something went wrong on our side" + support path. Never expose internals (`BR-631`) |
| Not found | What was looked for + where to go next |
| Rate limit | When it resets, specifically (`BR-632`) |

- `BR-816` — No error message blames the user for a system failure.
- `BR-817` — Every error offers a path forward. A dead-end error is a defect.

---

## 8. Settings Registry

Every configurable value in the platform. **No magic numbers in code** (`BR-487`).

### 8.1 Learning

| Key | Default | Scope |
|---|---|---|
| `lesson_completion_threshold` | 90% | Per course |
| `efficiency_factor` | 0.65 | Global |
| `projection_max_shift_days` | 7 | Global |
| `streak_min_minutes` | 5 | Global |
| `streak_freezes_per_30d` | 2 | Global |
| `sequential_locking_default` | on | Per course |
| `week_start_day` | Saturday | Global, user-overridable |

### 8.2 Assessment & Certification

| Key | Default | Scope |
|---|---|---|
| `quiz_pass_mark` | 70% | Per quiz |
| `quiz_attempts_inline` | unlimited | Per quiz |
| `quiz_attempts_final` | 3 | Per quiz |
| `quiz_cooldown_final_hours` | 24 | Per quiz |
| `certificate_completion_required` | 100% | Per course |
| `certificate_assessment_required` | true | Per course |

### 8.3 Commerce

| Key | Default | Scope |
|---|---|---|
| `refund_window_days` | 14 | Global |
| `refund_progress_threshold` | 30% | Global |
| `subscription_grace_days` | 7 | Global |
| `subscription_retry_attempts` | 3 | Global |
| `pause_max_months` | 3 | Global |
| `reactivation_price_lock_days` | 60 | Global |
| `fawry_expiry_hours` | 72 | Global |

### 8.4 Protection

| Key | Default | Scope |
|---|---|---|
| `auto_transfers_per_30d` | 2 | Global |
| `transfer_cooldown_hours` | 1 | Global |
| `abuse_flag_threshold` | 60 | Global |
| `abuse_transfer_count_threshold` | 5 | Global |
| `playback_token_ttl_hours` | 4 | Global |
| `resource_url_ttl_minutes` | 5 | Global |
| `concurrent_streams` | 1 | Global |
| `watermark_opacity` | 0.35 | Global |
| `watermark_move_interval_seconds` | 20 | Global |

### 8.5 AI

| Key | Default | Scope |
|---|---|---|
| `ai_free_lifetime_messages` | 5 | Global |
| `ai_quota_warning_percent` | 80% | Global |
| `ai_monthly_budget_usd` | 15 | Global |
| `ai_budget_alert_percent` | 80% | Global |
| `rag_chunk_tokens` | 400 | Global |
| `rag_top_k` | 8 | Global |
| `rag_relevance_threshold` | 0.62 | Global |
| `ai_context_recent_turns` | 6 | Global |

### 8.6 Community & Support

| Key | Default | Scope |
|---|---|---|
| `review_eligibility_progress` | 20% | Global |
| `review_prompt_progress_threshold` | 30% | Global |
| `review_display_threshold` | 5 | Global |
| `review_auto_approve_days` | 7 | Global |
| `review_edit_window_days` | 30 | Global |
| `qa_escalation_alert_hours` | 48 | Global |
| `ticket_alert_hours` | 24 | Global |
| `ticket_autoclose_days` | 7 | Global |
| `support_extension_max_days` | 14 | Role limit |
| `support_ai_grant_max` | 20 | Role limit |

### 8.7 Notifications

| Key | Default | Scope |
|---|---|---|
| `email_monthly_cap` | 3000 | Global |
| `email_per_learner_monthly_cap` | 6 | Global |
| `email_alert_percents` | 70, 90 | Global |
| `quiet_hours` | 22:00–08:00 | Global |
| `inactivity_days` | 3, 7, 14, 30 | Global |
| `push_max_daily` | 1 | Global |

**Rules:**
- `BR-818` — Every value above is editable from admin without deployment (`FEAT-170`).
- `BR-819` — Changing a setting is audit-logged with the previous value (`BR-488`).
- `BR-820` — Settings affecting money, access, or protection require typed confirmation (`BR-489`).
- `BR-821` — Defaults are hypotheses. Each should be reviewed against real data at 3 and 6 months post-launch.

---

## 9. Cross-Cutting Invariants

Rules that must hold system-wide regardless of feature.

- `BR-822` — **Learner data is never destroyed by a commercial event.** Refund, expiry, cancellation, and revocation affect access only. Progress, notes, certificates, and history persist (`DEC-07`).
- `BR-823` — **Every access check resolves through the entitlement engine.** No feature queries orders or purchases directly (`BR-101`).
- `BR-824` — **Every denial carries a reason and an action**, except `PERMISSION_ABSENT`, which renders nothing (`BR-707`).
- `BR-825` — **All timestamps are stored in UTC** and rendered in the learner's timezone (`BR-548`).
- `BR-826` — **All monetary values are stored as integer minor units** with an explicit currency code. Floating-point money is prohibited.
- `BR-827` — **All user-facing text is bilingual `jsonb`** with Arabic required (`BR-531`).
- `BR-828` — **Every background job is idempotent** (`BR-613`).
- `BR-829` — **Every sensitive action is audit-logged**, append-only (`BR-494`).
- `BR-830` — **Every threshold referenced anywhere in these documents appears in §8.** A number in code that is not in the registry is a defect.

---

## 10. Approval

| Item | Status |
|---|---|
| Resolved decisions `DEC-10`–`DEC-15` are accepted | ☐ Approved |
| All state machines and transitions are correct | ☐ Approved |
| Progress and projection formulas are correct | ☐ Approved |
| `EFFICIENCY_FACTOR` of 0.65 is reasonable | ☐ Approved |
| Streak rules including silent freezes are correct | ☐ Approved |
| Email priority allocation is correct | ☐ Approved |
| Abuse score weighting is a reasonable starting point | ☐ Approved |
| Notification timing table is complete and correct | ☐ Approved |
| Cancellation remedy routing (`DEC-11`) is correct | ☐ Approved |
| Prohibited language list is binding | ☐ Approved |
| Required copy patterns and Arabic examples are correct | ☐ Approved |
| Settings registry is complete — no missing thresholds | ☐ Approved |
| Cross-cutting invariants `BR-822`–`BR-830` are binding | ☐ Approved |

**Next document:** `08-system-design.md` — the technical composition of the system: applications, services, data stores, external providers, integration boundaries, and how each subsystem is built within the constraints of `CON-02` and `CON-03`.

---
