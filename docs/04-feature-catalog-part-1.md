# 04 — Feature Catalog · Part 1

### Modules `M01`–`M04` — Identity, Permissions, Commerce, Entitlements

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 04 — Feature Catalog (Part 1 of 5) |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | `01-problem-and-goals.md`, `02-target-users.md`, `03-features-identification.md` |
| **Feeds Into** | `05-roles-and-permissions.md`, `06-user-flows.md`, `07-business-logic.md`, `10-database-design.md`, `11-api-contract.md`, `14-security-design.md` |
| **Covers** | `FEAT-001` – `FEAT-046` (46 features) |

---

## Reading Guide

Each feature is specified as:

- **Why** — the problem it solves. If this is weak, the feature is questionable.
- **Actors** — who interacts with it.
- **Behavior** — what actually happens.
- **Rules** — binding constraints, carrying `BR-XXX` IDs consumed by `07-business-logic.md`.
- **Edge cases** — the situations that break naive implementations.

**Part index:**

| Part | Modules | Features |
|---|---|---|
| **1 (this)** | `M01`–`M04` | `FEAT-001`–`FEAT-046` |
| 2 | `M05`–`M07` | `FEAT-047`–`FEAT-088` |
| 3 | `M08`–`M13` | `FEAT-089`–`FEAT-143` |
| 4 | `M14`–`M17` | `FEAT-144`–`FEAT-183` |
| 5 | `M18`–`M21` | `FEAT-184`–`FEAT-220` |

---

# `M01` — Identity & Access

The entry point to everything. Failures here are total failures: a user who cannot register cannot buy, and a user who cannot log in has lost their purchase.

---

### `FEAT-001` — Email + Password Registration

**Why:** The universal fallback. Not every learner has a Google account, and not every learner trusts social login with a purchase.

**Actors:** `SEG-01` → `SEG-02`

**Behavior:**
- Collects full name, email, password.
- Password hashed with Argon2id before storage.
- Account created in `pending_verification` state.
- Verification email dispatched immediately (`FEAT-005`).
- User is logged in right away and routed to onboarding (`FEAT-077`) — verification does not block browsing.

**Rules:**
- `BR-001` — Password minimum 8 characters, must contain at least one letter and one number. No maximum length, no forced special characters.
- `BR-002` — Email addresses are unique and case-insensitive, normalized to lowercase.
- `BR-003` — An unverified account may browse, take free courses, and set goals, but **cannot purchase** or receive a certificate.

**Edge cases:**
- Registering with an email that already exists → do not reveal existence. Send a "you already have an account" email instead of an error. Prevents account enumeration.
- Registering with an email tied to a Google-only account → prompt account linking (`FEAT-004`) rather than creating a duplicate.

---

### `FEAT-002` — Google OAuth

**Why:** Removes the highest-friction moment in the funnel. Fewer form fields means more completed signups.

**Actors:** `SEG-01` → `SEG-02`

**Behavior:**
- OAuth 2.0 authorization code flow with PKCE.
- On first login, an account is created from the Google profile (name, email, avatar).
- Email from Google is treated as **pre-verified**.
- Existing account with the same email → identities are linked automatically.

**Rules:**
- `BR-004` — A Google-sourced email is considered verified without a separate verification email.
- `BR-005` — A user who registered via Google may set a password later to enable email login. They are never forced to.

**Edge cases:**
- User revokes Google access externally → account survives; they must set a password or use phone login to regain entry.
- Google account without an email (rare, enterprise-restricted) → reject with a clear message directing to email registration.

---

### `FEAT-003` — Phone + OTP Authentication

**Why:** A large share of the Egyptian and Gulf audience treats phone number as primary identity and uses email rarely. Requiring email would silently lose part of `PERS-01`.

**Actors:** `SEG-01` → `SEG-02`

**Behavior:**
- Phone number entered in international format with country selection.
- 6-digit OTP delivered by SMS.
- Verified number creates or authenticates the account.
- Same flow serves both registration and login.

**Rules:**
- `BR-006` — OTP validity is 5 minutes. Maximum 3 verification attempts per code.
- `BR-007` — Maximum 3 OTP requests per number per hour, then a 1-hour cooldown.
- `BR-008` — Phone numbers are stored in normalized E.164 format and are unique across accounts.
- `BR-009` — A phone-only account **must add an email before purchasing** — receipts, certificates, and lifecycle email require a deliverable address.

**Edge cases:**
- Number already linked to another account → offer login instead of registration.
- Number changed by the carrier and reassigned → the manual identity-verification path runs through support (`FEAT-154`).
- SMS delivery failure → surface a retry option and an alternative registration path; never leave a dead end.

---

### `FEAT-004` — Account Linking

**Why:** Without it, a learner who bought using Google and later logs in by phone appears to have lost their purchase. This is the single most damaging support incident a learning platform can produce.

**Actors:** All learners

