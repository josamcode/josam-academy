# 11 — API Contract · Part 1

### Conventions + Modules `M01`–`M09`

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 11 — API Contract (Part 1 of 2) |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | `05-roles-and-permissions.md`, `07-business-logic.md`, `09-system-architecture.md`, `10-database-design` |
| **Feeds Into** | `12-ui-ux-design.md`, `14-security-design.md`, `16-task-breakdown.md` |
| **Covers** | `API-1` – `API-9` · ~95 endpoints · `BR-1105` – `BR-1152` |

---

## 1. Conventions

### 1.1 Base & Versioning

```
Production   https://api.josamacademy.com/v1
Local        http://localhost:4000/v1
```

- `BR-1105` — Version lives in the path. A breaking change means `/v2`; `/v1` remains supported for at least 6 months so mobile clients on old versions keep working.
- `BR-1106` — Additive changes (new fields, new optional parameters) are not breaking and ship within the current version.

### 1.2 Headers

| Header | Required | Purpose |
|---|---|---|
| `Authorization: Bearer <token>` | Authenticated routes | Access token |
| `Accept-Language: ar \| en` | No | Response language; defaults to the profile preference |
| `X-Device-Token` | Playback routes | Device identification (`BR-1051`) |
| `X-Client-Platform` | Yes | `web` / `ios` / `android` |
| `X-Client-Version` | Mobile | Enables version-specific handling |
| `Idempotency-Key` | Mutations that create | Prevents duplicates on retry |
| `X-Correlation-Id` | No | Propagated through logs (`BR-627`) |

### 1.3 Response Envelope

**Single resource:**

```json
{
  "data": {
    "id": "crs_01HQZX...",
    "title": { "ar": "أساسيات React", "en": "React Fundamentals" },
    "_can": { "update": true, "delete": false }
  }
}
```

**Collection:**

```json
{
  "data": [ { "id": "...", "_can": { "update": true } } ],
  "_can": { "create": true, "export": false },
  "meta": {
    "total": 142,
    "page": 1,
    "per_page": 20,
    "total_pages": 8,
    "has_more": true
  }
}
```

- `BR-1107` — Every resource carries `_can`, computed server-side per request (`BR-703`).
- `BR-1108` — Collections carry a collection-level `_can` for actions such as `create` and `export`.
- `BR-1109` — Bilingual fields are always returned as objects, never pre-resolved to a single language. The client renders per its own locale, allowing language switching without a refetch.

### 1.4 Capability & Reason

When a capability is `false` and the user could plausibly act on it, `_reason` explains why:

```json
{
  "data": {
    "id": "lsn_01HQZX...",
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
      "message": {
        "ar": "أكمل درس \"المكونات الأساسية\" لفتح هذا الدرس",
        "en": "Complete \"Core Components\" to unlock this lesson"
      },
      "action": {
        "type": "navigate",
        "label": { "ar": "اذهب للدرس", "en": "Go to lesson" },
        "target": "/lessons/lsn_01HQZY..."
      }
    }
  }
}
```

- `BR-1110` — `_reason.code` comes from the fixed enumeration in `05 §7.3` (`BR-706`).
- `BR-1111` — `PERMISSION_ABSENT` is never returned. The field is simply absent from `_can`, and the UI renders nothing (`BR-707`).
- `BR-1112` — `action` is optional but strongly preferred. Every denial should offer a path forward (`BR-704`).

### 1.5 Errors

```json
{
  "error": {
    "code": "QUOTA_EXHAUSTED",
    "message": {
      "ar": "رصيدك من أسئلة المساعد انتهى — يتجدد ١ سبتمبر",
      "en": "You've used all your AI messages — they renew on 1 September"
    },
    "details": { "resets_at": "2026-09-01T00:00:00Z", "limit": 200 },
    "correlation_id": "req_01HQZX..."
  }
}
```

| Status | Meaning | Notes |
|---|---|---|
| 400 | Malformed request | |
| 401 | Missing or invalid token | Client refreshes and retries once |
| 403 | Permission or access denied | Security backstop; UI should never reach this (`BR-1111`) |
| 404 | Not found | Also returned for resources the actor may not know exist (`BR-713`) |
| 409 | Conflict | Duplicate, or state does not allow the operation |
| 422 | Validation failed | Field-level `details` |
| 429 | Rate limited | Includes `Retry-After` and reset time (`BR-632`) |
| 500 | Server error | Generic message only (`BR-940`) |

