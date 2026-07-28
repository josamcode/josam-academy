# 06 — User Flows & Workflows

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 06 — User Flows & Workflows |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | `02-target-users.md`, `04-feature-catalog-part-1.md` – `-part-5.md`, `05-roles-and-permissions.md` |
| **Feeds Into** | `07-business-logic.md`, `11-api-contract.md`, `12-ui-ux-design.md`, `15-implementation-roadmap.md`, `16-task-breakdown.md` |
| **Contains** | `FLOW-01` – `FLOW-30` · `BR-720` – `BR-772` |

---

## Reading Guide

Each flow specifies:

- **Actor** — who performs it
- **Trigger** — what starts it
- **Preconditions** — what must already be true
- **Steps** — the sequence, including decision branches
- **Success** — the intended end state
- **Failure paths** — what happens when things go wrong, which is where most products fail

Flows are grouped: **learner acquisition** (`FLOW-01`–`05`), **learning** (`FLOW-06`–`13`), **trust & lifecycle** (`FLOW-14`–`20`), **staff operations** (`FLOW-21`–`30`).

**Flow index:**

| Group | Flows |
|---|---|
| Acquisition & Purchase | `FLOW-01` – `FLOW-05` |
| Core Learning | `FLOW-06` – `FLOW-13` |
| Trust & Lifecycle | `FLOW-14` – `FLOW-20` |
| Staff Operations | `FLOW-21` – `FLOW-30` |

---

# Group A — Acquisition & Purchase

---

## `FLOW-01` — Registration

**Actor:** `SEG-01` → `SEG-02` · **Trigger:** Registration action from any surface

### Path A — Google (fastest, preferred)

```
1. Selects "Continue with Google"
2. OAuth consent → returns with profile
3. Account created, email pre-verified (BR-004)
4. Session issued
5. → FLOW-02 (Onboarding)
```

### Path B — Email + Password

```
1. Enters name, email, password
2. Client-side validation (BR-001)
3. Account created in pending_verification
4. Verification email dispatched (FEAT-005)
5. Session issued immediately — verification does not block browsing (BR-003)
6. → FLOW-02, with a persistent verification banner
```

### Path C — Phone + OTP

```
1. Selects country, enters phone number
2. OTP dispatched (BR-006, BR-007)
3. Enters 6-digit code
4. Account created, phone verified
5. Session issued
6. → FLOW-02
7. Email is requested later, before first purchase (BR-009)
```

**Failure paths:**

| Condition | Behavior |
|---|---|
| Email already registered | Neutral confirmation shown; "you already have an account" email sent. Never reveals existence (`BR-003` edge case) |
| Email belongs to a Google-only account | Prompts account linking, not a duplicate account (`FEAT-004`) |
| OTP expired | Auto-offers resend; the code is regenerated rather than showing an error (`BR-012` pattern) |
| OTP rate limit reached | States the reset time and offers email registration as an alternative (`BR-007`) |
| SMS undelivered | Retry action plus an alternative registration path — never a dead end |

**Rules:**
- `BR-720` — Registration completes in a maximum of 3 screens on every path.
- `BR-721` — A session is issued before verification on every path. Making a new user check email before seeing the product loses them.

---

## `FLOW-02` — Onboarding

**Actor:** New `SEG-02` · **Trigger:** Immediately after `FLOW-01` · **Target:** ≥ 70% completion (`MET-02`)

```
1. "What's your goal?"        → 5 visual options (PERS-01…05)
2. "Where are you now?"       → 4 level options
3. "How much time weekly?"    → 3 / 5 / 10 / 15+ hours
4. "What interests you?"      → multi-select topic tags
5. Goal record created; persona classified (BR-211)
6. Projection screen:
   "At 5 hours a week, you'll finish the Full-Stack path
    around 15 September."
7. 2–3 recommended courses shown (FEAT-088)
8. → Dashboard (FEAT-082)
```

**Skip path:**

```
Skip at any step → Dashboard
              → persistent dismissible prompt explaining the benefit (BR-210)
              → re-offered after the first completed lesson
```

**Rules:**
- `BR-722` — One question per screen. Multi-question forms measurably reduce completion.
- `BR-723` — Progress indicator visible throughout ("2 of 4").
- `BR-724` — Every step is skippable individually, not only the whole flow.
- `BR-725` — The projection screen (step 6) is the emotional payoff and is never omitted, even for partial answers — with a stated commitment alone it still produces a date (`BR-221`).

---

## `FLOW-03` — Discovery & Preview

**Actor:** `SEG-01` (unauthenticated) · **Trigger:** Search, share link, or certificate verification page

```
1. Lands on catalog or course page
2. Reads: outcomes, full curriculum, instructor, reviews (if ≥ 5, BR-366)
3. Plays a free preview lesson (FEAT-205)
   → no registration required (BR-589)
   → generic academy watermark, not learner identity (BR-590)
4. Preview ends → soft prompt showing what comes next
5. Decision point:
   ├─ Register → FLOW-01
   ├─ Purchase → prompted to register first (BR-074) → FLOW-01 → FLOW-04
   └─ Leaves  → no further contact (no account, no email)
```

