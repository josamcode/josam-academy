# 11 — API Contract · Part 2

### Modules `M10`–`M17`, `M21` — AI, Q&A, Reviews, Protection, Messaging, Support, Admin, Analytics

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 11 — API Contract (Part 2 of 2) |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | `11-api-contract-part-1.md` |
| **Feeds Into** | `12-ui-ux-design.md`, `14-security-design.md`, `16-task-breakdown.md` |
| **Covers** | `API-10` – `API-21` · ~96 endpoints · `BR-1153` – `BR-1210` |

---

## `API-10` — AI Tutor

| Method | Path | Permission |
|---|---|---|
| `GET` | `/me/ai/conversations` | `ai_conversation:read.own` |
| `POST` | `/me/ai/conversations` | `ai:chat` |
| `GET` | `/me/ai/conversations/:id` | `ai_conversation:read.own` |
| `DELETE` | `/me/ai/conversations/:id` | `ai_conversation:read.own` |
| `POST` | `/me/ai/conversations/:id/messages` | `ai:chat` |
| `POST` | `/me/ai/messages/:id/feedback` | `ai:chat` |
| `POST` | `/me/ai/messages/:id/escalate` | `qa_question:create` |

### `POST /me/ai/conversations/:id/messages`

Server-Sent Events. Streaming is mandatory (`BR-740`).

```json
// Request
{
  "content": "ليه بنستخدم useEffect هنا؟",
  "lesson_id": "lsn_01HQ..."
}
```

**SSE stream:**

```
event: start
data: {"message_id":"msg_01HQ...","quota_remaining":152}

event: token
data: {"text":"لأن "}

event: token
data: {"text":"useEffect "}

event: citations
data: {"citations":[
  {"lesson_id":"lsn_01HQ...","lesson_title":{"ar":"دورة حياة المكوّن","en":"Component Lifecycle"},
   "timestamp_seconds":750,"url":"/lessons/lsn_01HQ...?t=750"}
]}

event: done
data: {"message_id":"msg_01HQ...","quota_remaining":152,"tokens":{"input":1840,"output":312}}
```

**Non-streaming error events:**

```
event: error
data: {"code":"QUOTA_EXHAUSTED","message":{"ar":"رصيدك انتهى — يتجدد ١ سبتمبر","en":"..."},
       "details":{"resets_at":"2026-09-01T00:00:00Z","addon_product_id":"prd_01HQ..."}}

event: out_of_scope
data: {"closest_lesson":{"id":"lsn_01HR...","title":{...}},
       "escalation_available":true}
```

**Rules:**
- `BR-1153` — Quota is decremented on the `done` event only. A stream that fails mid-generation consumes nothing (`BR-799`).
- `BR-1154` — `citations` arrives as a discrete event built from chunk metadata, never parsed from generated text (`BR-1036`).
- `BR-1155` — `quota_remaining` is sent on both `start` and `done` so the UI can display it without a second request.
- `BR-1156` — Out-of-scope responses always offer escalation (`BR-325`).
- `BR-1157` — The request never accepts a system prompt, model, or retrieval parameters from the client. All are server-controlled (`BR-314`).

### `POST /me/ai/messages/:id/escalate`

```json
// Request
{ "note": "الإجابة مش واضحة بالنسبة لحالتي" }

// 201
{
  "data": {
    "question_id": "qaq_01HQ...",
    "status": "escalated",
    "expected_response": { "ar": "عادة يتم الرد خلال ٢٤ ساعة", "en": "Usually answered within 24 hours" }
  }
}
```

- `BR-1158` — The full AI conversation is attached automatically so the instructor never re-answers what was covered (`BR-329`).
- `BR-1159` — Expected response time is always returned. Silence must never be ambiguous (`BR-742`).

---

## `API-11` — Q&A

| Method | Path | Permission |
|---|---|---|
| `GET` | `/lessons/:id/questions` | `qa_question:read` |
| `POST` | `/lessons/:id/questions` | `qa_question:create` |
| `GET` | `/questions/:id` | `qa_question:read` |
| `PATCH` | `/questions/:id` | own question |
| `POST` | `/questions/:id/upvote` | `qa_question:read` |
| `DELETE` | `/questions/:id/upvote` | `qa_question:read` |
| `POST` | `/questions/:id/resolve` | `qa:resolve` |
| `PATCH` | `/questions/:id/visibility` | own question |
| `POST` | `/questions/:id/report` | authenticated |

**`POST /lessons/:id/questions`**

