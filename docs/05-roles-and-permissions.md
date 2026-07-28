# 05 — Roles & Permissions

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 05 — Roles & Permissions |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | `02-target-users.md`, `03-features-identification.md`, `04-feature-catalog-part-1.md` – `-part-5.md` |
| **Feeds Into** | `06-user-flows.md`, `07-business-logic.md`, `10-database-design.md`, `11-api-contract.md`, `12-ui-ux-design.md`, `14-security-design.md` |
| **Implements** | `PRIN-01`, `FEAT-013` – `FEAT-020`, `BR-030` – `BR-047` |

---

## 1. Governing Principles

Three rules govern this entire document.

**`PRIN-01` — Capability over rejection.**
The system never says "you don't have permission." Unavailable actions are **absent**, not blocked. Hard `403` exists only as a security backstop against direct API manipulation.

**Permissions are data, not code.**
Roles and their permission sets are database rows, editable from admin without deployment (`BR-030`). Only the *registry* of what permissions exist is defined in code, because each one maps to a real enforcement point.

**One definition, three consumers.**
Backend, web, and mobile read the same ability definitions from a shared package (`FEAT-018`). The server is always authoritative; clients use it for rendering only (`BR-043`).

---

## 2. Naming Convention

```
{model}:{action}[.{scope}]
```

| Segment | Meaning | Examples |
|---|---|---|
| `model` | The resource, singular snake_case | `course`, `device_transfer`, `ai_config` |
| `action` | The operation | `create`, `read`, `update`, `delete` |
| `scope` | Optional boundary qualifier | `own`, `any`, `pii` |

### Canonical Action Vocabulary

Actions are drawn from a fixed vocabulary. Inventing new verbs per model produces an unlearnable system.

| Action | Meaning |
|---|---|
| `create` | Bring a new record into existence |
| `read` | View one or many |
| `update` | Modify an existing record |
| `delete` | Remove (soft or hard, per model) |
| `publish` | Make visible to learners |
| `archive` | Withdraw without deleting |
| `approve` | Authorize a pending request |
| `request` | Submit for someone else's approval |
| `assign` | Attach to a user or queue |
| `moderate` | Hide, edit, or remove user-generated content |
| `export` | Extract as a file |
| `impersonate` | View the platform as another user |
| `manage` | Full control over a configuration surface |

### Scope Vocabulary

| Scope | Meaning |
|---|---|
| *(none)* | Applies globally |
| `.own` | Only records the actor owns (`FEAT-019`) |
| `.any` | All records regardless of owner |
| `.pii` | Includes personally identifiable fields |

**Resolution rules:**
- `.any` implies `.own` (`BR-033`)
- Absence of a permission is denial (`BR-034`)
- PII always requires its own explicit permission (`BR-035`)

---

## 3. Role Definitions

| ID | Key | Name | Count | System | Description |
|---|---|---|---|:--:|---|
| `ROLE-01` | `super_admin` | Super Admin | 1 | ✔ | The founder. Implicit access to everything. |
| `ROLE-02` | `instructor` | Instructor | 0 today | ✔ | Owns and teaches their own courses only. |
| `ROLE-03` | `content_assistant` | Content Assistant | 0–1 | ✔ | Authors content. Cannot publish, cannot see people or money. |
| `ROLE-04` | `support_agent` | Support Agent | 0–1 | ✔ | Handles tickets, devices, and access questions. No financial authority. |
| `ROLE-05` | `student` | Student | All learners | ✔ | Default role on registration. |

**Rules:**
- `BR-639` — `ROLE-01` holds all permissions implicitly. Its permission set is not stored or editable — this prevents the founder from accidentally locking themselves out.
- `BR-640` — `ROLE-05` is assigned automatically at registration and cannot be removed, only supplemented by a staff role.
- `BR-641` — A user holds exactly one role plus optional per-user overrides (`BR-031`).
- `BR-642` — Custom roles are creatable from admin (e.g. `accountant`, `marketer`) and draw from the same registry.

---

## 4. Permission Registry

Legend for role columns:

| Symbol | Meaning |
|:--:|---|
| ● | Granted |
| ◐ | Granted, scoped to `.own` |
| ○ | Granted, restricted (see notes) |
| — | Not granted |

`ROLE-01` is omitted from tables — it holds everything (`BR-639`).

---

### 4.1 `M01` — Identity & Access

| Permission | Description | `ROLE-02` | `ROLE-03` | `ROLE-04` | `ROLE-05` |
|---|---|:--:|:--:|:--:|:--:|
| `user:read` | View user list and basic profiles | — | — | ● | — |
| `user:read.pii` | View email, phone, address | — | — | ● | — |
| `user:create` | Create a user account manually | — | — | — | — |
| `user:update` | Edit another user's profile | — | — | ○ | — |
| `user:delete` | Delete a user account | — | — | — | — |
| `user:deactivate` | Suspend an account | — | — | — | — |
| `profile:read.own` | View own profile | ● | ● | ● | ● |
| `profile:update.own` | Edit own profile | ● | ● | ● | ● |
| `session:read.own` | View own active sessions | ● | ● | ● | ● |
| `session:delete.own` | Revoke own sessions | ● | ● | ● | ● |
| `session:delete.any` | Force logout another user | — | — | — | — |