**Rules:**
- `BR-726` — The full curriculum is visible without registration (`BR-585`).
- `BR-727` — The preview end prompt is informational, not a modal that blocks the page.
- `BR-728` — Registration initiated from a course page returns to that course after `FLOW-02`, never to a generic dashboard.

---

## `FLOW-04` — Purchase & Checkout

**Actor:** `SEG-02` → `SEG-03`/`04`/`05` · **Preconditions:** Authenticated, email verified (`BR-075`)

```
1. Selects a product
2. Pre-checks:
   ├─ Already owns it?     → "Go to course" replaces buy (BR-076)
   ├─ Email unverified?    → verification prompt with resend
   └─ Otherwise            → continue
3. Checkout screen: product, price, currency, coupon field, total
4. Optional coupon applied (FEAT-032)
   └─ Invalid → specific friendly reason (BR-079)
5. Payment method selection, filtered by detected country
   ├─ Egypt → Paymob: card / wallet / Fawry / installments
   └─ Other → Stripe: card
6. Redirect to hosted payment page
7. Payment attempt
   ├─ Success        → step 8
   ├─ Fawry selected → FLOW-05
   └─ Failure        → return with reason + retry, order stays pending
8. Webhook received and verified (FEAT-038)
9. Order marked paid · entitlements granted (FEAT-043) · invoice generated
10. Success screen → "Start learning" as the primary action
11. → FLOW-06, entering the first lesson directly (BR-077)
12. Confirmation email with receipt and a direct lesson link (BR-411)
```

**Failure paths:**

| Condition | Behavior |
|---|---|
| Payment declined | Reason shown, retry offered, order retained as `pending_payment` |
| Page closed before redirect | Webhook still grants entitlement; email carries the course link (`FEAT-031` edge case) |
| Webhook delayed | Success screen polls order status; reconciliation job is the backstop (`BR-069`) |
| Price changed mid-checkout | The price captured at initiation is honored (`FEAT-031` edge case) |
| Duplicate webhook | Idempotency key prevents double grant (`BR-096`) |

---

## `FLOW-05` — Deferred Payment (Fawry)

**Actor:** Egyptian learner · **Trigger:** Fawry selected in `FLOW-04`

```
1. Reference code generated and displayed prominently
2. Instructions: "Pay at any Fawry outlet or via the app"
3. Order state: pending_payment · expiry 72 hours (BR-069)
4. Code emailed and shown in the account area
5. Learner pays offline (may be hours later)
6. Paymob webhook received
7. Entitlement granted · confirmation email · in-app notification
8. → Learner returns and enters FLOW-06

Parallel: reconciliation job polls pending orders every 15 minutes (FEAT-214)
Parallel: reminder notification at 24h and 60h if unpaid
At 72h: order marked abandoned, with a friendly "still interested?" message
```

**Rules:**
- `BR-729` — The reference code is always retrievable from the account area. Losing it must never mean losing the purchase.
- `BR-730` — Abandonment messaging is an invitation to retry, never a cancellation notice (`PRIN-02`).

---

# Group B — Core Learning

---

## `FLOW-06` — First Learning Session (Activation)

**Actor:** New `SEG-03` · **Trigger:** Immediately after purchase · **Measures:** `MET-09`

```
1. Enters lesson 1 directly from checkout (BR-077)
2. Player loads:
   ├─ Entitlement validated
   ├─ Unlock rules evaluated (lesson 1 is never locked, BR-189)
   ├─ Device binding: first playback binds this device (FEAT-135)
   └─ Signed playback token issued (FEAT-133)
3. First-time overlay explains: notes panel, AI tutor, Q&A, resources
   → dismissible, shown once
4. Learner watches
   ├─ Position saved every 10s (BR-173 family)
   ├─ Timestamped resources surface as configured (FEAT-057)
   └─ Lesson Notes highlight in sync (FEAT-054)
5. At 90% watched → auto-complete (BR-176)
6. Celebration: "First lesson done" (FEAT-087)
7. Next lesson unlocks and is offered as the primary action
8. Session recorded (FEAT-076) · streak begins (FEAT-084)
```

**Rules:**
- `BR-731` — Device binding on first playback is announced, not silent: "this device is now your playback device — you can switch anytime."
- `BR-732` — The first-session overlay introduces at most 4 capabilities. More is ignored.
- `BR-733` — If the learner abandons before completing lesson 1, an in-app nudge appears on next visit, not an email.

---

## `FLOW-07` — Returning Session

**Actor:** Any active learner · **Trigger:** Opens web or mobile · **Highest-frequency flow in the product**

