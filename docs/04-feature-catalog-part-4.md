# 04 — Feature Catalog · Part 4

### Modules `M14`–`M17` — Notifications, Support, Admin Operations, Analytics

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 04 — Feature Catalog (Part 4 of 5) |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | `03-features-identification.md`, `04-feature-catalog-part-1.md`, `-part-2.md`, `-part-3.md` |
| **Feeds Into** | `07-business-logic.md`, `08-system-design.md`, `10-database-design.md`, `12-ui-ux-design.md`, `15-implementation-roadmap.md` |
| **Covers** | `FEAT-144` – `FEAT-183` (40 features) · `BR-408` – `BR-522` |

---

> **This part is about `MET-06`:** the founder spends under 3 hours per week on anything that is not teaching. Every feature here either removes manual work or makes a decision faster.

---

# `M14` — Notifications & Lifecycle Email

The highest return-on-effort system in the product. Lifecycle email is what brings a learner back on day 8 — the day most platforms lose them permanently.

**Hard constraint:** 3,000 emails/month on the Resend free tier (`CON-10`). At 500 learners this is roughly **6 emails per learner per month**. Every send must earn its place.

---

### `FEAT-144` — Transactional Email

**Why:** Non-negotiable. A purchase without a confirmation email produces a support ticket and a trust loss simultaneously.

**Actors:** All users

**Behavior:**

| Trigger | Content |
|---|---|
| Registration | Welcome + verification link |
| Email verification | Confirmation + first action |
| Purchase completed | Receipt, invoice link, direct course link |
| Payment failed | What happened, how to fix it |
| Password reset | Reset link |
| New country login | Security notice |
| Certificate issued | Certificate PDF + share prompt |
| Refund processed | Confirmation and timeline |
| Support reply | Notification with reply excerpt |
| Device transfer decision | Approved or needs review |

- Bilingual templates selected by the learner's language preference.
- RTL-correct HTML for Arabic (`PRIN-07`).

**Rules:**
- `BR-408` — Transactional email has absolute priority over every other send. It is never throttled or deferred (`CON-10`).
- `BR-409` — Transactional email ignores marketing opt-out. Unsubscribing does not cancel a receipt.
- `BR-410` — Every email contains one primary action, not a list of links (`BR-238`).
- `BR-411` — Purchase confirmation links directly to the **first lesson**, not the course page (`BR-077`).
- `BR-412` — Templates render correctly in RTL for Arabic, including buttons, alignment, and mixed-direction text.

---

### `FEAT-145` — In-App Notification Center

**Why:** Carries everything that does not justify an email — which is most things, under a 3,000/month cap.

**Behavior:**
- Persistent feed with read/unread state and an unread badge.
- Categories: learning, achievements, Q&A replies, account, announcements.
- Selecting a notification navigates directly to its context.
- Notifications older than 90 days are pruned.

**Rules:**
- `BR-413` — Anything that can be an in-app notification instead of an email **is** an in-app notification (`CON-10`).
- `BR-414` — Notifications are generated on the event, never by polling.
- `BR-415` — Bulk events collapse into one entry ("3 new lessons added to React Mastery").

---

### `FEAT-146` — Push Notifications (Mobile)

**Why:** Free delivery with higher open rates than email. Directly relieves pressure on the email budget.

**Behavior:**
- Device token registered on mobile login.
- Categories mirror the in-app center, with independent per-category opt-in.
- Deep links open the exact relevant screen.

**Rules:**
- `BR-416` — Push permission is requested **after** the learner completes their first lesson, never at first launch. Asking before demonstrating value gets denied.
- `BR-417` — Maximum 1 non-transactional push per day per learner.
- `BR-418` — No push between 22:00 and 08:00 in the learner's timezone (`BR-022`), unless the learner explicitly enabled evening study reminders.
- `BR-419` — When mobile push is available and enabled, the equivalent lifecycle email is suppressed. No duplicate messaging, and the email budget is preserved.

---

### `FEAT-147` — Inactivity Re-Engagement

**Why:** The single most valuable automated sequence in the platform. It targets exactly the failure the product exists to solve (`01` §1.1).

**Behavior:**

| Inactivity | Channel | Message |
|---|---|---|
| 3 days | In-app / push | "Pick up at lesson 7 — 12 minutes left." |
| 7 days | Email | Their goal, their progress, and one specific next lesson |
| 14 days | Email | Goal reminder with an offer to adjust the weekly plan |
| 30 days | Email | Final gentle check-in, then the sequence stops |
| 60 days | — | No further automated contact |

