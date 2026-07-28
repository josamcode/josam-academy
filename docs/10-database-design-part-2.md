# 10 — Database Design · Part 2

### Modules `M10`–`M17`, `M21` — AI, Q&A, Reviews, Protection, Messaging, Support, Administration, Analytics, Platform

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 10 — Database Design (Part 2 of 2) |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | `10-database-design-part-1.md` |
| **Feeds Into** | `11-api-contract.md`, `14-security-design.md`, `16-task-breakdown.md` |
| **Covers** | 37 tables · `TBL-049` – `TBL-085` · `BR-1025` – `BR-1088` |

---

## 1. `M10` — AI Tutor

### `TBL-049` `ai_task_configs`

```sql
CREATE TABLE ai_task_configs (
  id              TEXT PRIMARY KEY,
  task            ai_task NOT NULL UNIQUE,

  provider        ai_provider NOT NULL,
  model           TEXT NOT NULL,
  temperature     NUMERIC(3,2) NOT NULL DEFAULT 0.7,
  max_tokens      INTEGER NOT NULL DEFAULT 1500,
  system_prompt   TEXT,

  fallback_provider ai_provider,
  fallback_model  TEXT,

  is_enabled      BOOLEAN NOT NULL DEFAULT true,
  updated_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE ai_task AS ENUM
  ('tutor_chat','qa_answer','essay_grading','summarization','embedding');
CREATE TYPE ai_provider AS ENUM
  ('anthropic','openai','google','openrouter');
```

- `BR-1025` — Changes take effect within 60 seconds without restart (`BR-486`).
- `BR-1026` — The `embedding` task is guarded: changing it requires typed confirmation and triggers re-indexing (`BR-484`).
- `BR-1027` — API keys are **not** stored here. They live in environment variables (`BR-941`).

---

### `TBL-050` `ai_model_costs`

```sql
CREATE TABLE ai_model_costs (
  id                    TEXT PRIMARY KEY,
  provider              ai_provider NOT NULL,
  model                 TEXT NOT NULL,
  input_cost_per_mtok   NUMERIC(10,4) NOT NULL,
  output_cost_per_mtok  NUMERIC(10,4) NOT NULL,
  effective_from        DATE NOT NULL,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (provider, model, effective_from)
);
```

- `BR-1028` — Rates are editable in admin when vendor pricing changes (`BR-333`). Historic rows are retained so past cost reports remain accurate.

---

### `TBL-051` `content_chunks`