**Behavior:**
- One account may hold multiple identity providers: email/password, Google, phone.
- Linking initiated from account settings, or automatically when a verified email matches.
- All entitlements, progress, and history stay attached to the single account.

**Rules:**
- `BR-010` — Automatic linking occurs only on a **verified** matching email. Phone numbers never auto-link — a phone number carries no ownership proof of an existing account.
- `BR-011` — At least one authentication method must remain on the account. Unlinking the last one is not offered (`PRIN-01`).

**Edge cases:**
- Two separate accounts already exist with purchases on both → merge is a **support-only** operation with founder approval, and is logged in the audit trail (`FEAT-172`).

---

### `FEAT-005` — Email Verification

**Why:** Protects deliverability, prevents typo-addresses from losing certificates and receipts, and blocks throwaway-account abuse of free AI quota.

**Actors:** All learners

**Behavior:**
- Signed, single-use token valid for 24 hours.
- Verification link marks the account verified and redirects to the dashboard.
- Resend available with rate limiting.

**Rules:**
- `BR-012` — Expired token → a fresh one is issued automatically on click, not an error page.
- `BR-013` — Purchases require a verified email (`BR-003`).

**Edge cases:**
- Email changed after verification → the new address enters `pending` while the old remains active until confirmed. Prevents lockout by typo.

---

### `FEAT-006` — Password Reset

**Why:** Baseline recovery. Its absence generates support tickets forever.

**Actors:** All learners, staff

**Behavior:**
- Request by email → signed single-use token valid 1 hour.
- Successful reset invalidates all existing refresh tokens across all devices.

**Rules:**
- `BR-014` — Response is identical whether the email exists or not. No enumeration.
- `BR-015` — Password reset **does not** release device binding (`FEAT-135`). The two systems are deliberately independent — otherwise password reset becomes a device-transfer bypass.

**Edge cases:**
- Reset requested for a Google-only account → email explains the account uses Google sign-in and offers the option to set a password.

---

### `FEAT-007` — JWT Session Management

**Why:** Stateless authentication shared identically by web, mobile, and admin.

**Actors:** All

**Behavior:**
- Short-lived access token (15 minutes) carrying user ID, role, and permission version.
- Long-lived refresh token (30 days) with rotation on every use.
- Refresh tokens stored hashed and revocable server-side.

**Rules:**
- `BR-016` — Refresh token reuse detection: presenting an already-rotated token revokes the entire token family and forces re-login. Standard theft protection.
- `BR-017` — Permission changes bump a `permission_version` claim; tokens carrying a stale version are refreshed on the next request rather than rejected outright.
- `BR-018` — Mobile refresh tokens are stored in Keychain (iOS) and EncryptedSharedPreferences (Android), never in plain storage.

**Edge cases:**
- Clock skew between client and server → tokens allow a 60-second leeway.
- Account deactivated mid-session → the next refresh fails and the session ends cleanly.

---

### `FEAT-008` — Active Session List

**Why:** Learners need visibility into where they are logged in — especially on a platform that enforces device binding. Transparency prevents the perception of arbitrary lockouts.

**Actors:** All learners, staff

**Behavior:**
- Lists each active session with device label, browser/OS, approximate location, last activity, and a "current session" marker.
- Individual revoke, plus "sign out everywhere."

**Rules:**
- `BR-019` — Session revocation is immediate: the refresh token is invalidated and the access token expires within 15 minutes.
- `BR-020` — A session list is **not** a device list. Sessions are authentication; devices are playback authorization (`FEAT-135`). They are shown separately and explained in the UI to avoid confusion.

---

### `FEAT-009` — Profile Management

**Why:** Identity data feeds certificates, personalization, notifications, and AI context.

**Actors:** All learners, staff

**Behavior:**
- Editable: display name, avatar, bio, interface language, timezone, country.
- Avatar uploaded to R2, resized server-side to a fixed set of dimensions.

**Rules:**
- `BR-021` — The name printed on a certificate is captured **at issuance time** and frozen. Later profile edits do not alter previously issued certificates.
- `BR-022` — Timezone drives streak-day boundaries (`FEAT-084`) and lifecycle email send times (`FEAT-147`). It defaults to browser-detected and is user-overridable.
- `BR-023` — Avatar maximum 2 MB, formats JPG/PNG/WebP.

**Edge cases:**
- Name in Arabic vs English → both stored; the certificate uses the language the student selects at issuance.

---

### `FEAT-010` — Account Settings

**Why:** Consolidated control surface for everything a user owns about themselves.

**Actors:** All learners, staff

**Behavior:**
Grouped sections: security (password, sessions, linked accounts), preferences (language, theme, timezone), notifications (`FEAT-152`), devices (`FEAT-137`), billing (subscriptions, invoices, payment methods).

**Rules:**
- `BR-024` — Sections the user has no relevant data for are hidden, not shown empty and disabled (`PRIN-01`). A user with no subscription sees no billing section.

---

### `FEAT-011` — Account Deletion Request

