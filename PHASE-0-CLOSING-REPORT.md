# Phase 0 — Closing Report

| Field                | Value                                                                       |
| -------------------- | --------------------------------------------------------------------------- |
| **Phase**            | 0 — Foundation                                                              |
| **Position**         | **29 / 30 · 96.7%** — the exit position. 30/30 is not reachable.            |
| **Estimated**        | **27.5 d**                                                                  |
| **Actual**           | **16.90 d** (AI authoring + measured founder execution)                     |
| **Overall ratio**    | **0.615** — and §3 explains why this single number should not be used       |
| **Calendar elapsed** | **3 days** — 2026-07-28 to 2026-07-30 · 55 commits                          |
| **Exit check**       | Run 2026-07-30. `pnpm verify:fitness` → **40 caught, 0 NOT caught**, exit 0 |

---

## 1. Exit criteria — all twelve

| #   | Criterion                                       | Result                                                                      |
| --- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Deploy < 2 min, no build on server              | ✅ **≈5 s** — timed at 5 s, 4 s, 5 s from pushed images                     |
| 2   | Rollback by image tag                           | ✅ both directions; `version` confirmed reading the SHA on a real deploy    |
| 3   | Daily backup → R2, restore-verified             | ✅ `PASSED` into a clean database, migration ledger intact                  |
| 4   | Uptime monitor alerts by push, tested           | ✅ 503 from four locations over 46 s → push + email; **recovery confirmed** |
| 5   | 69 Wave 1 components, every state               | ✅ by roster **gate** — which found 68 and forced the fix                   |
| 6   | Every story passes axe, 2 themes × 2 directions | ✅ 49 stories × 4 combinations, real Chromium, real CSS                     |
| 7   | Fitness functions active — all five categories  | ✅ 40 functions, each proven by deliberate violation                        |
| 8   | `verify:fitness` **re-run** at exit             | ✅ **run today: 40 / 0, exit 0, clean tree** (`BR-1832`)                    |
| 9   | All 20 rows of `12 §19` reconciled              | ✅ **17 active · 3 deferred**, each naming an unstarted task                |
| 10  | A raw hex in a component fails the build        | ✅ fitness case 1                                                           |
| 11  | Health endpoint _(amended)_                     | ✅ `database`, `redis`, `last_backup` — the three that exist                |
| 12  | STATUS.md count _(amended)_                     | ✅ **29 / 30**, with the deferral stated as a decision                      |

**Two criteria were amended during the exit check, both by founder decision, and both recorded as
amendments rather than quietly reinterpreted.** Criterion 11 originally demanded `queue` and `storage`
checks; neither service exists in Phase 0, and reporting on a service that does not exist is `BR-892`'s
exact prohibition. Criterion 12 demanded "28/28", which `PH-0.29` and `PH-0.30` made arithmetically
impossible.

### The reconciliation found two ledger defects, and finding them is the criterion working

Criterion 9 is satisfied **now**. It was not satisfied when the exit check began:

- **Row 15, Core Web Vitals, was orphaned** — recorded against `PH-0.11`, which closed without it. A
  row naming a completed task **reads as scheduled**, which is worse than an empty owner. Re-owned to
  `PH-1.24`. Became the worked example beside `BR-1833`, and produced **`BR-1840`**.
- **Row 20 named a phase, not a task** — "Phase 1", which is precisely what `BR-1833` prohibits.
  Re-owned to `PH-1.10`, whose own output asserts the same property.
- **The score line disagreed with its own table**, claiming three rows deferred that `PH-0.30` had
  activated. It had been written once and never recomputed.

**All three were invisible to reading the summary and visible only by reading the rows.** That is
`BR-1832`'s point generalised: re-run, do not re-read.

---

## 2. Actual vs estimated, per task

### Type A — 24 tasks executed fully in this repository

