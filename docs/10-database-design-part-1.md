# 10 — Database Design · Part 1

### Modules `M01`–`M09` — Identity, Access, Commerce, Entitlements, Content, Learning, Motivation, Assessment, Certification

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 10 — Database Design (Part 1 of 2) |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | `07-business-logic.md`, `08-system-design.md`, `09-system-architecture.md` |
| **Feeds Into** | `11-api-contract.md`, `14-security-design.md`, `16-task-breakdown.md` |
| **Covers** | 42 tables · `TBL-001` – `TBL-042` · `BR-949` – `BR-1010` |

---

## 1. Conventions

### 1.1 `DEC-29` — Identifiers

Prefixed ULIDs stored as `TEXT`, not bare UUIDs.

```
usr_01HQZX9K2M4N8P6R3T5V7W9Y1B
crs_01HQZX9K2M4N8P6R3T5V7W9Y1C
lsn_01HQZX9K2M4N8P6R3T5V7W9Y1D
ord_01HQZX9K2M4N8P6R3T5V7W9Y1E
```

**Why:** ULIDs are time-sortable (better index locality than random UUIDs), and the prefix makes every identifier self-describing in logs, support conversations, and error reports. A support agent seeing `ord_01HQ…` immediately knows it is an order.

| Prefix | Entity | Prefix | Entity |
|---|---|---|---|
| `usr_` | user | `ord_` | order |
| `rol_` | role | `txn_` | transaction |
| `prd_` | product | `ent_` | entitlement |
| `crs_` | course | `sec_` | section |
| `lsn_` | lesson | `blk_` | note block |
| `res_` | resource | `qz_` | quiz |
| `qst_` | question | `att_` | attempt |
| `crt_` | certificate | `dev_` | device |
| `tkt_` | ticket | `cnv_` | AI conversation |

### 1.2 Column Standards

| Concern | Standard |
|---|---|
| Timestamps | `TIMESTAMPTZ`, always UTC (`BR-825`) |
| Every table | `created_at`, `updated_at` |
| Soft delete | `deleted_at TIMESTAMPTZ NULL` where retention matters |
| Money | `INTEGER` minor units + `CHAR(3)` currency (`BR-826`) |
| Bilingual text | `JSONB` as `{"ar": "...", "en": "..."}` (`BR-827`) |
| Booleans | `is_` / `has_` prefix |
| Enums | PostgreSQL native `ENUM` types |
| Ordering | `NUMERIC` fractional positions (`BR-134`) |

**Rules:**
- `BR-949` — Every foreign key declares an explicit `ON DELETE` behavior. Defaults are never relied upon.
- `BR-950` — No cross-module foreign keys except to `users(id)`. Cross-module references use identifier columns without a constraint, preserving extraction (`BR-838`, `BR-933`).
- `BR-951` — Bilingual `JSONB` always contains `ar`; `en` is optional (`BR-531`).
- `BR-952` — Every table belongs to exactly one module. Ownership is recorded in the table catalog.

### 1.3 Bilingual Field Pattern

```sql
title JSONB NOT NULL
-- {"ar": "أساسيات React", "en": "React Fundamentals"}

CONSTRAINT title_has_arabic CHECK (title ? 'ar' AND length(title->>'ar') > 0)
```

- `BR-953` — A `CHECK` constraint enforces the Arabic key on every bilingual column. Arabic is the source of truth and cannot be empty (`BR-524`).

---

## 2. `M01` — Identity

### `TBL-001` `users`

```sql
CREATE TABLE users (
  id                  TEXT PRIMARY KEY,
  role_id             TEXT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,

  email               CITEXT UNIQUE,
  email_verified_at   TIMESTAMPTZ,
  phone               TEXT UNIQUE,
  phone_verified_at   TIMESTAMPTZ,
  password_hash       TEXT,

  full_name           TEXT NOT NULL,
  display_name        TEXT,
  avatar_key          TEXT,
  bio                 TEXT,

  locale              TEXT NOT NULL DEFAULT 'ar',
  timezone            TEXT NOT NULL DEFAULT 'Africa/Cairo',
  theme_preference    theme_mode NOT NULL DEFAULT 'system',
  country_code        CHAR(2),

  permission_version  INTEGER NOT NULL DEFAULT 1,
  persona             persona_type,

  status              user_status NOT NULL DEFAULT 'active',
  last_active_at      TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,

  CONSTRAINT has_identity CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX idx_users_email        ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone        ON users(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role         ON users(role_id);
CREATE INDEX idx_users_last_active  ON users(last_active_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created      ON users(created_at DESC);
```

**Enums:**
```sql
CREATE TYPE user_status  AS ENUM ('active','suspended','pending_deletion','deleted');
CREATE TYPE theme_mode   AS ENUM ('light','dark','system');
CREATE TYPE persona_type AS ENUM ('career_switcher','freelancer','professional','builder','casual');
```

- `BR-954` — `email` uses `CITEXT` for case-insensitive uniqueness (`BR-002`).
- `BR-955` — `permission_version` increments on any permission change affecting this user (`BR-718`).
- `BR-956` — `persona` is derived from onboarding and drives recommendations, email timing, and AI context (`BR-211`).
- `BR-957` — Deletion anonymizes rather than removing the row; financial references remain intact (`BR-025`).

---

### `TBL-002` `user_identities`

```sql
CREATE TABLE user_identities (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider          auth_provider NOT NULL,
  provider_user_id  TEXT NOT NULL,
  provider_email    CITEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  linked_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_identities_user ON user_identities(user_id);

CREATE TYPE auth_provider AS ENUM ('password','google','phone');
```

- `BR-958` — One user may hold multiple identities; at least one must always remain (`BR-011`).

---

### `TBL-003` `refresh_tokens`

