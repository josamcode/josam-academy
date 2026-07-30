# Phase 1 — Plan · Identity, Permissions, Money

> **Not started.** This is the shape, for approval. `CLAUDE.md §2` step 2.

| Field                    | Value                                                    |
| ------------------------ | -------------------------------------------------------- |
| **Tasks**                | 32 · `PH-1.1` – `PH-1.32`                                |
| **Estimated**            | **31.0 d**                                               |
| **Forecast**             | **≈22.0 d** — blended, not 18.0 d. See §1.               |
| **Exit**                 | Real money paid and refunded · permission matrix green   |
| **Longest chain**        | 7.5 d — and it does **not** set the schedule. See §2.    |
| **Operational / vendor** | **8 of 32 tasks · 8.0 d · 26% of the estimate**          |
| **Blocked on founder**   | **5 pre-Phase-1 items**, then 5 vendor accounts. See §4. |

---

## 1. This phase is 26% operational, and that is stated here rather than in the closing report

**`CLAUDE.md §4` now requires this to be said at the start of a phase.** It is the first time it has
been said, and Phase 1 is the reason the rule exists.

| Population                                      | Est        | Ratio    | Forecast    |
| ----------------------------------------------- | ---------- | -------- | ----------- |
| Code against a `/docs` specification — 24 tasks | 23.0 d     | **0.58** | 13.3 d      |
| **Operational / vendor — 8 tasks**              | **8.0 d**  | **1.08** | **8.6 d**   |
| **Phase 1 forecast**                            | **31.0 d** | **0.71** | **≈22.0 d** |

**A naive 0.58 would forecast 18.0 d and understate by 4 days — roughly a working week.** That gap is
the whole value of Phase 0's split, and it is why the eight are named individually below rather than
counted.

### The eight operational tasks

| Task      | What makes it operational                                        | Est |
| --------- | ---------------------------------------------------------------- | --: |
| `PH-1.5`  | **Google OAuth** — external consent screen, client secrets, PKCE | 0.5 |
| `PH-1.6`  | **Twilio Verify** — account, service SID, per-message cost       | 1.0 |
| `PH-1.22` | **Stripe** — checkout, webhooks, subscriptions, customer portal  | 1.5 |
| `PH-1.23` | **Webhook pipeline** — signature verification + the first queue  | 1.0 |
| `PH-1.25` | **Invoice PDF** — the first queue job and the first R2 object    | 1.0 |
| `PH-1.26` | **Paymob** — cards, wallets, installments                        | 1.5 |
| `PH-1.27` | **Fawry** — deferred payment, 72 h expiry                        | 1.0 |
| `PH-1.28` | **Reconciliation job** — scheduled, recovers a lost webhook      | 0.5 |

**Type is not the test.** All eight are Type A by `CLAUDE.md §3` — executed in this repository. They
are operational because their correctness depends on a system nobody here controls, and that is what
the 1.08 measures.

---

## 2. The dependency shape