**Notes:**
- `BR-643` — `ROLE-04` holds `user:update` only for non-sensitive fields (name, language, timezone). Email and phone changes require identity verification and `ROLE-01`.
- `BR-644` — `user:read.pii` is the single most sensitive read permission in the system. Every use is audit-logged (`BR-470`).

---

### 4.2 `M02` — Roles & Permissions

| Permission | Description | `ROLE-02` | `ROLE-03` | `ROLE-04` | `ROLE-05` |
|---|---|:--:|:--:|:--:|:--:|
| `role:read` | View roles and their permissions | — | — | — | — |
| `role:create` | Create a custom role | — | — | — | — |
| `role:update` | Modify a role's permission set | — | — | — | — |
| `role:delete` | Delete a custom role | — | — | — | — |
| `permission:read` | View the permission registry | — | — | — | — |
| `permission:assign` | Grant or revoke per-user overrides | — | — | — | — |
| `staff:read` | View staff accounts | — | — | — | — |
| `staff:create` | Invite a staff member | — | — | — | — |
| `staff:update` | Change a staff member's role | — | — | — | — |

**Notes:**
- `BR-645` — The entire `M02` surface is `ROLE-01` only (`BR-490`). Delegating permission management defeats its purpose.
- `BR-646` — The last remaining Super Admin cannot be demoted or deactivated (`BR-492`).

---

### 4.3 `M03` — Commerce & Payments

| Permission | Description | `ROLE-02` | `ROLE-03` | `ROLE-04` | `ROLE-05` |
|---|---|:--:|:--:|:--:|:--:|
| `product:read` | View products and pricing | — | — | ● | ● |
| `product:create` | Create a product | — | — | — | — |
| `product:update` | Edit a product | — | — | — | — |
| `product:archive` | Withdraw from sale | — | — | — | — |
| `price:manage` | Set prices and price windows | — | — | — | — |
| `coupon:read` | View coupons | — | — | ● | — |
| `coupon:create` | Create a coupon | — | — | — | — |
| `coupon:update` | Edit or deactivate a coupon | — | — | — | — |
| `order:read` | View orders | — | — | ○ | ◐ |
| `order:read.amounts` | View monetary values on orders | — | — | — | ◐ |
| `transaction:read` | View payment transactions | — | — | ○ | — |
| `invoice:read` | View invoices | — | — | ○ | ◐ |
| `refund:request` | Submit a refund recommendation | — | — | ● | ◐ |
| `refund:approve` | Execute a refund | — | — | — | — |
| `subscription:read` | View subscription state | — | — | ● | ◐ |
| `subscription:update` | Cancel or pause a subscription | — | — | ○ | ◐ |
| `payment:read` | View revenue figures | — | — | — | — |

**Notes:**
- `BR-647` — `ROLE-04` sees that an order exists, its status, and what it granted — but **not the amount** (`BR-469`). Support does not need money to resolve access problems.
- `BR-648` — `refund:request` and `refund:approve` are permanently separate. Support recommends; the founder executes (`FEAT-036`).
- `BR-649` — `ROLE-05` scopes are all `.own` — learners see their own orders, invoices, and subscriptions.
- `BR-650` — `ROLE-04` may cancel a subscription on a learner's request, but may not change its price or plan.

---

### 4.4 `M04` — Entitlements

| Permission | Description | `ROLE-02` | `ROLE-03` | `ROLE-04` | `ROLE-05` |
|---|---|:--:|:--:|:--:|:--:|
| `entitlement:read` | View a user's entitlements | — | — | ● | ◐ |
| `entitlement:grant` | Manually grant an entitlement | — | — | — | — |
| `entitlement:revoke` | Revoke an entitlement | — | — | — | — |
| `entitlement:extend` | Extend an expiry date | — | — | ○ | — |
| `entitlement:read.audit` | View the entitlement history log | — | — | ● | — |
| `quota:read` | View quota balances | — | — | ● | ◐ |
| `quota:adjust` | Add or reset quota | — | — | ○ | — |

**Notes:**
- `BR-651` — `ROLE-04` may extend an entitlement by up to 14 days as a goodwill remedy without founder approval. Beyond that requires `ROLE-01`.
- `BR-652` — `ROLE-04` may grant up to 20 AI messages as a support remedy. Larger adjustments require `ROLE-01`.
- `BR-653` — Every manual grant, revoke, extension, or adjustment requires a reason (`BR-118`).

---

### 4.5 `M05` — Content Management