```sql
CREATE TABLE refresh_tokens (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id       TEXT NOT NULL,
  token_hash      TEXT NOT NULL UNIQUE,

  device_label    TEXT,
  user_agent      TEXT,
  ip_address      INET,
  platform        client_platform NOT NULL,

  expires_at      TIMESTAMPTZ NOT NULL,
  rotated_at      TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  revoked_reason  TEXT,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_user    ON refresh_tokens(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_family  ON refresh_tokens(family_id);
CREATE INDEX idx_refresh_expiry  ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;

CREATE TYPE client_platform AS ENUM ('web','ios','android');
```

- `BR-959` — Tokens are stored hashed, never in plaintext.
- `BR-960` — `family_id` enables reuse detection: presenting a rotated token revokes the entire family (`BR-016`).

---

### `TBL-004` `verification_tokens`

```sql
CREATE TABLE verification_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     token_purpose NOT NULL,
  token_hash  TEXT NOT NULL UNIQUE,
  target      TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_user ON verification_tokens(user_id, purpose)
  WHERE consumed_at IS NULL;

CREATE TYPE token_purpose AS ENUM ('email_verify','password_reset','email_change');
```

---

### `TBL-005` `otp_codes`

```sql
CREATE TABLE otp_codes (
  id          TEXT PRIMARY KEY,
  phone       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  attempts    SMALLINT NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_phone ON otp_codes(phone, created_at DESC);
```

- `BR-961` — Codes are hashed at rest (`BR-858`). Maximum 3 attempts, 5-minute TTL (`BR-006`).

---

### `TBL-006` `login_activity`

```sql
CREATE TABLE login_activity (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(id) ON DELETE CASCADE,
  email_attempt CITEXT,
  success       BOOLEAN NOT NULL,
  provider      auth_provider,
  ip_address    INET,
  country_code  CHAR(2),
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_user ON login_activity(user_id, created_at DESC);
```

- `BR-962` — Retained 90 days, then pruned (`FEAT-012`).

---

## 3. `M02` — Access

### `TBL-007` `roles`

```sql
CREATE TABLE roles (
  id           TEXT PRIMARY KEY,
  key          TEXT NOT NULL UNIQUE,
  name         JSONB NOT NULL,
  description  JSONB,
  is_system    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Seeded: `super_admin`, `instructor`, `content_assistant`, `support_agent`, `student`.

- `BR-963` — System roles cannot be deleted; `super_admin` permissions are implicit and not stored (`BR-639`).

---

### `TBL-008` `permissions`

```sql
CREATE TABLE permissions (
  id          TEXT PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,        -- 'course:update.own'
  model       TEXT NOT NULL,
  action      TEXT NOT NULL,
  scope       TEXT,
  module      TEXT NOT NULL,               -- 'M05'
  description JSONB,
  is_orphaned BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_permissions_model  ON permissions(model);
CREATE INDEX idx_permissions_module ON permissions(module);
```

- `BR-964` — Populated by the startup sync from the code registry. Permissions absent from code are flagged `is_orphaned`, never deleted (`FEAT-014`).

---

### `TBL-009` `role_permissions`

```sql
CREATE TABLE role_permissions (
  role_id       TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (role_id, permission_id)
);
```

---

### `TBL-010` `user_permission_overrides`

```sql
CREATE TABLE user_permission_overrides (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  effect        override_effect NOT NULL,
  reason        TEXT NOT NULL,
  expires_at    TIMESTAMPTZ,
  created_by    TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, permission_id)
);

CREATE TYPE override_effect AS ENUM ('grant','revoke');
```

- `BR-965` — A reason is mandatory (`BR-039`). Resolution order: revoke → grant → role → deny (`BR-038`).

---

## 4. `M03` — Commerce

### `TBL-011` `products`

```sql
CREATE TABLE products (
  id              TEXT PRIMARY KEY,
  type            product_type NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  name            JSONB NOT NULL,
  description     JSONB,
  short_pitch     JSONB,
  thumbnail_key   TEXT,

  status          product_status NOT NULL DEFAULT 'draft',
  billing_period  billing_period,
  trial_days      SMALLINT,
  tier_order      SMALLINT,

  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at     TIMESTAMPTZ,

  CONSTRAINT name_has_arabic CHECK (name ? 'ar')
);

CREATE INDEX idx_products_status ON products(status) WHERE archived_at IS NULL;
CREATE INDEX idx_products_type   ON products(type);