```json
// Request
{ "title": "الفرق بين useState و useRef",
  "body": "لما أستخدم أنهي واحدة؟",
  "timestamp_seconds": 750,
  "is_public": true }

// 201 — AI answers first
{
  "data": {
    "id": "qaq_01HQ...",
    "status": "ai_answered",
    "answers": [
      { "id": "qaa_01HQ...", "source": "ai", "body": "...",
        "citations": [...], "created_at": "..." }
    ],
    "_can": { "escalate": true, "resolve": true, "edit": true }
  }
}
```

- `BR-1160` — AI answers to Q&A do not consume the learner's chat quota. This is the platform's answering channel (`BR-341`).
- `BR-1161` — `source: "ai"` is always present and clients must display it visibly (`BR-1044`).

---

## `API-12` — Reviews

| Method | Path | Permission |
|---|---|---|
| `GET` | `/courses/:id/reviews` | public |
| `GET` | `/me/reviews` | `review:create` |
| `POST` | `/courses/:id/reviews` | `review:create` |
| `PATCH` | `/reviews/:id` | own, within edit window |
| `GET` | `/courses/:id/review-eligibility` | authenticated |

**`GET /courses/:id/review-eligibility`**

```json
{
  "data": {
    "eligible": false,
    "reason": {
      "code": "INSUFFICIENT_PROGRESS",
      "message": { "ar": "اكمل ٢٠٪ من الكورس علشان تقدر تقيّمه", "en": "..." }
    },
    "current_progress": 12,
    "required_progress": 20
  }
}
```

- `BR-1162` — Ineligible learners never see a review form. The client checks this endpoint before rendering (`PRIN-01`).
- `BR-1163` — `GET /courses/:id/reviews` returns an empty response with no aggregate below the display threshold (`BR-1049`).

---

## `API-13` — Devices & Protection

| Method | Path | Permission |
|---|---|---|
| `GET` | `/me/devices` | `device:read.own` |
| `POST` | `/me/devices/transfer` | `device_transfer:request` |
| `GET` | `/me/devices/transfers` | `device:read.own` |
| `PATCH` | `/me/devices/:id/label` | `device:read.own` |
| `POST` | `/sessions/:id/heartbeat` | authenticated |
| `POST` | `/sessions/:id/end` | authenticated |

**`GET /me/devices`**

```json
{
  "data": {
    "active_device": {
      "id": "dev_01HQ...",
      "label": "Chrome on Windows",
      "platform": "web",
      "bound_at": "2026-06-12T09:14:00Z",
      "last_seen_at": "2026-07-28T11:02:00Z",
      "is_current": false
    },
    "transfer_policy": {
      "auto_transfers_remaining": 2,
      "window_resets_at": "2026-08-12T00:00:00Z",
      "cooldown_active": false
    },
    "explanation": {
      "ar": "تشغيل الفيديو مربوط بجهاز واحد. باقي المنصة شغالة من أي جهاز.",
      "en": "Video playback is tied to one device. Everything else works from anywhere."
    }
  }
}
```

- `BR-1164` — The explanation is returned by the API, not written in the client, so the wording stays consistent across web and mobile (`BR-1137` pattern).
- `BR-1165` — Remaining automatic transfers are always visible before the learner needs one (`BR-390`).

**`POST /me/devices/transfer`**

```json
// Request
{ "device_token": "dev_tok_...", "platform": "ios",
  "fingerprint": { "os":"iOS 18", "screen":"390x844", "tz":"Africa/Cairo" } }

// 200 — auto-approved
{ "data": { "status": "auto_approved", "device_id": "dev_01HR...",
            "auto_transfers_remaining": 1,
            "message": { "ar": "تم — تقدر تشغّل من الجهاز ده دلوقتي", "en": "..." } } }

// 202 — queued for review
{ "data": { "status": "pending", "transfer_id": "dtr_01HQ...",
            "expected_review": { "ar": "عادة تتم المراجعة خلال ساعات", "en": "..." },
            "message": { "ar": "طلبك وصلنا وهنراجعه بسرعة", "en": "..." } } }
```

- `BR-1166` — Automatic approval completes in under 5 seconds (`BR-387`).
- `BR-1167` — No response on this endpoint implies wrongdoing in any language (`BR-737`).

---

## `API-14` — Notifications

| Method | Path | Permission |
|---|---|---|
| `GET` | `/me/notifications` | authenticated |
| `PATCH` | `/me/notifications/:id/read` | authenticated |
| `POST` | `/me/notifications/read-all` | authenticated |
| `GET` | `/me/notifications/unread-count` | authenticated |
| `POST` | `/me/push-tokens` | authenticated |
| `DELETE` | `/me/push-tokens/:token` | authenticated |

