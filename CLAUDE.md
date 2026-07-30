# CLAUDE.md — Operating Protocol · Josam Academy

> **This file is the rules. `STATUS.md` is reality. `/docs` is the specification.**
> Read this file and `STATUS.md` at the start of every session, before anything else.
> Update the task queue in §5 at the end of every task, in the same commit as the work.

| Field               | Value                                     |
| ------------------- | ----------------------------------------- |
| **Repository**      | `josam-academy`                           |
| **Domain**          | `josamacademy.com`                        |
| **Current phase**   | Phase 0 — Foundation                      |
| **Scope authority** | `docs/16-task-breakdown.md`, Phase 0 only |
| **Last updated**    | 2026-07-29                                |
| **Updated after**   | `PH-0.9` — runbook authored (split scope) |

---

## 1. Hard Scope Boundary

- Execute **only** tasks with IDs `PH-0.1` – `PH-0.30` as defined in `docs/16-task-breakdown.md`.
  `PH-0.29` and `PH-0.30` are remedial, added by founder decision after `PH-0.27` and after the
  Phase 0 status report respectively.
- **Never** start a `PH-1.x` or later task, even if it looks trivial, unblocking, or "while we're here".
- **Never** create a database table, an auth flow, a payment concept, a course model, a domain
  entity, or any business logic. Phase 0 has no features. It has infrastructure, tokens, i18n,
  primitives, and the Wave-1 components.
- If a Phase 0 task appears to need something from a later phase — **stop and report**. Do not improvise it.
- **Never** modify anything in `/docs`. If a document is wrong, stop and report it (`BR-1765`).
  The founder corrects the document first, then the task proceeds.
- Phase 1 does not begin until the Phase 0 closing report is delivered and accepted.

---

## 2. Operating Protocol — one task at a time

For every task, in this exact order. **Do not batch tasks.** One task, one verification, one commit, one report.

```
1  READ      the documents in the task's Refs column. Quote the specific rules
             (BR-xxxx) being implemented. Never work from memory.
2  PLAN      state: files to create, files to modify, packages to add, and any
             migration / env var / breaking change.
             WAIT FOR APPROVAL if the task touches more than 10 files
             or adds a new dependency.
3  BUILD     implement. Small, reviewable commits.
4  VERIFY    run: pnpm lint && pnpm typecheck && pnpm test && pnpm build
             plus the task-specific proof listed in the Output column.
             Paste the real terminal output. Never claim success not observed.
             Every new assertion is made to FAIL once before it is trusted
             (BR-1835) — a green test you have never seen red proves nothing.

             THE LOCAL GATE IS NOT THE GATE. A task is not done until CI is
             GREEN ON THE PUSHED COMMIT (BR-1761). The local run and CI diverged
             for FOUR CONSECUTIVE TASKS — PH-1.1 to PH-1.4 — and nothing
             detected it, because "committed and pushed" was being reported as
             though it were verification (BR-1518).

             CI cannot be observed from this environment: there is no `gh`.
             Therefore:
               - NEVER write "committed and pushed" in a way that reads as done.
               - After pushing, the task STOPS and the founder checks CI.
               - If CI is red, the task is NOT done, whatever the local gate said.
             An unobservable check is not a check that passed. It is one nobody
             looked at (BR-1830).

             WHEN A CHECK PASSES LOCALLY AND FAILS IN CI, THE FIRST QUESTION IS
             "what does my machine supply that CI does not" — before reading the
             code, before suspecting the test, before touching the workflow.
             At PH-1.1-1.4 the answer was `apps/api/.env`: dotenv loads INSIDE
             vitest, so those variables never travelled through turbo, which was
             stripping them. The local gate was not lax. It was STRUCTURALLY
             INCAPABLE of observing the failure, and that distinction is the
             finding — a lax gate can be tightened, an incapable one has to be
             changed (BR-1844).
5  RECORD    update STATUS.md — Work Log entry, progress table, current/next
             task, actual vs estimated time, AND **calendar days elapsed**.
             Update the task queue in §5 here.

             CALENDAR DAYS ARE A SEPARATE MEASUREMENT FROM ESTIMATE-DAYS, and
             recording only the second is what made the 34-week question
             unanswerable at Phase 0 exit. Phase 0 spent 16.9 estimate-days
             across 3 CALENDAR days — a 5.6x difference that no estimate ratio
             captures, because "day" in the task table is a unit of estimated
             effort and not a day of the founder's life.
             Every Work Log entry states: `Calendar: <start> -> <end> (N days)`.
             The estimate ratio predicts AI throughput; the calendar ratio is
             what a delivery date is actually a claim about (founder decision,
             2026-07-30).
6  COMMIT    one commit containing code + STATUS.md + CLAUDE.md together (BR-1799).
             Format: <type>(PH-0.x): <what>
7  REPORT    a short block: what exists now, what was verified, what diverged,
             what the founder must do manually before the next task.
```

**Completion rules:**

| Rule      | Meaning                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------- |
| `BR-1761` | A task is done when its **Output** exists and CI is green. Not when the code is written.           |
| `BR-1768` | Never mark a task done based on an AI claim. State what was actually executed.                     |
| `BR-1518` | Reporting success without running build · typecheck · lint · tests is a critical failure of trust. |
| `BR-1803` | If a session ends mid-task, say so explicitly: where it stopped, what remains.                     |
| `BR-1804` | An honest 0% is more useful than a false 40%. Never inflate the progress table.                    |
| `BR-1772` | One task at a time. Parallel half-finished tasks are how solo projects stall.                      |
| `BR-1774` | A task blocked by an unanswered question stops. The question is escalated, not guessed.            |
| `BR-1775` | Tasks are not reordered for interest. Dependency order exists for a reason (`BR-1764`).            |

---

## 3. Task Classification

### Type A — executed fully in this repo (24 tasks)