- `BR-1113` — Error messages are bilingual objects, localized server-side from the string catalog (`BR-523`).
- `BR-1114` — Internal details never appear in an error response (`BR-631`).
- `BR-1115` — Every error carries a `correlation_id` matching the log entry (`BR-630`).

### 1.6 Pagination, Filtering, Sorting

```
GET /v1/catalog/courses?page=2&per_page=20&sort=-published_at
                        &filter[level]=beginner&filter[category]=web
```

- `BR-1116` — Default `per_page` is 20, maximum 100.
- `BR-1117` — Sort uses `-` prefix for descending. Multiple sorts are comma-separated.
- `BR-1118` — High-volume feeds (notifications, audit log) use cursor pagination instead of offset; deep offsets are expensive on 2 vCPU.

### 1.7 Idempotency

- `BR-1119` — Every `POST` that creates a resource accepts `Idempotency-Key`. The same key within 24 hours returns the original response rather than creating a duplicate.
- `BR-1120` — Webhooks are idempotent by provider event ID (`BR-096`).

### 1.8 Rate Limits

Per `07 §8.7`. Responses include:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1722182400
```

---

## `API-1` — Authentication

Public unless noted.

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Email + password registration (`FLOW-01` B) |
| `POST` | `/auth/login` | Email + password login |
| `POST` | `/auth/google` | Google OAuth exchange (`FLOW-01` A) |
| `POST` | `/auth/phone/otp` | Request an OTP (`FLOW-01` C) |
| `POST` | `/auth/phone/verify` | Verify OTP, register or log in |
| `POST` | `/auth/refresh` | Rotate the refresh token |
| `POST` | `/auth/logout` | Revoke the current session |
| `POST` | `/auth/email/verify` | Consume a verification token |
| `POST` | `/auth/email/resend` | Resend verification |
| `POST` | `/auth/password/forgot` | Request a reset link |
| `POST` | `/auth/password/reset` | Consume a reset token |

**`POST /auth/register`**

```json
// Request
{
  "full_name": "محمد أحمد",
  "email": "user@example.com",
  "password": "••••••••",
  "locale": "ar",
  "timezone": "Africa/Cairo"
}

// 201
{
  "data": {
    "user": { "id": "usr_01HQ...", "full_name": "محمد أحمد",
              "email_verified": false, "onboarding_completed": false },
    "access_token": "eyJhbGc...",
    "expires_in": 900
  }
}
```

- `BR-1121` — The refresh token is set as an httpOnly cookie on web; on mobile it is returned in the body for Keychain storage (`BR-855`).
- `BR-1122` — A session is issued immediately; email verification never blocks access (`BR-721`).
- `BR-1123` — Registering with an existing email returns `201` with a neutral body and sends an "account exists" email. It never reveals existence (`FLOW-01` failure paths).

**`POST /auth/phone/otp`**

```json
// Request
{ "phone": "+201012345678" }

// 200
{ "data": { "expires_in": 300, "attempts_allowed": 3, "can_resend_at": "2026-07-28T12:01:00Z" } }
```

---

## `API-2` — Account

All require authentication.

| Method | Path | Permission |
|---|---|---|
| `GET` | `/me` | — |
| `PATCH` | `/me` | `profile:update.own` |
| `PATCH` | `/me/password` | — |
| `POST` | `/me/avatar` | `profile:update.own` |
| `GET` | `/me/sessions` | `session:read.own` |
| `DELETE` | `/me/sessions/:id` | `session:delete.own` |
| `DELETE` | `/me/sessions` | `session:delete.own` |
| `GET` | `/me/identities` | — |
| `POST` | `/me/identities` | — |
| `DELETE` | `/me/identities/:id` | — |
| `GET` | `/me/login-activity` | — |
| `GET` | `/me/devices` | `device:read.own` |
| `POST` | `/me/deletion-request` | — |
| `DELETE` | `/me/deletion-request` | — |
| `GET` | `/me/notification-preferences` | — |
| `PATCH` | `/me/notification-preferences` | — |

**`GET /me`**

```json
{
  "data": {
    "id": "usr_01HQ...",
    "full_name": "محمد أحمد",
    "email": "user@example.com",
    "email_verified": true,
    "phone": "+201012345678",
    "avatar_url": "https://cdn.josamacademy.com/...",
    "locale": "ar",
    "timezone": "Africa/Cairo",
    "theme_preference": "dark",
    "role": { "key": "student", "name": { "ar": "طالب", "en": "Student" } },
    "persona": "career_switcher",
    "onboarding_completed": true,
    "permissions": ["profile:update.own", "ai:chat", "..."],
    "_can": { "update": true, "delete_account": true, "access_admin": false }
  }
}
```

- `BR-1124` — `permissions` is returned so clients can build ability instances locally for optimistic rendering (`BR-710`).

---

## `API-3` — Roles & Permissions (Admin)

| Method | Path | Permission |
|---|---|---|
| `GET` | `/admin/roles` | `role:read` |
| `POST` | `/admin/roles` | `role:create` |
| `PATCH` | `/admin/roles/:id` | `role:update` |
| `DELETE` | `/admin/roles/:id` | `role:delete` |
| `GET` | `/admin/permissions` | `permission:read` |
| `PUT` | `/admin/roles/:id/permissions` | `role:update` |
| `GET` | `/admin/users/:id/overrides` | `permission:assign` |
| `POST` | `/admin/users/:id/overrides` | `permission:assign` |
| `DELETE` | `/admin/users/:id/overrides/:permissionId` | `permission:assign` |

**`PUT /admin/roles/:id/permissions`**

```json
// Request — full replacement, not a patch
{ "permission_keys": ["course:read", "course:create", "course:update.own"] }