- `BR-1168` — Notifications use cursor pagination (`BR-1118`).
- `BR-1169` — Push tokens are deregistered on logout (`BR-1065`).

---

## `API-15` — Support

| Method | Path | Permission |
|---|---|---|
| `GET` | `/me/tickets` | `ticket:read.own` |
| `POST` | `/me/tickets` | `ticket:create` |
| `GET` | `/me/tickets/:id` | `ticket:read.own` |
| `POST` | `/me/tickets/:id/messages` | `ticket:reply.own` |
| `POST` | `/me/tickets/:id/reopen` | `ticket:read.own` |
| `GET` | `/help/search` | public |
| `POST` | `/contact` | public |

**`POST /me/tickets`**

```json
// Request — context is auto-attached server-side
{ "category": "access", "subject": "الفيديو مش شغال",
  "body": "...", "attachments": ["upl_01HQ..."] }

// 201
{
  "data": {
    "id": "tkt_01HQ...",
    "status": "open",
    "priority": "urgent",
    "expected_response": { "ar": "هنرد خلال ٦ ساعات", "en": "We'll reply within 6 hours" }
  }
}
```

- `BR-1170` — Context (order, lesson, device, browser, entitlements) is captured server-side. The learner is never asked to describe their environment (`BR-1070`).
- `BR-1171` — Anything blocking access to paid content is automatically `urgent` regardless of tier (`BR-453`).
- `BR-1172` — Internal staff notes never appear in learner-facing responses (`BR-1073`).

---

## `API-16` — Admin: Content

| Method | Path | Permission |
|---|---|---|
| `GET` | `/admin/courses` | `course:read` |
| `POST` | `/admin/courses` | `course:create` |
| `GET` | `/admin/courses/:id` | `course:read` |
| `PATCH` | `/admin/courses/:id` | `course:update` |
| `POST` | `/admin/courses/:id/archive` | `course:archive` |
| `POST` | `/admin/courses/:id/publish` | `course:publish.approve` |
| `POST` | `/admin/courses/:id/publish-request` | `course:publish.request` |
| `POST` | `/admin/sections` | `section:create` |
| `PATCH` | `/admin/sections/:id` | `section:update` |
| `DELETE` | `/admin/sections/:id` | `section:delete` |
| `POST` | `/admin/lessons` | `lesson:create` |
| `PATCH` | `/admin/lessons/:id` | `lesson:update` |
| `DELETE` | `/admin/lessons/:id` | `lesson:delete` |
| `POST` | `/admin/curriculum/reorder` | `lesson:update` |
| `POST` | `/admin/videos/upload-authorization` | `video:upload` |
| `GET` | `/admin/lessons/:id/note-blocks` | `lesson_note:read` |
| `PUT` | `/admin/lessons/:id/note-blocks` | `lesson_note:update` |
| `POST` | `/admin/resources` | `resource:create` |
| `PATCH` | `/admin/resources/:id` | `resource:update` |
| `DELETE` | `/admin/resources/:id` | `resource:delete` |
| `PUT` | `/admin/unlock-rules` | `unlock_rule:manage` |
| `GET` | `/admin/media` | `media:read` |
| `POST` | `/admin/media/upload-url` | `media:upload` |
| `GET` | `/admin/content/:type/:id/versions` | `content:version.restore` |
| `POST` | `/admin/content/:type/:id/versions/:v/restore` | `content:version.restore` |

**`POST /admin/videos/upload-authorization`**

```json
// Request
{ "lesson_id": "lsn_01HQ...", "filename": "lesson-07.mp4", "size_bytes": 524288000 }

// 200
{
  "data": {
    "upload_url": "https://video.bunnycdn.com/library/.../videos/...",
    "video_asset_id": "vid_01HQ...",
    "headers": { "AccessKey": "..." },
    "expires_at": "2026-07-28T13:00:00Z"
  }
}
```

- `BR-1173` — The browser uploads directly to the provider. No video byte passes through the API (`BR-860`).
- `BR-1174` — Upload authorization is single-use and expires in 1 hour (`BR-138`).

**`PUT /admin/lessons/:id/note-blocks`**

```json
// Request — full replacement of the block list
{
  "blocks": [
    { "type": "heading", "position": 1, "start_time": 0,
      "content": { "ar": { "text": "المقدمة" }, "en": { "text": "Introduction" } } },
    { "type": "paragraph", "position": 2, "start_time": 30, "end_time": 270,
      "content": { "ar": { "text": "..." } } },
    { "type": "code", "position": 3, "start_time": 270,
      "content": { "ar": { "code": "const [x] = useState(0)", "language": "javascript" } } }
  ]
}

// 200
{
  "data": {
    "block_count": 3,
    "timestamped_count": 3,
    "chapters_generated": 1,
    "embedding_status": "queued",
    "guidance": { "ar": "ينصح بـ ٥ بلوكات على الأقل لكل درس", "en": "..." }
  }
}
```