The `pgvector` table. The single most performance-sensitive object in the AI subsystem.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE content_chunks (
  id               TEXT PRIMARY KEY,

  course_id        TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  section_id       TEXT REFERENCES sections(id) ON DELETE CASCADE,
  lesson_id        TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  block_id         TEXT REFERENCES lesson_note_blocks(id) ON DELETE CASCADE,

  source           chunk_source NOT NULL DEFAULT 'lesson_notes',
  content          TEXT NOT NULL,
  heading_path     TEXT,
  language         CHAR(2) NOT NULL,

  start_time       INTEGER,
  end_time         INTEGER,

  embedding        vector(3072),
  embedding_model  TEXT NOT NULL,
  embedding_dims   SMALLINT NOT NULL,

  token_count      SMALLINT,
  is_stale         BOOLEAN NOT NULL DEFAULT false,

  search_vector    tsvector GENERATED ALWAYS AS (
    to_tsvector(
      CASE WHEN language = 'ar' THEN 'arabic'::regconfig
           ELSE 'english'::regconfig END,
      content
    )
  ) STORED,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chunks_vector ON content_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_chunks_fts    ON content_chunks USING GIN(search_vector);
CREATE INDEX idx_chunks_course ON content_chunks(course_id) WHERE NOT is_stale;
CREATE INDEX idx_chunks_lesson ON content_chunks(lesson_id);
CREATE INDEX idx_chunks_stale  ON content_chunks(is_stale) WHERE is_stale;

CREATE TYPE chunk_source AS ENUM ('lesson_notes','qa_answer','article');
```

**Rules:**
- `BR-1029` — `embedding_model` and `embedding_dims` are stored per row, converting the "permanent" embedding decision into an incrementally migratable one (`DEC-02`, `BR-298`).
- `BR-1030` — A chunk never spans two lessons (`BR-864`).
- `BR-1031` — `start_time` inherits from the source block, making every retrieval citable to a video moment (`BR-865`).
- `BR-1032` — `search_vector` is a generated column using the language-appropriate configuration, enabling hybrid retrieval in one table (`BR-868`).
- `BR-1033` — Retrieval always filters by `course_id IN (entitled courses)` **before** similarity ranking (`BR-869`).
- `BR-1034` — Instructor answers promoted to the knowledge base enter with `source = 'qa_answer'` (`BR-301`).

---

### `TBL-052` `ai_conversations`

```sql
CREATE TABLE ai_conversations (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id     TEXT REFERENCES courses(id) ON DELETE SET NULL,

  title         TEXT,
  summary       TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_conv_user ON ai_conversations(user_id, updated_at DESC)
  WHERE deleted_at IS NULL;
```

- `BR-1035` — `summary` holds the rolling summary of older turns, bounding token cost (`BR-317`).

---

### `TBL-053` `ai_messages`

```sql
CREATE TABLE ai_messages (
  id                TEXT PRIMARY KEY,
  conversation_id   TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role              message_role NOT NULL,
  content           TEXT NOT NULL,

  lesson_context_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  citations         JSONB,
  retrieved_chunks  TEXT[],

  provider          ai_provider,
  model             TEXT,
  input_tokens      INTEGER,
  output_tokens     INTEGER,
  latency_ms        INTEGER,
  cost_usd          NUMERIC(10,6),

  was_out_of_scope  BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_msg_conv ON ai_messages(conversation_id, created_at);
CREATE INDEX idx_msg_oos  ON ai_messages(created_at DESC) WHERE was_out_of_scope;

CREATE TYPE message_role AS ENUM ('user','assistant','system');
```

- `BR-1036` — `citations` is built from chunk metadata, never parsed from model output (`BR-741`).
- `BR-1037` — `retrieved_chunks` retains which chunks were used, enabling retrieval debugging when feedback is negative (`BR-337`).
- `BR-1038` — `was_out_of_scope` drives the content gap report — one of the most valuable outputs in the system (`BR-327`, `BR-515`).

---

### `TBL-054` `ai_usage_daily`

```sql
CREATE TABLE ai_usage_daily (
  id             TEXT PRIMARY KEY,
  date           DATE NOT NULL,
  user_id        TEXT REFERENCES users(id) ON DELETE CASCADE,
  provider       ai_provider NOT NULL,
  model          TEXT NOT NULL,
  task           ai_task NOT NULL,

  request_count  INTEGER NOT NULL DEFAULT 0,
  input_tokens   BIGINT NOT NULL DEFAULT 0,
  output_tokens  BIGINT NOT NULL DEFAULT 0,
  cost_usd       NUMERIC(10,4) NOT NULL DEFAULT 0,
  error_count    INTEGER NOT NULL DEFAULT 0,

  UNIQUE (date, user_id, provider, model, task)
);

CREATE INDEX idx_ai_usage_date ON ai_usage_daily(date DESC);
```

- `BR-1039` — Aggregated on write. Computing monthly spend by scanning `ai_messages` would be wasteful on 2 vCPU.

---

### `TBL-055` `ai_feedback`

```sql
CREATE TABLE ai_feedback (
  id          TEXT PRIMARY KEY,
  message_id  TEXT NOT NULL REFERENCES ai_messages(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      feedback_rating NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (message_id, user_id)
);

CREATE TYPE feedback_rating AS ENUM ('positive','negative');
```

- `BR-1040` — Repeated negative feedback on chunks from the same lesson flags those Lesson Notes for revision (`BR-337`).

---

## 2. `M11` — Q&A

### `TBL-056` `qa_questions`

```sql
CREATE TABLE qa_questions (
  id                TEXT PRIMARY KEY,
  lesson_id         TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id         TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  title             TEXT NOT NULL,
  body              TEXT NOT NULL,
  timestamp_sec     INTEGER,
  attachment_key    TEXT,

  status            qa_status NOT NULL DEFAULT 'open',
  is_public         BOOLEAN NOT NULL DEFAULT true,
  is_hidden         BOOLEAN NOT NULL DEFAULT false,

  upvote_count      INTEGER NOT NULL DEFAULT 0,
  ai_conversation_id TEXT REFERENCES ai_conversations(id) ON DELETE SET NULL,

  escalated_at      TIMESTAMPTZ,
  answered_at       TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qa_lesson    ON qa_questions(lesson_id, created_at DESC)
  WHERE is_public AND NOT is_hidden;
CREATE INDEX idx_qa_escalated ON qa_questions(escalated_at)
  WHERE status = 'escalated';
CREATE INDEX idx_qa_user      ON qa_questions(user_id, created_at DESC);
CREATE INDEX idx_qa_search    ON qa_questions
  USING GIN(to_tsvector('simple', title || ' ' || body));

CREATE TYPE qa_status AS ENUM
  ('open','ai_answered','escalated','instructor_answered','resolved');
```

- `BR-1041` — Questions always belong to a lesson. There is no global question surface (`BR-338`, `NG-03`).
- `BR-1042` — Only `instructor_answered` questions become publicly visible (`BR-789`).
- `BR-1043` — Escalated questions unanswered after 48 hours surface on the operations dashboard (`BR-348`).

---

### `TBL-057` `qa_answers`

```sql
CREATE TABLE qa_answers (
  id              TEXT PRIMARY KEY,
  question_id     TEXT NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
  author_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  source          answer_source NOT NULL,

  body            TEXT NOT NULL,
  citations       JSONB,

  is_accepted     BOOLEAN NOT NULL DEFAULT false,
  promoted_to_kb  BOOLEAN NOT NULL DEFAULT false,
  promoted_chunk_id TEXT REFERENCES content_chunks(id) ON DELETE SET NULL,

  is_hidden       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qa_answers ON qa_answers(question_id, created_at);

CREATE TYPE answer_source AS ENUM ('ai','instructor','support');
```

- `BR-1044` — AI answers are always visibly labeled. Presenting AI output as the instructor's voice is a trust violation (`BR-342`).
- `BR-1045` — `promoted_to_kb` is the feedback loop that makes `MET-03` improve over time (`BR-743`).

---

### `TBL-058` `qa_votes`

```sql
CREATE TABLE qa_votes (
  question_id TEXT NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (question_id, user_id)
);
```

- `BR-1046` — Upvotes only. No downvotes — negative signals on a learner's question discourage asking (`BR-352`).

---

## 3. `M12` — Reviews

### `TBL-059` `reviews`

```sql
CREATE TABLE reviews (
  id                  TEXT PRIMARY KEY,
  course_id           TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id            TEXT REFERENCES orders(id) ON DELETE SET NULL,

  rating              SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body                TEXT,
  progress_at_review  NUMERIC(5,2) NOT NULL,

  status              review_status NOT NULL DEFAULT 'pending',
  moderated_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
  moderated_at        TIMESTAMPTZ,
  moderation_reason   TEXT,

  reply_body          TEXT,
  reply_by            TEXT REFERENCES users(id) ON DELETE SET NULL,
  reply_at            TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (course_id, user_id)
);

CREATE INDEX idx_reviews_course  ON reviews(course_id, created_at DESC)
  WHERE status IN ('approved','auto_approved');
CREATE INDEX idx_reviews_pending ON reviews(created_at) WHERE status = 'pending';

CREATE TYPE review_status AS ENUM
  ('pending','approved','auto_approved','rejected','hidden');
```

- `BR-1047` — Rejection is permitted only for spam or abuse, never for a low rating (`BR-751`).
- `BR-1048` — Reviews unmoderated for 7 days auto-approve. A backlog must not silently suppress genuine feedback (`BR-364`).
- `BR-1049` — Public display requires the course to hold at least `review_display_threshold` approved reviews (`BR-366`).

---

## 4. `M13` — Content Protection

### `TBL-060` `devices`

```sql
CREATE TABLE devices (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  device_token_hash TEXT NOT NULL UNIQUE,
  fingerprint_hash  TEXT,
  fingerprint_data  JSONB,

  label             TEXT NOT NULL,
  platform          client_platform NOT NULL,
  os_name           TEXT,
  browser_name      TEXT,

  is_active         BOOLEAN NOT NULL DEFAULT true,
  bound_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at      TIMESTAMPTZ,
  released_at       TIMESTAMPTZ,
  release_reason    TEXT
);

CREATE UNIQUE INDEX idx_device_active ON devices(user_id) WHERE is_active;
CREATE INDEX idx_device_token        ON devices(device_token_hash);
CREATE INDEX idx_device_fingerprint  ON devices(fingerprint_hash);
```

- `BR-1050` — A partial unique index enforces exactly one active device per learner (`BR-379`).
- `BR-1051` — `device_token_hash` is authoritative. `fingerprint_hash` is a secondary signal only and never blocks playback on its own (`BR-382`, `BR-384`).
- `BR-1052` — Binding governs video playback exclusively. Every other feature works from any device (`BR-378`, `PRIN-04`).

---

### `TBL-061` `device_transfers`

```sql
CREATE TABLE device_transfers (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_device_id    TEXT REFERENCES devices(id) ON DELETE SET NULL,
  to_device_id      TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,

  status            transfer_status NOT NULL DEFAULT 'pending',
  method            transfer_method NOT NULL,

  transfers_in_window SMALLINT NOT NULL,
  geo_distance_km   INTEGER,
  abuse_score       SMALLINT,

  requested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at        TIMESTAMPTZ,
  decided_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
  decision_reason   TEXT
);

CREATE INDEX idx_transfers_pending ON device_transfers(requested_at)
  WHERE status = 'pending';
CREATE INDEX idx_transfers_user    ON device_transfers(user_id, requested_at DESC);

CREATE TYPE transfer_status AS ENUM ('pending','approved','declined','auto_approved');
CREATE TYPE transfer_method AS ENUM ('automatic','manual','escalated');
```

- `BR-1053` — Evidence needed to decide is stored on the row so the queue requires no additional lookups (`BR-476`).
- `BR-1054` — The queue is ordered by wait time. A learner blocked from paid content is an urgent state (`BR-475`, `BR-770`).

---

### `TBL-062` `playback_sessions`

```sql
CREATE TABLE playback_sessions (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id      TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  device_id      TEXT REFERENCES devices(id) ON DELETE SET NULL,

  token_hash     TEXT NOT NULL,
  ip_address     INET,

  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at       TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_playback_active ON playback_sessions(user_id)
  WHERE ended_at IS NULL;
CREATE INDEX idx_playback_heartbeat ON playback_sessions(last_heartbeat)
  WHERE ended_at IS NULL;
```

- `BR-1055` — A partial unique index enforces one concurrent stream per account (`BR-396`).
- `BR-1056` — Sessions without a heartbeat for 2 minutes are released automatically (`BR-397`).

---

### `TBL-063` `playback_log`

```sql
CREATE TABLE playback_log (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id       TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  device_id       TEXT REFERENCES devices(id) ON DELETE SET NULL,
  ip_address      INET,
  country_code    CHAR(2),
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_playback_log_user   ON playback_log(user_id, created_at DESC);
CREATE INDEX idx_playback_log_lesson ON playback_log(lesson_id, created_at DESC);
```

- `BR-1057` — Retained 12 months, then pruned. Used for leak tracing and dispute resolution only (`BR-405`).
- `BR-1058` — Append-only (`BR-407`).

---

### `TBL-064` `download_log`

```sql
CREATE TABLE download_log (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_download_user ON download_log(user_id, created_at DESC);
```

- `BR-1059` — Unusual download volume contributes to the abuse score (`BR-403`).

---

### `TBL-065` `abuse_flags`

```sql
CREATE TABLE abuse_flags (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score         SMALLINT NOT NULL,
  signals       JSONB NOT NULL,

  status        flag_status NOT NULL DEFAULT 'open',
  reviewed_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  resolution    TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_flags_open ON abuse_flags(created_at DESC) WHERE status = 'open';

CREATE TYPE flag_status AS ENUM ('open','cleared','actioned');
```

- `BR-1060` — Flags never trigger automatic suspension. A human always reviews (`BR-802`).
- `BR-1061` — Ambiguous cases are cleared, not restricted. A false accusation costs more than a tolerated sharer (`BR-768`).

---

## 5. `M14` — Messaging

### `TBL-066` `notifications`

```sql
CREATE TABLE notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category    notification_category NOT NULL,
  type        TEXT NOT NULL,

  title       JSONB NOT NULL,
  body        JSONB NOT NULL,
  action_url  TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',

  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_user   ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notif_unread ON notifications(user_id) WHERE read_at IS NULL;

CREATE TYPE notification_category AS ENUM
  ('learning','achievement','qa','account','commercial','system');
```

- `BR-1062` — Pruned after 90 days (`FEAT-145`).
- `BR-1063` — Anything that can be in-app instead of email **is** in-app (`BR-413`).

---

### `TBL-067` `notification_preferences`

```sql
CREATE TABLE notification_preferences (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category    notification_category NOT NULL,
  channel     notification_channel NOT NULL,
  is_enabled  BOOLEAN NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, category, channel)
);

CREATE TYPE notification_channel AS ENUM ('in_app','email','push');
```

- `BR-1064` — Transactional categories are not user-disableable and are displayed as such with an explanation (`BR-437`).

---

### `TBL-068` `push_tokens`

```sql
CREATE TABLE push_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  platform    client_platform NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_user ON push_tokens(user_id) WHERE is_active;
```

- `BR-1065` — Tokens are deregistered on logout to prevent notifications reaching a shared device (`BR-577`).

---

### `TBL-069` `email_log`

```sql
CREATE TABLE email_log (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  to_address    TEXT NOT NULL,
  template_key  TEXT NOT NULL,
  priority      email_priority NOT NULL,
  locale        CHAR(2) NOT NULL,

  status        email_status NOT NULL DEFAULT 'queued',
  provider_id   TEXT,
  error_message TEXT,

  queued_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at       TIMESTAMPTZ,
  opened_at     TIMESTAMPTZ
);

CREATE INDEX idx_email_user   ON email_log(user_id, queued_at DESC);
CREATE INDEX idx_email_month  ON email_log(date_trunc('month', queued_at), priority);

CREATE TYPE email_priority AS ENUM ('p0','p1','p2','p3','p4');
CREATE TYPE email_status   AS ENUM ('queued','sent','failed','suppressed','deferred');
```

- `BR-1066` — `idx_email_month` backs the monthly budget counter without a full scan (`BR-801`).
- `BR-1067` — `suppressed` and `deferred` are recorded, not silently dropped, so budget behavior is auditable.

---

### `TBL-070` `email_templates`

```sql
CREATE TABLE email_templates (
  id           TEXT PRIMARY KEY,
  key          TEXT NOT NULL UNIQUE,
  subject      JSONB NOT NULL,
  body_html    JSONB NOT NULL,
  body_text    JSONB,
  priority     email_priority NOT NULL,
  is_enabled   BOOLEAN NOT NULL DEFAULT true,
  updated_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- `BR-1068` — Templates render RTL-correct HTML for Arabic (`BR-412`).

---

### `TBL-071` `email_budget`

```sql
CREATE TABLE email_budget (
  month           DATE PRIMARY KEY,
  cap             INTEGER NOT NULL,
  sent_p0         INTEGER NOT NULL DEFAULT 0,
  sent_p1         INTEGER NOT NULL DEFAULT 0,
  sent_p2         INTEGER NOT NULL DEFAULT 0,
  sent_p3         INTEGER NOT NULL DEFAULT 0,
  sent_p4         INTEGER NOT NULL DEFAULT 0,
  deferred_count  INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- `BR-1069` — Counters are incremented atomically at dispatch time, not at enqueue (`BR-439`).

---

## 6. `M15` — Support

### `TBL-072` `tickets`

```sql
CREATE TABLE tickets (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT REFERENCES users(id) ON DELETE SET NULL,
  guest_email        CITEXT,

  category           ticket_category NOT NULL,
  subject            TEXT NOT NULL,
  status             ticket_status NOT NULL DEFAULT 'open',
  priority           ticket_priority NOT NULL DEFAULT 'normal',

  assigned_to        TEXT REFERENCES users(id) ON DELETE SET NULL,
  context            JSONB NOT NULL DEFAULT '{}',

  first_response_at  TIMESTAMPTZ,
  resolved_at        TIMESTAMPTZ,
  closed_at          TIMESTAMPTZ,
  waiting_since      TIMESTAMPTZ,
  waiting_seconds    INTEGER NOT NULL DEFAULT 0,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT has_requester CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL)
);

CREATE INDEX idx_tickets_queue    ON tickets(priority, created_at)
  WHERE status IN ('open','in_progress');
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to, status);
CREATE INDEX idx_tickets_user     ON tickets(user_id, created_at DESC);

CREATE TYPE ticket_category AS ENUM
  ('payment','access','technical','content','account','other');
CREATE TYPE ticket_status   AS ENUM
  ('open','in_progress','waiting_on_customer','resolved','closed');
CREATE TYPE ticket_priority AS ENUM ('low','normal','high','urgent');
```

- `BR-1070` — `context` auto-captures order, lesson, device, and browser at submission (`BR-444`).
- `BR-1071` — `waiting_seconds` accumulates time in `waiting_on_customer` and is excluded from `MET-12` (`BR-787`).
- `BR-1072` — Payment and refund categories route to `ROLE-01` by default (`BR-688`).

---

### `TBL-073` `ticket_messages`

```sql
CREATE TABLE ticket_messages (
  id            TEXT PRIMARY KEY,
  ticket_id     TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_staff      BOOLEAN NOT NULL,
  is_internal   BOOLEAN NOT NULL DEFAULT false,

  body          TEXT NOT NULL,
  attachments   JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_msgs ON ticket_messages(ticket_id, created_at);
```

- `BR-1073` — `is_internal` messages are filtered at the serializer layer and never appear in any learner-facing response (`BR-756`).

---

### `TBL-074` `canned_responses`

```sql
CREATE TABLE canned_responses (
  id          TEXT PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  title       JSONB NOT NULL,
  body        JSONB NOT NULL,
  category    ticket_category,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- `BR-1074` — High `usage_count` identifies templates that should become help articles (`BR-456`).

---

## 7. `M16` — Administration

### `TBL-075` `settings`

```sql
CREATE TABLE settings (
  key          TEXT PRIMARY KEY,
  value        JSONB NOT NULL,
  value_type   setting_type NOT NULL,
  group_name   TEXT NOT NULL,
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  description  JSONB,
  updated_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_settings_group ON settings(group_name);

CREATE TYPE setting_type AS ENUM ('number','string','boolean','json','duration');
```

- `BR-1075` — Every threshold from `07-business-logic §8` is seeded here. A number in code absent from this table is a defect (`BR-830`).
- `BR-1076` — Sensitive settings require typed confirmation to change (`BR-820`).

---

### `TBL-076` `audit_log`

```sql
CREATE TABLE audit_log (
  id             TEXT PRIMARY KEY,
  actor_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_role     TEXT,

  action         TEXT NOT NULL,
  entity_type    TEXT NOT NULL,
  entity_id      TEXT,
  target_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,

  before_value   JSONB,
  after_value    JSONB,
  reason         TEXT,

  ip_address     INET,
  user_agent     TEXT,
  correlation_id TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_actor  ON audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_target ON audit_log(target_user_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_log(action, created_at DESC);
CREATE INDEX idx_audit_date   ON audit_log(created_at DESC);
```

- `BR-1077` — Append-only at every permission level, enforced by a database rule denying `UPDATE` and `DELETE` (`BR-1077` ← `BR-494`).
- `BR-1078` — Retained 24 months minimum (`BR-495`).
- `BR-1079` — Impersonation sessions and PII access are recorded here, not in separate tables (`BR-470`, `BR-501`).

---

### `TBL-077` `publish_requests`

```sql
CREATE TABLE publish_requests (
  id            TEXT PRIMARY KEY,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  requested_by  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note          TEXT,

  status        publish_status NOT NULL DEFAULT 'pending',
  decided_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  decided_at    TIMESTAMPTZ,
  feedback      TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_publish_pending ON publish_requests(created_at)
  WHERE status = 'pending';

CREATE TYPE publish_status AS ENUM ('pending','approved','returned');
```

- `BR-1080` — Returning requires feedback. A returned item is a revision request, not a refusal (`BR-765`).

---

## 8. `M17` — Analytics Read Models

Per `DEC-23`, analytics owns these tables and queries nothing else.

### `TBL-078` `analytics_revenue_daily`

```sql
CREATE TABLE analytics_revenue_daily (
  date            DATE NOT NULL,
  currency        CHAR(3) NOT NULL,
  provider        payment_provider NOT NULL,
  product_id      TEXT,
  country_code    CHAR(2),

  order_count     INTEGER NOT NULL DEFAULT 0,
  gross_minor     BIGINT NOT NULL DEFAULT 0,
  discount_minor  BIGINT NOT NULL DEFAULT 0,
  refund_minor    BIGINT NOT NULL DEFAULT 0,
  net_minor       BIGINT NOT NULL DEFAULT 0,

  PRIMARY KEY (date, currency, provider, product_id, country_code)
);
```

- `BR-1081` — Refunds are attributed to the original order date, not the refund date (`BR-505`).

---

### `TBL-079` `analytics_funnel_daily`

```sql
CREATE TABLE analytics_funnel_daily (
  date                  DATE PRIMARY KEY,
  visitors              INTEGER NOT NULL DEFAULT 0,
  registrations         INTEGER NOT NULL DEFAULT 0,
  onboarding_started    INTEGER NOT NULL DEFAULT 0,
  onboarding_completed  INTEGER NOT NULL DEFAULT 0,
  first_purchases       INTEGER NOT NULL DEFAULT 0,
  first_lesson_started  INTEGER NOT NULL DEFAULT 0,
  activated_7d          INTEGER NOT NULL DEFAULT 0
);
```

- `BR-1082` — Onboarding is tracked per step so the drop-off point is identifiable (`BR-507`).

---

### `TBL-080` `analytics_engagement_daily`

```sql
CREATE TABLE analytics_engagement_daily (
  date               DATE PRIMARY KEY,
  active_learners    INTEGER NOT NULL DEFAULT 0,
  sessions           INTEGER NOT NULL DEFAULT 0,
  total_minutes      INTEGER NOT NULL DEFAULT 0,
  lessons_completed  INTEGER NOT NULL DEFAULT 0,
  avg_session_minutes NUMERIC(6,2),
  active_streaks     INTEGER NOT NULL DEFAULT 0,
  mobile_share       NUMERIC(5,2)
);
```

- `BR-1083` — `mobile_share` directly measures `MET-07`.

---

### `TBL-081` `analytics_course_completion`

```sql
CREATE TABLE analytics_course_completion (
  course_id           TEXT NOT NULL,
  cohort_month        DATE NOT NULL,
  persona             persona_type,
  has_goal            BOOLEAN NOT NULL,
  used_ai             BOOLEAN NOT NULL,

  enrolled            INTEGER NOT NULL DEFAULT 0,
  started             INTEGER NOT NULL DEFAULT 0,
  completed           INTEGER NOT NULL DEFAULT 0,
  median_days_to_complete INTEGER,

  PRIMARY KEY (course_id, cohort_month, persona, has_goal, used_ai)
);
```

- `BR-1084` — The `has_goal` dimension is the primary validation of `GOAL-02`. If goal-setters do not complete at a measurably higher rate, the motivation system needs redesign before scaling content (`BR-509`).

---

### `TBL-082` `analytics_lesson_dropoff`

```sql
CREATE TABLE analytics_lesson_dropoff (
  lesson_id         TEXT NOT NULL,
  course_id         TEXT NOT NULL,
  week              DATE NOT NULL,

  reached           INTEGER NOT NULL DEFAULT 0,
  completed         INTEGER NOT NULL DEFAULT 0,
  avg_watch_percent NUMERIC(5,2),
  qa_count          INTEGER NOT NULL DEFAULT 0,
  quiz_fail_rate    NUMERIC(5,2),

  PRIMARY KEY (lesson_id, week)
);
```

- `BR-1085` — The steepest-drop lesson surfaces on the operations dashboard as a content improvement signal (`BR-510`).

---

### `TBL-083` `analytics_ai_daily`

```sql
CREATE TABLE analytics_ai_daily (
  date              DATE PRIMARY KEY,
  questions_asked   INTEGER NOT NULL DEFAULT 0,
  ai_resolved       INTEGER NOT NULL DEFAULT 0,
  escalated         INTEGER NOT NULL DEFAULT 0,
  deflection_rate   NUMERIC(5,2),
  out_of_scope      INTEGER NOT NULL DEFAULT 0,
  negative_feedback INTEGER NOT NULL DEFAULT 0,
  cost_usd          NUMERIC(10,4) NOT NULL DEFAULT 0
);
```

- `BR-1086` — `deflection_rate` is the direct `MET-03` measure (`BR-513`).

---

## 9. `M21` — Platform

### `TBL-084` `outbox_events`

```sql
CREATE TABLE outbox_events (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  version         SMALLINT NOT NULL DEFAULT 1,
  actor_id        TEXT,
  payload         JSONB NOT NULL,

  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  dispatched_at   TIMESTAMPTZ,
  attempts        SMALLINT NOT NULL DEFAULT 0,
  last_error      TEXT
);

CREATE INDEX idx_outbox_pending ON outbox_events(occurred_at)
  WHERE dispatched_at IS NULL;
```

- `BR-1087` — Events are written in the same transaction as the state change, then dispatched after commit (`BR-913`).
- `BR-1088` — Dispatched events are pruned after 30 days.

---

### `TBL-085` `backup_log`

```sql
CREATE TABLE backup_log (
  id             TEXT PRIMARY KEY,
  storage_key    TEXT NOT NULL,
  size_bytes     BIGINT NOT NULL,
  duration_ms    INTEGER NOT NULL,
  status         backup_status NOT NULL,
  error_message  TEXT,
  verified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE backup_status AS ENUM ('success','failed','verifying','verified');
```

- `BR-1089` — Backup status is surfaced on the operations dashboard. Silent backup failure is the most dangerous failure mode in the system (`BR-620`).

---

## 10. Indexing Strategy

### 10.1 Hot Paths

The five queries that must never be slow.

| # | Query | Index |
|---|---|---|
| 1 | Resolve a learner's entitlements | `idx_ent_lookup` (`TBL-021`) |
| 2 | Continue Learning lookup | `idx_enroll_user` (`TBL-033`) |
| 3 | Lesson progress for a course | `idx_progress_user_course` (`TBL-034`) |
| 4 | RAG retrieval | `idx_chunks_vector` + `idx_chunks_fts` (`TBL-051`) |
| 5 | Dashboard aggregate | Denormalized columns, no join |

### 10.2 Principles

- `BR-1090` — Partial indexes are used wherever a status column filters most rows (`WHERE deleted_at IS NULL`, `WHERE status = 'pending'`). They are dramatically smaller and stay in memory.
- `BR-1091` — Composite index column order follows selectivity: equality columns first, range columns last.
- `BR-1092` — Every foreign key used in a join carries an index. PostgreSQL does not create them automatically.
- `BR-1093` — Indexes are added when a query needs them, not preemptively. Every index costs write performance and memory — both scarce on this hardware.
- `BR-1094` — `pg_stat_statements` is enabled. Any query exceeding 100 ms in production is investigated.

### 10.3 Vector Index Tuning

```sql
-- Build (one-time, off-peak)
SET maintenance_work_mem = '512MB';
CREATE INDEX idx_chunks_vector ON content_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Query time
SET hnsw.ef_search = 40;
```

- `BR-1095` — HNSW rather than IVFFlat: at a few thousand chunks HNSW gives better recall with no training step, and the index rebuilds cheaply after re-indexing.
- `BR-1096` — Index builds run off-peak with elevated `maintenance_work_mem`, then reset (`BR-877`).

---

## 11. Migration Strategy

### 11.1 Expand–Contract (`DEC-20`)

```
Release N     ADD COLUMN new_field (nullable, default NULL)
              application writes both old and new, reads old

Release N+1   backfill new_field in batches
              application reads new, still writes both

Release N+2   DROP COLUMN old_field
```

- `BR-1097` — No release both stops using a column and drops it. This is what makes rollback survivable on a single server (`BR-888`).
- `BR-1098` — Backfills run in batches of 1,000 rows with pauses. A single large `UPDATE` locks the table and stalls the platform on 2 vCPU.
- `BR-1099` — Migrations run before the new image goes live and must be backward compatible with the previous release (`BR-887`).

### 11.2 Prohibited Migration Operations

| Operation | Why | Alternative |
|---|---|---|
| `ALTER COLUMN … TYPE` on a large table | Rewrites the whole table, holds an exclusive lock | Add new column, backfill, swap |
| `ADD COLUMN … NOT NULL DEFAULT` on a large table | Table rewrite on older PostgreSQL | Add nullable, backfill, then set `NOT NULL` |
| Adding an index without `CONCURRENTLY` | Blocks writes | `CREATE INDEX CONCURRENTLY` |
| Renaming a column in one release | Breaks the running previous version | Expand–contract |
| `DELETE` without a `WHERE` on a large table | Long transaction, table bloat | Batched deletes |

- `BR-1100` — All index creation in production uses `CONCURRENTLY`.

---

## 12. Retention & Pruning

| Table | Retention | Trigger |
|---|---|---|
| `login_activity` | 90 days | Daily job |
| `otp_codes` | 24 hours | Daily job |
| `verification_tokens` | 7 days after consumption | Daily job |
| `refresh_tokens` | 30 days after expiry | Daily job |
| `notifications` | 90 days | Daily job |
| `playback_log` | 12 months | Monthly job |
| `download_log` | 12 months | Monthly job |
| `transactions.provider_payload` | 90 days (nulled, row kept) | Monthly job |
| `outbox_events` | 30 days after dispatch | Daily job |
| `content_versions` | Last 20 per entity | On write |
| `ai_messages` | Permanent | — |
| `audit_log` | 24 months minimum | Manual review |
| `orders`, `transactions`, `invoices` | **Permanent** | Never pruned |
| `certificates` | **Permanent** | Never pruned |
| `lesson_progress`, `learner_notes` | **Permanent** | Never pruned (`BR-822`) |

- `BR-1101` — Financial records and learner achievement data are never pruned (`BR-025`, `BR-822`).
- `BR-1102` — Pruning runs in batches during off-peak hours.

---

## 13. Seed Data

Required at first boot.

| Data | Source |
|---|---|
| 5 system roles | `05-roles-and-permissions §3` |
| 174 permissions | Code registry, synced at startup (`BR-964`) |
| Role–permission assignments | `05-roles-and-permissions §4` |
| ~60 settings | `07-business-logic §8` (`BR-1075`) |
| AI task configs (5 tasks) | Sensible defaults, editable |
| AI model cost table | Current vendor pricing |
| Email templates | Bilingual, all lifecycle messages |
| Categories | Initial course taxonomy |
| Super Admin account | Founder, created via CLI |

- `BR-1103` — Seeds are idempotent and safe to re-run on every deployment.
- `BR-1104` — The Super Admin account is created by a CLI command, never by a public endpoint.

---

## 14. Complete Table Catalog

| Module | Tables | Range |
|---|---:|---|
| `M01` Identity | 6 | `TBL-001`–`006` |
| `M02` Access | 4 | `TBL-007`–`010` |
| `M03` Commerce | 10 | `TBL-011`–`020` |
| `M04` Entitlements | 2 | `TBL-021`–`022` |
| `M05` Content | 10 | `TBL-023`–`032` |
| `M06` Learning | 5 | `TBL-033`–`037` |
| `M07` Motivation | 4 | `TBL-038`–`041` |
| `M08` Assessment | 6 | `TBL-042`–`047` |
| `M09` Certification | 1 | `TBL-048` |
| `M10` AI | 7 | `TBL-049`–`055` |
| `M11` Q&A | 3 | `TBL-056`–`058` |
| `M12` Reviews | 1 | `TBL-059` |
| `M13` Protection | 6 | `TBL-060`–`065` |
| `M14` Messaging | 6 | `TBL-066`–`071` |
| `M15` Support | 3 | `TBL-072`–`074` |
| `M16` Administration | 3 | `TBL-075`–`077` |
| `M17` Analytics | 6 | `TBL-078`–`083` |
| `M21` Platform | 2 | `TBL-084`–`085` |
| **Total** | **85** | |

**Enum types:** 42 · **Estimated year-1 size:** < 3 GB (of 20 GB allocated)

---

## 15. Approval — Part 2 & Full Schema

| Item | Status |
|---|---|
| `pgvector` chunk table with per-row model tagging is correct | ☐ Approved |
| Generated `tsvector` column for hybrid retrieval is correct | ☐ Approved |
| AI usage and cost tracking tables are correct | ☐ Approved |
| Q&A schema including knowledge-base promotion is correct | ☐ Approved |
| Device binding via partial unique index is correct | ☐ Approved |
| Concurrent stream enforcement via partial unique index is correct | ☐ Approved |
| Email budget tables and priority tracking are correct | ☐ Approved |
| Audit log as append-only with database-level enforcement is correct | ☐ Approved |
| Analytics read models with no cross-module reads (`DEC-23`) are correct | ☐ Approved |
| Transactional outbox table is correct | ☐ Approved |
| Indexing strategy and hot-path coverage are correct | ☐ Approved |
| Expand–contract migration discipline is accepted | ☐ Approved |
| Prohibited migration operations list is binding | ☐ Approved |
| Retention policy — financial and learner data permanent — is correct | ☐ Approved |
| **The complete 85-table schema is correct and nothing is missing** | ☐ Approved |

**Next document:** `11-api-contract.md` — every endpoint: method, path, request shape, response shape, capability map, permissions required, error codes, and pagination conventions.

---