`PH-0.1` `0.2` `0.3` `0.4` `0.5` `0.6` `0.12` `0.13` `0.14` `0.15` `0.16` `0.17` `0.18` `0.19`
`0.20` `0.21` `0.22` `0.23` `0.24` `0.25` `0.26` `0.27`

Code, config, tests, stories. Full ownership.

### Type B — founder executes; the artifact is produced here (6 tasks)

`PH-0.7` VPS hardening · `PH-0.8` Cloudflare · `PH-0.9` Coolify · `PH-0.10` GitHub Actions ·
`PH-0.11` deploy + rollback · `PH-0.28` backups + monitoring

For these, produce in the repo:

- the committed runbook in `docs/runbooks/` — exact commands, verification checklist, recovery procedure
- the committed scripts — `scripts/backup.sh`, `scripts/restore-verify.sh`, Dockerfiles,
  `.github/workflows/*.yml`, compose overrides
- an explicit **founder checklist**: what must be run manually, and what output proves it worked

> **Note:** `docs/runbooks/` is the one path under `/docs` that this protocol creates.
> It is a new directory of operational artifacts, not a modification of the 16 specification documents.
> The `/docs` freeze in §1 applies to `01` – `16`.

**Never, under any circumstance:**

- attempt to SSH into any server
- request, read, generate, store, or echo any credential, token, key, password, `.env` value, or server IP
- run anything that touches production
- mark a type-B task done before the founder pastes back the verification output

---

## 4. Non-Negotiable Rules