- `BR-1175` — Full replacement, not incremental patching — block ordering and timestamps must remain internally consistent (`BR-147`).
- `BR-1176` — Saving queues re-embedding. `guidance` is advisory only and never blocks saving (`BR-143`).

**`POST /admin/curriculum/reorder`**

```json
// Request
{ "moves": [ { "type": "lesson", "id": "lsn_01HQ...",
               "section_id": "sec_01HR...", "position": 3.5 } ] }
```

- `BR-1177` — Fractional positions mean a single move updates one row (`BR-989`).

---

## `API-17` — Admin: Commerce

| Method | Path | Permission |
|---|---|---|
| `GET` | `/admin/products` | `product:read` |
| `POST` | `/admin/products` | `product:create` |
| `PATCH` | `/admin/products/:id` | `product:update` |
| `POST` | `/admin/products/:id/duplicate` | `product:create` |
| `POST` | `/admin/products/:id/archive` | `product:archive` |
| `PUT` | `/admin/products/:id/prices` | `price:manage` |
| `PUT` | `/admin/products/:id/entitlements` | `product:update` |
| `GET` | `/admin/coupons` | `coupon:read` |
| `POST` | `/admin/coupons` | `coupon:create` |
| `POST` | `/admin/coupons/bulk` | `coupon:create` |
| `PATCH` | `/admin/coupons/:id` | `coupon:update` |
| `GET` | `/admin/orders` | `order:read` |
| `GET` | `/admin/orders/:id` | `order:read` |
| `GET` | `/admin/refund-requests` | `refund:request` |
| `POST` | `/admin/refund-requests/:id/recommend` | `refund:request` |
| `POST` | `/admin/refund-requests/:id/approve` | `refund:approve` |
| `POST` | `/admin/refund-requests/:id/decline` | `refund:approve` |
| `GET` | `/admin/subscriptions` | `subscription:read` |

**`PUT /admin/products/:id/entitlements`**

```json
// Request
{
  "entitlements": [
    { "key": "access:course:crs_01HQ...", "duration_days": null },
    { "key": "feature:ai_tutor", "duration_days": 90 },
    { "key": "quota:ai_messages", "duration_days": 90,
      "quota_limit": 200, "quota_period": "monthly" },
    { "key": "feature:certificate", "duration_days": null }
  ],
  "backfill_existing_buyers": false
}

// 200
{
  "data": {
    "entitlement_count": 4,
    "preview": [
      { "ar": "وصول مدى الحياة لكورس أساسيات React", "en": "Lifetime access to React Fundamentals" },
      { "ar": "٢٠٠ سؤال للمساعد شهريًا لمدة ٣ شهور", "en": "200 AI messages/month for 3 months" }
    ],
    "warning": {
      "ar": "التعديل ده يطبق على المشتريات الجديدة فقط",
      "en": "This change applies to future purchases only"
    },
    "existing_buyers": 47
  }
}
```

- `BR-1178` — Changes affect future purchases only unless `backfill_existing_buyers` is explicitly set (`BR-1178` ← `BR-113`, `BR-114`).
- `BR-1179` — The `preview` is generated server-side and is the same text shown on the public product page. Marketing cannot diverge from reality (`BR-1128`).

**`GET /admin/orders`** — response shape varies by permission:

```json
// With payment:read
{ "data": [ { "id": "ord_01HQ...", "total_minor": 149900, "currency": "EGP", ... } ] }

// ROLE-04 without payment:read — amounts omitted entirely
{ "data": [ { "id": "ord_01HQ...", "status": "paid", "product_name": {...},
              "granted_entitlements": [...] } ] }
```

- `BR-1180` — Monetary fields are **omitted**, not nulled or masked, for actors without `payment:read` (`DEC-15`, `BR-1180` ← `BR-469`).

---

## `API-18` — Admin: Users & Operations