**Why:** A legal and ethical baseline, and a trust signal to a low-trust audience.

**Actors:** All learners

**Behavior:**
- User requests deletion; a 14-day grace period begins during which logging in cancels the request.
- On execution: personal data anonymized, content contributions (reviews, questions) reassigned to "Deleted User."
- Financial records retained as legally required.

**Rules:**
- `BR-025` — Orders, invoices, and transactions are **never** deleted — they are financial records. Only personal identifiers are stripped.
- `BR-026` — An active subscription must be cancelled before deletion executes; the user is told this rather than silently blocked.
- `BR-027` — Issued certificates remain publicly verifiable, showing the name captured at issuance. Deleting an account does not invalidate a credential already presented to employers.

**Edge cases:**
- Deletion requested during an active refund dispute → deletion is deferred until the dispute closes, and the user is informed.

---

### `FEAT-012` — Login Activity Log

**Why:** Lets a learner detect unauthorized access themselves, reducing support load and increasing confidence in the security model.

**Actors:** All learners, staff

**Behavior:**
- Records timestamp, IP, approximate location, device, and success/failure for the last 90 days.
- Displayed newest first in account settings.

**Rules:**
- `BR-028` — Failed attempts are recorded but never expose which credential was wrong.
- `BR-029` — Successful login from a new country triggers a notification email.

---

# `M02` — Roles & Permissions

The most architecturally consequential module in the product. Everything else renders through it.

---

### `FEAT-013` — Database-Driven Roles

**Why:** Hardcoded roles mean a deployment every time the team structure changes. A single-person team cannot absorb that (`CON-01`).

**Actors:** `PERS-10`

**Behavior:**
- Roles are database rows: key, bilingual display name, description, system flag.
- Seeded roles: `ROLE-01` Super Admin, `ROLE-02` Instructor, `ROLE-03` Content Assistant, `ROLE-04` Support Agent, `ROLE-05` Student.
- Custom roles creatable from admin (e.g. Accountant, Marketer).

**Rules:**
- `BR-030` — System roles cannot be deleted, but their permission sets are editable — except `ROLE-01`, which always holds all permissions implicitly.
- `BR-031` — A user holds exactly one role, plus optional per-user overrides (`FEAT-016`). Multiple simultaneous roles are deliberately excluded — they multiply reasoning complexity with no near-term benefit.
- `BR-032` — Deleting a custom role requires reassigning its users first. The system proposes a target role rather than blocking.

---

### `FEAT-014` — Granular Permission Registry

**Why:** The founder explicitly requires per-model, per-action control.

**Actors:** `PERS-10`

**Behavior:**
Permission format: `{model}:{action}[.{scope}]`

```
course:create
course:read
course:update.own      → only courses they own
course:update.any      → any course
course:publish.request
course:publish.approve
lesson:delete.own
student:read
student:read.pii       → email, phone, address
payment:read
refund:request
refund:approve
device_transfer:approve
ai_config:update
```

- Permissions are registered in code (they map to real capabilities) and stored in the database for assignment.
- A startup sync reconciles code-defined permissions with the database, adding new ones and flagging orphans.

**Rules:**
- `BR-033` — `.own` and `.any` are distinct permissions. Holding `.any` implies `.own`.
- `BR-034` — Absence of a permission is denial. There is no implicit grant.
- `BR-035` — Personally identifiable information sits behind dedicated permissions (`student:read.pii`), separate from general read access. This is what keeps `ROLE-02` and `ROLE-03` away from learner contact details.

**Edge cases:**
- A permission removed from code but still assigned → flagged in admin as orphaned, not silently dropped.

---

### `FEAT-015` — Role–Permission Assignment UI

**Why:** Permissions that require SQL to change are permissions that never change.

**Actors:** `PERS-10`

**Behavior:**
- Matrix view: models as rows, actions as columns, checkboxes at intersections.
- Grouped by module with search.
- Bulk actions: grant all for a model, clear all, copy from another role.
- Live preview: "this role will be able to…" summary in plain language.

**Rules:**
- `BR-036` — Changing a role's permissions increments `permission_version` for every user holding it (`BR-017`), so changes take effect on the next request without forced logout.
- `BR-037` — Every change is written to the audit log (`FEAT-020`).

---

### `FEAT-016` — Per-User Permission Overrides

**Why:** Reality produces exceptions. One assistant is trusted to publish; one instructor needs temporary revenue visibility. Creating a whole role for a single exception is worse than supporting exceptions directly.

**Actors:** `PERS-10`

**Behavior:**
- Grant or revoke individual permissions on a specific user, on top of their role.
- Overrides display distinctly in the admin UI with an optional reason note.
- Optional expiry date for temporary grants.

**Rules:**
- `BR-038` — Resolution order: explicit user revoke → explicit user grant → role permission → deny.
- `BR-039` — Overrides are always visible on the user's admin profile. Invisible special-casing is how permission systems rot.