```
1. Dashboard loads in one aggregated request (BR-227)
2. Displays:
   ├─ Greeting + streak
   ├─ CONTINUE  ← visually dominant (BR-224)
   │   "State Management · 12:30 · 8 min left"
   ├─ Goal card: 62% · ~18 days to target
   ├─ This week: 3.5 of 5 hours
   └─ What's next / recent wins
3. Taps Continue
4. Player opens at the exact second (BR-065)
5. Learns → completion → pointer advances (BR-184)
6. Returns to dashboard with updated state
```

**Branches:**

| Condition | Behavior |
|---|---|
| No purchases yet | Catalog-oriented dashboard, still leading with the goal (`BR-225`) |
| Resume lesson now locked | Pointer moves to nearest unlocked item with an explanation (`BR-186`) |
| Behind projected pace | Recovery framing, never deficit framing (`FLOW-19`, `BR-230`) |
| Ahead of pace | Explicit positive acknowledgment (`BR-229`) |
| Everything complete | Recommendations become primary (`FEAT-088`) |

---

## `FLOW-08` — Encountering a Locked Lesson

**Actor:** Any learner · **Trigger:** Selects a locked item · **Implements:** `PRIN-03`

```
1. Locked lesson is VISIBLE in the curriculum with title, duration, lock icon
2. Selects it
3. API returns _can.play: false with _reason (BR-042, §7.2 of doc 05)
4. UI displays the unlock condition in the learner's language:
   "Complete 'Core Components' to unlock this lesson"
5. A direct action to satisfy the condition is offered
6. Learner completes the prerequisite → unlock evaluated → lesson opens
```

**Reason variants:**

| Reason | Message pattern | Offered action |
|---|---|---|
| `LESSON_LOCKED` | Names the prerequisite | Go to prerequisite |
| Quiz gate | "Score 70% on the previous quiz" | Go to quiz |
| Drip delay | "Available on 3 September" | Set a reminder |
| `NO_ENTITLEMENT` | "Included in the Full-Stack bundle" | View the product |
| `ENTITLEMENT_EXPIRED` | "Your access ended — pick up where you left off" | Reactivate |

**Rules:**
- `BR-734` — Locked lessons are never hidden or greyed into illegibility. Title and duration are always readable.
- `BR-735` — Every locked state offers exactly one concrete action (`BR-238`).
- `BR-736` — The words "denied," "forbidden," and "no permission" never appear on a learner surface (`BR-193`).

---

## `FLOW-09` — Device Transfer Request

**Actor:** Any learner · **Trigger:** Attempts playback on an unbound device · **Frequency:** the most common friction event

```
1. Playback requested from device B
2. Server: entitlement OK, unlock OK, device MISMATCH
3. Screen shows:
   ├─ Current device: "Chrome on Windows · bound 12 June"
   ├─ This device: "Safari on iPhone"
   ├─ Automatic transfers remaining: 2 of 2 this month (BR-390)
   └─ Action: "Switch playback to this device"
4. Decision:
   ├─ Within policy (BR-389)
   │   → approved in under 5 seconds (BR-387)
   │   → device B bound, device A released
   │   → playback begins
   │
   ├─ Beyond automatic limit
   │   → request submitted → FLOW-23
   │   → "Usually reviewed within a few hours"
   │   → notification on decision
   │
   └─ Beyond abuse threshold (5+ / 30 days)
       → escalated to ROLE-01 with evidence (BR-391)
       → learner sees a neutral "under review" state
```

**Rules:**
- `BR-737` — The screen never implies wrongdoing. It states the situation and offers the action (`BR-386`).
- `BR-738` — Everything except video playback keeps working on device B: notes, AI, Q&A, quizzes, progress (`PRIN-04`, `BR-378`).
- `BR-739` — An in-progress session on device A finishes the current lesson before release (`BR-388`).

---

## `FLOW-10` — AI Tutor Conversation

**Actor:** Learner with `feature:ai_tutor` · **Trigger:** Opens the AI panel from a lesson

```
1. Panel opens with conversation history for this course (FEAT-113)
2. Quota balance visible
3. Learner asks a question (Arabic, English, or mixed)
4. Server assembles:
   ├─ Hybrid retrieval over entitled content only (BR-303, BR-304)
   ├─ Student context: goal, level, progress, current lesson (FEAT-112)
   └─ Conversation summary + recent turns (BR-317)
5. Response streams back
6. Answer includes citations: "📍 Lesson 7 · 12:30"
7. Learner taps a citation → player seeks to that second (FEAT-111)
8. Quota decremented (BR-321)
```

**Branches:**

| Condition | Behavior |
|---|---|
| Question out of scope | Brief labeled answer + closest lesson + escalation offer (`BR-325`) · logged as a content gap (`BR-327`) |
| Quota at 80% | Proactive notice (`BR-110`) |
| Quota exhausted | Reset date + add-on option, framed as capability (`BR-324`) |
| No entitlement | Panel shows what grants AI access — never an error (`BR-106`) |
| Request fails | Quota not consumed (`BR-322`), retry offered |
| Learner unsatisfied | "Ask the instructor" → `FLOW-11` |