| Permission | Description | `ROLE-02` | `ROLE-03` | `ROLE-04` | `ROLE-05` |
|---|---|:--:|:--:|:--:|:--:|
| `course:read` | View courses in admin | ◐ | ● | — | — |
| `course:create` | Create a course | ● | — | — | — |
| `course:update.own` | Edit own courses | ● | — | — | — |
| `course:update.any` | Edit any course | — | ● | — | — |
| `course:delete` | Delete a course | — | — | — | — |
| `course:archive` | Archive a course | ◐ | — | — | — |
| `course:publish.request` | Submit for publish approval | ● | ● | — | — |
| `course:publish.approve` | Publish or return a submission | — | — | — | — |
| `section:create` | Create a section | ◐ | ● | — | — |
| `section:update` | Edit a section | ◐ | ● | — | — |
| `section:delete` | Delete a section | ◐ | ○ | — | — |
| `lesson:create` | Create a lesson | ◐ | ● | — | — |
| `lesson:update` | Edit a lesson | ◐ | ● | — | — |
| `lesson:delete` | Delete a lesson | ◐ | ○ | — | — |
| `lesson_note:read` | View lesson notes in admin | ◐ | ● | — | — |
| `lesson_note:update` | Write or edit lesson notes | ◐ | ● | — | — |
| `video:upload` | Upload video to the provider | ◐ | ● | — | — |
| `video:delete` | Delete a video | ◐ | — | — | — |
| `resource:create` | Add a resource | ◐ | ● | — | — |
| `resource:update` | Edit a resource | ◐ | ● | — | — |
| `resource:delete` | Delete a resource | ◐ | ○ | — | — |
| `media:read` | Browse the media library | ● | ● | — | — |
| `media:upload` | Upload to the media library | ● | ● | — | — |
| `media:delete` | Delete from the media library | ◐ | — | — | — |
| `content:version.restore` | Restore a previous version | ◐ | ● | — | — |

**Notes:**
- `BR-654` — `ROLE-03` (Content Assistant) has broad **edit** access across all courses but **zero publish** authority (`PERS-12` boundaries). This is deliberate: they are an authoring resource, not a decision-maker.
- `BR-655` — `ROLE-03` cannot delete **published** content. Their delete permissions apply to draft items only (`○`).
- `BR-656` — `ROLE-02` (Instructor) is scoped to `.own` throughout, enforced at the data layer (`FEAT-019`).
- `BR-657` — Only `ROLE-01` holds `course:publish.approve` (`BR-163`).
- `BR-658` — `course:delete` is granted to nobody by default, including via the UI. Archiving is always the offered path (`BR-125`).

---

### 4.6 `M06` — Learning Experience

| Permission | Description | `ROLE-02` | `ROLE-03` | `ROLE-04` | `ROLE-05` |
|---|---|:--:|:--:|:--:|:--:|
| `lesson:play` | Play lesson video | ● | ● | — | ◐ |
| `progress:read.own` | View own progress | ● | ● | ● | ● |
| `progress:read.any` | View another learner's progress | ◐ | — | ● | — |
| `progress:update.own` | Mark lessons complete | ● | ● | ● | ● |
| `progress:reset` | Reset a learner's progress | — | — | ○ | ◐ |
| `note:crud.own` | Manage own notes | ● | ● | ● | ● |
| `bookmark:crud.own` | Manage own bookmarks | ● | ● | ● | ● |
| `unlock_rule:manage` | Configure unlock conditions | ◐ | — | — | — |
| `unlock_rule:override` | Manually unlock for a learner | ◐ | — | ○ | — |

**Notes:**
- `BR-659` — Staff hold `lesson:play` unscoped so they can review content, but staff playback is excluded from analytics and does not consume device binding.
- `BR-660` — `ROLE-02` sees progress only for learners enrolled in their own courses (`BR-516`).
- `BR-661` — `ROLE-03` never sees learner progress. They have no access to people data at all (`PERS-12` boundaries).
- `BR-662` — Learners may reset their own progress for a course they own, with confirmation.
- `BR-663` — `unlock_rule:manage` is instructor-scoped; `ROLE-03` may not alter learning structure, only content.

---

### 4.7 `M07` — Goals & Motivation

| Permission | Description | `ROLE-02` | `ROLE-03` | `ROLE-04` | `ROLE-05` |
|---|---|:--:|:--:|:--:|:--:|
| `goal:crud.own` | Manage own learning goal | ● | ● | ● | ● |
| `goal:read.any` | View a learner's goal | ◐ | — | ● | — |
| `streak:read.own` | View own streak | ● | ● | ● | ● |
| `streak:read.any` | View a learner's streak | ◐ | — | ● | — |
| `streak:adjust` | Restore a broken streak | — | — | ○ | — |
| `achievement:read.own` | View own achievements | ● | ● | ● | ● |

**Notes:**
- `BR-664` — `ROLE-04` may restore a streak once per learner per 90 days as a goodwill remedy (e.g. after a platform outage).
- `BR-665` — Goals are visible to `ROLE-04` because support conversations depend on understanding what the learner is trying to achieve.