// 200
{ "data": { "role_id": "rol_01HQ...", "permission_count": 3, "affected_users": 1 } }
```

- `BR-1125` — Full replacement rather than incremental patching. Partial updates to permission sets are how permission systems silently drift.
- `BR-1126` — The response reports `affected_users`, whose `permission_version` was bumped (`BR-955`).

---

## `API-4` — Public Catalog

No authentication required.

| Method | Path | Description |
|---|---|---|
| `GET` | `/catalog/courses` | Paginated, filterable listing |
| `GET` | `/catalog/courses/:slug` | Course detail with full curriculum |
| `GET` | `/catalog/courses/:slug/reviews` | Reviews, if above threshold |
| `GET` | `/catalog/categories` | Category tree |
| `GET` | `/catalog/products/:id` | Product with entitlement preview |
| `GET` | `/public/verify/:code` | Certificate verification (`FLOW-14`) |

**`GET /catalog/courses/:slug`**

```json
{
  "data": {
    "id": "crs_01HQ...",
    "slug": { "ar": "asasyat-react", "en": "react-fundamentals" },
    "title": { "ar": "أساسيات React", "en": "React Fundamentals" },
    "outcomes": { "ar": ["...", "..."], "en": ["...", "..."] },
    "level": "beginner",
    "duration_minutes": 720,
    "lesson_count": 48,
    "sequential_locking": true,
    "estimated_weeks": { "at_5_hours": 4, "at_10_hours": 2 },
    "rating": { "average": 4.7, "count": 23, "distribution": {"5":15,"4":6,"3":2} },
    "instructor": { "name": "Josam", "avatar_url": "..." },
    "curriculum": [
      {
        "id": "sec_01HQ...",
        "title": { "ar": "المقدمة", "en": "Introduction" },
        "lessons": [
          { "id": "lsn_01HQ...", "title": {...}, "duration_seconds": 480,
            "type": "video", "is_preview": true },
          { "id": "lsn_01HR...", "title": {...}, "duration_seconds": 1140,
            "type": "video", "is_preview": false }
        ]
      }
    ],
    "products": [
      { "id": "prd_01HQ...", "type": "one_time",
        "price": { "currency": "EGP", "amount_minor": 149900, "formatted": "١٬٤٩٩ ج.م" },
        "grants": [
          { "label": { "ar": "وصول مدى الحياة", "en": "Lifetime access" } },
          { "label": { "ar": "٢٠٠ سؤال للمساعد شهريًا لمدة ٣ شهور",
                       "en": "200 AI messages/month for 3 months" } },
          { "label": { "ar": "شهادة معتمدة", "en": "Certificate" } }
        ]
      }
    ],
    "_can": { "enroll": true, "preview": true, "purchase": true }
  }
}
```

- `BR-1127` — The full curriculum is public, including locked lesson titles and durations (`BR-585`).
- `BR-1128` — `grants` is generated from `product_entitlements`. Marketing copy can never diverge from what is actually granted (`BR-586`).
- `BR-1129` — `estimated_weeks` previews the goal mechanic before signup (`BR-588`).

**`GET /public/verify/:code`**

```json
// Valid
{ "data": { "valid": true, "learner_name": "محمد أحمد",
            "course_title": "أساسيات React", "completed_at": "2026-06-15",
            "issued_by": "Josam Academy",
            "course_url": "https://josamacademy.com/courses/asasyat-react" } }