| Method | Path | Permission |
|---|---|---|
| `GET` | `/admin/dashboard` | `dashboard:read` |
| `GET` | `/admin/users` | `user:read` |
| `GET` | `/admin/users/:id` | `user:read` |
| `PATCH` | `/admin/users/:id` | `user:update` |
| `POST` | `/admin/users/:id/entitlements` | `entitlement:grant` |
| `DELETE` | `/admin/users/:id/entitlements/:entId` | `entitlement:revoke` |
| `POST` | `/admin/users/:id/entitlements/:entId/extend` | `entitlement:extend` |
| `POST` | `/admin/users/:id/quota-adjust` | `quota:adjust` |
| `POST` | `/admin/entitlements/bulk-grant` | `entitlement:grant` |
| `GET` | `/admin/users/:id/entitlement-history` | `entitlement:read.audit` |
| `POST` | `/admin/users/:id/impersonate` | `user:impersonate` |
| `DELETE` | `/admin/impersonation` | `user:impersonate` |
| `GET` | `/admin/device-transfers` | `device_transfer:approve` |
| `POST` | `/admin/device-transfers/:id/approve` | `device_transfer:approve` |
| `POST` | `/admin/device-transfers/:id/decline` | `device_transfer:approve` |
| `GET` | `/admin/abuse-flags` | `abuse_flag:read` |
| `POST` | `/admin/abuse-flags/:id/resolve` | `abuse_flag:resolve` |
| `GET` | `/admin/publish-requests` | `approval_queue:read` |
| `POST` | `/admin/publish-requests/:id/approve` | `course:publish.approve` |
| `POST` | `/admin/publish-requests/:id/return` | `course:publish.approve` |
| `GET` | `/admin/tickets` | `ticket:read.any` |
| `POST` | `/admin/tickets/:id/messages` | `ticket:reply` |
| `PATCH` | `/admin/tickets/:id` | `ticket:update_status` |
| `GET` | `/admin/qa/queue` | `qa_answer:create` |
| `POST` | `/admin/questions/:id/answer` | `qa_answer:create` |
| `POST` | `/admin/answers/:id/promote` | `qa:promote_to_kb` |
| `GET` | `/admin/grading/queue` | `grading:read` |
| `POST` | `/admin/grading/:answerId` | `grading:submit` |
| `GET` | `/admin/reviews` | `review:read` |
| `POST` | `/admin/reviews/:id/approve` | `review:approve` |
| `POST` | `/admin/reviews/:id/reject` | `review:approve` |
| `POST` | `/admin/reviews/:id/reply` | `review:reply` |
| `GET` | `/admin/staff` | `staff:read` |
| `POST` | `/admin/staff/invite` | `staff:create` |
| `PATCH` | `/admin/staff/:id` | `staff:update` |
| `GET` | `/admin/audit-log` | `audit_log:read` |

### `GET /admin/dashboard`

The operations screen (`FLOW-30`). Shaped entirely by the actor's permissions.

```json
{
  "data": {
    "needs_attention": [
      { "type": "device_transfers", "count": 3, "oldest_age_minutes": 47,
        "urgency": "high", "url": "/admin/device-transfers",
        "label": { "ar": "طلبات نقل أجهزة", "en": "Device transfer requests" } },
      { "type": "escalated_qa", "count": 2, "oldest_age_hours": 51,
        "urgency": "high", "url": "/admin/qa/queue" },
      { "type": "tickets_overdue", "count": 1, "oldest_age_hours": 28,
        "urgency": "medium", "url": "/admin/tickets" },
      { "type": "pending_reviews", "count": 4, "urgency": "low",
        "url": "/admin/reviews" }
    ],

    "revenue": {
      "today": { "amount_minor": 449700, "currency": "EGP", "order_count": 3 },
      "month": { "amount_minor": 8994000, "currency": "EGP", "order_count": 60,
                 "change_percent": 12.4 }
    },

    "learners": { "new_today": 7, "active_this_week": 142, "total": 486 },

    "learning_health": {
      "completion_rate": 38.2,
      "completion_target": 35,
      "activation_7d": 67.1,
      "trend": "improving"
    },

    "ai": { "messages_today": 214, "cost_month_usd": 8.42,
            "budget_usd": 15, "deflection_rate": 71.3 },

    "system": {
      "last_backup": { "at": "2026-07-28T04:00:12Z", "status": "verified" },
      "uptime_30d": 99.94,
      "email_budget": { "used": 1840, "cap": 3000, "percent": 61.3 },
      "error_rate_24h": 0.02,
      "queue_depth": 3
    }
  }
}
```

- `BR-1181` — Every `needs_attention` item carries a direct URL to its resolution screen (`BR-464`).
- `BR-1182` — Items are ordered by urgency, with device transfers weighted highest (`BR-770`).
- `BR-1183` — Blocks the actor lacks permission for are omitted entirely (`BR-467`, `BR-1136`).
- `BR-1184` — The response is a single aggregated query against cached values (`BR-466`).