---

### 4.8 `M08` — Assessment

| Permission | Description | `ROLE-02` | `ROLE-03` | `ROLE-04` | `ROLE-05` |
|---|---|:--:|:--:|:--:|:--:|
| `quiz:read` | View quizzes in admin | ◐ | ● | — | — |
| `quiz:create` | Create a quiz | ◐ | ● | — | — |
| `quiz:update` | Edit a quiz | ◐ | ● | — | — |
| `quiz:delete` | Delete a quiz | ◐ | ○ | — | — |
| `quiz:publish` | Make a quiz live | ◐ | — | — | — |
| `question:crud` | Manage questions | ◐ | ● | — | — |
| `question_bank:manage` | Manage the shared question bank | ◐ | ● | — | — |
| `attempt:read.own` | View own attempts | ● | ● | ● | ● |
| `attempt:read.any` | View learner attempts | ◐ | — | ● | — |
| `attempt:reset` | Grant an additional attempt | ◐ | — | ○ | — |
| `grading:read` | View the grading queue | ◐ | — | — | — |
| `grading:submit` | Confirm a grade | ◐ | — | — | — |

**Notes:**
- `BR-666` — `ROLE-03` may draft quizzes but never publish them (`BR-247`).
- `BR-667` — `ROLE-04` may grant one extra attempt on a final assessment as a support remedy; more requires the instructor.
- `BR-668` — Only instructors and `ROLE-01` may confirm grades. AI-suggested scores are never final (`BR-260`).

---

### 4.9 `M09` — Certificates

| Permission | Description | `ROLE-02` | `ROLE-03` | `ROLE-04` | `ROLE-05` |
|---|---|:--:|:--:|:--:|:--:|
| `certificate:read.own` | View own certificates | ● | ● | ● | ● |
| `certificate:read.any` | View issued certificates | ◐ | — | ● | — |
| `certificate:issue` | Manually issue a certificate | — | — | — | — |
| `certificate:revoke` | Revoke a certificate | — | — | — | — |
| `certificate:reissue` | Reissue with corrections | — | — | ○ | — |

**Notes:**
- `BR-669` — Manual issuance and revocation are `ROLE-01` only. A certificate is a credential the founder's name stands behind (`BR-276`).
- `BR-670` — `ROLE-04` may reissue for a name correction only; this revokes the prior code (`BR-282`).

---

### 4.10 `M10` — AI Tutor

| Permission | Description | `ROLE-02` | `ROLE-03` | `ROLE-04` | `ROLE-05` |
|---|---|:--:|:--:|:--:|:--:|
| `ai:chat` | Use the AI tutor | ● | ● | ● | ○ |
| `ai_conversation:read.own` | View own conversations | ● | ● | ● | ● |
| `ai_conversation:read.any` | View learner conversations | — | — | ○ | — |
| `ai_config:read` | View AI configuration | — | — | — | — |
| `ai_config:update` | Change provider, model, prompts | — | — | — | — |
| `ai_usage:read` | View usage and cost reports | — | — | — | — |
| `ai:compare` | Use the model comparison tool | — | — | — | — |
| `ai:reindex` | Trigger content re-embedding | — | — | — | — |

**Notes:**
- `BR-671` — `ROLE-05` access to `ai:chat` is gated by entitlement, not by role (`FEAT-041`). The permission grants the capability; the entitlement grants the quota.
- `BR-672` — `ROLE-04` may view a learner's AI conversation **only** while an open ticket references it, and every view is audit-logged. This is a privacy-sensitive read.
- `BR-673` — `ai_config:update` is `ROLE-01` only. Model configuration controls both cost and answer quality (`FEAT-169`).
- `BR-674` — `ai:reindex` is `ROLE-01` only and requires typed confirmation (`BR-484`).

---

### 4.11 `M11` — Q&A

| Permission | Description | `ROLE-02` | `ROLE-03` | `ROLE-04` | `ROLE-05` |
|---|---|:--:|:--:|:--:|:--:|
| `qa_question:create` | Ask a question | ● | ● | ● | ◐ |
| `qa_question:read` | View questions | ◐ | — | ● | ○ |
| `qa_answer:create` | Answer as instructor | ◐ | — | — | — |
| `qa_answer:update` | Edit an answer | ◐ | — | — | — |
| `qa:moderate` | Hide, edit, or remove content | ◐ | — | ● | — |
| `qa:resolve` | Mark a question resolved | ◐ | — | ● | ◐ |
| `qa:promote_to_kb` | Add an answer to the AI knowledge base | ◐ | — | — | — |

**Notes:**
- `BR-675` — `ROLE-02` sees and answers questions only on their own lessons (`BR-345`).
- `BR-676` — `ROLE-05` reads public resolved questions on lessons they have access to, and their own private questions.
- `BR-677` — `qa:promote_to_kb` belongs to instructors only. Adding an unverified answer to the AI knowledge base propagates errors at scale (`BR-330`).