```
                            PH-1.1  Schema: users, tokens, OTP, login activity   (1.0)
                                │      ← PH-0.6 · GATED ON SB-33
              ┌─────────────────┼─────────────────┬──────────────────┐
              ▼                 ▼                 ▼                  ▼
      1.2 Argon2id(.5)   1.3 JWT rotation(1)  1.7 Schema:roles(.5)  1.14 Schema:entitlements(.5)
              │                 │                 │                  │
              └────────┬────────┤                 ▼                  ├──────────────┐
                       ▼        ├──► 1.5 Google OAuth(.5) ⚙          ▼              ▼
              1.4 Email reg(1)  └──► 1.6 Twilio OTP(1)   ⚙   1.8 Registry(1)   1.15 Engine(1.5)
                       │                                            │              │      SB-39
                       ▼                                            ▼              ▼
              1.31 Account area(1)                          1.9 Abilities(1)  1.16 Quota(1)
                                                             │        │
                                              ┌──────────────┘        └──────────┐
                                              ▼                                  ▼
                                    1.10 Guard+scope(1)                1.11 Capability(1)
                                              │                                  │
                                              ▼                                  ▼
                                    1.12 Perm matrix(1)                 1.13 Admin roles(1.5)
                                                                                 │
   1.14 ──► 1.17 Schema:products(.5) ──┬──────────────────────────────────┬──────┘
                                       ▼                                  ▼
                              1.19 Coupons(1)                    1.18 Product editor(1.5)
                                       │
            1.17 ──► 1.20 Schema:orders(1) ──► 1.21 PaymentProvider(.5)
                          │                          │
                          ├──► 1.25 Invoice PDF(1) ⚙ ├──► 1.22 Stripe(1.5) ⚙
                          │                          │         │
                          ├──► 1.30 Refunds(1)       │         ├──► 1.23 Webhooks(1) ⚙
                          │                          │         ├──► 1.24 Checkout UI(1)
                          │                          │         └──► 1.29 Subscriptions(1.5)
                          │                          │
                          │                          └──► 1.26 Paymob(1.5) ⚙  ◄── SB-40
                          │                                    │
                          │                                    ▼
                          │                              1.27 Fawry(1) ⚙
                          │                                    │
                          │                                    ▼
                          │                              1.28 Reconciliation(.5) ⚙
                          ▼
                 1.32 Manual grant(.5)  ← also 1.15, 1.13

                    ⚙ = operational / vendor  ·  1.13, 1.24, 1.31 also depend on PH-0.26 / 0.27 (done)
```

**Longest chain: 7.5 d** — `1.1 → 1.7 → 1.8 → 1.9 → 1.11 → 1.13 → 1.18`.

> **The critical path does not set this schedule, and it is worth saying why before anyone plans
> around it.** `BR-1772` allows one task at a time, and there is one AI and one founder. **The
> schedule is the total, ~22 d, not the 7.5 d chain.** A critical path describes what a _team_ could
> parallelise. Reading 7.5 d as "Phase 1 could be done in a week and a half" would be a planning
> error of roughly three weeks.
>
> Where the shape does matter is **ordering under risk**: `1.1` unblocks four independent subtrees, so
> a defect in it is the most expensive defect available in this phase. It gets the most verification,
> not the least, despite being "just a migration".

---

## 3. Task list

### Week 1 — Identity · 5.0 d

| Task       | Depends      | Est | Output                           |
| ---------- | ------------ | --: | -------------------------------- |
| `PH-1.1`   | `0.6`        | 1.0 | Migration applied, seeds run     |
| `PH-1.2`   | `1.1`        | 0.5 | ~100 ms hash time **verified**   |
| `PH-1.3`   | `1.1`        | 1.0 | Reuse revokes the family         |
| `PH-1.4`   | `1.2`, `1.3` | 1.0 | Enumeration-resistant responses  |
| `PH-1.5` ⚙ | `1.3`        | 0.5 | Auto-link on verified email      |
| `PH-1.6` ⚙ | `1.3`        | 1.0 | OTP works; flag disables cleanly |

### Week 2 — Permissions · 7.0 d

| Task      | Depends        | Est | Output                              |
| --------- | -------------- | --: | ----------------------------------- |
| `PH-1.7`  | `1.1`          | 0.5 | Migration applied                   |
| `PH-1.8`  | `1.7`          | 1.0 | **174 permissions synced**          |
| `PH-1.9`  | `1.8`          | 1.0 | Same rules on both sides            |
| `PH-1.10` | `1.9`          | 1.0 | **A forgotten `where` cannot leak** |
| `PH-1.11` | `1.9`          | 1.0 | Reason codes from the fixed enum    |
| `PH-1.12` | `1.10`         | 1.0 | Matrix green                        |
| `PH-1.13` | `1.11`, `0.26` | 1.5 | Full replacement semantics          |

### Week 3 — Entitlements & Products · 6.0 d

| Task      | Depends        | Est | Output                             |
| --------- | -------------- | --: | ---------------------------------- |
| `PH-1.14` | `1.1`          | 0.5 | Hot lookup index in place          |
| `PH-1.15` | `1.14`         | 1.5 | **p95 < 20 ms** — and `SB-39`      |
| `PH-1.16` | `1.15`         | 1.0 | Concurrent requests cannot overrun |
| `PH-1.17` | `1.14`         | 0.5 | Migration applied                  |
| `PH-1.18` | `1.17`, `1.13` | 1.5 | New offer in < 15 min (`MET-05`)   |
| `PH-1.19` | `1.17`         | 1.0 | Specific reason on an invalid code |