**`GET /admin/device-transfers`**

```json
{
  "data": [
    {
      "id": "dtr_01HQ...",
      "waiting_minutes": 47,
      "learner": { "id": "usr_01HQ...", "name": "محمد أحمد",
                   "active_entitlements": 2, "member_since": "2026-03-14" },
      "from_device": { "label": "Chrome on Windows", "bound_at": "2026-06-12",
                       "last_seen_at": "2026-07-27T22:10:00Z" },
      "to_device": { "label": "Safari on iPhone", "platform": "ios" },
      "evidence": {
        "transfers_in_30d": 3,
        "geo_distance_km": 12,
        "abuse_score": 18,
        "prior_flags": 0,
        "assessment": { "ar": "يبدو تبديل عادي", "en": "Appears to be a normal switch" }
      },
      "_can": { "approve": true, "decline": true }
    }
  ],
  "meta": { "total": 3, "auto_approved_today": 11 }
}
```

- `BR-1185` — All evidence needed to decide is on the row. No second lookup (`BR-1053`).
- `BR-1186` — `assessment` is a server-generated plain-language summary, so a support agent without security expertise can still decide correctly.
- `BR-1187` — Declining requires a reason and sends an explanation with a support path (`BR-477`).

**`POST /admin/users/:id/impersonate`**

```json
// Request
{ "reason": "Learner reports lesson 7 not loading — ticket tkt_01HQ..." }

// 200
{
  "data": {
    "impersonation_token": "...",
    "expires_at": "2026-07-28T12:30:00Z",
    "restrictions": ["read_only", "no_playback", "no_purchases", "no_messages"]
  }
}
```

- `BR-1188` — Reason is mandatory; the session is read-only, auto-terminates in 30 minutes, and is fully audit-logged (`BR-1188` ← `BR-499`–`BR-503`).
- `BR-1189` — Video playback is disabled during impersonation — it would consume the learner's device binding and pollute their playback log (`BR-502`).

---

## `API-19` — Admin: AI & Settings

| Method | Path | Permission |
|---|---|---|
| `GET` | `/admin/ai/configs` | `ai_config:read` |
| `PATCH` | `/admin/ai/configs/:task` | `ai_config:update` |
| `POST` | `/admin/ai/test` | `ai_config:update` |
| `POST` | `/admin/ai/compare` | `ai:compare` |
| `GET` | `/admin/ai/model-costs` | `ai_config:read` |
| `PUT` | `/admin/ai/model-costs` | `ai_config:update` |
| `POST` | `/admin/ai/reindex` | `ai:reindex` |
| `GET` | `/admin/ai/reindex/status` | `ai:reindex` |
| `GET` | `/admin/ai/content-gaps` | `ai_usage:read` |
| `GET` | `/admin/settings` | `setting:read` |
| `PATCH` | `/admin/settings` | `setting:update` |
| `GET` | `/admin/email-templates` | `email_template:read` |
| `PATCH` | `/admin/email-templates/:key` | `email_template:update` |
| `GET` | `/admin/translations` | `translation:read` |
| `PATCH` | `/admin/translations` | `translation:update` |

**`POST /admin/ai/compare`**

```json
// Request
{
  "prompt": "اشرح الفرق بين useState و useRef",
  "lesson_id": "lsn_01HQ...",
  "candidates": [
    { "provider": "anthropic", "model": "claude-haiku-4-5" },
    { "provider": "google",    "model": "gemini-flash" }
  ]
}

// 200
{
  "data": {
    "retrieved_chunks": [ { "lesson_id": "...", "excerpt": "...", "score": 0.84 } ],
    "results": [
      { "provider": "anthropic", "model": "claude-haiku-4-5", "response": "...",
        "latency_ms": 1240, "tokens": {"input":1840,"output":312}, "cost_usd": 0.0021 },
      { "provider": "google", "model": "gemini-flash", "response": "...",
        "latency_ms": 890, "tokens": {"input":1840,"output":287}, "cost_usd": 0.0009 }
    ]
  }
}
```

- `BR-1190` — Both candidates receive **identical retrieved context**, so the comparison measures the model, not retrieval variance.
- `BR-1191` — Comparison runs consume founder budget and are excluded from learner quotas (`BR-331`).

**`POST /admin/ai/reindex`**

```json
// Request
{ "scope": "all", "confirm": "REINDEX", "new_embedding_model": "text-embedding-3-large" }

// 202
{ "data": { "job_id": "job_01HQ...", "estimated_chunks": 4120,
            "estimated_cost_usd": 0.42, "estimated_minutes": 18 } }
```