---

### 4.12 `M12` — Reviews

| Permission | Description | `ROLE-02` | `ROLE-03` | `ROLE-04` | `ROLE-05` |
|---|---|:--:|:--:|:--:|:--:|
| `review:create` | Submit a review | — | — | — | ◐ |
| `review:read` | View reviews in admin | ◐ | — | ● | — |
| `review:approve` | Approve or reject a review | — | — | — | — |
| `review:reply` | Post a public reply | ◐ | — | — | — |
| `review:moderate` | Hide an abusive review | — | — | ● | — |

**Notes:**
- `BR-678` — `review:approve` is `ROLE-01` only, and rejection is permitted solely for spam or abuse — never for a low rating (`BR-362`).
- `BR-679` — `ROLE-04` may hide an abusive review immediately; the founder reviews the decision afterward.

---

### 4.13 `M13` — Content Protection

| Permission | Description | `ROLE-02` | `ROLE-03` | `ROLE-04` | `ROLE-05` |
|---|---|:--:|:--:|:--:|:--:|
| `device:read.own` | View own bound device | ● | ● | ● | ● |
| `device:read.any` | View a learner's devices | — | — | ● | — |
| `device_transfer:request` | Request a device switch | ● | ● | ● | ● |
| `device_transfer:approve` | Approve a transfer request | — | — | ○ | — |
| `device_transfer:approve.override` | Approve beyond policy limits | — | — | — | — |
| `device:unbind` | Force-release a device binding | — | — | ○ | — |
| `playback_log:read` | View playback history | — | — | ○ | — |
| `abuse_flag:read` | View flagged accounts | — | — | ● | — |
| `abuse_flag:resolve` | Clear or action a flag | — | — | — | — |

**Notes:**
- `BR-680` — `ROLE-04` approves transfers **within policy** (`DEC-04`). Requests beyond the abuse threshold escalate to `ROLE-01` (`BR-391`).
- `BR-681` — `ROLE-04` may view playback logs for a specific learner while handling an open ticket, and cannot export them (`BR-406`).
- `BR-682` — Only `ROLE-01` may act on an abuse flag. Suspending a paying learner is never a support-level decision (`BR-393`).

---

### 4.14 `M14` — Notifications & Email

| Permission | Description | `ROLE-02` | `ROLE-03` | `ROLE-04` | `ROLE-05` |
|---|---|:--:|:--:|:--:|:--:|
| `notification:read.own` | View own notifications | ● | ● | ● | ● |
| `notification:send` | Send a manual notification | ◐ | — | ○ | — |
| `announcement:create` | Broadcast to learners | — | — | — | — |
| `email_template:read` | View email templates | — | ● | — | — |
| `email_template:update` | Edit email templates | — | ● | — | — |
| `email_budget:read` | View email budget consumption | — | — | — | — |

**Notes:**
- `BR-683` — `ROLE-02` may notify learners enrolled in their own courses (e.g. new content added).
- `BR-684` — `ROLE-04` may notify an individual learner in the context of a ticket, never in bulk.
- `BR-685` — Broadcasts are `ROLE-01` only. A single bad broadcast can exhaust the monthly email budget (`CON-10`).
- `BR-686` — `ROLE-03` may edit email templates as a content task, but cannot send.

---

### 4.15 `M15` — Support

| Permission | Description | `ROLE-02` | `ROLE-03` | `ROLE-04` | `ROLE-05` |
|---|---|:--:|:--:|:--:|:--:|
| `ticket:create` | Open a ticket | ● | ● | ● | ● |
| `ticket:read.own` | View own tickets | ● | ● | ● | ● |
| `ticket:read.any` | View all tickets | — | — | ● | — |
| `ticket:reply` | Reply to a ticket | — | — | ● | ◐ |
| `ticket:assign` | Assign a ticket | — | — | ● | — |
| `ticket:update_status` | Change ticket status | — | — | ● | — |
| `ticket:internal_note` | Write staff-only notes | — | — | ● | — |
| `canned_response:manage` | Manage reply templates | — | — | ● | — |

**Notes:**
- `BR-687` — Internal notes are never exposed to learners through any surface, including API responses (`BR-447`).
- `BR-688` — Payment and refund category tickets route to `ROLE-01` by default (`BR-449`).

---

### 4.16 `M16` — Admin & Operations

| Permission | Description | `ROLE-02` | `ROLE-03` | `ROLE-04` | `ROLE-05` |
|---|---|:--:|:--:|:--:|:--:|
| `admin:access` | Access the admin area at all | ● | ● | ● | — |
| `dashboard:read` | View the operations dashboard | ◐ | — | ○ | — |
| `setting:read` | View system settings | — | — | — | — |
| `setting:update` | Change system settings | — | — | — | — |
| `audit_log:read` | View the audit log | — | — | — | — |
| `approval_queue:read` | View pending approvals | — | — | — | — |
| `user:impersonate` | View the platform as a learner | — | — | — | — |