---

### `FEAT-017` — Capability Map in API Responses

**Why:** This is `PRIN-01` made concrete, and the founder's explicit requirement. The UI must never render an action the user cannot perform, and must never show a permission error.

**Actors:** All staff, all learners

**Behavior:**
Every resource response embeds a computed `_can` object:

```json
{
  "id": "crs_01H...",
  "title": { "ar": "أساسيات React", "en": "React Fundamentals" },
  "_can": {
    "update": true,
    "delete": false,
    "publish": false,
    "request_publish": true,
    "view_students": true,
    "view_revenue": false
  }
}
```

- Collections carry `_can` per item plus a collection-level map for actions such as `create`.
- The frontend renders purely from `_can`. It contains no permission logic of its own.

**Rules:**
- `BR-040` — `_can` is computed server-side per request against live permissions. It is never cached across users.
- `BR-041` — Hard `403` remains implemented on every endpoint as a security backstop, but is unreachable through normal UI use (`PRIN-01`).
- `BR-042` — The same principle applies to learners: a locked lesson returns `_can.play: false` with an `unlock_reason`, so the UI shows the path instead of an error (`PRIN-03`).

**Edge cases:**
- Permissions revoked while a page is open → the next action returns `403`; the client interprets this as "refresh capabilities" and re-renders, rather than showing a raw error.

---

### `FEAT-018` — Shared Ability Definitions

**Why:** Duplicating permission logic across backend, web, and mobile guarantees the three will diverge. Divergence in a permission system is a security bug.

**Actors:** System

**Behavior:**
- A single CASL ability definition lives in a shared monorepo package.
- Backend uses it for enforcement and `_can` computation.
- Web and mobile use it for optimistic rendering ahead of a response.

**Rules:**
- `BR-043` — The server is always authoritative. Client-side ability checks are a UX optimization and are never trusted.

---

### `FEAT-019` — Ownership Scoping

**Why:** `ROLE-02` (Instructor) must operate freely inside their own content and be entirely absent from everyone else's.

**Actors:** `PERS-11`, `PERS-10`

**Behavior:**
- Ownable resources carry an `owner_id`.
- Queries are automatically scoped when the user holds `.own` but not `.any`.
- Scoping applies at the data layer, so it cannot be bypassed by a forgotten filter in a controller.

**Rules:**
- `BR-044` — Ownership cascades: owning a course implies ownership of its sections, lessons, resources, and quizzes.
- `BR-045` — Ownership is transferable by `ROLE-01` only, and is audit-logged.
- `BR-046` — A scoped list returns an empty result, never a `403`. An instructor with no courses sees "create your first course," not an error (`PRIN-01`).

---

### `FEAT-020` — Permission Audit Trail

**Why:** When access changes, there must be a record of who changed it and when. This matters most on the day something goes wrong.

**Actors:** `PERS-10`

**Behavior:**
- Records: actor, target user or role, permission, action (grant/revoke), timestamp, IP, optional reason.
- Filterable and exportable.

**Rules:**
- `BR-047` — Audit entries are append-only. No edit, no delete, at any permission level.

---

# `M03` — Commerce & Payments

Where the platform earns. Built on `PRIN-05`: every offer is configuration, never code.

---

### `FEAT-021` — Product Abstraction

**Why:** The central commercial idea. Products are decoupled from content, so any offer can be assembled without engineering (`GOAL-05`).

**Actors:** `PERS-10`

**Behavior:**
A product carries: type, bilingual name and description, pricing per currency, media, status, and a set of entitlements it grants (`FEAT-043`).

```
Product ──grants──▶ Entitlements ──unlock──▶ Content / Features
```

Types: `one_time`, `subscription`, `bundle`, `membership`, `addon`.

**Rules:**
- `BR-048` — A product never references a lesson or video directly. It only grants entitlements.
- `BR-049` — Multiple products may grant the same entitlement. A course can be sold alone, inside a bundle, and included in a membership simultaneously.
- `BR-050` — Archiving a product stops new sales but never revokes entitlements already granted.

---

### `FEAT-022` — One-Time Purchase Products

**Why:** The default and most trusted purchase model for this audience. Recurring billing carries suspicion in the Egyptian market; a single payment does not.

**Actors:** All learners

**Behavior:**
- Single payment grants its entitlements.
- Access duration configurable: lifetime, or fixed months.

**Rules:**
- `BR-051` — "Lifetime" means the lifetime of the platform, stated explicitly in the terms. No ambiguity.
- `BR-052` — Time-boxed access begins at purchase, not at first lesson view.
- `BR-053` — Repurchasing a time-boxed product **extends** existing access rather than replacing it.

---

### `FEAT-023` — Subscription Products

**Why:** Predictable recurring revenue and access to the full catalog for `PERS-03`, who wants breadth rather than one course.

**Actors:** `SEG-04`