- `BR-1192` — Typed confirmation is required (`BR-1026`). The estimated cost is shown before starting.

**`GET /admin/ai/content-gaps`**

```json
{
  "data": [
    { "theme": { "ar": "نشر التطبيق على السيرفر", "en": "Deploying to a server" },
      "question_count": 23, "closest_lesson": null,
      "sample_questions": ["...", "..."],
      "suggestion": { "ar": "محتوى مقترح لدرس جديد", "en": "Candidate for a new lesson" } }
  ]
}
```

- `BR-1193` — One of the highest-value outputs in the system: it tells the founder exactly what to teach next, derived from real learner questions (`BR-1038`, `BR-515`).

**`PATCH /admin/settings`**

```json
// Request
{ "changes": { "auto_transfers_per_30d": 3, "refund_window_days": 21 },
  "confirm": "CONFIRM" }

// 200
{ "data": { "updated": 2,
            "applied_at": "2026-07-28T12:04:00Z",
            "previous": { "auto_transfers_per_30d": 2, "refund_window_days": 14 } } }
```

- `BR-1194` — Sensitive settings require typed confirmation and record previous values in the audit log (`BR-1076`, `BR-819`).

---

## `API-20` — Admin: Analytics

| Method | Path | Permission |
|---|---|---|
| `GET` | `/admin/reports/revenue` | `report:revenue` |
| `GET` | `/admin/reports/funnel` | `report:enrollment` |
| `GET` | `/admin/reports/completion` | `report:completion` |
| `GET` | `/admin/reports/dropoff` | `report:dropoff` |
| `GET` | `/admin/reports/engagement` | `report:engagement` |
| `GET` | `/admin/reports/ai` | `report:ai_usage` |
| `GET` | `/admin/reports/quiz` | `report:quiz` |
| `GET` | `/admin/reports/support` | `report:support` |
| `GET` | `/admin/reports/at-risk` | `report:engagement` |
| `POST` | `/admin/reports/:type/export` | `report:export` |

**`GET /admin/reports/completion`**

```json
{
  "data": {
    "overall": { "rate": 38.2, "target_6m": 35, "target_12m": 45, "status": "above_target" },
    "by_goal_set": {
      "with_goal":    { "rate": 44.1, "learners": 312 },
      "without_goal": { "rate": 19.8, "learners": 174 },
      "delta": 24.3
    },
    "by_ai_usage": {
      "used_ai":     { "rate": 47.2 },
      "never_used":  { "rate": 28.6 }
    },
    "by_persona": [
      { "persona": "career_switcher", "rate": 42.8, "learners": 198 }
    ]
  },
  "meta": { "as_of": "2026-07-28T14:00:00Z", "is_eventually_consistent": true }
}
```

- `BR-1195` — `by_goal_set` is the primary validation of `GOAL-02`. A negligible delta means the motivation system needs redesign before scaling content (`BR-1084`).
- `BR-1196` — `as_of` is always returned. Analytics is eventually consistent by design and never pretends to be live (`BR-904`).

**`POST /admin/reports/:type/export`**

```json
// 202
{ "data": { "job_id": "job_01HQ...", "estimated_rows": 4820,
            "notify_when_ready": true } }
```

- `BR-1197` — Exports run as background jobs and never block the request thread (`BR-522`).
- `BR-1198` — Exports containing PII require `student:read.pii` and are flagged as security events (`BR-521`).

---

## `API-21` — System & Webhooks

| Method | Path | Auth |
|---|---|---|
| `GET` | `/health` | public |
| `GET` | `/admin/system/health` | `system:health` |
| `GET` | `/admin/system/queues` | `job:read` |
| `POST` | `/admin/system/jobs/:id/retry` | `job:retry` |
| `GET` | `/admin/system/backups` | `backup:read` |
| `POST` | `/admin/system/backups/trigger` | `backup:trigger` |
| `POST` | `/webhooks/paymob` | signature |
| `POST` | `/webhooks/stripe` | signature |
| `POST` | `/webhooks/bunny` | signature |
| `POST` | `/webhooks/resend` | signature |

**Webhook handling contract:**

```
1. Verify signature                       → 401 on failure
2. Check idempotency by provider event id  → 200 if already processed
3. Persist raw payload
4. Enqueue to `critical`
5. Return 200 immediately                  (BR-917)
```

- `BR-1199` — Webhooks always return `200` once accepted, even if downstream processing later fails. Retries are handled internally, not by the provider.
- `BR-1200` — An unknown order referenced by a webhook is logged and alerted, never silently dropped (`BR-099`).