| Task      | Est |  Act | Ratio | Task      |      Est |       Act |     Ratio |
| --------- | --: | ---: | ----: | --------- | -------: | --------: | --------: |
| `PH-0.1`  | 0.5 | 0.25 |  0.50 | `PH-0.19` |      0.5 |       0.4 |      0.80 |
| `PH-0.2`  | 0.5 | 0.25 |  0.50 | `PH-0.20` |      0.5 |       0.4 |      0.80 |
| `PH-0.3`  | 0.5 | 0.40 |  0.80 | `PH-0.21` |      1.0 |       0.7 |      0.70 |
| `PH-0.4`  | 0.5 | 0.35 |  0.70 | `PH-0.22` |      1.0 |       0.5 |      0.50 |
| `PH-0.5`  | 0.5 | 0.20 |  0.40 | `PH-0.23` |      1.0 |       0.5 |      0.50 |
| `PH-0.6`  | 0.5 | 0.45 |  0.90 | `PH-0.24` |      2.0 |      1.15 |      0.58 |
| `PH-0.12` | 1.0 | 0.40 |  0.40 | `PH-0.25` |      1.5 |       0.8 |      0.53 |
| `PH-0.13` | 1.0 | 0.40 |  0.40 | `PH-0.26` |      1.5 |      0.75 |      0.50 |
| `PH-0.14` | 0.5 | 0.30 |  0.60 | `PH-0.27` |      2.0 |       1.1 |      0.55 |
| `PH-0.15` | 1.0 | 0.40 |  0.40 | `PH-0.29` |      0.5 |      0.45 |      0.90 |
| `PH-0.16` | 1.5 | 0.90 |  0.60 | `PH-0.30` |      1.0 |       1.1 |  **1.10** |
| `PH-0.17` | 1.5 | 0.70 |  0.47 |           |          |           |           |
| `PH-0.18` | 1.0 | 0.50 |  0.50 | **Total** | **23.0** | **13.35** | **0.580** |

**`PH-0.30` is the only Type-A task that overran, and it is the most informative row in the table.**
It was the remedial conformance task — the one that went looking for what the other 23 had missed. It
found a base surface that had never been styled (1.04:1 contrast, 80 stories affected), a roster
short by one component, `--text-muted` never contrast-tested, and four enforcement checks that had no
owning task at all. **Work that checks other work does not get faster from a good spec, because its
input is defects rather than requirements.**

### Type B — 6 tasks, founder-executed, artifact produced here

| Task      |     Est |      Act | Authoring   | Execution                 | Note                            |
| --------- | ------: | -------: | ----------- | ------------------------- | ------------------------------- |
| `PH-0.7`  |     1.0 |     0.30 | 0.30 actual | **not reported**          | Estimate never split            |
| `PH-0.8`  |     0.5 |     0.30 | 0.35 → 0.30 | **not run — deferred**    | Runbook complete                |
| `PH-0.9`  |     0.5 |     0.50 | 0.25 → 0.25 | 0.35 → 0.25 **(partial)** | §7 half-deferred, §8 not run    |
| `PH-0.10` |     1.0 |     1.15 | all of it   | CI executes itself        | **Overran — see §4**            |
| `PH-0.11` |     0.5 |     0.60 | 0.30 → 0.35 | 0.20 → 0.25               | The only clean execution figure |
| `PH-0.28` |     1.0 |     0.70 | 0.65 → 0.70 | **not reported**          | Executed; time never given      |
| **Total** | **4.5** | **3.55** |             |                           | **ratio 0.789**                 |

---

## 3. The estimate ratio, split three ways and deliberately not averaged

> **`DEC-56` and `BR-1802` require this split. Averaging the three produces 0.615, and that number
> describes nothing that will happen again.**

| Population                        | Estimated |    Actual |     Ratio | Data quality              |
| --------------------------------- | --------: | --------: | --------: | ------------------------- |
| **1. Type A** — AI executes       |  **23.0** | **13.35** | **0.580** | 24 points. Solid.         |
| **2. Type B authoring** — AI      |  **2.55** |  **2.75** | **1.078** | 5 points. Usable.         |
| **3. Type B execution** — founder |  **0.20** |  **0.25** |  **1.25** | **1 point. Not a ratio.** |