**Behavior:**
- Monthly or annual billing through Stripe (international) or Paymob (Egypt, where supported).
- Entitlements remain active while the subscription is active.
- Cancellation retains access to the end of the paid period.

**Rules:**
- `BR-054` — Cancellation never revokes access immediately. The paid period is always honored.
- `BR-055` — Failed payment enters a 7-day grace period with access intact and up to 3 retry attempts, then moves the user to `SEG-06`.
- `BR-056` — During grace, messaging is a reminder, never a threat (`PRIN-02`).
- `BR-057` — Content completed during an active subscription remains visible after expiry as read-only Lesson Notes (`DEC-07`).

**Edge cases:**
- Price change while subscribed → existing subscribers keep their original price until they cancel. Grandfathering is a retention asset.
- Subscribing while holding a one-time purchase → both entitlements coexist. The one-time purchase survives subscription expiry.

---

### `FEAT-024` — Bundle Products

**Why:** Raises average order value and gives the learner a coherent path rather than a shopping decision.

**Actors:** All learners

**Behavior:**
- Groups multiple course entitlements at a combined price.
- Displays the saving versus buying separately.

**Rules:**
- `BR-058` — A learner who already owns part of a bundle sees the bundle price adjusted, or is offered only the remaining items. Never charged twice for the same content.
- `BR-059` — Adding a course to an existing bundle grants it to everyone who already bought that bundle. This is a deliberate loyalty mechanic and is stated on the bundle page.

---

### `FEAT-025` — Membership Products

**Why:** Bundles content *and* capability — the highest-value commercial construct and the natural home for AI quota, priority support, and extras.

**Actors:** `SEG-05`

**Behavior:**
- Tiered memberships (e.g. Basic / Pro) each granting a defined entitlement set.
- Billed one-time or recurring.

**Rules:**
- `BR-060` — Membership tiers are ordered. Upgrading is prorated; downgrading takes effect at the end of the current period.
- `BR-061` — Feature entitlements from a membership stack additively with those from individual purchases. Quotas sum; they do not replace one another.

---

### `FEAT-026` — Feature Add-On Products

**Why:** Directly monetizes `PERS-04`, the heaviest AI consumer, instead of subsidizing them from other learners' payments (`CON-02`).

**Actors:** `PERS-04`, all learners

**Behavior:**
- Sells a capability with no content attached: extra AI messages, priority support, extended access, certificate re-issuance.
- Purchasable standalone or offered contextually at the moment a quota is exhausted.

**Rules:**
- `BR-062` — The quota-exhausted screen presents the add-on as an option, framed as capability, never as an interruption or a paywall shock (`PRIN-02`).
- `BR-063` — Purchased quota is additive to the current period's remaining balance and does not reset it.

---

### `FEAT-027` — Multi-Currency Pricing

**Why:** Egyptian and Gulf purchasing power differ by an order of magnitude. A single price fails both markets.

**Actors:** All learners

**Behavior:**
- Explicit price per currency: EGP, SAR, AED, USD.
- Currency selected by detected country, user-overridable.
- Prices are authored per currency, never converted at runtime.

**Rules:**
- `BR-064` — No live FX conversion. Every price is a deliberate commercial decision.
- `BR-065` — Currency is fixed at checkout and recorded on the order. Later price or currency changes never affect a completed order.
- `BR-066` — A missing price for a currency falls back to USD via Stripe rather than hiding the product.

---

### `FEAT-028` — Paymob Integration

**Why:** The primary Egyptian gateway. Card penetration is limited; wallets, Fawry, and installments are how this market actually pays (`CON-08`).

**Actors:** Egyptian learners

**Behavior:**
- Methods: cards, mobile wallets (Vodafone Cash, Orange Money, Etisalat Cash), Fawry reference codes, and installment plans.
- Hosted payment page; card data never touches the platform.
- Webhook-driven order fulfillment (`FEAT-038`).

**Rules:**
- `BR-067` — Fawry payments complete asynchronously — potentially hours later. The order sits in `pending_payment` and the entitlement is granted only on webhook confirmation.
- `BR-068` — The learner sees a clear "your reference code is X, pay at any Fawry outlet" state with the order retrievable from their account.
- `BR-069` — Pending Fawry orders expire after 72 hours and are marked abandoned.

**Edge cases:**
- Wallet payment succeeds but the webhook fails → a scheduled reconciliation job polls pending orders against the gateway API (`FEAT-214`).

---

### `FEAT-029` — Stripe Integration

**Why:** Gulf and international coverage, and the strongest available subscription infrastructure.

**Actors:** Gulf and international learners

**Behavior:**
- Stripe Checkout for one-time payments; Stripe Billing for subscriptions.
- Customer portal for payment method updates and cancellation.
- Webhook-driven fulfillment.

**Rules:**
- `BR-070` — Stripe subscription state is authoritative for subscription products. The local database mirrors it and reconciles on webhook.
- `BR-071` — 3D Secure is always enabled. Reduced fraud outweighs marginal conversion loss.