**Rules:**
- `BR-740` — Streaming is mandatory on all surfaces. A blank wait reads as failure (`BR-566`).
- `BR-741` — Citations are generated from chunk metadata, never from model output (`BR-312`).

---

## `FLOW-11` — Question Escalation to Instructor

**Actor:** Learner → `PERS-10`/`PERS-11` · **Trigger:** "Ask the instructor" from AI or lesson Q&A · **Measures:** `MET-03`

```
LEARNER SIDE
1. Submits a question (auto-captures lesson + timestamp, BR-340)
2. AI answers first, clearly labeled (BR-341, BR-342)
   → AI answers to Q&A do NOT consume learner quota (BR-341)
3. Learner decides:
   ├─ Resolved → marked ai_answered → resolved
   └─ Not satisfied → escalates

INSTRUCTOR SIDE
4. Question enters the instructor queue with the full AI conversation attached (BR-329)
5. Instructor answers
6. Learner notified (FEAT-145)
7. Instructor optionally marks "add to knowledge base" (BR-330)
   → answer embedded → AI answers this question itself next time (BR-301)

TIMEOUT
Unanswered after 48h → surfaces on the operations dashboard (BR-348)
```

**Rules:**
- `BR-742` — Expected response time is always shown to the learner ("usually within 24 hours"). Silence must never be ambiguous (`BR-346`).
- `BR-743` — The knowledge-base promotion loop is the mechanism that makes `MET-03` improve over time rather than plateau.

---

## `FLOW-12` — Quiz Attempt

**Actor:** Any learner · **Trigger:** Reaches a quiz lesson or checkpoint

```
1. Pre-screen: question count, pass mark, attempts remaining, time limit if any
2. Starts attempt
3. Answers questions
   ├─ Options shuffled if configured (BR-249)
   ├─ Answers submitted incrementally (BR-569)
   └─ Interruption pauses timers, never fails (BR-265, BR-568)
4. Submits
5. Auto-gradable questions scored immediately
   └─ Essay questions → grading queue (BR-257) → FLOW-24
6. Result screen (FEAT-098):
   ├─ Passed → celebration → next lesson unlocks
   ├─ Just below → "So close — review these 3 points" + retry
   └─ Well below → linked lessons covering each missed question (BR-270)
7. Highest score counts toward progress (BR-267)
```

**Failure paths:**

| Condition | Behavior |
|---|---|
| Attempts exhausted on a final assessment | Escalates to instructor review, never a permanent block (`BR-264`) |
| Connection lost mid-attempt | Answers already submitted are retained; the attempt resumes |
| Essay pending | Auto-graded portion scored now; learner notified when review completes (`BR-259`) |

**Rules:**
- `BR-744` — The word "failed" never appears (`BR-269`). "Not yet" is the framing.
- `BR-745` — Every incorrect answer links to the exact lesson and timestamp covering it (`BR-270`).

---

## `FLOW-13` — Course Completion & Certification

**Actor:** Completing learner · **Trigger:** Final required item completed · **The emotional peak of the product**

```
1. Completion event fires
2. Progress reaches 100% (BR-182)
3. Certificate eligibility evaluated immediately (BR-274):
   ├─ All required items complete    ✔
   ├─ Final assessment passed        ✔
   └─ Active entitlement             ✔
4. Certificate record + verification code created SYNCHRONOUSLY (BR-277)
5. Celebration screen — immediate, no "processing" message (BR-278):
   ├─ "You finished React Fundamentals"
   ├─ Certificate preview
   ├─ Share to LinkedIn (BR-433)
   └─ Recommended next course (BR-243)
6. PDF rendered in background → stored on R2 (BR-280)
7. Email: certificate attached + verification link + next step (FEAT-150)
8. Goal updated:
   ├─ Goal achieved     → archived as an achievement (BR-214)
   └─ Goal continues    → projection recalculated for remaining courses
9. Review prompt appears (FLOW-15)
```

**Branches:**

| Condition | Behavior |
|---|---|
| Completed but assessment not passed | "One step left — pass the final assessment" with a direct link |
| Entitlement expired at completion | Certificate still issued for work already done; access messaging handled separately |
| PDF generation fails | Retried; certificate remains valid and viewable in-app meanwhile (`BR-614`) |

**Rules:**
- `BR-746` — The certificate is never gated behind sharing, review submission, or any other action.
- `BR-747` — The completion screen is the highest-converting surface in the product and always carries a next-step recommendation (`BR-243`).

---

# Group C — Trust & Lifecycle

---

## `FLOW-14` — Public Certificate Verification

**Actor:** `SEG-01` — typically an employer or recruiter · **Trigger:** Verification link or manual code entry