Population 2 covers `PH-0.8`, `PH-0.9`, `PH-0.10`, `PH-0.11`, `PH-0.28` — every Type-B task with a
split authoring estimate. `PH-0.7`'s 0.30 d of authoring has no split estimate to compare against.

### These three numbers say different things, and the difference is the finding

**AI writing code against a specification runs at ~0.58. AI writing an operational runbook runs at
~1.08 — nearly twice as slow relative to estimate.** That is not noise across five data points, and
the cause is structural: component work has a specification (`12 §20`, 69 named components with
states enumerated). A runbook has no specification. It has a machine whose real state must be
discovered, branch conditions for configurations that might already exist, a recovery path for each
step, and a blast radius on other people's applications. **The `/docs` specification is what makes the
0.58 possible, and it does not extend to operations.**

### Population 3 is one data point and must not be used

Four of six Type-B executions have no reported time. The single figure — `PH-0.11`, 0.20 estimated
against ~2 hours actual — is worse than it looks: **roughly twenty minutes were steps and the rest was
diagnosing six divergences**, three of which were defects in my own runbook. Had it been clean it
would have finished in under half an hour. Had there been ten divergences it would have been four.

**A ratio built on that single point would encode divergence density as though it were a property of
execution.** It is not. `PH-0.9`'s execution came in at 0.25 against 0.35 — but it is a **partial**
task with §7 half-deferred and §8 not run, so it is not comparable either.

> **Recommendation: do not calibrate anything on population 3 until at least four clean executions
> exist.** `PH-0.8` will supply one. Ask for the elapsed time on every future Type-B task, at
> execution — it has been forgotten twice.

---

## 4. What the ratio implies for the remaining 162 tasks

| Population        | Tasks   | Estimated   |
| ----------------- | ------- | ----------- |
| Phase 0 (done)    | 30      | 27.5 d      |
| Phases 1–7        | **162** | **184.5 d** |
| **Whole project** | **192** | **212.0 d** |

**34 weeks is 170 working days, which requires a ratio of 0.92 or better.**

| At ratio                    | Remaining | Weeks (5 d/wk) |
| --------------------------- | --------- | -------------- |
| **0.58** — Type A           | 107 d     | **21 weeks**   |
| **0.615** — Phase 0 overall | 114 d     | **23 weeks**   |
| **0.92** — break-even       | 170 d     | **34 weeks**   |
| **1.00** — no gain          | 184 d     | **37 weeks**   |

### The arithmetic says 34 weeks has room. The arithmetic is answering the wrong question.

**The ratio measures AI authoring throughput. It is not the binding constraint on the calendar.**
Phase 0 consumed **16.9 estimate-days in 3 calendar days**. The unit "day" in this project is an
estimate unit, not a day of the founder's life, and the two have differed by roughly 5.6× so far.
Nothing in the ratio accounts for what actually consumes calendar time:

1. **Vendor and paperwork lead time.** Phase 0 integrated **zero** external vendors. Phase 1
   integrates five — Stripe, Paymob, Fawry, Twilio, Google OAuth. `SB-40` is already the first
   instance: Paymob activation waits on a commercial registration, on someone else's clock. No ratio
   compresses a registration.
2. **Founder execution and decision latency.** Six Type-B tasks in Phase 0; each needed a session of
   the founder's attention, and four never had their time recorded at all.
3. **Content authoring.** `DEC-58` — the founder authors one complete course **during** Phase 2. That
   work is **not in the 41 d** Phase 2 is estimated at, and it is the project's top risk (`RSK-05`).
4. **Phase 0 had no domain.** No data model, no business rules, no permissions, no money. Every Phase-0
   task had an answer written down in `/docs` before it started. Phase 1 opens with a schema, an auth
   flow and a payment integration, where the specification stops being a description of the answer and
   becomes a description of the requirement.

### The honest position

**Nothing observed suggests 34 weeks is unrealistic, and nothing observed confirms it.** The 0.58 is
real and was earned by an unusually complete specification. It will most likely degrade toward the
1.08 seen in operational work as tasks acquire irreducible external uncertainty — and the calendar,
not the ratio, is what 34 weeks is actually a claim about.