**Notes:**
- `BR-689` — `admin:access` is the gateway permission. Without it, `/admin` does not exist for that user — no redirect, no error page (`PRIN-01`).
- `BR-690` — Each role sees a different dashboard composed from their permissions (`BR-467`). `ROLE-02` sees their own course metrics; `ROLE-04` sees the support and device queues.
- `BR-691` — `user:impersonate` is `ROLE-01` only, read-only, reason-required, and fully audit-logged (`BR-499`–`BR-503`).
- `BR-692` — `audit_log:read` is `ROLE-01` only. Anyone who can read the audit log can see everyone's activity.

---

### 4.17 `M17` — Analytics

| Permission | Description | `ROLE-02` | `ROLE-03` | `ROLE-04` | `ROLE-05` |
|---|---|:--:|:--:|:--:|:--:|
| `report:revenue` | Revenue reporting | — | — | — | — |
| `report:enrollment` | Funnel and conversion | — | — | — | — |
| `report:completion` | Completion analytics | ◐ | — | — | — |
| `report:dropoff` | Drop-off analysis | ◐ | — | — | — |
| `report:engagement` | Engagement metrics | — | — | — | — |
| `report:ai_usage` | AI usage and cost | — | — | — | — |
| `report:quiz` | Quiz performance | ◐ | — | — | — |
| `report:support` | Ticket and resolution metrics | — | — | ● | — |
| `report:export` | Export any report | — | — | — | — |

**Notes:**
- `BR-693` — `ROLE-02` sees completion, drop-off, and quiz analytics **for their own courses only** — the data they need to improve their teaching, and nothing about money (`PERS-11` boundaries).
- `BR-694` — `report:export` is `ROLE-01` only. Exports containing PII are additionally flagged as security events (`BR-521`).

---

### 4.18 `M18`, `M20`, `M21` — Localization, Public Site, Platform

| Permission | Description | `ROLE-02` | `ROLE-03` | `ROLE-04` | `ROLE-05` |
|---|---|:--:|:--:|:--:|:--:|
| `translation:read` | View translation strings | — | ● | — | — |
| `translation:update` | Edit translation strings | — | ● | — | — |
| `page:read` | View public pages in admin | — | ● | — | — |
| `page:update` | Edit public pages | — | ● | — | — |
| `page:publish` | Publish a public page | — | — | — | — |
| `article:create` | Write a blog article | ● | ● | — | — |
| `article:update` | Edit an article | ◐ | ● | — | — |
| `article:publish` | Publish an article | — | — | — | — |
| `legal:update` | Edit legal pages | — | — | — | — |
| `system:health` | View system health | — | — | — | — |
| `backup:read` | View backup status | — | — | — | — |
| `backup:trigger` | Run a manual backup | — | — | — | — |
| `job:read` | View queue status | — | — | — | — |
| `job:retry` | Retry a failed job | — | — | — | — |

**Notes:**
- `BR-695` — `ROLE-03` is the primary translation and public-page editor — it fits the content assistant role precisely.
- `BR-696` — `legal:update` is `ROLE-01` only. Legal text carries liability.
- `BR-697` — All of `M21` is `ROLE-01` only. Infrastructure is not a delegated concern for a one-person team.

---

## 5. Permission Count Summary

| Module | Permissions |
|---|---:|
| `M01` Identity | 11 |
| `M02` Roles & Permissions | 9 |
| `M03` Commerce | 17 |
| `M04` Entitlements | 7 |
| `M05` Content | 25 |
| `M06` Learning | 9 |
| `M07` Goals | 6 |
| `M08` Assessment | 12 |
| `M09` Certificates | 5 |
| `M10` AI | 8 |
| `M11` Q&A | 7 |
| `M12` Reviews | 5 |
| `M13` Protection | 9 |
| `M14` Notifications | 6 |
| `M15` Support | 8 |
| `M16` Admin | 7 |
| `M17` Analytics | 9 |
| `M18`/`M20`/`M21` | 14 |
| **Total** | **174** |

---

## 6. Scoping & Resolution

### 6.1 Resolution Order

Evaluated top to bottom; the first match wins (`BR-038`):

```
1. Is the actor ROLE-01?              → grant everything
2. Explicit user-level REVOKE?        → deny
3. Explicit user-level GRANT?         → grant
4. Role holds the permission?         → grant (apply scope)
5. Otherwise                          → deny
```

### 6.2 Scope Enforcement

Scoping is applied at the **data layer**, not in controllers (`BR-656`).

```
Actor holds course:update.any  → no filter applied
Actor holds course:update.own  → WHERE owner_id = actor.id
Actor holds neither            → resource is absent from results
```