```
1. Opens josamacademy.com/verify (or /verify/{code})
2. Enters or arrives with a code
3. Rate-limited lookup (BR-287)
4. Result:
   ├─ Valid    → learner name, course title, completion date,
   │             issuing academy, link to the course (BR-286)
   ├─ Revoked  → "This certificate was revoked" (BR-285)
   └─ Not found→ "No certificate found with this code" — no format hints
5. Page carries academy branding and a discreet path to the course (BR-596)
```

**Rules:**
- `BR-748` — Only name, course, and date are exposed. Never email, phone, score, or progress detail (`BR-286`).
- `BR-749` — The page is indexable and is treated as an acquisition surface, not a utility page (`BR-595`).

---

## `FLOW-15` — Review Submission

**Actor:** `SEG-03`+ meeting eligibility · **Trigger:** Reaching 30% progress, or course completion

```
1. Eligibility checked: verified purchase + ≥ 20% progress (BR-357)
   └─ Not eligible → prompt does not appear at all (PRIN-01)
2. Prompt appears (non-blocking)
3. Learner submits: 1–5 stars + optional text (BR-360)
4. State: pending
5. Founder reviews (FLOW-27 daily routine)
   ├─ Approved → published with verified-purchase badge
   ├─ Rejected → only for spam or abuse, with reason (BR-362, BR-363)
   └─ Unmoderated 7 days → auto-approved (BR-364)
6. Public display only once the course has ≥ 5 approved reviews (BR-366)
7. Founder may reply publicly (FEAT-130)
```

**Rules:**
- `BR-750` — The review prompt appears at most twice per course: at 30% and at completion. Never again.
- `BR-751` — A low rating is never grounds for rejection. This rule exists to keep the review system honest (`BR-362`).

---

## `FLOW-16` — Entitlement Expiry & Reactivation

**Actor:** `SEG-03`/`04`/`05` → `SEG-06` · **Trigger:** Approaching expiry

```
NOTIFICATION SEQUENCE
T-7 days  → email + in-app: "Your access ends on 15 September"
T-1 day   → in-app reminder
T-0       → grace period begins, full access retained (BR-115)
T+grace   → access transitions

AT TRANSITION
1. Learner becomes SEG-06
2. RETAINED PERMANENTLY (DEC-07, BR-105):
   ├─ All progress and completion history
   ├─ All personal notes
   ├─ All earned certificates
   ├─ Q&A history
   └─ Read access to Lesson Notes for completed lessons
3. LOST:
   ├─ Video playback
   ├─ Resource downloads
   ├─ AI tutor
   └─ New quiz attempts
4. Dashboard shows a reactivation invitation, never a lockout screen (BR-435)

REACTIVATION
5. One action restores the previous plan (FEAT-037)
6. Within 60 days → previous price restored (BR-095)
7. Learner resumes at the exact lesson and second they left (BR-091)
```

**Rules:**
- `BR-752` — The expiry screen leads with what is retained, not what is lost (`BR-435`).
- `BR-753` — An in-progress video session is never interrupted by expiry; it applies from the next session (`BR-116`).
- `BR-754` — `SEG-06` learners continue receiving milestone and achievement history — they are not treated as former customers.

---

## `FLOW-17` — Refund Request

**Actor:** Learner → `ROLE-04` → `ROLE-01` · **Trigger:** Refund requested from the account area

```
LEARNER
1. Selects the order, chooses a reason, adds detail
2. Eligibility checked: within 14 days (BR-089)
   └─ Outside window → still submittable, flagged as an exception
3. Request created, acknowledgment shown with expected timeline

SUPPORT (ROLE-04)
4. Reviews request + progress + order
5. Options:
   ├─ Resolve without refund (extension, different course, credit)
   └─ Forward with recommendation → refund:request (BR-648)

FOUNDER (ROLE-01)
6. Approves or declines → refund:approve
7. If approved:
   ├─ Gateway refund executed (FEAT-030)
   ├─ Entitlement revoked
   ├─ Progress data PRESERVED (BR-091)
   └─ Confirmation email with timeline
8. If declined:
   └─ Reason + an alternative offer, never a bare rejection (BR-092)
```

**Branches:**

| Condition | Behavior |
|---|---|
| Progress > 30% | Requires explicit founder override with recorded reason (`BR-090`) |
| Gateway refund fails | Request stays open, flagged; entitlement not revoked until money moves (`FEAT-036` edge case) |
| Subscription refund | Current period refunded; subscription cancelled |

---

## `FLOW-18` — Support Ticket

**Actor:** Any user → `ROLE-04` · **Trigger:** Help center, account area, or contextual entry