**Rules:**
- `BR-420` — Every message names a **specific** next lesson with its duration. "Come back and study" is ignored; "12 minutes to finish State Management" is actionable (`BR-238`).
- `BR-421` — No guilt language at any stage (`BR-237`).
- `BR-422` — The sequence stops permanently at 30 days. Continuing past that produces spam complaints and damages domain reputation.
- `BR-423` — Any learning activity resets the sequence immediately.
- `BR-424` — Learners with no purchases receive a shorter sequence — they cost email budget without revenue.
- `BR-425` — Send times respect the learner's timezone, targeting their historically most active hour where data exists.

---

### `FEAT-148` — Streak Reminders

**Why:** A streak's motivational value depends on the learner remembering it exists.

**Behavior:**
- Optional daily reminder at a learner-chosen time.
- Only sent when the day has no qualifying activity yet.
- Push where available, otherwise suppressed entirely — never email (`CON-10`).

**Rules:**
- `BR-426` — Opt-in only, never on by default.
- `BR-427` — Streak reminders are **never** sent by email. A daily email would consume the entire monthly budget for a handful of learners.
- `BR-428` — Silent when the learner has already studied that day.

---

### `FEAT-149` — Milestone Emails

**Why:** Positive reinforcement at the moment of achievement, and the natural place to introduce what comes next.

**Behavior:**

| Milestone | Send |
|---|---|
| First lesson completed | In-app only |
| Section completed | In-app only |
| 50% of a course | Email — the psychological turning point |
| Course completed | Email + certificate + next recommendation |
| 30-day streak | In-app + push |

**Rules:**
- `BR-429` — Only two milestones justify email: 50% and completion. Everything else is in-app (`CON-10`).
- `BR-430` — The completion email is the highest-converting message in the product and carries the next-course recommendation (`BR-243`).
- `BR-431` — Milestone emails never contain a hard sell. The recommendation is framed as a next step, not an offer.

---

### `FEAT-150` — Certificate Delivery Email

**Why:** The proudest moment in the learner's journey and the platform's best acquisition trigger (`GOAL-08`).

**Behavior:**
- PDF attached and also linked.
- Includes the verification URL and a one-action LinkedIn share.
- Sent immediately on PDF generation.

**Rules:**
- `BR-432` — The PDF is attached where under 5 MB, otherwise linked. Attachments are opened; links often are not.
- `BR-433` — The share prompt appears once, in this email and in-app. It is never repeated (`BR-289`).

---

### `FEAT-151` — Subscription Lifecycle Email

**Why:** Silent billing events produce chargebacks. Communicated billing events produce renewals.

**Behavior:**

| Event | Timing |
|---|---|
| Renewal reminder | 3 days before charge |
| Payment succeeded | Immediately, with receipt |
| Payment failed | Immediately, with a fix action |
| Grace period ending | 2 days before access pauses |
| Access paused | On expiry, with one-action reactivation |
| Win-back | 30 days after expiry, once only |

**Rules:**
- `BR-434` — Subscription email is transactional and exempt from marketing opt-out, except the win-back message.
- `BR-435` — The access-paused email leads with what they keep (progress, notes, certificates), not what they lost (`PRIN-02`, `DEC-07`).
- `BR-436` — Exactly one win-back attempt. More reads as desperation.

---

### `FEAT-152` — Notification Preferences

**Why:** Control is what separates helpful messaging from spam, and it protects domain reputation.

**Behavior:**
- Per-category, per-channel matrix: email, push, in-app.
- Categories: learning reminders, achievements, Q&A replies, announcements, offers.
- Global "pause all non-essential for 30 days" option.
- One-click unsubscribe honored in every marketing email.

**Rules:**
- `BR-437` — Transactional categories are not user-disableable and are shown as such, with an explanation (`PRIN-01`).
- `BR-438` — Unsubscribing from one category never unsubscribes from others.
- `BR-439` — Preferences are honored within 5 minutes; queued sends are re-checked at dispatch, not at enqueue.

---

### `FEAT-153` — Email Rate Governance

**Why:** `CON-10` is a hard ceiling. Without governance, a single campaign exhausts the month and receipts stop being delivered — the worst possible outcome.