CREATE TYPE product_type    AS ENUM ('one_time','subscription','bundle','membership','addon');
CREATE TYPE product_status  AS ENUM ('draft','published','archived');
CREATE TYPE billing_period  AS ENUM ('monthly','annual');
```

- `BR-966` — A product never references content directly. It grants entitlements only (`BR-048`).
- `BR-967` — Products are archived, never deleted (`BR-050`).

---

### `TBL-012` `product_prices`

```sql
CREATE TABLE product_prices (
  id              TEXT PRIMARY KEY,
  product_id      TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  currency        CHAR(3) NOT NULL,
  amount_minor    INTEGER NOT NULL CHECK (amount_minor >= 0),
  compare_at_minor INTEGER,

  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_window CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX idx_price_active ON product_prices(product_id, currency)
  WHERE is_active AND starts_at IS NULL AND ends_at IS NULL;
CREATE INDEX idx_price_window ON product_prices(product_id, starts_at, ends_at);
```

- `BR-968` — Prices are authored per currency. No runtime FX conversion (`BR-064`).
- `BR-969` — Scheduled windows implement launch pricing (`FEAT-033`); expiry is automatic.

---

### `TBL-013` `product_entitlements`

```sql
CREATE TABLE product_entitlements (
  id              TEXT PRIMARY KEY,
  product_id      TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  entitlement_key TEXT NOT NULL,          -- 'access:course:crs_01H...'
  duration_days   INTEGER,                -- NULL = lifetime
  quota_limit     INTEGER,
  quota_period    quota_period,
  sort_order      SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_prod_ent ON product_entitlements(product_id);

CREATE TYPE quota_period AS ENUM ('monthly','lifetime');
```

- `BR-970` — `entitlement_key` is a string, not a foreign key. This is the deliberate seam between `commerce` and `content` (`BR-950`).

---

### `TBL-014` `coupons`

```sql
CREATE TABLE coupons (
  id                 TEXT PRIMARY KEY,
  code               TEXT NOT NULL UNIQUE,
  discount_type      discount_type NOT NULL,
  discount_value     INTEGER NOT NULL,
  currency           CHAR(3),

  max_redemptions    INTEGER,
  max_per_user       SMALLINT NOT NULL DEFAULT 1,
  redemption_count   INTEGER NOT NULL DEFAULT 0,
  min_order_minor    INTEGER,
  first_purchase_only BOOLEAN NOT NULL DEFAULT false,
  applies_to_renewals BOOLEAN NOT NULL DEFAULT false,

  product_ids        TEXT[],
  starts_at          TIMESTAMPTZ,
  expires_at         TIMESTAMPTZ,
  is_active          BOOLEAN NOT NULL DEFAULT true,

  created_by         TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coupons_code ON coupons(code) WHERE is_active;

CREATE TYPE discount_type AS ENUM ('percentage','fixed');
```

- `BR-971` — Deactivating a coupon stops redemptions but never reverses completed orders (`BR-481`).

---

### `TBL-015` `orders`

```sql
CREATE TABLE orders (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status            order_status NOT NULL DEFAULT 'pending_payment',

  currency          CHAR(3) NOT NULL,
  subtotal_minor    INTEGER NOT NULL,
  discount_minor    INTEGER NOT NULL DEFAULT 0,
  tax_minor         INTEGER NOT NULL DEFAULT 0,
  total_minor       INTEGER NOT NULL,

  coupon_id         TEXT REFERENCES coupons(id) ON DELETE SET NULL,
  coupon_code       TEXT,

  provider          payment_provider NOT NULL,
  provider_ref      TEXT,
  payment_method    TEXT,

  product_snapshot  JSONB NOT NULL,
  country_code      CHAR(2),

  paid_at           TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user     ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status   ON orders(status) WHERE status = 'pending_payment';
CREATE INDEX idx_orders_paid     ON orders(paid_at DESC) WHERE status = 'paid';
CREATE INDEX idx_orders_provider ON orders(provider, provider_ref);

CREATE TYPE order_status     AS ENUM
  ('pending_payment','paid','failed','abandoned','refunded','partially_refunded');
CREATE TYPE payment_provider AS ENUM ('paymob','stripe','kashier','manual');
```

- `BR-972` — `product_snapshot` freezes the product, its price, and its entitlements at purchase time. Later product edits never rewrite history (`BR-084`).
- `BR-973` — Orders are immutable once `paid` (`BR-775`).
- `BR-974` — `expires_at` drives Fawry abandonment at 72 hours (`BR-069`).

---

### `TBL-016` `order_items`

```sql
CREATE TABLE order_items (
  id             TEXT PRIMARY KEY,
  order_id       TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity       SMALLINT NOT NULL DEFAULT 1,
  unit_minor     INTEGER NOT NULL,
  total_minor    INTEGER NOT NULL
);

CREATE INDEX idx_order_items ON order_items(order_id);
```

---

### `TBL-017` `transactions`

```sql
CREATE TABLE transactions (
  id              TEXT PRIMARY KEY,
  order_id        TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  type            transaction_type NOT NULL,
  status          transaction_status NOT NULL,

  currency        CHAR(3) NOT NULL,
  amount_minor    INTEGER NOT NULL,

  provider        payment_provider NOT NULL,
  provider_txn_id TEXT,
  provider_payload JSONB,
  failure_code    TEXT,
  failure_message TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_txn_order    ON transactions(order_id);
CREATE INDEX idx_txn_provider ON transactions(provider, provider_txn_id);

CREATE TYPE transaction_type   AS ENUM ('charge','refund','chargeback');
CREATE TYPE transaction_status AS ENUM ('pending','succeeded','failed');
```

- `BR-975` — `provider_payload` retained 90 days for dispute resolution, then nulled (`BR-097`).

---

### `TBL-018` `invoices`

```sql
CREATE TABLE invoices (
  id             TEXT PRIMARY KEY,
  order_id       TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  invoice_number INTEGER NOT NULL UNIQUE,
  storage_key    TEXT,
  company_name   TEXT,
  tax_id         TEXT,
  issued_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE invoice_number_seq;
```

- `BR-976` — Invoice numbers are sequential and gapless via a dedicated sequence (`BR-086`).
- `BR-977` — Rendered once and stored on R2; never regenerated (`BR-087`).

---

### `TBL-019` `refund_requests`

```sql
CREATE TABLE refund_requests (
  id                TEXT PRIMARY KEY,
  order_id          TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status            refund_status NOT NULL DEFAULT 'requested',

  reason_code       TEXT NOT NULL,
  reason_text       TEXT,
  progress_at_request NUMERIC(5,2),

  requested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  decision_note     TEXT,
  amount_minor      INTEGER,
  transaction_id    TEXT REFERENCES transactions(id) ON DELETE SET NULL
);

CREATE INDEX idx_refunds_status ON refund_requests(status)
  WHERE status IN ('requested','recommended');

CREATE TYPE refund_status AS ENUM
  ('requested','recommended','approved','declined','processed','failed');
```

- `BR-978` — `progress_at_request` is captured at submission for the 30% override rule (`BR-090`).

---

### `TBL-020` `subscriptions`

```sql
CREATE TABLE subscriptions (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  product_id            TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  status                subscription_status NOT NULL,

  provider              payment_provider NOT NULL,
  provider_sub_id       TEXT,

  currency              CHAR(3) NOT NULL,
  amount_minor          INTEGER NOT NULL,
  billing_period        billing_period NOT NULL,

  current_period_start  TIMESTAMPTZ NOT NULL,
  current_period_end    TIMESTAMPTZ NOT NULL,
  grace_ends_at         TIMESTAMPTZ,
  retry_count           SMALLINT NOT NULL DEFAULT 0,

  cancelled_at          TIMESTAMPTZ,
  cancel_reason_code    TEXT,
  paused_until          TIMESTAMPTZ,
  ends_at               TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subs_user     ON subscriptions(user_id);
CREATE INDEX idx_subs_status   ON subscriptions(status);
CREATE INDEX idx_subs_renewal  ON subscriptions(current_period_end)
  WHERE status IN ('active','past_due');

CREATE TYPE subscription_status AS ENUM
  ('trialing','active','past_due','paused','cancelled','expired');
```

- `BR-979` — The provider is authoritative for subscription state; this table mirrors and reconciles on webhook (`BR-070`).
- `BR-980` — `amount_minor` preserves grandfathered pricing. Price changes never touch existing rows (`FEAT-023` edge case).

---

## 5. `M04` — Entitlements

### `TBL-021` `entitlements`

```sql
CREATE TABLE entitlements (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key             TEXT NOT NULL,           -- 'access:course:crs_01H...'
  kind            entitlement_kind NOT NULL,

  source_type     entitlement_source NOT NULL,
  source_id       TEXT,

  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ,
  grace_ends_at   TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,

  quota_limit     INTEGER,
  quota_period    quota_period,
  quota_consumed  INTEGER NOT NULL DEFAULT 0,
  period_started_at TIMESTAMPTZ,

  reason          TEXT,
  granted_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ent_lookup ON entitlements(user_id, key)
  WHERE revoked_at IS NULL;
CREATE INDEX idx_ent_expiry ON entitlements(expires_at)
  WHERE revoked_at IS NULL AND expires_at IS NOT NULL;
CREATE INDEX idx_ent_source ON entitlements(source_type, source_id);

CREATE TYPE entitlement_kind   AS ENUM ('content','feature','quota');
CREATE TYPE entitlement_source AS ENUM ('order','subscription','manual','free','promotion');
```

- `BR-981` — `idx_ent_lookup` is the hottest index in the database. Every content read resolves through it (`BR-823`).
- `BR-982` — Entitlements are additive: same key from multiple sources yields the longest expiry, and quotas sum (`BR-100`).
- `BR-983` — Expiry is evaluated at read time; no nightly job flips rows (`BR-102`).
- `BR-984` — Quota consumption uses `UPDATE … WHERE quota_consumed + n <= quota_limit RETURNING` for atomicity (`BR-798`).

---

### `TBL-022` `entitlement_events`

```sql
CREATE TABLE entitlement_events (
  id             TEXT PRIMARY KEY,
  entitlement_id TEXT NOT NULL REFERENCES entitlements(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event          entitlement_event NOT NULL,
  actor_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  reason         TEXT,
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ent_events_user ON entitlement_events(user_id, created_at DESC);

CREATE TYPE entitlement_event AS ENUM
  ('granted','extended','revoked','expired','quota_reset','quota_adjusted');
```

- `BR-985` — Append-only. No update, no delete, at any permission level (`BR-121`).

---

## 6. `M05` — Content

### `TBL-023` `courses`

```sql
CREATE TABLE courses (
  id                  TEXT PRIMARY KEY,
  owner_id            TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  slug_ar             TEXT NOT NULL UNIQUE,
  slug_en             TEXT UNIQUE,
  title               JSONB NOT NULL,
  subtitle            JSONB,
  description         JSONB,
  outcomes            JSONB,               -- {"ar":[...], "en":[...]}
  requirements        JSONB,
  target_audience     JSONB,

  level               course_level NOT NULL,
  category_id         TEXT REFERENCES categories(id) ON DELETE SET NULL,
  tags                TEXT[],

  thumbnail_key       TEXT,
  trailer_video_id    TEXT,

  duration_minutes    INTEGER NOT NULL DEFAULT 0,
  duration_override   INTEGER,
  lesson_count        INTEGER NOT NULL DEFAULT 0,

  sequential_locking  BOOLEAN NOT NULL DEFAULT true,
  certificate_enabled BOOLEAN NOT NULL DEFAULT true,
  completion_required NUMERIC(5,2) NOT NULL DEFAULT 100,
  is_free             BOOLEAN NOT NULL DEFAULT false,

  status              content_status NOT NULL DEFAULT 'draft',
  published_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at         TIMESTAMPTZ,

  CONSTRAINT title_has_arabic CHECK (title ? 'ar')
);

CREATE INDEX idx_courses_owner  ON courses(owner_id);
CREATE INDEX idx_courses_status ON courses(status) WHERE archived_at IS NULL;
CREATE INDEX idx_courses_pub    ON courses(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_courses_tags   ON courses USING GIN(tags);

CREATE TYPE course_level    AS ENUM ('beginner','intermediate','advanced');
CREATE TYPE content_status  AS ENUM ('draft','pending_review','published','archived');
```

- `BR-986` — `owner_id` drives `.own` scoping and cascades to sections, lessons, and resources (`BR-698`).
- `BR-987` — Slugs are immutable after first publication; changes create redirect rows (`BR-126`).
- `BR-988` — `duration_minutes` and `lesson_count` are denormalized aggregates, recalculated on content change. Computing them per catalog request would be wasteful on 2 vCPU.

---

### `TBL-024` `categories`

```sql
CREATE TABLE categories (
  id         TEXT PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  name       JSONB NOT NULL,
  parent_id  TEXT REFERENCES categories(id) ON DELETE SET NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  icon       TEXT
);
```

---

### `TBL-025` `sections`

```sql
CREATE TABLE sections (
  id          TEXT PRIMARY KEY,
  course_id   TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       JSONB NOT NULL,
  description JSONB,
  position    NUMERIC NOT NULL,
  status      content_status NOT NULL DEFAULT 'draft',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sections_course ON sections(course_id, position);
```

- `BR-989` — `position` is `NUMERIC` so reordering updates a single row (`BR-134`).

---

### `TBL-026` `lessons`

```sql
CREATE TABLE lessons (
  id               TEXT PRIMARY KEY,
  course_id        TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  section_id       TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,

  title            JSONB NOT NULL,
  type             lesson_type NOT NULL,
  position         NUMERIC NOT NULL,

  video_asset_id   TEXT REFERENCES video_assets(id) ON DELETE SET NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,

  is_required      BOOLEAN NOT NULL DEFAULT true,
  is_preview       BOOLEAN NOT NULL DEFAULT false,
  completion_threshold NUMERIC(5,2),

  status           content_status NOT NULL DEFAULT 'draft',
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lessons_course  ON lessons(course_id, position);
CREATE INDEX idx_lessons_section ON lessons(section_id, position);
CREATE INDEX idx_lessons_preview ON lessons(course_id) WHERE is_preview;

CREATE TYPE lesson_type AS ENUM ('video','text','quiz','assignment');
```

- `BR-990` — Progress binds to `lesson.id`. Reordering never invalidates progress (`BR-133`).
- `BR-991` — `is_preview` grants public access with no entitlement (`BR-104`, `DEC-08`).

---

### `TBL-027` `video_assets`

```sql
CREATE TABLE video_assets (
  id               TEXT PRIMARY KEY,
  provider         video_provider NOT NULL,
  provider_video_id TEXT NOT NULL,
  status           video_status NOT NULL DEFAULT 'uploading',
  duration_seconds INTEGER,
  thumbnail_url    TEXT,
  uploaded_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (provider, provider_video_id)
);

CREATE TYPE video_provider AS ENUM ('bunny','vdocipher');
CREATE TYPE video_status   AS ENUM ('uploading','processing','ready','failed');
```

- `BR-992` — Storing the provider alongside the identifier permits a mixed-provider library during migration (`BR-141`).

---

### `TBL-028` `lesson_note_blocks`

```sql
CREATE TABLE lesson_note_blocks (
  id            TEXT PRIMARY KEY,
  lesson_id     TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  type          block_type NOT NULL,
  content       JSONB NOT NULL,          -- {"ar": {...}, "en": {...}}
  position      NUMERIC NOT NULL,

  start_time    INTEGER,
  end_time      INTEGER,

  language_code TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_timing CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time)
);

CREATE INDEX idx_blocks_lesson ON lesson_note_blocks(lesson_id, position);
CREATE INDEX idx_blocks_timed  ON lesson_note_blocks(lesson_id, start_time)
  WHERE start_time IS NOT NULL;

CREATE TYPE block_type AS ENUM
  ('heading','paragraph','code','callout','list','image','table');
```

- `BR-993` — Blocks are stored structurally, never as an HTML blob. RAG chunking depends on structure (`BR-144`).
- `BR-994` — `heading` blocks carrying timestamps become player chapters (`BR-149`).
- `BR-995` — Editing marks embeddings stale and queues re-indexing (`BR-145`).

---

### `TBL-029` `resources`

```sql
CREATE TABLE resources (
  id                TEXT PRIMARY KEY,
  course_id         TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  section_id        TEXT REFERENCES sections(id) ON DELETE CASCADE,
  lesson_id         TEXT REFERENCES lessons(id) ON DELETE CASCADE,

  type              resource_type NOT NULL,
  title             JSONB NOT NULL,
  description       JSONB,

  storage_key       TEXT,
  url               TEXT,
  code_content      TEXT,
  code_language     TEXT,
  note_content      JSONB,
  embed_provider    TEXT,

  file_size_bytes   BIGINT,
  mime_type         TEXT,

  appears_at        INTEGER,
  required_entitlement TEXT,
  position          NUMERIC NOT NULL DEFAULT 0,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resources_lesson ON resources(lesson_id, position);
CREATE INDEX idx_resources_course ON resources(course_id);

CREATE TYPE resource_type AS ENUM ('file','link','code','note','embed');
```

- `BR-996` — `required_entitlement` gates individual resources independently of the lesson (`BR-157`).
- `BR-997` — Files are served only through 5-minute signed URLs (`BR-401`).

---

### `TBL-030` `media_assets`

```sql
CREATE TABLE media_assets (
  id           TEXT PRIMARY KEY,
  storage_key  TEXT NOT NULL UNIQUE,
  filename     TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  size_bytes   BIGINT NOT NULL,
  width        INTEGER,
  height       INTEGER,
  usage_count  INTEGER NOT NULL DEFAULT 0,
  uploaded_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- `BR-998` — `usage_count` prevents deletion of in-use assets (`BR-166`).

---

### `TBL-031` `content_versions`

```sql
CREATE TABLE content_versions (
  id           TEXT PRIMARY KEY,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  version      INTEGER NOT NULL,
  snapshot     JSONB NOT NULL,
  created_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (entity_type, entity_id, version)
);

CREATE INDEX idx_versions_entity ON content_versions(entity_type, entity_id, version DESC);
```

- `BR-999` — Last 20 versions retained per entity (`BR-164`).

---

### `TBL-032` `unlock_rules`

```sql
CREATE TABLE unlock_rules (
  id           TEXT PRIMARY KEY,
  entity_type  unlock_entity NOT NULL,
  entity_id    TEXT NOT NULL,
  logic        unlock_logic NOT NULL DEFAULT 'all',
  rules        JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (entity_type, entity_id)
);

CREATE TYPE unlock_entity AS ENUM ('lesson','section','quiz');
CREATE TYPE unlock_logic  AS ENUM ('all','any');
```

**`rules` shape:**
```json
[
  { "type": "complete_lesson",       "target": "lsn_01H..." },
  { "type": "pass_quiz",             "target": "qz_01H...", "min_score": 70 },
  { "type": "days_since_enrollment", "value": 7 },
  { "type": "complete_section",      "target": "sec_01H..." },
  { "type": "manual_approval" }
]
```

- `BR-1000` — Rules referencing deleted targets evaluate as satisfied. Failing open prevents an authoring mistake from stranding paying learners (`BR-190`).
- `BR-1001` — Circular dependencies are detected at save time and rejected with an explanation (`BR-192`).

---

## 7. `M06` — Learning

### `TBL-033` `enrollments`

```sql
CREATE TABLE enrollments (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id           TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

  enrolled_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,

  progress_percent    NUMERIC(5,2) NOT NULL DEFAULT 0,
  completed_items     INTEGER NOT NULL DEFAULT 0,
  required_items      INTEGER NOT NULL DEFAULT 0,

  last_lesson_id      TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  last_position_sec   INTEGER NOT NULL DEFAULT 0,
  last_activity_at    TIMESTAMPTZ,

  UNIQUE (user_id, course_id)
);

CREATE INDEX idx_enroll_user     ON enrollments(user_id, last_activity_at DESC);
CREATE INDEX idx_enroll_course   ON enrollments(course_id);
CREATE INDEX idx_enroll_active   ON enrollments(last_activity_at DESC)
  WHERE completed_at IS NULL;
```

- `BR-1002` — `last_lesson_id` + `last_position_sec` power Continue Learning in a single indexed lookup (`FEAT-068`).
- `BR-1003` — Enrollment records persist permanently, independent of entitlement state (`BR-822`).
- `BR-1004` — `progress_percent` is denormalized and recalculated on each completion event, never computed per dashboard load (`BR-227`).

---

### `TBL-034` `lesson_progress`

```sql
CREATE TABLE lesson_progress (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id           TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id           TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

  status              progress_status NOT NULL DEFAULT 'not_started',
  position_seconds    INTEGER NOT NULL DEFAULT 0,
  watched_percent     NUMERIC(5,2) NOT NULL DEFAULT 0,

  first_completed_at  TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  last_viewed_at      TIMESTAMPTZ,
  view_count          INTEGER NOT NULL DEFAULT 0,

  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, lesson_id)
);

CREATE INDEX idx_progress_user_course ON lesson_progress(user_id, course_id);
CREATE INDEX idx_progress_completed   ON lesson_progress(course_id, status)
  WHERE status = 'completed';

CREATE TYPE progress_status AS ENUM ('not_started','in_progress','completed');
```

- `BR-1005` — `first_completed_at` is written once and never overwritten (`BR-781`).
- `BR-1006` — Position updates are batched every 10 seconds and must never block playback (`BR-175`).

---

### `TBL-035` `learning_sessions`

```sql
CREATE TABLE learning_sessions (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id         TEXT REFERENCES courses(id) ON DELETE SET NULL,

  started_at        TIMESTAMPTZ NOT NULL,
  ended_at          TIMESTAMPTZ,
  active_seconds    INTEGER NOT NULL DEFAULT 0,
  lessons_touched   INTEGER NOT NULL DEFAULT 0,

  platform          client_platform NOT NULL,
  local_date        DATE NOT NULL
);

CREATE INDEX idx_sessions_user_date ON learning_sessions(user_id, local_date DESC);
CREATE INDEX idx_sessions_started   ON learning_sessions(started_at DESC);
```

- `BR-1007` — `local_date` is computed in the learner's timezone and is the basis for streaks and weekly totals (`BR-207`).
- `BR-1008` — Sessions under 60 seconds of active time are discarded (`BR-206`).

---

### `TBL-036` `learner_notes`

```sql
CREATE TABLE learner_notes (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id      TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id      TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

  content        TEXT NOT NULL,
  timestamp_sec  INTEGER,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notes_user     ON learner_notes(user_id, created_at DESC);
CREATE INDEX idx_notes_lesson   ON learner_notes(user_id, lesson_id, timestamp_sec);
CREATE INDEX idx_notes_search   ON learner_notes USING GIN(to_tsvector('simple', content));
```

- `BR-1009` — Notes are private. No staff role can read them (`BR-197`).
- `BR-1010` — Notes survive entitlement expiry permanently (`BR-198`).

---

### `TBL-037` `bookmarks`

```sql
CREATE TABLE bookmarks (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id  TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, lesson_id)
);
```

---

## 8. `M07` — Motivation

### `TBL-038` `learning_goals`

```sql
CREATE TABLE learning_goals (
  id                   TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  goal_type            persona_type NOT NULL,
  goal_description     TEXT,
  current_level        course_level NOT NULL,
  weekly_hours         SMALLINT NOT NULL,
  interests            TEXT[],

  target_course_id     TEXT REFERENCES courses(id) ON DELETE SET NULL,
  projected_date       DATE,
  projected_calculated_at TIMESTAMPTZ,

  status               goal_status NOT NULL DEFAULT 'active',
  achieved_at          TIMESTAMPTZ,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_goal_active ON learning_goals(user_id)
  WHERE status = 'active';

CREATE TYPE goal_status AS ENUM ('active','achieved','abandoned','superseded');
```

- `BR-1011` — Exactly one active goal per learner, enforced by a partial unique index (`BR-213`).
- `BR-1012` — `projected_date` moves by at most ±7 days per recalculation (`BR-794`).

---

### `TBL-039` `goal_history`

```sql
CREATE TABLE goal_history (
  id             TEXT PRIMARY KEY,
  goal_id        TEXT NOT NULL REFERENCES learning_goals(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field          TEXT NOT NULL,
  old_value      TEXT,
  new_value      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### `TBL-040` `streaks`

```sql
CREATE TABLE streaks (
  user_id             TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak      INTEGER NOT NULL DEFAULT 0,
  best_streak         INTEGER NOT NULL DEFAULT 0,
  last_qualifying_date DATE,
  freezes_used_30d    SMALLINT NOT NULL DEFAULT 0,
  last_freeze_at      DATE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- `BR-1013` — `best_streak` is permanent and never resets (`BR-797`).
- `BR-1014` — Freezes apply silently; the learner is informed afterward (`BR-796`).

---

### `TBL-041` `achievements`

```sql
CREATE TABLE achievements (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        achievement_type NOT NULL,
  course_id   TEXT REFERENCES courses(id) ON DELETE SET NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_achievements_user ON achievements(user_id, achieved_at DESC);

CREATE TYPE achievement_type AS ENUM (
  'first_lesson','first_quiz_passed','section_complete',
  'quarter_course','half_course','three_quarter_course','course_complete',
  'streak_7','streak_30','streak_100','first_certificate','goal_achieved'
);
```

- `BR-1015` — Achievements are named moments, not a points economy (`BR-240`, `NG-04`).

---

## 9. `M08` — Assessment

### `TBL-042` `quizzes`

```sql
CREATE TABLE quizzes (
  id                  TEXT PRIMARY KEY,
  course_id           TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  section_id          TEXT REFERENCES sections(id) ON DELETE CASCADE,
  lesson_id           TEXT REFERENCES lessons(id) ON DELETE CASCADE,

  title               JSONB NOT NULL,
  description         JSONB,
  scope               quiz_scope NOT NULL,

  pass_mark           NUMERIC(5,2) NOT NULL DEFAULT 70,
  max_attempts        SMALLINT,
  time_limit_minutes  SMALLINT,
  cooldown_hours      SMALLINT,
  shuffle_questions   BOOLEAN NOT NULL DEFAULT false,
  shuffle_options     BOOLEAN NOT NULL DEFAULT true,
  show_answers        answer_reveal NOT NULL DEFAULT 'after_submit',
  question_pool_size  SMALLINT,

  status              content_status NOT NULL DEFAULT 'draft',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quizzes_course ON quizzes(course_id);

CREATE TYPE quiz_scope    AS ENUM ('lesson','section','course_final');
CREATE TYPE answer_reveal AS ENUM ('never','after_submit','after_pass');
```

- `BR-1016` — `course_final` quizzes gate certificate eligibility (`BR-273`).

---

### `TBL-043` `questions`

```sql
CREATE TABLE questions (
  id             TEXT PRIMARY KEY,
  course_id      TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  type           question_type NOT NULL,

  prompt         JSONB NOT NULL,
  explanation    JSONB,
  rubric         JSONB,

  points         SMALLINT NOT NULL DEFAULT 1,
  partial_credit BOOLEAN NOT NULL DEFAULT false,
  difficulty     question_difficulty,
  tags           TEXT[],

  case_sensitive BOOLEAN NOT NULL DEFAULT false,
  is_in_bank     BOOLEAN NOT NULL DEFAULT false,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_questions_course ON questions(course_id);
CREATE INDEX idx_questions_bank   ON questions(course_id) WHERE is_in_bank;
CREATE INDEX idx_questions_tags   ON questions USING GIN(tags);

CREATE TYPE question_type       AS ENUM ('mcq_single','mcq_multi','true_false','fill_blank','essay');
CREATE TYPE question_difficulty AS ENUM ('easy','medium','hard');
```

---

### `TBL-044` `question_options`

```sql
CREATE TABLE question_options (
  id           TEXT PRIMARY KEY,
  question_id  TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  content      JSONB NOT NULL,
  is_correct   BOOLEAN NOT NULL DEFAULT false,
  explanation  JSONB,
  position     SMALLINT NOT NULL,
  accepted_answers TEXT[]
);

CREATE INDEX idx_options_question ON question_options(question_id, position);
```

- `BR-1017` — `accepted_answers` serves fill-blank questions with Arabic normalization applied at comparison time (`BR-256`).

---

### `TBL-045` `quiz_questions`

```sql
CREATE TABLE quiz_questions (
  quiz_id     TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  position    SMALLINT NOT NULL,
  PRIMARY KEY (quiz_id, question_id)
);
```

---

### `TBL-046` `quiz_attempts`

```sql
CREATE TABLE quiz_attempts (
  id                TEXT PRIMARY KEY,
  quiz_id           TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id         TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

  attempt_number    SMALLINT NOT NULL,
  status            attempt_status NOT NULL DEFAULT 'started',

  question_snapshot JSONB NOT NULL,
  score             NUMERIC(5,2),
  max_score         NUMERIC(5,2),
  passed            BOOLEAN,

  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at      TIMESTAMPTZ,
  graded_at         TIMESTAMPTZ,
  duration_seconds  INTEGER,

  UNIQUE (quiz_id, user_id, attempt_number)
);

CREATE INDEX idx_attempts_user   ON quiz_attempts(user_id, quiz_id);
CREATE INDEX idx_attempts_review ON quiz_attempts(status)
  WHERE status = 'pending_review';

CREATE TYPE attempt_status AS ENUM
  ('started','submitted','pending_review','graded','abandoned');
```

- `BR-1018` — `question_snapshot` freezes questions as they existed at attempt time (`BR-266`).
- `BR-1019` — The highest-scoring attempt determines progress and eligibility (`BR-784`).

---

### `TBL-047` `attempt_answers`

```sql
CREATE TABLE attempt_answers (
  id                TEXT PRIMARY KEY,
  attempt_id        TEXT NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id       TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,

  selected_options  TEXT[],
  text_answer       TEXT,

  is_correct        BOOLEAN,
  points_awarded    NUMERIC(5,2),

  ai_suggested_score NUMERIC(5,2),
  ai_justification  TEXT,
  grader_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
  grader_feedback   TEXT,
  graded_at         TIMESTAMPTZ,

  answered_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_answers_attempt ON attempt_answers(attempt_id);
```

- `BR-1020` — `ai_suggested_score` is never exposed to the learner (`BR-261`). Only `grader_feedback` and the confirmed score are visible.

---

## 10. `M09` — Certification

### `TBL-048` `certificates`

```sql
CREATE TABLE certificates (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  course_id         TEXT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,

  verification_code TEXT NOT NULL UNIQUE,

  learner_name      TEXT NOT NULL,
  course_title      TEXT NOT NULL,
  language          CHAR(2) NOT NULL DEFAULT 'ar',

  final_score       NUMERIC(5,2),
  completed_at      TIMESTAMPTZ NOT NULL,
  issued_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  pdf_storage_key   TEXT,
  pdf_generated_at  TIMESTAMPTZ,

  status            certificate_status NOT NULL DEFAULT 'issued',
  revoked_at        TIMESTAMPTZ,
  revoked_reason    TEXT,
  replaced_by       TEXT REFERENCES certificates(id) ON DELETE SET NULL,

  UNIQUE (user_id, course_id, status) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_cert_code   ON certificates(verification_code);
CREATE INDEX idx_cert_user   ON certificates(user_id, issued_at DESC);
CREATE INDEX idx_cert_course ON certificates(course_id);

CREATE TYPE certificate_status AS ENUM ('issued','revoked','superseded');
```

- `BR-1021` — `learner_name` and `course_title` are denormalized and frozen at issuance. Later profile or course edits never alter an issued certificate (`BR-1021` ← `BR-021`, `BR-281`).
- `BR-1022` — `verification_code` is cryptographically random with an unambiguous alphabet, never sequential (`BR-283`).
- `BR-1023` — Certificates are permanent. Account deletion never invalidates them (`BR-284`).
- `BR-1024` — Reissue creates a new record and marks the prior one `superseded`, revoking its code (`BR-282`).

---

## 11. Part 1 Table Catalog

| # | Table | Module | Rows (yr 1) |
|---|---|---|---:|
| `TBL-001` | `users` | M01 | ~500 |
| `TBL-002` | `user_identities` | M01 | ~700 |
| `TBL-003` | `refresh_tokens` | M01 | ~2,000 |
| `TBL-004` | `verification_tokens` | M01 | ~1,500 |
| `TBL-005` | `otp_codes` | M01 | ~3,000 |
| `TBL-006` | `login_activity` | M01 | ~20,000 |
| `TBL-007` | `roles` | M02 | 5 |
| `TBL-008` | `permissions` | M02 | 174 |
| `TBL-009` | `role_permissions` | M02 | ~300 |
| `TBL-010` | `user_permission_overrides` | M02 | < 20 |
| `TBL-011` | `products` | M03 | ~15 |
| `TBL-012` | `product_prices` | M03 | ~60 |
| `TBL-013` | `product_entitlements` | M03 | ~50 |
| `TBL-014` | `coupons` | M03 | ~30 |
| `TBL-015` | `orders` | M03 | ~800 |
| `TBL-016` | `order_items` | M03 | ~900 |
| `TBL-017` | `transactions` | M03 | ~1,200 |
| `TBL-018` | `invoices` | M03 | ~700 |
| `TBL-019` | `refund_requests` | M03 | ~40 |
| `TBL-020` | `subscriptions` | M03 | ~150 |
| `TBL-021` | `entitlements` | M04 | ~2,000 |
| `TBL-022` | `entitlement_events` | M04 | ~5,000 |
| `TBL-023` | `courses` | M05 | ~5 |
| `TBL-024` | `categories` | M05 | ~15 |
| `TBL-025` | `sections` | M05 | ~50 |
| `TBL-026` | `lessons` | M05 | ~400 |
| `TBL-027` | `video_assets` | M05 | ~400 |
| `TBL-028` | `lesson_note_blocks` | M05 | ~4,000 |
| `TBL-029` | `resources` | M05 | ~600 |
| `TBL-030` | `media_assets` | M05 | ~800 |
| `TBL-031` | `content_versions` | M05 | ~3,000 |
| `TBL-032` | `unlock_rules` | M05 | ~400 |
| `TBL-033` | `enrollments` | M06 | ~1,500 |
| `TBL-034` | `lesson_progress` | M06 | ~60,000 |
| `TBL-035` | `learning_sessions` | M06 | ~40,000 |
| `TBL-036` | `learner_notes` | M06 | ~8,000 |
| `TBL-037` | `bookmarks` | M06 | ~2,000 |
| `TBL-038` | `learning_goals` | M07 | ~500 |
| `TBL-039` | `goal_history` | M07 | ~1,000 |
| `TBL-040` | `streaks` | M07 | ~500 |
| `TBL-041` | `achievements` | M07 | ~6,000 |
| `TBL-042` | `quizzes` | M08 | ~60 |
| `TBL-043` | `questions` | M08 | ~800 |
| `TBL-044` | `question_options` | M08 | ~3,000 |
| `TBL-045` | `quiz_questions` | M08 | ~900 |
| `TBL-046` | `quiz_attempts` | M08 | ~5,000 |
| `TBL-047` | `attempt_answers` | M08 | ~50,000 |
| `TBL-048` | `certificates` | M09 | ~400 |

**48 tables · largest table ~60,000 rows.** Total data volume in year 1 is well under 2 GB, comfortably within the 20 GB PostgreSQL allocation (`§11.3` of doc 08).

---

## 12. Approval — Part 1

| Item | Status |
|---|---|
| Prefixed ULID identifiers (`DEC-29`) are accepted | ☐ Approved |
| Column standards (UTC, minor units, bilingual `jsonb`) are correct | ☐ Approved |
| No cross-module foreign keys except `users` (`BR-950`) is accepted | ☐ Approved |
| Identity and access schema is correct | ☐ Approved |
| Commerce schema with product snapshots is correct | ☐ Approved |
| Entitlement schema and the hot lookup index are correct | ☐ Approved |
| Content schema including block-structured lesson notes is correct | ☐ Approved |
| Denormalized progress aggregates on `enrollments` are accepted | ☐ Approved |
| Unlock rules as `jsonb` with fail-open behavior are accepted | ☐ Approved |
| Assessment schema with question snapshots is correct | ☐ Approved |
| Certificate denormalization and permanence rules are correct | ☐ Approved |

**Next:** `10-database-design · Part 2` — `M10` AI & `pgvector`, `M11` Q&A, `M12` Reviews, `M13` Protection, `M14` Messaging, `M15` Support, `M16` Administration, `M17` Analytics read models, plus indexing strategy, migration approach, and seed data.

---