```
LEARNER
1. Selects category · describes the issue · attaches files
2. Matching help articles surfaced BEFORE submission (BR-445)
   └─ Resolved by article → no ticket created
3. Submits — context auto-attached: order, lesson, device, browser (BR-444)
4. Acknowledgment with expected response time

STAFF
5. Ticket enters the queue
   ├─ Payment / refund category → routed to ROLE-01 (BR-449)
   └─ Otherwise → support queue
6. Priority assigned (FEAT-158)
   └─ Blocking paid access → urgent regardless of tier (BR-453)
7. Support replies, optionally from a canned template (BR-455)
8. Status transitions (FEAT-157)
9. Resolved → auto-closes after 7 days of no reply (BR-452)
   └─ Learner replies → reopens (BR-448)
```

**Rules:**
- `BR-755` — Deflection through help articles happens before submission, not after. Post-submission suggestions read as dismissal.
- `BR-756` — Internal notes are never visible to the learner through any surface (`BR-687`).

---

## `FLOW-19` — Inactivity Re-Engagement

**Actor:** System → inactive learner · **Trigger:** Scheduled evaluation (`FEAT-214`) · **Highest-ROI automation in the platform**

```
DAY 3   → in-app / push
          "Pick up at State Management — 12 minutes left"

DAY 7   → email
          ├─ Their goal restated
          ├─ Their progress: "you're 62% there"
          ├─ ONE specific lesson with its duration (BR-420)
          └─ Direct resume link

DAY 14  → email
          ├─ "Life gets busy — want to adjust your weekly plan?"
          └─ One-action commitment adjustment (BR-220)

DAY 30  → email
          ├─ Final gentle check-in
          └─ Sequence terminates permanently (BR-422)

DAY 60+ → no automated contact

RESET: any learning activity resets the sequence immediately (BR-423)
```

**Rules:**
- `BR-757` — Every message names a specific lesson with its duration. Generic encouragement is ignored (`BR-420`).
- `BR-758` — No guilt language at any stage: no "you missed," "you've been inactive," "you're falling behind" (`BR-237`).
- `BR-759` — Where push is enabled, the equivalent email is suppressed (`BR-419`).
- `BR-760` — Learners with no purchases receive a shortened sequence (`BR-424`).

---

## `FLOW-20` — Subscription Renewal & Failure

**Actor:** `SEG-04` · **Trigger:** Billing cycle

```
SUCCESS PATH
T-3 days → renewal reminder email
T-0      → charge succeeds → receipt → entitlements extended

FAILURE PATH
T-0      → charge fails
1. Immediate notification with a fix action
2. Grace period begins — 7 days, FULL ACCESS RETAINED (BR-055)
3. Retry attempts: T+1, T+3, T+6 (up to 3, BR-055)
4. T+5 → "Your access pauses in 2 days" reminder
5. T+7 → still failing:
   ├─ Learner becomes SEG-06
   ├─ Progress, notes, certificates retained (DEC-07)
   └─ Reactivation invitation, not a lockout (BR-056)
6. T+37 → single win-back message (BR-436)
7. No further automated contact

CANCELLATION PATH
1. Learner initiates cancellation
2. PAUSE offered first — up to 3 months, place retained (BR-094)
   ├─ Accepts pause → subscription paused, access ends at period end
   └─ Declines      → cancellation proceeds
3. Optional reason captured (BR-093)
4. Access retained until the end of the paid period (BR-054)
5. At period end → SEG-06 with full history intact
```

**Rules:**
- `BR-761` — Grace-period messaging is a reminder, never a threat (`BR-056`).
- `BR-762` — Pause is always offered before cancellation completes. A meaningful share of cancellations are temporary circumstances, not dissatisfaction.

---

# Group D — Staff Operations

---

## `FLOW-21` — Course Authoring

**Actor:** `ROLE-01` / `ROLE-02` / `ROLE-03` (scoped)

```
1. Create course: bilingual title, description, outcomes, level, category
2. Upload thumbnail and trailer
3. Build structure: sections → lessons (FEAT-050 drag-and-drop)
4. Per lesson:
   ├─ Upload video → direct to Bunny, bypassing the VPS (BR-136)
   ├─ Wait for transcoding → status shown, not an error (BR-137)
   ├─ Write Lesson Notes in blocks
   ├─ Stamp blocks with video timestamps (FEAT-054)
   ├─ Attach resources, optionally timestamped (FEAT-057)
   └─ Set unlock rules (default: previous lesson, BR-188)
5. Build quizzes (FLOW-12 target)
6. Preview as learner
7. Publish path:
   ├─ ROLE-01 → publishes directly (BR-163)
   └─ ROLE-02 / ROLE-03 → publish:request → FLOW-22
8. On publish:
   ├─ Lesson Notes queued for embedding (BR-145)
   ├─ Course appears in catalog
   └─ Optional "new content" notification to enrolled learners (BR-161)
```

**Rules:**
- `BR-763` — Publishing is blocked until the minimum requirements are met, and the UI lists exactly what is missing rather than showing a generic error (`BR-124`).
- `BR-764` — Embedding is queued on publish, not on save, so drafts never consume AI budget.