**Behavior:**
Priority tiers with monthly budget allocation:

| Tier | Type | Budget share | Behavior at cap |
|---|---|---|---|
| P0 | Transactional | Unlimited | Never throttled |
| P1 | Subscription lifecycle | ~15% | Never throttled |
| P2 | Milestones & certificates | ~20% | Deferred, then sent |
| P3 | Inactivity re-engagement | ~40% | Deferred to next month |
| P4 | Announcements & offers | ~25% | Dropped |

- Live usage counter in admin with a projected month-end total.
- Alert at 70% and 90% consumption.
- Per-learner send cap enforced independently.

**Rules:**
- `BR-440` — P0 and P1 always send, even if that means P3 and P4 are fully suppressed.
- `BR-441` — Maximum 6 non-transactional emails per learner per month, regardless of triggers.
- `BR-442` — Approaching the cap automatically converts eligible sends to in-app notifications rather than dropping them silently.
- `BR-443` — The founder is alerted before the cap is reached, not after.

---

# `M15` — Support & Ticketing

Built in-house rather than integrated. The permission system, learner data, and entitlement history already exist here — an external tool would duplicate all of it and add cost (`CON-02`).

---

### `FEAT-154` — Ticket Creation

**Why:** A learner with a problem and no channel becomes a refund or a bad review.

**Behavior:**
- Submitted from the help center, account area, or contextually (e.g. from a failed payment screen).
- Fields: category, subject, description, optional attachments.
- Categories: payment, access, technical, content, account, other.
- Contextual submission auto-attaches relevant data (order ID, lesson ID, device info).

**Rules:**
- `BR-444` — Context is attached automatically. Asking a learner to describe their device and browser is asking them to do support's job.
- `BR-445` — Before submission, matching help articles are surfaced. Deflection is cheaper than resolution.
- `BR-446` — Unauthenticated visitors submit via the contact form (`FEAT-210`), not the ticket system.

---

### `FEAT-155` — Ticket Threading

**Behavior:**
- Chronological message thread between learner and staff.
- Internal notes visible to staff only.
- Attachments on any message.
- Both sides notified on new messages.

**Rules:**
- `BR-447` — Internal notes are visually distinct and never exposed to the learner through any surface, including API responses.
- `BR-448` — Learners may reply to a resolved ticket, which reopens it.

---

### `FEAT-156` — Ticket Assignment

**Behavior:**
- Manual assignment, or automatic routing by category.
- Unassigned tickets sit in a shared queue.
- Assignment notifies the assignee.

**Rules:**
- `BR-449` — Payment and refund categories route to the founder by default (`PERS-13` boundaries).
- `BR-450` — A ticket always has an owner or sits visibly in the unassigned queue. Silent orphaning is not possible.

---

### `FEAT-157` — Ticket Status Workflow

**Behavior:** `open` → `in_progress` → `waiting_on_customer` → `resolved` → `closed`

- `waiting_on_customer` pauses response-time measurement.
- Auto-close 7 days after resolution with no reply.

**Rules:**
- `BR-451` — Response time (`MET-12`) excludes time in `waiting_on_customer`.
- `BR-452` — Auto-closed tickets remain reopenable for 30 days.

---

### `FEAT-158` — Priority Levels

**Why:** Priority support is a sellable entitlement (`FEAT-041`) and a real differentiator for membership tiers.

**Behavior:**
- Levels: low, normal, high, urgent.
- `feature:priority_support` holders start at high.
- Payment-blocking issues auto-escalate to urgent.
- Queue sorted by priority, then age.

**Rules:**
- `BR-453` — Anything blocking a paid learner from accessing content they own is urgent, regardless of their tier.
- `BR-454` — Priority affects ordering, never quality of response.

---

### `FEAT-159` — Canned Responses

**Why:** The same six questions constitute most of the volume. Retyping them is pure `MET-06` waste.

**Behavior:**
- Reusable templates with variable substitution (learner name, course, order).
- Bilingual, organized by category, searchable.
- Inserted into the reply box and editable before sending.

**Rules:**
- `BR-455` — Templates are always editable before sending. Verbatim canned responses read as dismissive.
- `BR-456` — Usage counts identify which templates should become help articles instead.

---

### `FEAT-160` — Attachment Support

**Behavior:** Images and documents up to 10 MB on any ticket message, stored on R2 with signed access.