**Re-derive this number at the Phase 1 exit, when there are 32 more tasks including five vendor
integrations.** That is the first ratio worth planning on. This one is worth knowing and not worth
betting on.

---

## 5. Divergences

Twenty-two new business rules were written during Phase 0 — **`BR-1820` – `BR-1841`**. Every one
exists because something diverged. The full narrative is in `STATUS.md §4`; this is the index.

### The recurring finding, which the founder named as the most valuable output

**Mechanisms that load, report healthy, and enforce nothing.** Eleven separate instances:

| Where     | The mechanism that was silently dead                                                |
| --------- | ----------------------------------------------------------------------------------- |
| `PH-0.16` | **3 of 17 fitness functions** loaded cleanly and enforced nothing                   |
| `PH-0.17` | Stylelint silently disabling Tailwind                                               |
| `PH-0.21` | Focus-first-error that never moved focus (`SB-19`)                                  |
| `PH-0.7`  | **Hardening silenced its own fail2ban** → `BR-1836`                                 |
| `PH-0.26` | Three navs whose specs asserted `tabindex`, not focus → `BR-1837`                   |
| `PH-0.10` | Prisma generated state absent on a clean clone → `BR-1838`                          |
| `PH-0.10` | `renovate.json` never validated — rejected wholesale by Renovate                    |
| `PH-0.30` | `ioredis` `retryStrategy` latching into permanent error                             |
| `PH-0.28` | `apt-get autoremove` silently deleting `aws` from the backup image                  |
| `PH-0.28` | A rotated R2 token created **read-only** — `pg_dump` passed, only the upload failed |
| `PH-0.9`  | An expected value that would have read a pass as a failure → **`BR-1841`**          |

### Divergences by task — the ones that changed a decision

| Task      | Divergence                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------------- |
| `PH-0.2`  | Root-level `eslint` and `turbo run lint` are **not equivalent** — became `SB-15`, then a CI requirement         |
| `PH-0.6`  | **Prisma 7 uses a driver adapter.** Code-contained, **not behaviour-contained** — 5 items re-verify (`BR-1819`) |
| `PH-0.15` | jsdom 30 crash on `calc(% + px)` — patched upstream, patch guarded by its own spec                              |
| `PH-0.21` | `<label for>` names only **labelable** elements; a `div[role]` gets no accessible name                          |
| `PH-0.24` | Radix roving focus untestable with `user.keyboard()`; a real `<button>` synthesises clicks from Enter/Space     |
| `PH-0.25` | `validateFile` accepted a PE binary renamed `photo.png`; `isIsoDate` accepted 30 February                       |
| `PH-0.27` | `BR-1470` focus return was inert — Radix focuses a Trigger ref that controlled dialogs never have               |
| `PH-0.7`  | `PermitRootLogin no` **broke every deploy on the box for a day**; `sshd` takes the **first** directive value    |
| `PH-0.10` | CI must run lint by **both** paths; `pnpm/action-setup` Node 20 deprecation recorded                            |
| `PH-0.11` | `version` reported `0.0.0` in production all phase; Coolify's pre-deploy hook runs in the **old** container     |
| `PH-0.28` | UptimeRobot offers keyword monitors **only at creation**; two `A` records round-robined behind a `200`          |
| `PH-0.9`  | Coolify's field is under **Resource Limits**, not Advanced; containers are **not** named `josam-*`              |
| `PH-0.30` | The app **had no base surface** — 1.04:1 across 80 stories, masked by `AppShell`                                |

**The six `PH-0.11` divergences and the five `PH-0.28` divergences are recorded in full in their
runbooks' own execution records**, which is where the next person will be standing when they matter.

---

## 6. Technical debt — every item with a revisit date

### Due now or before Phase 1 begins