---

## `FLOW-22` — Publish Approval

**Actor:** `ROLE-02`/`ROLE-03` → `ROLE-01`

```
1. Submitter requests publication with an optional note
2. Item enters the approval queue (FEAT-173), sorted by wait time
3. Founder previews in learner view
4. Decision:
   ├─ Approve → published · submitter notified
   └─ Return  → REQUIRED feedback (BR-497)
                → item returns to draft with feedback visible on it
                → submitter notified
5. Pending over 48 hours → surfaces on the operations dashboard (BR-498)
```

**Rules:**
- `BR-765` — Returning always carries feedback. A returned item is a revision request, not a refusal (`BR-162`).

---

## `FLOW-23` — Device Transfer Approval

**Actor:** `ROLE-04` / `ROLE-01` · **Trigger:** Request from `FLOW-09` beyond automatic policy

```
1. Request appears in the queue, sorted by WAIT TIME (BR-475)
2. Each entry shows, without opening another screen (BR-476):
   ├─ Learner name and course access
   ├─ Current device and requested device
   ├─ Transfers in the last 30 days
   ├─ Geographic distance between devices
   └─ Abuse score and prior flags
3. Decision:
   ├─ Approve  → transfer executed · learner notified · playback available
   ├─ Decline  → REQUIRED reason → explanation + support path (BR-477)
   └─ Escalate → to ROLE-01 if beyond the abuse threshold (BR-391)
4. Auto-approved transfers listed separately for visibility only
```

**Rules:**
- `BR-766` — A learner blocked from content they paid for is an urgent state. This queue is checked first in the daily routine (`FLOW-30`).

---

## `FLOW-24` — Q&A and Grading

**Actor:** `ROLE-01` / `ROLE-02`

```
Q&A QUEUE
1. Escalated questions ordered by age (BR-348)
2. Each shows: lesson, timestamp, learner progress, full AI attempt (BR-329)
3. Instructor answers
4. Optionally: "add to knowledge base" → embedded (BR-330)
5. Learner notified

GRADING QUEUE
6. Pending essay answers listed
7. AI suggestion shown: proposed score + justification + gaps (FEAT-095)
8. Instructor confirms, adjusts, or overrides (BR-260)
9. Grade finalized → learner notified (BR-259)
   └─ Learner never sees the AI suggestion (BR-261)
```

---

## `FLOW-25` — Product Creation

**Actor:** `ROLE-01` · **Target:** under 15 minutes (`MET-05`)

```
1. Create product: type, bilingual name, description, media
2. Set prices per currency (BR-064)
3. Attach entitlements with durations (FEAT-043):
   ├─ access:course:react-mastery   → lifetime
   ├─ feature:ai_tutor              → 3 months
   ├─ quota:ai_messages 200/month   → 3 months
   └─ feature:certificate           → lifetime
4. Preview panel shows exactly what a buyer receives (BR-586)
5. Optional: schedule a launch price window (FEAT-033)
6. Publish → live immediately, no deployment (BR-478)
```

**Rules:**
- `BR-767` — Editing a live product warns explicitly which changes affect existing buyers and which do not (`BR-479`).

---

## `FLOW-26` — Manual Entitlement Grant

**Actor:** `ROLE-01` (or `ROLE-04` within limits)

```
1. Open the learner profile → grant entitlement
2. Select entitlement, duration, and REQUIRED reason (BR-653)
3. Limits:
   ├─ ROLE-04: extend ≤ 14 days · ≤ 20 AI messages · 1 quiz attempt (BR-651, BR-652)
   └─ ROLE-01: unlimited
4. Granted → learner notified → appears labeled "granted," not "purchased"
5. Excluded from revenue, included in engagement analytics (BR-473)
6. Audit-logged (FEAT-046)

BULK PATH
7. Select a segment → preview affected count → typed confirmation (BR-474)
```

---

## `FLOW-27` — AI Configuration Change

**Actor:** `ROLE-01`

```
1. Open AI configuration (FEAT-169)
2. Select the task: tutor chat · essay evaluation · summarization
3. Change provider / model / temperature / prompt
4. Test in the console before applying
5. Optionally: run the comparison tool against the current model (FEAT-117)
6. Apply → effective within 60 seconds, no restart (BR-486)
7. Audit-logged with the previous value (BR-485)

EMBEDDING MODEL (separate, guarded path)
8. Requires typed confirmation and an explicit warning (BR-484)
9. Triggers a full re-index job → queued and monitored
```

---

## `FLOW-28` — Handling an Abuse Flag

**Actor:** `ROLE-01`

```
1. Flagged account appears in the review queue with evidence (FEAT-139)
2. Founder reviews: transfer pattern, geography, concurrency, watch volume
3. NO automatic suspension has occurred (BR-393)
4. Options:
   ├─ Clear the flag        → likely legitimate (device change, travel)
   ├─ Contact the learner   → starts from INQUIRY, not accusation (BR-395)
   └─ Restrict              → last resort, reason recorded, learner informed
5. All actions audit-logged
```