**Rules:**
- `BR-457` — Attachments are private and accessible only to the ticket participants and authorized staff.
- `BR-458` — Attachments are retained as long as the ticket, then purged after 12 months.

---

### `FEAT-161` — Resolution Time Tracking

**Why:** Measures `MET-12` and reveals which categories consume disproportionate time — the input for what to automate next.

**Behavior:**
- First-response time and full-resolution time per ticket.
- Aggregated by category, assignee, and period.
- Median and 90th percentile, not mean (outliers distort the mean badly at low volume).

**Rules:**
- `BR-459` — Reported as median and p90. A single week-long ticket must not hide otherwise good performance.
- `BR-460` — Categories exceeding the target trigger a review of whether the underlying problem can be removed rather than supported.

---

# `M16` — Admin & Operations

Runs inside the web application, not as a separate deployment (`CON-03`). Calibrated to `PERS-12` (least technical) while remaining fast for `PERS-10`.

---

### `FEAT-162` — Unified Admin Shell

**Why:** A separate admin service means a second container, a second build, a second auth integration, and a second deployment — on a 2 vCPU server (`CON-03`).

**Behavior:**
- Admin lives at `/admin` within the same Next.js application.
- Shared authentication, permissions, design tokens, and API layer.
- Navigation renders from the capability map — a user sees only sections they can use (`PRIN-01`).
- Distinct visual treatment so admin is never confused with the learner view.

**Rules:**
- `BR-461` — Navigation is derived from permissions, not hardcoded. A support agent never sees a revenue menu item that leads nowhere.
- `BR-462` — Admin routes are excluded from search indexing and never publicly linked.
- `BR-463` — Admin code is split so learner-facing bundles never load it.

---

### `FEAT-163` — Operations Dashboard

**Why:** The founder's stated need: one screen answering "what needs me today?" Everything else in `M16` exists to serve actions started here.

**Actors:** `PERS-10`

**Behavior:**

| Block | Content |
|---|---|
| Revenue today / this month | Amount, order count, comparison to previous period |
| New learners | Registrations and first purchases |
| **Needs your attention** | Pending device transfers, escalated Q&A, tickets over 24h, pending publish requests, flagged accounts |
| Learning health | Active learners this week, completion trend |
| AI usage | Messages today, month-to-date cost, remaining budget |
| System health | Backup status, uptime, email budget consumption, error rate |

- "Needs your attention" is the visual priority. Each item links directly to its resolution screen.
- Empty state when nothing needs action: explicitly confirmed, not blank.

**Rules:**
- `BR-464` — Every attention item is actionable in one click from this screen (`MET-06`).
- `BR-465` — Blocks with nothing to report are omitted, not shown as zeros (`PRIN-01`).
- `BR-466` — The dashboard loads in a single aggregated request with cached expensive aggregates (`CON-03`).
- `BR-467` — Revenue blocks are hidden for roles without `payment:read`. The same screen serves every staff role, shaped by permissions.

---

### `FEAT-164` — Student Directory & Lookup

**Why:** `PERS-13`'s primary tool. Every support case starts with "who is this and what do they have?"

**Behavior:**
Search by name, email, phone, or order ID. The learner profile shows:

- Identity, registration date, verification status, language
- Purchases, entitlements (active and expired), payment history
- Bound device and transfer history
- Progress across all courses, streaks, and goal
- Ticket history and Q&A activity
- Notes and internal staff annotations

**Rules:**
- `BR-468` — Full PII requires `student:read.pii`. Roles without it see the name and progress only (`BR-035`).
- `BR-469` — Payment amounts are hidden from `ROLE-04`; transaction existence and status are visible (`BR-122`).
- `BR-470` — Every profile view by staff is audit-logged. Learner data access is never anonymous.
- `BR-471` — Search matching on partial phone or email requires the PII permission.

---

### `FEAT-165` — Manual Enrollment

**Why:** Gifts, partnerships, beta access, and support remediation. Without it, every exception becomes a fake order (`FEAT-045`).

**Behavior:**
- Grant a course, bundle, or membership to a learner from their profile or from the product page.
- Duration and reason required.
- Bulk grant to a selected segment.
- Appears to the learner labeled as granted, not purchased.

**Rules:**
- `BR-472` — A reason is mandatory (`BR-118`).
- `BR-473` — Excluded from revenue, included in engagement analytics (`BR-119`).
- `BR-474` — Bulk operations show an explicit affected-count confirmation before executing.