### Week 4 — Payments · 5.0 d

| Task        | Depends        | Est | Output                             |
| ----------- | -------------- | --: | ---------------------------------- |
| `PH-1.20`   | `1.17`         | 1.0 | Migration applied                  |
| `PH-1.21`   | `1.20`         | 0.5 | Two implementations stubbed        |
| `PH-1.22` ⚙ | `1.21`         | 1.5 | Real payment grants an entitlement |
| `PH-1.23` ⚙ | `1.22`         | 1.0 | Duplicate events → **one** grant   |
| `PH-1.24`   | `1.22`, `0.27` | 1.0 | Routes into lesson 1 on success    |
| `PH-1.25` ⚙ | `1.20`         | 1.0 | Sequential numbers, stored on R2   |

### Week 5 — Local Payments & Lifecycle · 8.0 d

| Task        | Depends        | Est | Output                                      |
| ----------- | -------------- | --: | ------------------------------------------- |
| `PH-1.26` ⚙ | `1.21`         | 1.5 | Real EGP payment succeeds — **`SB-40`**     |
| `PH-1.27` ⚙ | `1.26`         | 1.0 | Payment hours later still grants            |
| `PH-1.28` ⚙ | `1.27`         | 0.5 | **Lost webhook recovered**                  |
| `PH-1.29`   | `1.22`         | 1.5 | Reason-gated remedy works                   |
| `PH-1.30`   | `1.20`, `1.13` | 1.0 | Entitlement revoked, progress **preserved** |
| `PH-1.31`   | `1.4`, `0.26`  | 1.0 | Sections absent when empty                  |
| `PH-1.32`   | `1.15`, `1.13` | 0.5 | Audit-logged                                |

---

## 4. What is blocked on you, and when

### A. Before `PH-1.1` — five items already carrying "before Phase 1" dates

**These are not new asks. They are Phase 0 debt whose due date has now arrived.**

| Item         | Action                                                              | Gates                                                                                                     |
| ------------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **`SB-33`**  | Rotate the Postgres and Redis credentials                           | **`PH-1.1`** — the trigger was "the first migration that creates a table", and `PH-1.1` is that migration |
| **`SB-38`**  | Split the R2 token: read-only for the API, write/delete for backups | **`PH-1.25`**, ideally before any real data                                                               |
| **`SB-34`**  | Expose `/health` and switch to a keyword monitor                    | Before real users — a silent database failure gets expensive the moment data exists                       |
| **`SB-35`**  | Origin CA certificate + pin TLS to Full (strict)                    | Before real traffic                                                                                       |
| **`PH-0.8`** | Cloudflare Tunnel — closes `SB-22`, implements `BR-1702`            | Deferred **to after Phase 0 exit**, which is now                                                          |

> **Recommended order: `SB-33` immediately before `PH-1.1` and the rest in one session with `PH-0.8`.**
> `SB-33` is genuinely blocking; the other four are "before real users", and Phase 1 has no users
> until its exit. Doing `PH-0.8` first is the higher-value session because it closes the only item
> that is currently a **live** exposure rather than a latent one.

### B. Vendor accounts — five, each with its own lead time

| Vendor            | Needed by | You must supply                                                     | Lead time                     |
| ----------------- | --------- | ------------------------------------------------------------------- | ----------------------------- |
| **Google Cloud**  | `PH-1.5`  | OAuth client ID + secret, consent screen, redirect URIs             | Hours                         |
| **Twilio**        | `PH-1.6`  | Account, Verify service SID, token — **and a budget**               | Hours · **costs per message** |
| **Stripe**        | `PH-1.22` | Test keys now; **business verification for live mode**              | Test: hours · Live: **days**  |
| **Cloudflare R2** | `PH-1.25` | A bucket for invoices, separate from `josam-backups`                | Minutes                       |
| **Paymob**        | `PH-1.26` | Sandbox credentials now; **commercial registration for activation** | **Weeks — see §5**            |