**Rules:**
- `BR-768` — A false accusation costs far more than a tolerated sharer. Ambiguous cases are cleared, not restricted (`BR-394`).

---

## `FLOW-29` — Learner Troubleshooting (Impersonation)

**Actor:** `ROLE-01` · **Trigger:** "It doesn't work for me" with no reproducible detail

```
1. Open the learner profile → impersonate
2. REQUIRED reason entered (BR-501)
3. Read-only session begins with a persistent banner (BR-499)
4. Founder sees exactly what the learner sees:
   dashboard, entitlements, unlock states, capability maps
5. Video playback is DISABLED during impersonation (BR-502)
6. Session auto-terminates after 30 minutes
7. Fully audit-logged with reason and duration
```

---

## `FLOW-30` — Daily Operations Routine

**Actor:** `ROLE-01` · **Target:** under 3 hours per week (`MET-06`) — roughly **25 minutes per day**

```
OPEN THE OPERATIONS DASHBOARD (FEAT-163)

1. NEEDS YOUR ATTENTION  ← handle first, in this order
   ├─ Device transfers pending      → FLOW-23  (blocking paid access)
   ├─ Escalated Q&A over 48h        → FLOW-24
   ├─ Tickets over 24h              → FLOW-18
   ├─ Publish requests over 48h     → FLOW-22
   ├─ Refund requests               → FLOW-17
   ├─ Reviews pending               → FLOW-15
   └─ Abuse flags                   → FLOW-28

2. SYSTEM HEALTH  ← 10-second scan
   ├─ Backup succeeded last night?  (BR-620)
   ├─ Uptime and error rate normal?
   ├─ Email budget on track?        (BR-443)
   └─ AI spend within budget?       (BR-514)

3. SIGNALS  ← weekly, not daily
   ├─ Steepest drop-off lesson      (BR-510)
   ├─ Out-of-scope AI questions     (BR-327) — what to teach next
   ├─ Questions flagged as broken   (BR-518)
   └─ At-risk learners              (BR-517)
```

**Rules:**
- `BR-769` — Every attention item resolves in one click from the dashboard (`BR-464`).
- `BR-770` — Device transfers are always first. A learner unable to watch content they paid for is the most damaging open state in the system.
- `BR-771` — If the routine consistently exceeds 25 minutes, the cause is a design failure to be fixed, not a workload to absorb (`MET-06`).
- `BR-772` — Signals are reviewed weekly, not daily. Daily review of trend data produces noise-driven decisions.

---

## Flow → Feature Coverage

| Flow group | Primary features exercised |
|---|---|
| Acquisition (`01`–`05`) | `FEAT-001`–`006`, `031`–`038`, `077`–`079`, `202`–`205` |
| Learning (`06`–`13`) | `FEAT-063`–`076`, `082`–`088`, `089`–`105`, `106`–`119`, `133`–`141` |
| Lifecycle (`14`–`20`) | `FEAT-036`–`037`, `044`, `104`, `127`–`132`, `144`–`153` |
| Staff (`21`–`30`) | `FEAT-047`–`062`, `162`–`174`, `175`–`183` |

Every learner-facing feature appears in at least one flow. No orphan features.

---

## Open Questions

| ID | Question | Blocking | Owner |
|---|---|---|---|
| `OQ-15` | Should the review prompt appear at 30% progress, or only at completion? Earlier means more reviews but less informed ones. | `07-business-logic` | Founder |
| `OQ-16` | On subscription cancellation, should pause be offered automatically or only when a "too expensive" / "no time" reason is selected? | `07-business-logic` | Founder |

---

## Approval

| Item | Status |
|---|---|
| Registration paths and the no-verification-block rule are correct | ☐ Approved |
| Onboarding flow (4 steps, skippable, projection payoff) is correct | ☐ Approved |
| Checkout routing directly into lesson 1 is correct | ☐ Approved |
| Fawry deferred payment handling is correct | ☐ Approved |
| Locked lesson experience implements `PRIN-03` correctly | ☐ Approved |
| Device transfer flow and messaging are correct | ☐ Approved |
| AI conversation and escalation loop are correct | ☐ Approved |
| Completion and certification flow is correct | ☐ Approved |
| Expiry flow leading with what is retained is correct | ☐ Approved |
| Inactivity sequence and its 30-day termination are correct | ☐ Approved |
| Daily operations routine fits within 25 minutes | ☐ Approved |
| Business rules `BR-720`–`BR-772` are binding | ☐ Approved |

**Next document:** `07-business-logic.md` — the consolidated rule engine: all timing rules, state machines, calculation formulas, notification triggers, and the complete copy tone specification derived from `PRIN-02`.

---