---

### `FEAT-166` — Device Transfer Queue

**Why:** The most frequent recurring manual decision in the platform. Its efficiency directly determines whether `MET-06` holds.

**Behavior:**
Each pending request shows: learner, current device, requested device, transfer count in the last 30 days, geographic distance, abuse score, and any prior flags.

- Approve or decline with one action; declining requires a reason.
- Bulk approve for clearly legitimate requests.
- Auto-approved transfers are listed separately for visibility, not action.

**Rules:**
- `BR-475` — The queue is sorted by wait time. A learner blocked from content they paid for is an urgent state.
- `BR-476` — Every request presents the evidence needed to decide without opening another screen (`MET-06`).
- `BR-477` — Declining sends an explanation and a support path, never a bare rejection (`PRIN-02`).

---

### `FEAT-167` — Product & Pricing Management

**Why:** The mechanism that makes `PRIN-05` real and delivers `MET-05` (a new offer in under 15 minutes).

**Behavior:**
- Create and edit products of every type.
- Attach entitlements with durations (`FEAT-043`).
- Set per-currency prices and scheduled price windows.
- Live preview of exactly what a buyer receives.
- Duplicate an existing product as a starting point.

**Rules:**
- `BR-478` — No product operation requires a deployment (`PRIN-05`).
- `BR-479` — Editing a live product warns explicitly about which changes affect existing buyers and which do not (`BR-113`).
- `BR-480` — Products cannot be deleted, only archived (`BR-050`).

---

### `FEAT-168` — Coupon Management

**Behavior:**
- Create codes with all constraints from `FEAT-032`.
- Usage dashboard: redemptions, revenue attributed, conversion rate.
- Bulk generation of unique codes for campaigns.
- Deactivate without deleting.

**Rules:**
- `BR-481` — Deactivating a code stops new redemptions but never reverses completed orders.
- `BR-482` — Redemption history is retained permanently for revenue reconciliation.

---

### `FEAT-169` — AI Configuration Panel

**Why:** The founder's explicit requirement to switch providers and models freely and compare them (`CON-06`).

**Behavior:**
- Per-task configuration (`FEAT-107`): provider, model, temperature, max tokens, system prompt, fallback.
- Provider API keys stored encrypted, write-only in the UI.
- Live cost table per model, editable when vendor pricing changes.
- Test console for validating a configuration before applying.
- Quota defaults per entitlement tier.

**Rules:**
- `BR-483` — API keys are never displayed after saving, not even masked-but-copyable.
- `BR-484` — Changing the embedding model requires a separate confirmed re-index operation with an explicit warning (`BR-295`).
- `BR-485` — Every change is audit-logged with the previous value (`BR-296`).
- `BR-486` — Configuration changes take effect within 60 seconds without restart.

---

### `FEAT-170` — System Settings

**Behavior:**
Grouped configuration:

| Group | Contents |
|---|---|
| Branding | Logo, colors, academy name, contact details |
| Policies | Refund window, review threshold, completion threshold |
| Devices | Transfer limits, cooldowns, abuse thresholds (`DEC-04`) |
| Certificates | Template, signature, eligibility defaults |
| Email | Sender identity, budget alerts, template overrides |
| Features | Global toggles for optional subsystems |
| Localization | Default language, supported currencies, week start day |

**Rules:**
- `BR-487` — Every threshold referenced anywhere in this catalog is editable here. No magic numbers in code.
- `BR-488` — Settings changes are audit-logged.
- `BR-489` — Dangerous settings require typed confirmation, not just a click.

---

### `FEAT-171` — Staff User Management

**Behavior:**
- Invite staff by email with a pre-assigned role.
- Assign roles and per-user permission overrides (`FEAT-016`).
- Deactivate without deleting, preserving their audit history.
- View each staff member's recent activity.

**Rules:**
- `BR-490` — Only `ROLE-01` may create or modify staff accounts.
- `BR-491` — Deactivation revokes all sessions immediately (`BR-019`).
- `BR-492` — The last remaining Super Admin cannot be deactivated or demoted.
- `BR-493` — Staff invitations expire after 7 days.

---

### `FEAT-172` — Global Audit Log

**Why:** When something goes wrong — and it will — the question is always "what changed and who changed it."