---

### `FEAT-030` — Payment Provider Abstraction

**Why:** `DEC-01`. Gateway choice depends on unresolved business registration; the architecture must not depend on the outcome.

**Actors:** System

**Behavior:**

```
PaymentProvider
├── createCheckout(order, customer)
├── verifyWebhook(payload, signature)
├── refund(transaction, amount)
├── createSubscription(plan, customer)
└── cancelSubscription(subscriptionId)
```

Implementations: `PaymobProvider`, `StripeProvider`, `KashierProvider` (fallback).

**Rules:**
- `BR-072` — Provider selection is per-currency and per-country, configured in admin, not hardcoded.
- `BR-073` — All providers write to the same order and transaction tables. Reporting never branches on provider.

---

### `FEAT-031` — Checkout Flow

**Why:** The highest-stakes screen in the product. Every unnecessary field costs money.

**Actors:** All learners

**Behavior:**
- Direct checkout from a product page. **No cart** — this is a course academy, not a store; multi-item purchases are handled by bundles.
- Summary: product, price, currency, applicable discount, final total.
- Coupon field (`FEAT-032`).
- Payment method selection filtered to the detected country.
- Post-payment: success screen with immediate "start learning" action.

**Rules:**
- `BR-074` — Purchase requires authentication. Guest checkout is excluded — entitlements need an account, and a purchase that cannot be located is the worst possible outcome.
- `BR-075` — Purchase requires a verified email (`BR-003`, `BR-013`).
- `BR-076` — Already owning the product replaces the buy action with "go to course." Duplicate purchase is never possible (`PRIN-01`).
- `BR-077` — On success, the learner is routed **into the first lesson**, not back to the catalog. First-session activation drives `MET-09`.

**Edge cases:**
- Payment succeeds, page closed before redirect → the webhook still grants the entitlement, and the confirmation email contains a direct course link.
- Price changed between page load and payment → the price captured at checkout initiation is honored.

---

### `FEAT-032` — Coupons & Discount Codes

**Why:** Launch pricing, campaigns, partnerships, and recovery of abandoned purchases.

**Actors:** `PERS-10`, all learners

**Behavior:**
- Percentage or fixed-amount discounts.
- Constraints: expiry date, total usage cap, per-user cap, product scope, minimum order value, first-purchase-only.
- Redemption tracking per code.

**Rules:**
- `BR-078` — One coupon per order. Stacking is excluded.
- `BR-079` — An invalid code returns a specific, friendly reason ("this code expired on 15 August"), never a generic failure (`PRIN-02`).
- `BR-080` — Coupons apply before tax and before currency selection is locked.
- `BR-081` — A coupon can be attached to a subscription's first period only, or to every renewal — configurable per code.

---

### `FEAT-033` — Time-Limited Launch Pricing

**Why:** Scheduled promotions without the founder needing to be awake at the start and end times (`MET-06`).

**Actors:** `PERS-10`

**Behavior:**
- Price window with start and end timestamps per product and currency.
- Original price shown struck through with a countdown.
- Automatic reversion at expiry.

**Rules:**
- `BR-082` — Countdown timers must reflect a real deadline. Fake or resetting urgency is prohibited — it contradicts the trust posture the brand depends on.

---

### `FEAT-034` — Order & Transaction Records

**Why:** The financial spine. Everything commercial reconciles here.

**Actors:** `PERS-10`, system

**Behavior:**
- **Order**: what was bought, by whom, at what price, in what currency, in what state.
- **Transaction**: individual payment attempt with gateway reference, status, and raw response.
- One order may hold multiple transactions (failed attempt, then success; or a refund).

**Rules:**
- `BR-083` — Orders are immutable once paid. Corrections are new records, never edits.
- `BR-084` — Every order stores the price, currency, discount, and product snapshot **as of purchase time**. Later product changes never rewrite history.
- `BR-085` — Order states: `pending_payment` → `paid` → `refunded` / `partially_refunded` / `failed` / `abandoned`.

---

### `FEAT-035` — Invoice Generation

**Why:** Gulf professionals and company-reimbursed learners require documentation. Its absence blocks a paying segment.

**Actors:** All learners

**Behavior:**
- PDF generated on payment confirmation, stored on R2, linked from the order.
- Contains academy details, learner details, line items, taxes if applicable, and payment method.

**Rules:**
- `BR-086` — Invoice numbers are sequential, gapless, and never reused.
- `BR-087` — Generated once and stored; never re-rendered on demand (`CON-03`).
- `BR-088` — Learners may add a company name and tax ID to their profile for inclusion on future invoices.

---

### `FEAT-036` — Refund Request Workflow

**Why:** Refund clarity is trust infrastructure in a low-trust market. Separating request from approval keeps financial authority with the founder (`PERS-13` boundaries).

**Actors:** All learners, `PERS-13`, `PERS-10`