**`GET /health`** — used by external monitoring (`BR-892`):

```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "queue": { "status": "ok", "depth": 3 },
    "storage": "ok",
    "last_backup": "2026-07-28T04:00:12Z"
  },
  "version": "1.4.2"
}
```

---

## Part 2 Endpoint Summary

| Group | Endpoints |
|---|---:|
| `API-10` AI Tutor | 7 |
| `API-11` Q&A | 9 |
| `API-12` Reviews | 5 |
| `API-13` Devices & Protection | 6 |
| `API-14` Notifications | 6 |
| `API-15` Support | 7 |
| `API-16` Admin: Content | 25 |
| `API-17` Admin: Commerce | 18 |
| `API-18` Admin: Users & Operations | 36 |
| `API-19` Admin: AI & Settings | 15 |
| `API-20` Admin: Analytics | 10 |
| `API-21` System & Webhooks | 10 |
| **Total** | **154** |

---

## Full API Summary

| Part | Groups | Endpoints |
|---|---|---:|
| 1 | `API-1` – `API-9` | 94 |
| 2 | `API-10` – `API-21` | 154 |
| **Total** | **21 groups** | **248** |

---

## Cross-Cutting API Rules

- `BR-1201` — Every endpoint enforces its permission independently of `_can` (`BR-714`).
- `BR-1202` — Every list endpoint applies scope filtering at the query layer (`BR-918`).
- `BR-1203` — Every mutation that creates accepts `Idempotency-Key` (`BR-1119`).
- `BR-1204` — Every user-facing string in a response is bilingual and drawn from the string catalog (`BR-1113`).
- `BR-1205` — No response exposes internal identifiers from external providers except where the client needs them for playback or checkout.
- `BR-1206` — No response contains monetary values for actors lacking `payment:read` (`BR-1180`).
- `BR-1207` — Every endpoint is covered by a generated permission test (`BR-936`).
- `BR-1208` — The OpenAPI specification is generated from the implementation and is the source for `packages/contracts` (`OQ-19` resolved below).
- `BR-1209` — Breaking changes require a new version path; additive changes do not (`BR-1105`, `BR-1106`).
- `BR-1210` — Every endpoint returns within 500 ms at p95 under expected load, or is redesigned. On 2 vCPU, a slow endpoint degrades the entire platform.

---

## Resolved Decisions

| ID | Resolves | Decision |
|---|---|---|
| `DEC-30` | `OQ-19` | **`packages/contracts` is generated from the NestJS OpenAPI specification**, with hand-authored Zod schemas layered on top for validation. Generation guarantees the contract never drifts from the implementation; the hand-authored layer keeps client-facing types clean. |
| `DEC-31` | `OQ-20` | **The outbox dispatcher polls every 2 seconds.** `LISTEN/NOTIFY` is lower latency but adds a persistent connection and a reconnection failure mode. At this scale, 2-second latency on a background event is imperceptible, and polling is dramatically simpler to operate alone (`CON-01`). |

---

## Approval — Part 2 & Full Contract

| Item | Status |
|---|---|
| SSE streaming format for AI responses is correct | ☐ Approved |
| Quota consumed only on stream completion (`BR-1153`) is correct | ☐ Approved |
| Q&A AI-first response not consuming learner quota is correct | ☐ Approved |
| Device transfer responses and non-accusatory language are correct | ☐ Approved |
| Support ticket context auto-capture is correct | ☐ Approved |
| Direct-to-provider video upload authorization is correct | ☐ Approved |
| Lesson note blocks as full replacement is correct | ☐ Approved |
| Product entitlement preview matching public display is correct | ☐ Approved |
| Monetary fields **omitted** rather than masked (`BR-1180`) is accepted | ☐ Approved |
| Operations dashboard shape and ordering are correct | ☐ Approved |
| Device transfer queue evidence and plain-language assessment are correct | ☐ Approved |
| Impersonation restrictions are correct | ☐ Approved |
| AI comparison using identical retrieved context is correct | ☐ Approved |
| Content gaps report is correct | ☐ Approved |
| Completion report segmented by goal-set (`BR-1195`) is correct | ☐ Approved |
| Webhook handling contract is correct | ☐ Approved |
| `DEC-30` and `DEC-31` are accepted | ☐ Approved |
| **The complete 248-endpoint contract is correct and nothing is missing** | ☐ Approved |

**Next document:** `12-ui-ux-design.md` — screen inventory, layout systems, component library, the design token specification, RTL behavior, and the detailed design of the dashboard and player.

---