**Behavior:**
- Records every sensitive action: permission changes, entitlement grants, refunds, content deletions, settings changes, PII access, manual enrollments, moderation.
- Fields: actor, action, target, before/after values, timestamp, IP, user agent.
- Filterable by actor, action type, target, and date range. Exportable.

**Rules:**
- `BR-494` — Append-only at every permission level, including `ROLE-01` (`BR-047`).
- `BR-495` — Retained 24 months minimum.
- `BR-496` — Failed authorization attempts are logged as security events (`FEAT-218`).

---

### `FEAT-173` — Content Approval Queue

**Behavior:**
- Pending publish requests with submitter, item, submission time, and note.
- Preview in learner view before deciding.
- Approve, or return with required feedback.
- Sorted by wait time.

**Rules:**
- `BR-497` — Returning requires feedback (`BR-162`).
- `BR-498` — Requests pending over 48 hours surface on the operations dashboard.

---

### `FEAT-174` — Impersonation (Read-Only)

**Why:** "It doesn't work for me" is unresolvable without seeing what they see. This converts a multi-message thread into a ten-second look.

**Behavior:**
- Initiated from a learner profile with a required reason.
- Renders the learner's exact view: dashboard, courses, entitlements, unlock states.
- **Read-only** — no writes, no purchases, no playback, no messages.
- Persistent visual banner throughout the session.
- Auto-terminates after 30 minutes.

**Rules:**
- `BR-499` — Strictly read-only. No action taken during impersonation may modify data.
- `BR-500` — `ROLE-01` only.
- `BR-501` — Every impersonation session is audit-logged with the reason and duration.
- `BR-502` — Video playback is disabled during impersonation — it would consume the learner's device binding and pollute their playback log.
- `BR-503` — The learner is not notified, but the log is available on request. This is a support tool, not surveillance, and the audit trail is what keeps it honest.

---

# `M17` — Analytics & Reporting

Every report exists to answer a specific question tied to a metric in `01` §5. Reports that answer no question are not built.

---

### `FEAT-175` — Revenue Reporting

**Question answered:** *Am I making money, and from what?*

**Behavior:**
- Revenue by day, week, month, and custom range.
- Breakdown by product, product type, currency, gateway, and country.
- Net of refunds, with gross shown separately.
- Comparison against the previous period.
- Manual grants excluded (`BR-473`).

**Rules:**
- `BR-504` — Revenue is reported in original currency with a total converted at the rate recorded on the order date, never at today's rate.
- `BR-505` — Refunds are attributed to the original order date, not the refund date.
- `BR-506` — Requires `payment:read`.

---

### `FEAT-176` — Enrollment Analytics

**Question answered:** *Where does the funnel leak?*

**Behavior:**

```
Visitors → Registrations → Onboarding completed → First purchase → First lesson
```

- Conversion rate at each stage, with time-to-convert distributions.
- Registration source breakdown (Google / email / phone).
- Measures `MET-02` (goal set rate) and `MET-09` (7-day activation).

**Rules:**
- `BR-507` — Onboarding completion is tracked per step so the drop-off point is identifiable (`BR-212`).

---

### `FEAT-177` — Completion Analytics

**Question answered:** *Is the product thesis working?* (`MET-01`)

**Behavior:**
- Completion rate per course, per cohort, and overall.
- Median time to completion.
- Segmented by persona (`BR-211`), by goal-set vs not, and by AI-user vs not.
- Trend over time against the 35% / 45% targets.

**Rules:**
- `BR-508` — Completion is measured against required items only (`BR-179`).
- `BR-509` — The goal-set vs no-goal comparison is the primary validation of `GOAL-02`. If the difference is negligible, the motivation system needs redesign before scaling content.

---

### `FEAT-178` — Drop-Off Analysis

**Question answered:** *Which lesson kills courses?*

**Behavior:**
- Per-lesson retention curve showing how many learners reached and completed each lesson.
- Highlights the steepest drops.
- Correlates with quiz failure rates and Q&A volume on the same lesson.
- Average watch percentage per video.

**Rules:**
- `BR-510` — The steepest-drop lesson is surfaced on the operations dashboard as a content improvement signal.
- `BR-511` — Lessons with low average watch percentage but high completion indicate learners skipping — a content quality signal, not a technical one.

---

### `FEAT-179` — Engagement Metrics