**Behavior:**
- Learner submits a request with a reason from the account area.
- Support triages and either resolves without refund or forwards with a recommendation (`refund:request`).
- Founder approves or declines (`refund:approve`).
- Approval triggers the gateway refund and revokes the related entitlement.

**Rules:**
- `BR-089` — Refund eligibility window is configurable, defaulting to 14 days from purchase.
- `BR-090` — A refund past a configurable progress threshold (default 30% completion) requires explicit founder override, with the reason recorded.
- `BR-091` — Refunding revokes the entitlement but **preserves progress data** — if they return, they resume where they stopped (`DEC-07`).
- `BR-092` — A declined refund is answered with a reason and an alternative offer (extension, credit, different course), never a flat rejection (`PRIN-02`).

**Edge cases:**
- Gateway refund fails → the request stays open and is flagged for manual handling; the entitlement is not revoked until money actually moves.

---

### `FEAT-037` — Subscription Lifecycle Management

**Why:** Subscriptions fail silently and expensively without deliberate handling.

**Actors:** `SEG-04`, system

**Behavior:**
States: `trialing` → `active` → `past_due` → `cancelled` / `expired`

- Renewal reminder 3 days before charge.
- Failed payment triggers grace, retries, and notification.
- Cancellation collects an optional reason and offers a pause alternative.
- Post-expiry reactivation restores the previous plan in one action.

**Rules:**
- `BR-093` — Cancellation reasons are recorded and surfaced in analytics (`FEAT-179`).
- `BR-094` — Pause is offered before cancellation is confirmed — up to 3 months, retaining progress and place.
- `BR-095` — Reactivation within 60 days restores the previous price.

---

### `FEAT-038` — Payment Webhook Handling

**Why:** Every payment gateway delivers webhooks late, twice, or out of order. Naive handling grants double entitlements or none at all.

**Actors:** System

**Behavior:**
- Signature verification on every inbound webhook.
- Idempotency key per event; duplicates are acknowledged and ignored.
- Events processed through a queue, never inline (`FEAT-213`).
- Failed processing retries with exponential backoff and alerts after final failure.

**Rules:**
- `BR-096` — Webhook processing is idempotent. The same event processed ten times produces exactly one entitlement.
- `BR-097` — Raw webhook payloads are stored for 90 days for dispute resolution.
- `BR-098` — Out-of-order events are resolved by event timestamp, not arrival order.
- `BR-099` — A payment webhook for an unknown order is logged and alerted, never silently dropped.

---

# `M04` — Entitlements & Access Control

The layer that makes `PRIN-05` real. Nothing in the product checks "did you buy this course" — everything checks "do you hold this entitlement."

---

### `FEAT-039` — Entitlement Engine

**Why:** One access model for content, features, and quotas. Without it, every new commercial idea becomes a code change.

**Actors:** System

**Behavior:**
An entitlement records: user, key, source (product/order/manual), granted timestamp, optional expiry, status, and metadata.

```
access:course:{course_id}
access:bundle:{bundle_id}
feature:ai_tutor
feature:certificate
feature:priority_support
quota:ai_messages:{n}/month
```

- Resolution is a single indexed lookup returning the user's active entitlement set.
- Cached in Redis per user, invalidated on any change.

**Rules:**
- `BR-100` — Entitlements are additive. Holding the same key from multiple sources yields the longest expiry, and quotas sum (`BR-061`).
- `BR-101` — Every access check in the entire system resolves through this engine. No feature queries orders or purchases directly.
- `BR-102` — Expiry is evaluated at read time, not by a nightly job. A grace period is a property of the entitlement, not a separate mechanism.

---

### `FEAT-040` — Content Entitlements

**Why:** Grants access to a course, a bundle, or the full catalog.

**Actors:** All learners

**Behavior:**
- `access:course:{id}` unlocks that course's lessons, resources, and quizzes.
- `access:catalog:all` unlocks everything published (subscriptions and top memberships).
- Free courses grant an entitlement automatically on enrollment, keeping one uniform access path.

**Rules:**
- `BR-103` — Free content still issues an entitlement. No special-case bypass — one code path for all access.
- `BR-104` — Preview lessons (`DEC-08`) are accessible without any entitlement, including to `SEG-01`.
- `BR-105` — Losing a content entitlement never deletes progress, notes, or certificates (`DEC-07`).

---

### `FEAT-041` — Feature Entitlements

**Why:** Capability sold independently of content — the mechanism behind memberships and add-ons.

**Actors:** All learners

**Behavior:**
Boolean capabilities: `feature:ai_tutor`, `feature:certificate`, `feature:priority_support`, `feature:downloadable_resources`, `feature:instructor_qa`.

Checked at the point of use; absence changes what renders, never producing an error (`PRIN-01`).

**Rules:**
- `BR-106` — A missing feature entitlement produces an invitation to unlock, not a blocked action.
- `BR-107` — Feature entitlements may be scoped globally or to a specific course, allowing "AI included with this course only."

---