| ID      | Item                                                                                       | Revisit                                |
| ------- | ------------------------------------------------------------------------------------------ | -------------------------------------- |
| `SB-38` | One R2 token both writes and deletes every dump; the API holds a copy though it only lists | **Before Phase 1 data**                |
| `SB-34` | A degraded `/health` does not alert — the monitor is plain HTTP                            | **Before Phase 1**                     |
| `SB-35` | Certificate expiry unmonitored **+** TLS mode Automatic — dangerous only as a pair         | **Before Phase 1 traffic**             |
| `SB-33` | Database and Redis credentials shared into a transcript                                    | **Before the first Phase 1 migration** |
| `SB-22` | **Coolify dashboard reachable from the internet on port 8000**                             | **`PH-0.8`, after exit**               |

### Due at a named task

| ID      | Item                                                                     | Revisit                                  |
| ------- | ------------------------------------------------------------------------ | ---------------------------------------- |
| `SB-39` | Memory limits applied but **unvalidated** — 198 MiB used against 3,008 M | **`PH-1.15`** (premise expires `PH-1.1`) |
| `SB-40` | Paymob activation gated on paperwork; sandbox ≠ production webhooks      | **Phase 1 exit**                         |
| `SB-19` | Focus-first-error behaviour                                              | First Phase 1 form                       |
| `SB-16` | ESLint replaces rather than merges rule options                          | Any new `no-restricted-syntax` block     |
| `SB-08` | `12 §20.12` says 134 components; a census counts 151                     | **Wave 2**                               |

### Deferred by decision, carried openly

| ID       | Item                                                                    | Revisit            |
| -------- | ----------------------------------------------------------------------- | ------------------ |
| `PH-0.8` | Cloudflare Tunnel — **`BR-1702` UNIMPLEMENTED**, origin IP exposed      | **After exit**     |
| `SB-25`  | 26 pending OS updates, one unappliable — needs a reboot window          | Founder scheduling |
| `SB-17`  | Provider VM snapshots are **not** backup coverage and are never counted | Standing           |
| `SB-24`  | The client database is **out of scope** and not ours to back up         | Standing           |
| `SB-14`  | `13 §9` cites a `§19` that does not exist                               | Documentation pass |
| `SB-03`  | `docs/00-START-HERE.md` referenced but absent                           | Documentation pass |

**30 debt items are tracked in `STATUS.md §8`; 5 are closed.** Nothing was closed by decision without
its reason recorded, and nothing open lacks an owner.

---

## 7. What Phase 0 actually produced

**Working, deployed, and verified:** a two-service application on `josamacademy.com` behind
Cloudflare, deployed in ~5 s from SHA-tagged images with rollback proven both ways; Postgres 16 +
pgvector and Redis 7.4.10, both unpublished; a verified backup — dumped, uploaded, and **restored
into a clean database**; push alerting proven in both directions; 69 Wave-1 components passing axe in
four theme/direction combinations; 863 tests; and **40 fitness functions, every one proven by a
deliberate violation.**

**Deliberately absent:** any product. No accounts, no courses, no payments, no data model beyond one
empty migration. That was the scope.

### The one thing worth carrying into Phase 1 above all others

Phase 0's defining pattern was **enforcement that reports healthy and enforces nothing** — eleven
instances, and every one was found by asking a mechanism to fail rather than by reading it. `BR-1725`,
`BR-1830`, `BR-1832`, `BR-1834`, `BR-1835` and now `BR-1841` all restate one idea from different
angles:

> **A check you have never watched fail is not a check. A check whose expected value you never
> observed from a known-good run is worse than one that is absent.**

Phase 1 adds permissions, money and personal data — three domains where a silently-dead check is not
an inconvenience.

---

## 8. Exit statement

**Phase 0 exits at 29 / 30 with one task deferred by founder decision.**

It does **not** exit complete. `PH-0.8` is outstanding; `BR-1702` is unimplemented; `SB-22` is a live
gap with an owner and a plan. Those are recorded as a decision a person made, and this report is
written so they cannot later be read as things that got finished.

**Every exit criterion is met or explicitly amended, and the amendments are visible in
`CLAUDE.md §7` beside the original text they replaced.**

Phase 1 does not begin until this report is accepted.