**Question answered:** *Are learners actually returning?* (`MET-11`)

**Behavior:**
- Weekly and monthly active learners.
- Session frequency, duration, and time-of-day distribution.
- Streak distribution and average streak length.
- Weekly commitment adherence across the learner base.
- Churn and cancellation reasons (`BR-093`).

**Rules:**
- `BR-512` — Activity is defined by qualifying learning sessions (`BR-206`), never by login.

---

### `FEAT-180` — AI Usage & Cost Reporting

**Question answered:** *Is the AI replacing me, and what does it cost?* (`MET-03`)

**Behavior:**
- Message volume by day, course, and learner.
- **Deflection rate:** AI-resolved questions ÷ total questions — the direct `MET-03` measure.
- Cost by model, provider, and period, with projected month-end spend.
- Out-of-scope question list as a content gap report (`BR-327`).
- Negative feedback clustering by lesson (`BR-337`).

**Rules:**
- `BR-513` — Deflection counts a question as resolved when the learner marks it resolved or takes no escalation action within 24 hours.
- `BR-514` — Cost projection triggers an alert at 80% of the configured monthly budget (`BR-334`).
- `BR-515` — The content gap report is one of the most valuable outputs in the system and is surfaced monthly to the founder, not buried in a reports section.

---

### `FEAT-181` — Student Progress Reports

**Question answered:** *How is this specific learner doing?*

**Behavior:**
- Per-learner detail: courses, progress, sessions, quiz results, streak, goal, projected date.
- Per-course roster with each learner's progress.
- Identifies at-risk learners: inactive, far behind their projection, or repeatedly failing.

**Rules:**
- `BR-516` — `ROLE-02` sees only learners enrolled in their own courses, and never their contact details (`PERS-11` boundaries).
- `BR-517` — The at-risk list is actionable: each entry offers a direct message or a manual entitlement extension.

---

### `FEAT-182` — Quiz Performance Analytics

**Question answered:** *Which questions are broken, and which lessons failed to teach?*

**Behavior:**
- Per-question success rate, average attempts, and time spent.
- Flags questions with anomalous rates: near 0% (likely broken or unfair) and near 100% (likely trivial).
- Maps failed questions back to their source lessons.

**Rules:**
- `BR-518` — Questions under 20% or over 95% success are flagged for review. Both extremes indicate a problem.
- `BR-519` — High failure on a question whose lesson has high completion indicates the **lesson** failed, not the learner (`PRIN-02` applied to content review).

---

### `FEAT-183` — Data Export

**Behavior:**
- CSV export of any report with the applied filters.
- Learner list export requiring PII permission.
- Financial export formatted for accounting.
- Exports are queued and delivered by download link (`CON-03`).

**Rules:**
- `BR-520` — Every export is audit-logged with the requesting actor and the row count.
- `BR-521` — Exports containing PII require `student:read.pii` and are additionally flagged as security events.
- `BR-522` — Exports are generated in a background job and never block the request thread.

---

## Coverage Summary — Part 4

| Module | Features | Business Rules |
|---|---:|---:|
| `M14` Notifications & Email | 10 | `BR-408`–`BR-443` |
| `M15` Support & Ticketing | 8 | `BR-444`–`BR-460` |
| `M16` Admin & Operations | 13 | `BR-461`–`BR-503` |
| `M17` Analytics & Reporting | 9 | `BR-504`–`BR-522` |
| **Total** | **40** | **115 rules** |

**Running total:** 183 of 220 features · 522 business rules

---

## Approval — Part 4

| Item | Status |
|---|---|
| Email priority tiers and budget allocation (`FEAT-153`) are accepted | ☐ Approved |
| Inactivity sequence timing and the 30-day stop are accepted | ☐ Approved |
| Decision to never send streak reminders by email (`BR-427`) is accepted | ☐ Approved |
| In-house support system rather than an external tool is accepted | ☐ Approved |
| Operations dashboard blocks and "needs your attention" priority are correct | ☐ Approved |
| Read-only impersonation with mandatory reason is accepted | ☐ Approved |
| Analytics scope — every report answers a metric question | ☐ Approved |

**Next:** `04-feature-catalog · Part 5` — `M18` Localization & Theming, `M19` Mobile Application, `M20` Public Site, `M21` Platform & Infrastructure (`FEAT-184`–`FEAT-220`). This completes the catalog.

---