### `FEAT-042` — Quota Entitlements

**Why:** AI cost is the only variable expense that scales with usage. Uncapped, it breaks a $30/month budget (`CON-02`, `PERS-04`).

**Actors:** System, all learners

**Behavior:**
- Metered entitlements with a limit, a period (monthly/lifetime), and a consumed counter.
- `quota:ai_messages` — the primary case.
- Remaining balance visible to the learner before it runs out.
- Automatic period reset for recurring quotas.

**Rules:**
- `BR-108` — Free registered users receive 5 lifetime AI messages (`DEC-06`).
- `BR-109` — Quota consumption is atomic. Concurrent requests cannot exceed the limit.
- `BR-110` — At 80% consumption the learner is informed proactively — no surprise exhaustion (`PRIN-02`).
- `BR-111` — Exhaustion presents the add-on option (`FEAT-026`) alongside a clear reset date.
- `BR-112` — A failed AI request does not consume quota.

---

### `FEAT-043` — Product → Entitlement Mapping

**Why:** The exact mechanism by which the founder composes offers without a deployment (`PRIN-05`, `MET-05`).

**Actors:** `PERS-10`

**Behavior:**
- Admin UI attaching any number of entitlements to a product, each with its own duration.
- Example — "React Mastery + AI" product grants:
  - `access:course:react-mastery` (lifetime)
  - `feature:ai_tutor` (3 months)
  - `quota:ai_messages` (200/month, 3 months)
  - `feature:certificate` (lifetime)
- Preview panel showing exactly what a buyer receives.

**Rules:**
- `BR-113` — Editing a product's entitlement set affects **future purchases only**. Existing buyers keep what they bought (`BR-084`).
- `BR-114` — Adding an entitlement to an existing product may optionally be back-granted to prior buyers, as an explicit, confirmed action.

---

### `FEAT-044` — Entitlement Expiry & Grace

**Why:** Time-boxed access must end predictably and be communicated humanely.

**Actors:** System, `SEG-06`

**Behavior:**
- Expiry evaluated at read time (`BR-102`).
- Configurable grace period after expiry with full access retained.
- Notification sequence at 7 days, 1 day, and on expiry.
- Post-expiry the learner enters `SEG-06` with history intact.

**Rules:**
- `BR-115` — Expiry messaging is an invitation to return, never a lockout notice (`PRIN-02`).
- `BR-116` — Expiry never interrupts an in-progress video session. It applies from the next session.
- `BR-117` — A certificate already earned is permanent and unaffected by expiry (`BR-027`).

---

### `FEAT-045` — Manual Entitlement Grant

**Why:** Gifts, partnerships, beta testers, support remediation, and the founder's own access. Without it, every exception becomes a fake purchase.

**Actors:** `PERS-10`

**Behavior:**
- Grant any entitlement to any user from the admin, with duration and a required reason.
- Appears in the learner's account labeled as granted, not purchased.
- Revocable, with reason recorded.

**Rules:**
- `BR-118` — Manual grants require a reason. No silent access.
- `BR-119` — Manual grants are excluded from revenue reporting but included in enrollment and completion analytics.
- `BR-120` — Bulk granting to a segment (e.g. all `PERS-01` who completed course X) is supported as a single confirmed operation.

---

### `FEAT-046` — Entitlement Audit Log

**Why:** Access disputes are resolved by history. "I paid for this and lost it" must be answerable in seconds.

**Actors:** `PERS-10`, `PERS-13`

**Behavior:**
- Append-only record of every grant, expiry, revocation, and quota reset, with source and actor.
- Visible on the learner's admin profile as a timeline.

**Rules:**
- `BR-121` — Append-only. No deletion at any permission level (`BR-047`).
- `BR-122` — Support (`ROLE-04`) can read the entitlement log but cannot see the associated payment amounts.

---

## Coverage Summary — Part 1

| Module | Features | Business Rules |
|---|---:|---:|
| `M01` Identity & Access | 12 | `BR-001`–`BR-029` |
| `M02` Roles & Permissions | 8 | `BR-030`–`BR-047` |
| `M03` Commerce & Payments | 18 | `BR-048`–`BR-099` |
| `M04` Entitlements | 8 | `BR-100`–`BR-122` |
| **Total** | **46** | **122 rules** |

---

## Approval — Part 1

| Item | Status |
|---|---|
| Identity and authentication behavior is correct | ☐ Approved |
| Permission model and capability map approach are correct | ☐ Approved |
| Commercial model (products → entitlements) is correct | ☐ Approved |
| Payment rules, refund policy, and thresholds are acceptable | ☐ Approved |
| Entitlement engine design is correct | ☐ Approved |
| Business rules `BR-001`–`BR-122` are binding | ☐ Approved |

**Next:** `04-feature-catalog · Part 2` — `M05` Content Management, `M06` Learning Experience, `M07` Goals & Motivation (`FEAT-047`–`FEAT-088`).

---