**Rules:**
- `BR-698` — Ownership cascades: owning a course implies ownership of its sections, lessons, notes, resources, and quizzes (`BR-044`).
- `BR-699` — A scoped query returning nothing produces an empty state with a constructive next action, never a `403` (`BR-046`).
- `BR-700` — Scope filters are applied by a shared query decorator so they cannot be omitted by forgetting a `where` clause in a new endpoint.

### 6.3 Ownership Transfer

- `BR-701` — Course ownership is transferable by `ROLE-01` only and is audit-logged (`BR-045`).
- `BR-702` — Deactivating an instructor does not orphan their courses; ownership transfers to `ROLE-01` automatically.

---

## 7. Capability Map Specification

The concrete implementation of `PRIN-01` and the founder's core requirement (`FEAT-017`).

### 7.1 Shape

Every resource response embeds `_can`:

```json
{
  "id": "crs_01HQZX...",
  "title": { "ar": "أساسيات React", "en": "React Fundamentals" },
  "status": "published",
  "_can": {
    "update": true,
    "delete": false,
    "archive": true,
    "publish": false,
    "request_publish": true,
    "manage_unlock_rules": true,
    "view_students": true,
    "view_revenue": false
  }
}
```

Collections carry both per-item and collection-level maps:

```json
{
  "data": [ { "id": "...", "_can": { "update": true } } ],
  "_can": { "create": true, "export": false },
  "meta": { "total": 42, "page": 1 }
}
```

### 7.2 Learner-Facing Capability

The same mechanism serves learners, carrying unlock and entitlement state (`BR-042`):

```json
{
  "id": "lsn_01HQ...",
  "title": { "ar": "إدارة الحالة", "en": "State Management" },
  "duration_seconds": 1140,
  "is_locked": true,
  "_can": {
    "play": false,
    "read_notes": false,
    "download_resources": false,
    "ask_question": false
  },
  "_reason": {
    "code": "LESSON_LOCKED",
    "unlock_condition": {
      "ar": "أكمل درس \"المكونات الأساسية\" لفتح هذا الدرس",
      "en": "Complete \"Core Components\" to unlock this lesson"
    },
    "action": { "type": "navigate", "target": "lsn_01HQY..." }
  }
}
```

**Rules:**
- `BR-703` — `_can` is computed server-side per request against live permissions, entitlements, and unlock rules. It is never cached across users (`BR-040`).
- `BR-704` — Every `false` capability that a user could plausibly act on carries a `_reason` with a human-readable, localized explanation and, where possible, a concrete action.
- `BR-705` — The frontend contains no permission logic. It renders from `_can` (`BR-043`).
- `BR-706` — `_reason` codes come from a fixed enumeration so clients can special-case presentation without parsing text.

### 7.3 Reason Code Enumeration

| Code | Meaning | Typical UI |
|---|---|---|
| `LESSON_LOCKED` | Unlock rules unmet | Show condition + shortcut |
| `NO_ENTITLEMENT` | Content not owned | Show what grants access |
| `ENTITLEMENT_EXPIRED` | Access lapsed | Reactivation invitation |
| `QUOTA_EXHAUSTED` | AI or download limit reached | Show reset date + add-on |
| `DEVICE_MISMATCH` | Playing on an unbound device | Offer transfer request |
| `CONCURRENT_STREAM` | Already playing elsewhere | Offer takeover |
| `EMAIL_UNVERIFIED` | Verification required | Resend action |
| `AWAITING_APPROVAL` | Pending staff decision | Show expected timeline |
| `INSUFFICIENT_PROGRESS` | Threshold not met (e.g. review) | Show required progress |
| `PERMISSION_ABSENT` | Staff lacks the permission | **Render nothing at all** |

**Rules:**
- `BR-707` — `PERMISSION_ABSENT` never renders a message. The control is simply not drawn. This is the sole reason code with no user-facing text (`PRIN-01`).

---

## 8. Shared Ability Definition

One definition consumed by backend, web, and mobile (`FEAT-018`).

```ts
// packages/abilities/src/defineAbilities.ts

export function defineAbilitiesFor(actor: Actor): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (actor.role === 'super_admin') {
    can('manage', 'all');
    return build();
  }

  for (const permission of actor.permissions) {
    const { model, action, scope } = parsePermission(permission);

    if (scope === 'own') {
      can(action, model, { owner_id: actor.id });
    } else {
      can(action, model);
    }
  }

  for (const revoked of actor.revokedPermissions) {
    const { model, action } = parsePermission(revoked);
    cannot(action, model);
  }

  return build();
}
```

**Rules:**
- `BR-708` — The package has no runtime dependency on the backend, so mobile and web can consume it directly.
- `BR-709` — The permission registry is generated from a single source file; adding a permission in code makes it available for assignment in admin after the startup sync (`FEAT-014`).
- `BR-710` — Client-side ability checks are a rendering optimization only. Every mutation is re-checked server-side (`BR-043`).

---

## 9. Admin Navigation Visibility