| Rule                | Meaning                                                                                                                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BR-1579`           | `strict: true` everywhere. `any` and `@ts-ignore` fail the build. No exceptions, no `eslint-disable` to get green.                                                                                                                           |
| `BR-1220`           | A raw hex value in a component fails the build. Semantic tokens only (`--accent`, never `--gold`).                                                                                                                                           |
| `BR-1219`           | Component styles reference **purpose**, not appearance.                                                                                                                                                                                      |
| `BR-1342`           | Tailwind palette utilities (`text-gray-500`, `bg-blue-600`) must not exist. Tokens only.                                                                                                                                                     |
| `BR-1528`           | Radix is never exposed to feature code. It sits behind our components.                                                                                                                                                                       |
| `BR-1580`           | Prisma appears only in repositories. Never in a service or controller.                                                                                                                                                                       |
| `BR-1533`           | `packages/tokens` is the single source for color, spacing, type, radius, motion.                                                                                                                                                             |
| `BR-525`            | No hardcoded user-facing strings. Everything through `packages/i18n`. Arabic 6-form plurals.                                                                                                                                                 |
| `BR-1232`           | RTL: logical properties only (`margin-inline-start`, never `margin-left`). Both directions must work.                                                                                                                                        |
| `BR-1569`–`BR-1571` | Every component: a story per variant, per size, per state; renders in 2 themes × 2 directions; passes axe in CI.                                                                                                                             |
| `BR-1725`           | Phase 0 does not end until a deliberate rule violation is confirmed to fail the build. For each fitness function in `PH-0.16`: write the violation, show the failure, then remove it. Untested enforcement is not enforcement.               |
| `BR-1835`           | A test that passes on its **first** run is not yet evidence. Break the input or break the code, confirm it fails for the reason it claims, then trust it. `BR-1725` says this of enforcement mechanisms; it applies to assertions generally. |
| `BR-1834`           | A tool with `--fix` authority is itself a source of defects. Assert an autofixer's **output**, never its configuration. Look for rewrites that stay syntactically valid and semantically dead.                                               |
| `BR-1524`           | Feature code imports from `@josam/ui` only. A native form control in a feature file fails the build.                                                                                                                                         |
| `BR-1591`           | Dependencies pinned to exact versions. No ranges (`DEC-46`).                                                                                                                                                                                 |
| `BR-1599`           | No vendor SDK imported outside `shared/providers`.                                                                                                                                                                                           |

### Estimating a task — the 0.58 / 1.08 split (`BR-1802`, `DEC-56`)

**Phase 0 measured two different ratios, and using the wrong one is a planning error, not a
rounding error.**

| Work                                                                     | Ratio    | Estimate against |
| ------------------------------------------------------------------------ | -------- | ---------------- |
| Code written against a `/docs` specification                             | **0.58** | 0.58             |
| Runbooks, server work, vendor integration, anything the founder executes | **1.08** | **1.08**         |

**The cause is structural, not incidental.** Component work had `12 §20` — 69 named components with
states enumerated before a line was written. A runbook has no specification: it has a machine whose
real state must be discovered, a branch for every configuration that might already exist, a recovery
path per step, and a blast radius on other people's applications. **`/docs` is what makes 0.58
possible, and `/docs` stops at the edge of this repository.**

Binding, from Phase 1 onward:

1. **Every task that touches the server, an external vendor, or founder execution is estimated at
   1.08**, not 0.58. Type is not the test — a Type-A task calling a vendor API is operational work.
2. **When a phase is mostly operational, say so at the START of the phase**, in the phase plan, with
   the count. Discovering the mix in a closing report is discovering it too late to act on.
3. **Founder execution time is asked for at execution and recorded.** It was forgotten twice in Phase
   0 (`PH-0.7`, `PH-0.28`), which is why that population has one usable data point instead of four.

### Prohibited fixes (`BR-1512`)

Silencing a lint rule · loosening a type · `!important` · magic pixel offsets · `setTimeout` to
dodge a race · disabling a test · `overflow: hidden` to hide overflow · `z-index: 9999` ·
empty `try/catch` · blanket optional chaining · `@ts-ignore`.

> **If you reach for one of these, the design is wrong — stop and report.**

---

## 5. Phase 0 Task Queue — live status

**Legend:** ⬜ not started · 🟡 in progress · ✅ done (Output exists + verified) · 🔴 blocked
**Type:** A = executed here · B = founder-executed, artifact produced here

| ID        | Task                                                                                                                                                                                                                    | Type | Depends        | Est | Status | Actual | Output (proof required)                                |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--: | -------------- | --: | :----: | -----: | ------------------------------------------------------ |
| `PH-0.1`  | Initialize monorepo: pnpm workspaces, Turborepo, base `tsconfig`                                                                                                                                                        |  A   | —              | 0.5 |   ✅   |   0.25 | `pnpm build` → 5 successful, 5 total                   |
| `PH-0.2`  | Shared config package: ESLint flat config, Stylelint, Prettier                                                                                                                                                          |  A   | `0.1`          | 0.5 |   ✅   |   0.25 | `pnpm lint` → 6 successful, 6 total (6/6 ws)           |
| `PH-0.3`  | Scaffold `apps/api` (NestJS) with health endpoint                                                                                                                                                                       |  A   | `0.1`          | 0.5 |   ✅   |    0.4 | `GET /health` → 200 + DI probe passes                  |
| `PH-0.4`  | Scaffold `apps/web` (Next.js 16, App Router, route groups)                                                                                                                                                              |  A   | `0.1`          | 0.5 |   ✅   |   0.35 | 5 route groups render 200; 4-part probe passed         |
| `PH-0.5`  | Docker Compose: Postgres 16 + pgvector, Redis 7, MailHog                                                                                                                                                                |  A   | `0.1`          | 0.5 |   ✅   |    0.2 | Stack healthy; 127.0.0.1-only proven                   |
| `PH-0.6`  | Prisma init, connection, first empty migration                                                                                                                                                                          |  A   | `0.5`          | 0.5 |   ✅   |   0.45 | `pnpm db:migrate` succeeds — empty migration applied   |
| `PH-0.7`  | **VPS hardening**: SSH keys, disable root, fail2ban, ufw, unattended-upgrades                                                                                                                                           |  B   | —              |   1 |   ✅   |    0.3 | Executed; output pasted back; port 8000 open           |
| `PH-0.9`  | **Coolify already installed** — verify, rotate admin credential, unbind from 0.0.0.0, firewall it, apply `08 §11.1` memory limits                                                                                       |  B   | `0.7`          | 0.5 |   ✅   |    0.5 | 5/5 restarts=0 oom=false; §7/§8 → `PH-0.8`             |
| `PH-0.10` | GitHub Actions: lint → typecheck → test → build → push to ghcr.io                                                                                                                                                       |  B   | `0.2`          |   1 |   ✅   |   1.15 | Run #3 green; both images pullable by SHA tag          |
| `PH-0.11` | Coolify deploy from registry + rollback by tag verification                                                                                                                                                             |  B   | `0.9`, `0.10`  | 0.5 |   ✅   |    0.6 | Deploy 5s; rollback both ways; 6 divergences (2h exec) |
| `PH-0.12` | `packages/tokens`: both themes → CSS vars + RN constants                                                                                                                                                                |  A   | `0.1`          |   1 |   ✅   |    0.4 | Tokens in web bundle; 40 specs incl. contrast          |
| `PH-0.13` | `packages/i18n`: AR/EN catalogs, 6-form Arabic plurals, locale utils                                                                                                                                                    |  A   | `0.1`          |   1 |   ✅   |    0.4 | 48 specs; all six AR forms proven reachable            |
| `PH-0.14` | Tailwind 4 bound to tokens; no palette utilities available                                                                                                                                                              |  A   | `0.12`         | 0.5 |   ✅   |    0.3 | 7 prohibited classes emit no rule (verified)           |
| `PH-0.15` | Storybook with theme + direction toolbars, axe addon                                                                                                                                                                    |  A   | `0.12`         |   1 |   ✅   |    0.4 | 4 combinations + axe proven to fail on demand          |
| `PH-0.16` | **Fitness functions**: boundaries, dependency-cruiser, custom lint rules                                                                                                                                                |  A   | `0.2`          | 1.5 |   ✅   |    0.9 | 17 deliberate violations, 17 caught, 0 missed          |
| `PH-0.17` | Primitives: `Text` `Heading` `Stack` `Inline` `Grid` `Box` `Icon` `Surface`                                                                                                                                             |  A   | `0.14`, `0.15` | 1.5 |   ✅   |    0.7 | Off-scale → TS2322; verify:fitness 21/21               |
| `PH-0.18` | Architectural: `T` `Bidi` `Money` `Num` `Percent` `Duration` `When` `CopyableId`                                                                                                                                        |  A   | `0.13`, `0.17` |   1 |   ✅   |    0.5 | Bilingual fallback + bdi isolation, 110 specs          |
| `PH-0.19` | Structured logging (Pino) with correlation IDs; Sentry wiring                                                                                                                                                           |  A   | `0.3`          | 0.5 |   ✅   |    0.4 | Request traced end to end — id in log + body           |
| `PH-0.20` | `Button` `IconButton` all variants and states                                                                                                                                                                           |  A   | `0.17`         | 0.5 |   ✅   |    0.4 | 5 states; disabled-without-reason is TS2322            |
| `PH-0.21` | `Form` + `FormField` (label, hint, required, error, ARIA)                                                                                                                                                               |  A   | `0.17`         |   1 |   ✅   |    0.7 | Focus + dirty asserted against a real DOM              |
| `PH-0.22` | Text fields: `TextField` `TextArea` `PasswordField` `NumberField` `CurrencyField` `CodeField`                                                                                                                           |  A   | `0.21`         |   1 |   ✅   |    0.5 | 29 specs on submitted values, not on props             |
| `PH-0.23` | Identity fields: `PhoneField` `EmailField` `OTPField`                                                                                                                                                                   |  A   | `0.21`         |   1 |   ✅   |    0.5 | LTR survives RTL doc; paste fills all six              |
| `PH-0.24` | Choice fields: `Select` `Combobox` `MultiSelect` `RadioGroup` `RadioCard` `Checkbox` `Switch` `Slider` `TagsInput` `RatingInput`                                                                                        |  A   | `0.21`         |   2 |   ✅   |   1.15 | 10 components; 28/28 fitness; jsdom patched            |
| `PH-0.25` | Time/file fields: `DatePicker` `DurationField` `TimestampField` `FileDrop` `ImageDrop`                                                                                                                                  |  A   | `0.21`         | 1.5 |   ✅   |    0.8 | RTL calendar proven 4 ways; MIME sniffed               |
| `PH-0.26` | Layout & nav: `AppShell` `TopBar` `SideNav` `BottomNav` `PageHeader` `PageFooter` `Breadcrumb` `Tabs` `SkipLink`                                                                                                        |  A   | `0.17`         | 1.5 |   ✅   |   0.75 | 2 primary actions = TS2322 (case 29)                   |
| `PH-0.27` | Feedback: `Toast` `InlineAlert` `Dialog` `ConfirmDialog` `Drawer` `Popover` `Tooltip` `DropdownMenu` `Skeleton` `ProgressBar` `ProgressRing` `EmptyState` `ErrorState` `OfflineBanner` `ReadOnlyBanner` `QueryBoundary` |  A   | `0.17`         |   2 |   ✅   |    1.1 | 3 states required = TS2741 (case 31)                   |
| `PH-0.28` | **Backups + monitoring**: daily `pg_dump` → R2, weekly restore verify, UptimeRobot, push alerts                                                                                                                         |  B   | `0.9`          |   1 |   ✅   |    0.7 | Restore VERIFIED from a clean DB; alert push proven    |
| `PH-0.29` | **`BR-1544` conformance** — `readOnly`/`disabled` distinct on all 24 fields, `disabled` carrying a reason, plus a fitness function                                                                                      |  A   | `0.27`         | 0.5 |   ✅   |   0.45 | Bare `disabled?: boolean` fails lint (case 33)         |
| `PH-0.30` | **Phase 0 conformance closure** — criterion 6 in a real browser, roster gate, the four unowned checks, Redis health indicator                                                                                           |  A   | `0.27`, `0.10` |   1 |   ✅   |    1.1 | 40/40 fitness; 49 stories × 4 combos green             |
| `PH-0.8`  | **DEFERRED to after Phase 0 exit** — Cloudflare Tunnel, origin firewall rules. Runbook already authored: `docs/runbooks/cloudflare-tunnel.md`                                                                           |  B   | `0.7`          | 0.5 |   ⏸️   |    0.3 | Deferred by founder decision. `SB-22` stays OPEN       |

**Progress: 29 / 30 · 96.7%** — the exit position. `PH-0.8` is deferred by founder decision and 30/30
is not reachable.

**Estimated total 27.5 d · actual 16.90 d · ratio 0.615.** Both header figures were wrong until
2026-07-30: the estimate read 20.5 d (the Est column sums to 27.5) and the actual read 16.65 d. A
summary that is not recomputed from its own table drifts — the same defect as `12 §19`'s score line,
and the second instance in this file.

> **The Redis health indicator is registered in the same task that installs `ioredis` — never
> "later" (`SB-16`).** `11 §API-21` lists `redis` among the `GET /health` checks. `PH-0.6` built
> the pattern: an indicator registers itself with `HealthService` on module init, so this is a few
> lines. A `/health` that reports `status: ok` while silently omitting a dependency the founder
> believes is being watched is worse than one that never claimed to check it (`BR-892`).

> **`PH-0.10` is done — run #3 green, both images pullable by SHA tag** (`BR-1761`).
> Run #2 failed on `BR-1838`: `prisma generate` writes a gitignored directory that had existed
> locally since `PH-0.6`, so `pnpm lint` passed on the development machine and **could not have
> caught it at any point**. Fixed as `postinstall`, not a CI step — a CI-only fix repairs CI and
> leaves a clean clone broken, which is the divergence that caused it.
>
> **Renovate is installed.** Its first act was to reject `renovate.json` — `_comment` keys, which
> Renovate rejects rather than ignores, so it opened an issue and no PRs. Rewritten with
> `description` (a real option, and one that reaches the PR body), validated by
> `pnpm check:renovate` in CI, and proven by fitness case 37. Same shape as `BR-1838`: a config
> that has never been validated is not a config that works.

> **`PH-0.10` runs `pnpm verify:fitness` in CI** (`BR-1831`) — done. The deliberate-violation suite
> is what makes the 17 fitness functions trustworthy, and three of them were _silently dead_ when
> written — loading cleanly and enforcing nothing. A proof that only re-runs when somebody
> remembers is not a safety net. It runs on every push, next to lint.

> **`PH-0.10` must run lint by BOTH paths — `turbo run lint` _and_ a single root-level
> `eslint` invocation over changed files, the way the pre-commit hook does.** They are not
> equivalent: turbo runs `eslint .` inside each workspace (one TSConfig root), the hook runs it
> once from the repository root across every workspace. The second path caught a real parser
> defect at `PH-0.2` that the first structurally cannot see. A CI that only runs turbo goes green
> on code the hook rejects, and the bug resurfaces in a pull request instead of locally.

> **`PH-1.1` – `PH-1.4` are DONE — CI run #28, `cbbe6ef`, green in 10m 15s, 947 tests across 10
> tasks, both images published by SHA tag.** Confirmed by the founder reading the run, not asserted
> here (`BR-1761`).
>
> They were reported complete four tasks earlier, while CI was RED for all four. The last green
> before the fix was `4097f46`, docs-only. **Four tasks were closed on evidence that never
> existed** — `BR-1761` and `BR-1518`. The code was in fact correct; that is luck, not process.
>
> **Root cause: `turbo.json` declared no `env` keys.** Turbo 2 runs tasks in strict env mode, so a
> task receives ONLY the variables declared for it; undeclared ones are filtered out entirely,
> not merely excluded from the cache key. `DATABASE_URL`, `REDIS_URL` and `JWT_SECRET` never
> reached the test process.
>
> **Why it was invisible locally.** `apps/api/.env` exists and `vitest.setup.ts` loads
> `dotenv/config`, so those values arrive INSIDE the vitest process from the file and never pass
> through turbo at all. CI has no `.env`, so the same suites read the process environment — where
> turbo had already removed them. The local gate could not have caught this at any point, which is
> the same shape as `BR-1838`.
>
> Fixed in `turbo.json` (`env` declared on `test`) and in the workflow (a Redis service, job-level
> env, and a preflight that fails naming the missing variable). Verified by reproducing CI locally:
> `.env` moved aside, variables supplied through the process environment, `--force` to defeat the
> cache — **947 tests, 10/10 tasks green**. They stay NOT DONE until CI itself is green.

> **`PH-0.9` is EXECUTED and 🟡 PARTIAL — the limits half only, and it is not done.** Three things
> outstanding, none of them "it mostly worked": **§6.5**, the next-day `restarts=0` / `oom=false`
> check, which is what actually blocks completion; **§7**, the admin credential rotation and the
> other-admin/token/2FA sweep, deferred by founder decision into `PH-0.8`'s session because that is
> when the dashboard stops being internet-reachable anyway; and **§8**, never run. Open registration
> was confirmed **OFF** — a real finding, and the only §7 control currently standing.
>
> **The limits are applied and unvalidated, which is not the same as verified.** Josam was using
> ~198 MiB against 3,008 M allocated — fifteen times headroom — so nothing approached a ceiling. The
> client + Coolify total measured **1,650 MiB**, below the assumed 1,800, so the recalculated table was
> applied with no adjustment. The sizing is first genuinely exercised when Phase 1 puts real data
> behind it; `josam-postgres` at 1 G with `shared_buffers` 256 MB is sized for an empty schema and is
> the one to re-examine then (`SB-39`).
>
> **The runbook's expected heap value was wrong in the dangerous direction and is corrected.** It said
> expect ≈ 512; the process reports **560**, because `--max-old-space-size` sizes the old generation
> while `heap_size_limit` adds the young generation on top. A runbook expecting the flag value **reads
> a pass as a failure**, and the repair a person then reaches for — raising the flag until the numbers
> match — pushes the heap ceiling above the container limit and breaks `BR-879` outright. The
> assertion is the **inequality** `flag < heap_size_limit < container limit`, never an equality.
>
> Two smaller corrections from execution: the field is under **Resource Limits → Maximum Memory
> Limit**, not Advanced; and every `docker` command needs `sudo`, because `josam` is in `sudo` but
> deliberately not in the root-equivalent `docker` group (`PH-0.7`).

> **`PH-0.9`'s original scope was DELIBERATELY SPLIT, and it completes at 🟡 partial — never ✅.**
> Memory limits (`SB-23`, recalculated against measured client usage rather than `08 §11.1`'s
> whole-box table) and the admin credential rotation are actionable now. **Unbinding the dashboard
> from `0.0.0.0` and closing port 8000 are recorded against `PH-0.8`, not against `PH-0.9`** — doing
> them without the tunnel removes the founder's clients' path to their own control panel with nothing
> replacing it. `PH-0.9` is about to close, and a closed task cannot own an outstanding check
> (`BR-1833`, `BR-1840`).
>
> The seed runbook's OOM reasoning was **wrong and is corrected in place**: declaring a limit does not
> raise a container's global `oom_badness`. We are still the ones killed, but because a limited
> container has a **second, private kill path** — its own cgroup ceiling — that unlimited neighbours
> do not. The conclusion survived; the mechanism did not. It matters because under the old reasoning
> generous sizing would not have helped, and under the real one it is the entire mitigation.

> **`PH-0.28` is authored and locally exercised as far as it can be without the founder's R2
> credentials.** `scripts/backup.sh` dumps the real database and passes its size and `PGDMP` format
> checks; both scripts refuse to run with a missing variable, naming it; `infra/backup/Dockerfile`
> builds and **asserts its own toolchain**, which is what caught `apt-get autoremove` silently
> removing `aws` while leaving `pg_dump` in place. The `last_backup` indicator has 31 specs including
> three that prove it **cannot latch** — `PH-0.30`'s failure, not repeated.

> **`PH-0.11` is done — deploy 5 s, rollback proven both directions.** Criteria 1 and 2 are met.
> **Criterion 2's proof rests on image-tag inspection, not the `version` field**, because that field
> reported a constant `0.0.0` in production for the whole of Phase 0 — the health service read
> `npm_package_version`, which is undefined outside a pnpm-launched process. Fixed, with specs that
> fail on the old code; **not yet reconfirmed by a deploy of two different SHAs.**
>
> **Migrations moved out of Coolify's pre-deployment hook and into the API image's start command.**
> The hook runs `docker exec` in the **old** container, so it skipped entirely on a first deploy and
> made migration capability depend on the version being replaced. Coolify's pre-deployment field is
> now **empty and must stay empty**.
>
> **`PermitRootLogin no` broke every deploy on the box, including the client projects, for a day.**
> Coolify deploys over SSH as root; the correct value here is `prohibit-password`. `PH-0.7`'s
> runbook is corrected, along with the `docker` group and the Docker-network `ufw` rules — and
> `sshd` takes the **first** value for a directive, so a later drop-in does not override an earlier
> one.

> **`PH-0.8` is DEFERRED by founder decision (2026-07-29), not cancelled and not deprioritised
> permanently.** It is scheduled for **after Phase 0 exit**. Its runbook is already written and
> committed (`docs/runbooks/cloudflare-tunnel.md`), so resuming it costs execution time only.
>
> Consequences, which are recorded rather than softened:
>
> - **`SB-22` stays OPEN** — the Coolify dashboard is reachable from the internet on port 8000. A
>   known live gap with an owner. Not closed, not accepted.
> - **`BR-1702` is UNIMPLEMENTED** — the origin IP is exposed and the origin firewall does not
>   restrict HTTP to Cloudflare ranges.
> - Any exit criterion depending on either reads **"not met — deferred"**. Never "pending", never
>   "passing".

> **Wave 1 is complete — 69 / 69 components, `12 §20.12.1`.** 8 primitives · 8 architectural ·
> 2 controls · 2 form · 24 fields · 9 layout/navigation · 16 feedback. All 22 Type-A tasks are
> done. What remains in Phase 0 is the five founder-gated infrastructure tasks — `PH-0.8`, `0.9`,
> `0.10`, `0.11`, `0.28` — plus the exit criteria in §7, which include **re-running**
> `pnpm verify:fitness` (40 cases) rather than re-reading this line (`BR-1832`).

> **Estimate-ratio caution (`DEC-56`, `BR-1802`).** `PH-0.1` came in at half its estimate, but it
> is a Type-A task executed by AI with every version already resolved by the pre-`PH-0.1` pass.
> One data point, and the least representative kind. Do not recalibrate anything on it — the ratio
> only becomes meaningful once type-B tasks and the component tasks have real numbers against them.

> **Three things from `PH-0.24` bind the remaining component tasks.**
>
> 1. **`<label for>` names only _labelable_ elements** — `input`, `select`, `textarea`, `button`,
>    `meter`, `output`, `progress`. A `div` or `span` carrying a `role` gets **no accessible name**
>    from it, and the markup looks entirely correct. Any control whose focusable element is not
>    labelable must take `labelledBy` from `useFormField()` and set `aria-labelledby`. This caught
>    `Slider` only because axe runs per component; it is invisible to review. `PH-0.25`'s
>    `FileDrop`/`ImageDrop` and much of `PH-0.27` are the same shape.
>
> 2. **Radix roving focus cannot be tested with `user.keyboard('{ArrowDown}')`.** Radix defers the
>    focus move into a `setTimeout` so it lands after the key event reaches `document`, where its
>    "arrow key is down" flag lives. userEvent fires keydown and keyup back to back, so the flag is
>    already cleared: focus moves, selection does not follow, and a correct component looks broken.
>    Use the `pressArrow()` helper (press, tick, release). Raising userEvent's `delay` does not
>    work — it sits between keystrokes, not within one. `PH-0.26`'s `Tabs` and `SideNav` need this.
>
> 3. **Assert the EFFECT, not the marker** — now `BR-1837` in `12 §19.1`, which is the record;
>    this is the reminder. `PH-0.26` shipped three navs whose arrow keys moved
>    the roving `tabIndex` and left focus behind — visibly doing nothing — and the specs passed,
>    because they asserted which element carried `tabindex="0"`. `tabindex` is the marker;
>    `document.activeElement` is the effect. Same shape as `PH-0.21`'s inert focus-first-error
>    (`SB-19`). Whenever a test can assert either, assert the one a user would notice.
>
> 4. **A real `<button>` synthesises a click from `Enter` and `Space`.** A keydown handler that
>    also toggles state runs twice and nets to nothing — inert to a keyboard, perfect with a mouse.
>    `preventDefault()` on both keys, and test every control by keyboard alone; the pointer tests
>    passed throughout on the broken `MultiSelect`.

---

## 6. Execution Order

Dependency-resolved. `PH-0.16` deliberately precedes every component task — building 69
components without the enforcement active means 69 components to re-audit.

```
Local foundation      0.1 → 0.2 → 0.3 → 0.4 → 0.5 → 0.6 → 0.19
Design system base    0.12 → 0.13 → 0.14 → 0.15 → 0.16
Primitives            0.17 → 0.18
Components            0.20 → 0.21 → 0.22 → 0.23 → 0.24 → 0.25 → 0.26 → 0.27
Infra (type B)        0.7 → 0.8 → 0.9 → 0.10 → 0.11 → 0.28   (founder-gated, parallel)
```

---

## 7. Phase 0 Exit Criteria

Phase 0 is not done until **all** of these are true and evidenced.

```
☐ Push to main deploys to production in under 2 minutes, no build on the server
☐ Rollback by image tag verified working
☐ Daily backup runs, uploads to R2, and restore-verifies from a clean database
☐ Uptime monitor alerts by push when the server is stopped (tested, not configured)
☐ All 69 Wave 1 components in Storybook, every state (roster: 12 §20.12.1)
☐ Every story passes axe in both themes and both directions
☐ Fitness functions active: boundaries · tokens · logical properties
    · hardcoded strings · prohibited copy terms