// Revoked
{ "data": { "valid": false, "status": "revoked" } }

// Not found — 404
{ "error": { "code": "CERTIFICATE_NOT_FOUND", "message": { ... } } }
```

- `BR-1130` — Only name, course, and date are exposed. Never email, phone, score, or progress (`BR-748`).

---

## `API-5` — Commerce

| Method | Path | Permission |
|---|---|---|
| `POST` | `/checkout/coupon/validate` | authenticated |
| `POST` | `/checkout/session` | authenticated, verified email |
| `GET` | `/me/orders` | `order:read.own` |
| `GET` | `/me/orders/:id` | `order:read.own` |
| `GET` | `/me/orders/:id/invoice` | `invoice:read.own` |
| `POST` | `/me/orders/:id/refund-request` | `refund:request.own` |
| `GET` | `/me/subscriptions` | `subscription:read.own` |
| `POST` | `/me/subscriptions/:id/cancel` | `subscription:update.own` |
| `POST` | `/me/subscriptions/:id/pause` | `subscription:update.own` |
| `POST` | `/me/subscriptions/:id/resume` | `subscription:update.own` |
| `POST` | `/webhooks/paymob` | signature |
| `POST` | `/webhooks/stripe` | signature |

**`POST /checkout/session`**

```json
// Request
{ "product_id": "prd_01HQ...", "currency": "EGP",
  "coupon_code": "LAUNCH30", "payment_method": "card" }

// 200
{
  "data": {
    "order_id": "ord_01HQ...",
    "checkout_url": "https://accept.paymob.com/...",
    "expires_at": "2026-07-28T13:00:00Z",
    "summary": {
      "subtotal_minor": 149900, "discount_minor": 44970,
      "total_minor": 104930, "currency": "EGP"
    }
  }
}
```

**Fawry response variant:**

```json
{
  "data": {
    "order_id": "ord_01HQ...",
    "payment_type": "deferred",
    "reference_code": "8123456789",
    "expires_at": "2026-07-31T12:00:00Z",
    "instructions": { "ar": "ادفع بالكود ده في أي منفذ فوري", "en": "..." }
  }
}
```

- `BR-1131` — Checkout requires a verified email (`BR-1131` ← `BR-075`).
- `BR-1132` — Already owning the product returns `409 ALREADY_OWNED` with a link to the course (`BR-076`).
- `BR-1133` — The reference code remains retrievable from `GET /me/orders/:id` indefinitely (`BR-729`).

**`POST /me/subscriptions/:id/cancel`**

```json
// Step 1 — reason submitted, remedy returned (DEC-11)
{ "reason_code": "no_time" }