Navigation is generated from permissions, never hardcoded (`BR-461`).

| Section | Required permission | `ROLE-02` | `ROLE-03` | `ROLE-04` |
|---|---|:--:|:--:|:--:|
| Dashboard | `dashboard:read` | ◐ | — | ○ |
| Courses | `course:read` | ◐ | ● | — |
| Media Library | `media:read` | ● | ● | — |
| Quizzes | `quiz:read` | ◐ | ● | — |
| Grading | `grading:read` | ◐ | — | — |
| Q&A | `qa_question:read` | ◐ | — | ● |
| Students | `user:read` | — | — | ● |
| Progress | `progress:read.any` | ◐ | — | ● |
| Products | `product:update` | — | — | — |
| Coupons | `coupon:read` | — | — | ● |
| Orders | `order:read` | — | — | ○ |
| Refunds | `refund:request` | — | — | ● |
| Entitlements | `entitlement:read` | — | — | ● |
| Devices | `device:read.any` | — | — | ● |
| Tickets | `ticket:read.any` | — | — | ● |
| Reviews | `review:read` | ◐ | — | ● |
| Reports | any `report:*` | ◐ | — | ○ |
| Translations | `translation:read` | — | ● | — |
| Public Pages | `page:read` | — | ● | — |
| AI Config | `ai_config:read` | — | — | — |
| Settings | `setting:read` | — | — | — |
| Staff & Roles | `role:read` | — | — | — |
| Audit Log | `audit_log:read` | — | — | — |
| System | `system:health` | — | — | — |

**Rules:**
- `BR-711` — A section with no granted permission does not appear. There is no greyed-out state and no "upgrade" prompt for staff (`PRIN-01`).
- `BR-712` — A section appears if the actor holds **any** of its required permissions; contents within it are then individually gated.
- `BR-713` — Direct navigation to a route the actor cannot access renders the same "not found" surface as a genuinely missing page. It never confirms that a restricted section exists.

---

## 10. Security Backstop

The capability map is a UX layer. It is not security (`BR-041`).

**Rules:**
- `BR-714` — Every endpoint enforces its permission independently of `_can`. A client that fabricates capabilities gains nothing.
- `BR-715` — Enforcement failures return `403` with a generic body. They never disclose which permission was missing.
- `BR-716` — Repeated `403` responses from one actor are logged as security events and surface in error tracking (`BR-496`).
- `BR-717` — Scope enforcement is applied in queries, so a valid permission with the wrong scope returns an empty result rather than another user's data.
- `BR-718` — Permission changes take effect on the next request via `permission_version`, without forcing logout (`BR-017`, `BR-036`).

---

## 11. Implementation Notes

**Startup sync (`FEAT-014`):**
On boot, the application reconciles the code-defined permission registry with the database — inserting new permissions, and flagging permissions present in the database but absent from code as orphaned rather than deleting them.

**Seeding:**
The five system roles are seeded with the permission sets defined in §4. Seeds are idempotent and safe to re-run.

**Caching:**
An actor's resolved permission set is cached in Redis keyed by user ID and `permission_version`. Any permission change bumps the version, invalidating the cache without an explicit purge.

**Testing requirement:**
- `BR-719` — Every endpoint has a test asserting that an actor without the required permission receives `403` and that `_can` reports `false`. Permission regressions are silent until exploited.

---

## 12. Open Questions

| ID | Question | Blocking | Owner |
|---|---|---|---|
| `OQ-13` | Should `ROLE-03` (Content Assistant) be able to edit **any** course, or only courses explicitly assigned to them? Current design grants global edit access. | `10-database-design` | Founder |
| `OQ-14` | Should `ROLE-04` (Support) be able to see the *existence* of order amounts in aggregate (e.g. "high-value customer") without seeing figures? | `07-business-logic` | Founder |

---

## 13. Approval

| Item | Status |
|---|---|
| Naming convention `model:action.scope` is correct | ☐ Approved |
| Action and scope vocabularies are complete | ☐ Approved |
| Five system roles and their boundaries are correct | ☐ Approved |
| The 174-permission registry is complete | ☐ Approved |
| `ROLE-02` scoped to `.own` throughout is correct | ☐ Approved |
| `ROLE-03` with broad edit but zero publish authority is correct | ☐ Approved |
| `ROLE-04` with no financial visibility is correct | ☐ Approved |
| Resolution order and data-layer scoping are correct | ☐ Approved |
| Capability map shape and reason codes are correct | ☐ Approved |
| `PERMISSION_ABSENT` rendering nothing at all (`BR-707`) is accepted | ☐ Approved |
| Navigation generated from permissions is correct | ☐ Approved |
| Business rules `BR-639`–`BR-719` are binding | ☐ Approved |

**Next document:** `06-user-flows.md` — end-to-end journeys for every user type: registration, onboarding, purchase, learning, assessment, certification, device transfer, support, and every staff workflow.

---