☐ `pnpm verify:fitness` (44 cases) RE-RUN at exit — not re-read — and every case still caught
    (`BR-1832`). The recorded table in STATUS.md §4 is evidence of a past run, never
    a substitute for a present one (`BR-1768`).
☐ All 20 checks in `12 §19` reconciled: active, or recorded against the task that
    activates them (`BR-1833`). The count is 20, not "the ones switched on".
☐ A raw hex color in a component fails the build (verified by deliberate violation)
☐ Health endpoint reports database, Redis, last backup — the three dependencies that EXIST.
    AMENDED 2026-07-30. The original read "database, Redis, queue, storage, last backup".
    Phase 0 has no queue and no object storage, and a health check reporting on a service that
    does not exist is `BR-892`'s exact prohibition — it is the failure the check is for.
    `queue` is recorded against `PH-1.23`, the first task that enqueues.
    `storage` is recorded against `PH-1.25`, the first task that stores an object on R2.
    Both named by task ID, and both NOT STARTED (`BR-1840`).
☐ STATUS.md shows 29 / 30 with honest actual-vs-estimate times per task.
    AMENDED 2026-07-30. The original read "28/28", which `PH-0.29` and `PH-0.30` made
    arithmetically impossible — there are 30 tasks.
    **29 / 30 is the exit position, and 30 / 30 is not reachable.** `PH-0.8` is DEFERRED by
    founder decision to after Phase 0 exit. Consequently, and stated here so it can never be
    read as finished:
      · `BR-1702` is NOT MET — the origin IP is exposed, no origin firewall restricts HTTP
        to Cloudflare ranges.
      · `SB-22` is OPEN — the Coolify dashboard is reachable from the internet on port 8000.
      · `PH-0.9`'s unbind-and-firewall half is recorded against `PH-0.8`, NOT against `PH-0.9`.
    Phase 0 exits with a known live gap that a person decided to accept for now.
    It does NOT exit complete. Any summary that reads "Phase 0 done, everything green"
    is wrong, and this line exists to make that wrongness visible.