// 200
{
  "data": {
    "remedy_offered": "pause",
    "remedy": {
      "type": "pause", "max_months": 3,
      "message": { "ar": "تحب توقف الاشتراك مؤقتًا بدل ما تلغيه؟", "en": "..." }
    },
    "confirm_cancel_url": "/me/subscriptions/sub_01HQ.../cancel?confirmed=true"
  }
}
```

- `BR-1134` — Exactly one remedy is offered, and only when the stated reason warrants it (`BR-809`, `§6.5` of doc 07).
- `BR-1135` — `confirm_cancel_url` is always present in the response. Cancellation is never hidden behind the remedy (`BR-774`).

---

## `API-6` — Entitlements

| Method | Path | Permission |
|---|---|---|
| `GET` | `/me/entitlements` | `entitlement:read.own` |
| `GET` | `/me/quotas` | `quota:read.own` |

```json
{
  "data": {
    "content": [
      { "key": "access:course:crs_01HQ...", "course_id": "crs_01HQ...",
        "expires_at": null, "source": "order" }
    ],
    "features": [
      { "key": "feature:ai_tutor", "expires_at": "2026-10-15T00:00:00Z" },
      { "key": "feature:certificate", "expires_at": null }
    ],
    "quotas": [
      { "key": "quota:ai_messages", "limit": 200, "consumed": 47,
        "remaining": 153, "period": "monthly", "resets_at": "2026-08-01T00:00:00Z" }
    ]
  }
}
```

---

## `API-7` — Learning

| Method | Path | Permission |
|---|---|---|
| `GET` | `/me/dashboard` | authenticated |
| `GET` | `/me/continue` | authenticated |
| `GET` | `/me/courses` | authenticated |
| `GET` | `/courses/:id` | `course:read` |
| `GET` | `/courses/:id/curriculum` | `course:read` |
| `GET` | `/courses/:id/search` | `course:read` |
| `GET` | `/lessons/:id` | `lesson:read` |
| `POST` | `/lessons/:id/playback-token` | `lesson:play` |
| `PATCH` | `/lessons/:id/progress` | `progress:update.own` |
| `POST` | `/lessons/:id/complete` | `progress:update.own` |
| `DELETE` | `/lessons/:id/complete` | `progress:update.own` |
| `GET` | `/lessons/:id/notes` | `lesson_note:read` |
| `GET` | `/lessons/:id/resources` | `lesson:read` |
| `POST` | `/resources/:id/download` | `lesson:read` |
| `GET` | `/me/notes` | `note:crud.own` |
| `POST` | `/lessons/:id/notes` | `note:crud.own` |
| `PATCH` | `/notes/:id` | `note:crud.own` |
| `DELETE` | `/notes/:id` | `note:crud.own` |
| `GET` | `/me/notes/export` | `note:crud.own` |
| `POST` | `/lessons/:id/bookmark` | `bookmark:crud.own` |
| `DELETE` | `/lessons/:id/bookmark` | `bookmark:crud.own` |
| `POST` | `/sessions/heartbeat` | authenticated |

### `GET /me/dashboard`

The most-requested endpoint in the product. Single aggregated response (`BR-227`).

```json
{
  "data": {
    "greeting": { "ar": "صباح الخير يا محمد", "en": "Good morning, Mohamed" },
    "streak": { "current": 5, "best": 23, "freezes_remaining": 2 },

    "continue": {
      "course": { "id": "crs_01HQ...", "title": {...}, "thumbnail_url": "..." },
      "section_title": {...},
      "lesson": { "id": "lsn_01HQ...", "title": {...} },
      "position_seconds": 750,
      "duration_seconds": 1140,
      "remaining_minutes": 7,
      "resume_url": "/lessons/lsn_01HQ...?t=750"
    },

    "goal": {
      "type": "career_switcher",
      "label": { "ar": "تغيير مجالي", "en": "Change my field" },
      "progress_percent": 62,
      "projected_date": "2026-09-15",
      "days_remaining": 18,
      "status": "on_track",
      "message": { "ar": "درسين الأسبوع ده وتفضل على المسار",
                   "en": "Two lessons this week keeps you on track" }
    },

    "this_week": {
      "minutes_completed": 210,
      "minutes_committed": 300,
      "lessons_completed": 4,
      "days": [
        { "date": "2026-07-25", "minutes": 45, "qualified": true },
        { "date": "2026-07-26", "minutes": 0,  "qualified": false }
      ]
    },

    "next_up": [
      { "id": "lsn_01HR...", "title": {...}, "duration_seconds": 600, "is_locked": false }
    ],

    "recent_wins": [
      { "type": "section_complete", "label": {...}, "achieved_at": "2026-07-26T20:14:00Z" }
    ],

    "recommended": [
      { "course_id": "crs_01HS...", "title": {...},
        "reason": { "ar": "يكمّل اللي خلصته", "en": "Builds on what you finished" } }
    ]
  }
}
```

- `BR-1136` — Blocks with no data are **omitted from the response entirely**, not returned as `null` or empty arrays. The client renders what exists (`BR-465`, `PRIN-01`).
- `BR-1137` — `goal.message` is server-generated from the copy specification (`07 §7`). Motivational copy is never assembled client-side, so the tone rules are enforced in one place.
- `BR-1138` — `status` is one of `on_track` / `ahead` / `recovering`. There is no `behind` value — the vocabulary itself excludes deficit framing (`BR-226`).

### `POST /lessons/:id/playback-token`

The most security-sensitive endpoint. Implements the full decision table in `07 §6.2`.

```json
// Request
{ "device_token": "dev_tok_...", "platform": "web" }