**Nothing here needs a credential in this repository or in a transcript.** Every one goes into Coolify
as an environment variable, exactly as `PH-0.28`'s did. `BR-1599` keeps each vendor SDK inside
`shared/providers`, so the blast radius of any of them changing is one directory.

---

## 5. Where Paymob activation sits — and why it should start on day one

**`SB-40` is recorded correctly: Phase 1 is not blocked; its final step is.** All 32 tasks can be
built and tested without activation, because Paymob's sandbox issues test credentials without the
commercial registration.

**What activation actually gates is the Phase 1 exit criterion — _real money paid and refunded_.**

| Can be done on sandbox                                       | Needs activation                  |
| ------------------------------------------------------------ | --------------------------------- |
| `PH-1.26` build, `PH-1.27` Fawry, `PH-1.28` reconciliation   | A **real EGP payment** succeeding |
| Every schema, every entitlement, the whole permission matrix | The Phase 1 **exit**              |

### The recommendation, stated rather than asked

> **Start the commercial registration now, in parallel with `PH-1.1`, not at week 5 when `PH-1.26`
> comes up.**

**It is the only item in Phase 1 with a lead time you do not control.** Phase 1 forecasts at ~22
working days. If the registration takes four weeks and is started when `PH-1.26` begins, **the
paperwork becomes the critical path and the built code waits on it.** Started on day one, it almost
certainly completes before the code needs it, and costs nothing but the application.

**A cheaper hedge exists and is worth taking as well:** Stripe's live mode needs business verification
too, but typically days rather than weeks. If Stripe activates first, the Phase 1 exit criterion —
_real money paid and refunded_ — can be met through `PH-1.22` while Paymob is still pending, and
Paymob activation moves to a Phase 2 item without holding the exit. **That keeps the exit criterion
honest rather than redefining it**: real money, really refunded, just not in EGP yet.

### The risk that travels with it — `SB-40`, and it is `BR-1830` at the vendor boundary

**Sandbox webhook payloads sometimes differ from production.** `PH-1.26` must state in its own output
that verification was **against sandbox only**, and name activation as where that assumption is
finally tested. The same applies to `PH-1.27` and to `PH-1.22` in test mode.

> **A payment integration that has only ever seen sandbox traffic is a mechanism reporting healthy
> against inputs it chose for itself.** That is the shape Phase 0 met eleven times. The difference is
> that here the failure mode is a payment that is taken and not granted.

`PH-1.23`'s idempotent pipeline is the structural mitigation — verify, dedupe, enqueue, 200 — because
a duplicate or replayed production event produces one grant regardless. **Build it before trusting any
provider's webhook, not after the first one misbehaves.**

---

## 6. Three things Phase 0 says about how Phase 1 should be built

1. **`PH-1.1` is the highest-leverage defect site in the phase.** Four subtrees hang off it. It is
   also the first non-empty migration, so it retires `SB-39`'s "sized for an empty schema" premise and
   triggers `SB-33`. A migration is not a small task here.

2. **`PH-1.10` and `PH-1.12` are Phase 0's lesson applied to permissions.** _A forgotten `where` cannot
   leak_ and _matrix green_ are both claims that a mechanism enforces something. Phase 0 found eleven
   mechanisms that loaded and enforced nothing. **Both must be proven by deliberate violation before
   they are believed** (`BR-1725`, `BR-1835`) — write the query that forgets its scope, watch it be
   refused, then remove it.

3. **`queue` and `storage` join `/health` at `PH-1.23` and `PH-1.25`.** They are recorded against those
   task IDs in `CLAUDE.md §7`'s amended criterion 11. Registering an indicator in the same task that
   installs the dependency is `SB-16`'s rule, and Phase 0 broke it once already.

---

## 7. What I need from you to begin

1. **Approval of this shape**, or a correction to it.
2. **`SB-33`** — rotate the database and Redis credentials. `PH-1.1` cannot honestly start before it.
3. **A decision on the Paymob registration timing** — my recommendation is §5: start it now.
4. **Whether `PH-0.8` runs first.** It is deferred to "after Phase 0 exit", which is today, and it is
   the only currently-live exposure. My recommendation is yes, before `PH-1.1`.

**Phase 1 does not begin until you say so.**