```

When all boxes are true, produce the **Phase 0 closing report**: actual vs estimated days per
task, the estimate ratio, what the ratio implies for the remaining 163 tasks (`DEC-56`,
`BR-1802`), every divergence recorded, and every item of technical debt with a revisit date.
Then **stop**. Do not begin Phase 1.

---

## 8. Open Items Raised at Step 0

Recorded here and in `STATUS.md §5` / `§7`. These are founder decisions, not AI decisions.

| ID      | Item                                                                                                                                                                                                                                                                                                                                                   | Blocks                      | Status                                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `SB-01` | ~~Repository is not a git repository.~~ `git init -b main` ran at `PH-0.1`; the repo exists locally and the first commit landed. The **GitHub remote** is founder work (credentials) and is still required before `PH-0.10`.                                                                                                                           | `PH-0.10`                   | 🟡 **Half-closed** — local done, remote outstanding                                                                   |
| `SB-02` | Node runtime: `13 §2` said Node 22 LTS; pinned to **Node 24 LTS / 24.18.0**.                                                                                                                                                                                                                                                                           | —                           | ✅ **Resolved** — `13 §2` corrected, `13 §18` appendix added, logged in `STATUS.md §7`.                               |
| `SB-03` | `docs/00-START-HERE.md` is referenced by `STATUS.md §12` but does not exist.                                                                                                                                                                                                                                                                           | Nothing — informational     | 🟡 Open                                                                                                               |
| `SB-04` | Wave-1 component count 62 vs 69.                                                                                                                                                                                                                                                                                                                       | —                           | ✅ **Resolved** — Wave 1 = **69**. `12 §20.12.1` roster, `§20.12.2` reassignments, counts corrected in `12` and `15`. |
| `SB-05` | ~~`PH-0.7` runbook missing from `docs/runbooks/`.~~ **Closed by founder decision 2026-07-29: stop waiting for the file — `PH-0.7` is authored from `14 §12` directly.**                                                                                                                                                                                | Nothing                     | ✅ **Closed**                                                                                                         |
| `SB-06` | TypeScript pinned to **6.0.3**, not the newer 7.0.2, because `typescript-eslint` caps at `<6.1.0` and TS 7 would silently disable type-aware linting (`BR-1579`).                                                                                                                                                                                      | —                           | ✅ **Resolved** — `BR-1805`, `BR-1806`.                                                                               |
| `SB-07` | ~~**Next.js major.**~~ **Pre-authorised 2026-07-29: `PH-0.4` adopts Next 16 and corrects `13 §4` + the `PH-0.4` row, gated on the four-part probe — route groups render · ISR works · Tailwind 4 binds · Storybook 10 + a11y addon runs. If any fails, hold at 15.x, log it, continue (`BR-1809`).**                                                   | Nothing                     | ✅ **Resolved — execute at `PH-0.4`**                                                                                 |
| `SB-08` | `12 §20.12` states **134** total components; a full `§20` census enumerates **151**. Wave 2/3 counts unrecounted (`BR-1813`).                                                                                                                                                                                                                          | Wave 2                      | 🟡 Open                                                                                                               |
| `SB-13` | `09 §9`'s monorepo tree omits **`packages/ui`**, though `12 §20` mandates it (`BR-1524` — feature code imports from `@josam/ui` only; `BR-1575` — it depends on no app). Created at `PH-0.1` on the authority of `12`. `09 §9` also still lists `contracts` and `abilities`, correctly deferred to `PH-1.8`/`PH-1.9`. `09 §9` needs a correction pass. | Nothing — `12` governs      | ✅ **Resolved** — `09 §9` corrected 2026-07-28                                                                        |
| `SB-14` | `13 §9` cites "custom rules (`§19`)" but `13` has no `§19` — it ends at `§18`. Dangling cross-reference, same class as `SB-11`. Custom lint rules are `PH-0.16`, which carries its own Refs, so nothing is lost.                                                                                                                                       | Nothing — `PH-0.16` governs | 🟡 Open — needs a target section or the citation removed                                                              |
| `OQ-24` | Renovate auto-merge policy for patch updates (`13 §16`). Needed during `PH-0.10`.                                                                                                                                                                                                                                                                      | `PH-0.10`                   | 🟡 Open                                                                                                               |

### Server facts (founder-supplied 2026-07-29 — binding on `PH-0.7` – `PH-0.11`, `PH-0.28`)

| Fact                                                                                                                                                                                                                    | Consequence                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ubuntu 24.04 · 2 vCPU · 8 GB · 100 GB · Frankfurt                                                                                                                                                                       | Matches `08 §11`'s assumption exactly. **No capacity divergence** — the memory budget in `08 §11.1` stands as written.                                                                                                                                                                                                                                         |
| **Box has been live ~90 days** with root password login enabled and no firewall                                                                                                                                         | `PH-0.7` hardens a **running, exposed** machine. No step may assume a clean install; every step needs an "if this is already configured differently" branch. Assume prior access is possible.                                                                                                                                                                  |
| **The box is SHARED — 13 containers, 4 live CLIENT apps** (a fifth client container is an inactive clone, serving no traffic — corrected at `PH-0.9`) plus their own `postgres:18-alpine` and `redis:7.2`, ~22% of 8 GB | **Not a provider template.** `08 §11.1` allocates 6.9 GB of 8 GB to Josam Academy — the whole machine — and is therefore invalid. `PH-0.9` recalculates against real free headroom and **must not** limit the client containers (`SB-23`). `PH-0.28`'s backup scope is **Josam Academy's database only** (`SB-24`).                                            |
| **Coolify already installed**, serving the client projects                                                                                                                                                              | `PH-0.9` is not an install. See its rewritten row above.                                                                                                                                                                                                                                                                                                       |
| **Port 8000 (Coolify dashboard) is publicly reachable** — runbook authored at `PH-0.8`, awaiting execution                                                                                                              | `SB-22`, open. **Decided: Cloudflare Tunnel** — `cloudflared` dials out, nothing inbound, port 8000 then closed at the provider firewall; dashboard behind Cloudflare Access, founder email only. **The tunnel is proven working BEFORE port 8000 closes** — it is also the path to the founder's clients' control panel. Provider console stays the fallback. |
| **SSH stays on port 22** — decided at `PH-0.7` execution                                                                                                                                                                | `14 §12`'s non-default port was declined: operational risk on a box carrying other people's traffic, for no security return. Its stated purpose (noise reduction) is served by fail2ban.                                                                                                                                                                       |
| **Ninety-day exposure: checked, clean**                                                                                                                                                                                 | One uid-0 account, two known keys, all logins from the founder. No rebuild. The question is **closed** — do not reopen it from memory.                                                                                                                                                                                                                         |
| **26 pending updates, one unappliable**                                                                                                                                                                                 | `SB-25`. Needs a reboot window on a box serving client traffic — a scheduling decision. `unattended-upgrades` handles security patches going forward with `Automatic-Reboot "false"`.                                                                                                                                                                          |
| Provider offers **weekly VM snapshots**                                                                                                                                                                                 | These do **not** satisfy `PH-0.28`. A VM snapshot is not a verified database restore — it is never exercised, never proven to restore, and captures a torn `pg` data directory. Never count it as backup coverage.                                                                                                                                             |
| Provider has a **network-level firewall separate from ufw**, currently with zero rules                                                                                                                                  | `PH-0.7` configures ufw on the host; `PH-0.8` adds the provider firewall as a **second, independent layer**. Both runbooks must name the other so neither is mistaken for full coverage.                                                                                                                                                                       |
| **Branch protection unavailable** — rulesets are not enforced on private repos on this plan                                                                                                                             | `PH-0.10`'s CI is the **only** gate on `main`. Nothing server-side prevents a direct push. The pre-commit hook and commitlint are the local line of defence, and they are bypassable with `--no-verify`.                                                                                                                                                       |

### Resolved version pins (binding — `BR-1810`)

**Only what Phase 0 touches is pinned.** Everything else is deferred to the phase that installs it
and is explicitly non-binding (`13 §18.2`, `BR-1814`, `BR-1815`). Full table in `13 §18.1`.

| Node                          | pnpm        | Turborepo  | TypeScript | PostgreSQL                              | Redis             |
| ----------------------------- | ----------- | ---------- | ---------- | --------------------------------------- | ----------------- |
| **24.18.0** (`.nvmrc` = `24`) | **11.17.0** | **2.10.7** | **6.0.3**  | **16** (`pgvector/pgvector:0.8.5-pg16`) | **7.4.10-alpine** |

Identical across `engines` · `packageManager` · `.nvmrc` · CI Node matrix · every Dockerfile base image.

**Constraints that bind every task:**

- Every `tsconfig` uses `moduleResolution: "nodenext"` or `"bundler"`. TS 6 rejects `"node"` with `TS5107` (`BR-1806`).
- TypeScript stays at **6.0.3** until `typescript-eslint` supports TS 7 — TS 7 silently disables typed linting, which is how `BR-1579` is enforced (`BR-1805`).
- `.gitignore` must contain `.turbo/` — Turborepo's local cache lives in `.turbo/cache`.
- **Prisma 7 confirmed at `PH-0.6`** — all three `BR-1816` probe parts passed; 7.9.1 stands (`SB-09` closed). It connects through a **driver adapter** (`@prisma/adapter-pg` over `pg`), which is code-contained inside `shared/database` but **not behaviour-contained**: pooling, `$transaction` semantics and Prisma error shapes all moved. `08` and `10` assume the Prisma 5 client. Five items must be re-verified when Phase 1 writes its first transaction — `BR-1819`, `STATUS.md §7`.
- **Next.js 16** is the decision, gated on a `PH-0.4` probe: route groups · ISR · Tailwind 4 binding · Storybook 10 + a11y addon. If any fails, report and hold at 15.x — do not work around (`BR-1809`).

### BR numbering

New rules take their number from **`docs/BR-REGISTRY.md §4`** — never from a document's own header,
which in six cases declares a range that does not match its contents (`BR-1820`). Next free block:
**`BR-1826`** onward. Update `§3`/`§4` of the registry in the same commit (`BR-1821`).

---

## 9. Session Start Block

Paste at the start of every later session:

```
Read CLAUDE.md and STATUS.md. Confirm the last completed task, the next task,
and any open blocker or divergence. State the next task's Refs documents and
read them. Then plan that single task and wait for my approval.
Scope is Phase 0 only. Do not touch PH-1.x or later.
```

---

_This file is how the rules survive across sessions. Update §5 at the end of every task._