// 200 — authorized
{
  "data": {
    "playback_url": "https://vz-xxx.b-cdn.net/.../playlist.m3u8",
    "token": "...",
    "expires_at": "2026-07-28T16:00:00Z",
    "session_id": "pbs_01HQ...",
    "watermark": { "enabled": true },
    "resume_position_seconds": 750,
    "chapters": [
      { "title": {...}, "start_time": 0 },
      { "title": {...}, "start_time": 270 }
    ]
  }
}

// 403 — device mismatch
{
  "error": {
    "code": "DEVICE_MISMATCH",
    "message": { "ar": "التشغيل مربوط بجهاز تاني", "en": "Playback is on another device" },
    "details": {
      "current_device": { "label": "Chrome on Windows", "bound_at": "2026-06-12" },
      "auto_transfers_remaining": 2,
      "can_auto_transfer": true,
      "transfer_url": "/me/devices/transfer"
    }
  }
}

// 409 — concurrent stream
{
  "error": {
    "code": "CONCURRENT_STREAM",
    "message": { "ar": "الفيديو شغال على شاشة تانية", "en": "Playing on another screen" },
    "details": { "takeover_url": "/lessons/lsn_01HQ.../playback-token?takeover=true" }
  }
}
```

- `BR-1139` — The response never contains a raw video URL usable without the token (`BR-168`).
- `BR-1140` — Every denial includes the concrete action that resolves it (`BR-1112`).
- `BR-1141` — Watermark content is constructed server-side and never appears in the response. The client cannot know or alter it (`BR-861`).

### `PATCH /lessons/:id/progress`

```json
// Request — batched, sent every 10 seconds
{ "position_seconds": 780, "watched_seconds_delta": 10, "session_id": "pbs_01HQ..." }

// 200
{ "data": { "position_seconds": 780, "watched_percent": 68.4, "auto_completed": false } }
```

- `BR-1142` — This endpoint is high-frequency and must be fast. It writes only to `lesson_progress` and never triggers synchronous aggregation (`BR-1006`).
- `BR-1143` — Crossing the completion threshold sets `auto_completed: true` and publishes `lesson.completed` asynchronously.

---

## `API-8` — Goals & Motivation

| Method | Path | Permission |
|---|---|---|
| `POST` | `/onboarding` | authenticated |
| `GET` | `/me/goal` | `goal:crud.own` |
| `PUT` | `/me/goal` | `goal:crud.own` |
| `GET` | `/me/goal/projection` | `goal:crud.own` |
| `GET` | `/me/streak` | `streak:read.own` |
| `GET` | `/me/achievements` | `achievement:read.own` |
| `GET` | `/me/weekly-progress` | authenticated |

**`POST /onboarding`**

```json
// Request
{ "goal_type": "career_switcher", "current_level": "beginner",
  "weekly_hours": 5, "interests": ["web","javascript","react"] }

// 200
{
  "data": {
    "goal": { "id": "gol_01HQ...", "projected_date": "2026-09-15" },
    "projection_message": {
      "ar": "بمعدل ٥ ساعات في الأسبوع، هتخلص المسار ده حوالي ١٥ سبتمبر",
      "en": "At 5 hours a week, you'll finish this path around 15 September"
    },
    "recommended_courses": [ { "id": "crs_01HQ...", "title": {...}, "reason": {...} } ]
  }
}
```

- `BR-1144` — Every step is individually optional. Partial submissions are accepted and still produce a projection where possible (`BR-724`, `BR-725`).

**`GET /me/goal/projection`**

```json
{
  "data": {
    "projected_date": "2026-09-15",
    "days_remaining": 18,
    "progress_percent": 62,
    "status": "on_track",
    "calculation": {
      "remaining_minutes": 270,
      "weekly_commitment_hours": 5,
      "actual_weekly_minutes": 210,
      "basis": "blended",
      "confidence": "medium"
    },
    "next_action": {
      "message": { "ar": "درسين الأسبوع ده وتفضل على المسار", "en": "..." },
      "lesson": { "id": "lsn_01HR...", "duration_minutes": 12 }
    }
  }
}
```

- `BR-1145` — `calculation` is exposed so the learner can see why the date is what it is. An opaque projection is not trusted.
- `BR-1146` — `next_action` always names a specific lesson with its duration (`BR-812`).

---

## `API-9` — Assessment & Certification

| Method | Path | Permission |
|---|---|---|
| `GET` | `/quizzes/:id` | `quiz:read` |
| `POST` | `/quizzes/:id/attempts` | `attempt:read.own` |
| `GET` | `/attempts/:id` | `attempt:read.own` |
| `PATCH` | `/attempts/:id/answers` | `attempt:read.own` |
| `POST` | `/attempts/:id/submit` | `attempt:read.own` |
| `GET` | `/me/attempts` | `attempt:read.own` |
| `GET` | `/me/certificates` | `certificate:read.own` |
| `GET` | `/certificates/:id` | `certificate:read.own` |
| `GET` | `/certificates/:id/download` | `certificate:read.own` |

**`POST /attempts/:id/submit`**

```json
// 200 — passed
{
  "data": {
    "score": 85, "max_score": 100, "passed": true,
    "status": "graded",
    "message": { "ar": "ممتاز — ٨٥٪", "en": "Excellent — 85%" },
    "results": [
      { "question_id": "qst_01HQ...", "is_correct": true, "points_awarded": 1 }
    ],
    "next_action": { "type": "next_lesson", "lesson_id": "lsn_01HR..." },
    "certificate_issued": null
  }
}

// 200 — not passed
{
  "data": {
    "score": 65, "max_score": 100, "passed": false,
    "message": { "ar": "قريب جدًا — ٦٥٪. راجع ٣ نقاط وجرّب تاني",
                 "en": "So close — 65%. Review these 3 points and try again" },
    "review_items": [
      { "question_id": "qst_01HQ...", "is_correct": false,
        "lesson": { "id": "lsn_01HQ...", "title": {...}, "timestamp_seconds": 750 },
        "explanation": {...} }
    ],
    "attempts_remaining": 2,
    "next_action": { "type": "retry", "available_at": "2026-07-29T12:00:00Z" }
  }
}
```

- `BR-1147` — The response never contains the word "failed" in any language (`BR-744`).
- `BR-1148` — `review_items` links every incorrect answer to the exact lesson and timestamp covering it (`BR-745`).
- `BR-1149` — Exhausted attempts return a review escalation path, never a permanent block (`BR-264`).

**Certificate issuance** (returned inline when a submission completes a course):

```json
{
  "certificate_issued": {
    "id": "crt_01HQ...",
    "verification_code": "JOSAM-4K7M-9XQP-2WRT",
    "verification_url": "https://josamacademy.com/verify/JOSAM-4K7M-9XQP-2WRT",
    "pdf_status": "generating",
    "share": { "linkedin_url": "https://www.linkedin.com/profile/add?..." }
  }
}
```

- `BR-1150` — The certificate record and code are returned synchronously; the PDF follows (`BR-785`). The learner never sees a "processing" state (`BR-278`).

**`GET /certificates/:id/download`**

Returns a 5-minute signed R2 URL.

- `BR-1151` — The PDF is never regenerated on request (`BR-977`).
- `BR-1152` — If the PDF is not yet ready, the response returns `202` with a retry hint rather than an error.

---

## Part 1 Endpoint Summary

| Group | Endpoints |
|---|---:|
| `API-1` Authentication | 11 |
| `API-2` Account | 16 |
| `API-3` Roles & Permissions | 9 |
| `API-4` Public Catalog | 6 |
| `API-5` Commerce | 12 |
| `API-6` Entitlements | 2 |
| `API-7` Learning | 22 |
| `API-8` Goals & Motivation | 7 |
| `API-9` Assessment & Certification | 9 |
| **Total** | **94** |

---

## Approval — Part 1

| Item | Status |
|---|---|
| Response envelope with `_can` and `_reason` is correct | ☐ Approved |
| Bilingual fields returned as objects, not resolved strings (`BR-1109`) | ☐ Approved |
| Error format and status code mapping are correct | ☐ Approved |
| Authentication endpoints and token handling are correct | ☐ Approved |
| Public catalog exposing the full curriculum is correct | ☐ Approved |
| Checkout flow including Fawry deferred payment is correct | ☐ Approved |
| Cancellation with reason-gated remedy (`BR-1134`) is correct | ☐ Approved |
| Dashboard as a single aggregated response is correct | ☐ Approved |
| Playback token endpoint and its denial responses are correct | ☐ Approved |
| Quiz result responses avoiding failure language are correct | ☐ Approved |
| Synchronous certificate issuance with async PDF is correct | ☐ Approved |

**Next:** `11-api-contract · Part 2` — AI, Q&A, reviews, devices, notifications, support, and the full admin API surface.

---
