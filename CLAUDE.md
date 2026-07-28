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
| **Last updated**    | 2026-07-28                                |
| **Updated after**   | `PH-0.2` — shared lint/format config      |

---

## 1. Hard Scope Boundary

- Execute **only** tasks with IDs `PH-0.1` – `PH-0.28` as defined in `docs/16-task-breakdown.md`.
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
5  RECORD    update STATUS.md — Work Log entry, progress table, current/next
             task, actual vs estimated time. Update the task queue in §5 here.
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

### Type A — executed fully in this repo (22 tasks)

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

| Rule                | Meaning                                                                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BR-1579`           | `strict: true` everywhere. `any` and `@ts-ignore` fail the build. No exceptions, no `eslint-disable` to get green.                                                                                                             |
| `BR-1220`           | A raw hex value in a component fails the build. Semantic tokens only (`--accent`, never `--gold`).                                                                                                                             |
| `BR-1219`           | Component styles reference **purpose**, not appearance.                                                                                                                                                                        |
| `BR-1342`           | Tailwind palette utilities (`text-gray-500`, `bg-blue-600`) must not exist. Tokens only.                                                                                                                                       |
| `BR-1528`           | Radix is never exposed to feature code. It sits behind our components.                                                                                                                                                         |
| `BR-1580`           | Prisma appears only in repositories. Never in a service or controller.                                                                                                                                                         |
| `BR-1533`           | `packages/tokens` is the single source for color, spacing, type, radius, motion.                                                                                                                                               |
| `BR-525`            | No hardcoded user-facing strings. Everything through `packages/i18n`. Arabic 6-form plurals.                                                                                                                                   |
| `BR-1232`           | RTL: logical properties only (`margin-inline-start`, never `margin-left`). Both directions must work.                                                                                                                          |
| `BR-1569`–`BR-1571` | Every component: a story per variant, per size, per state; renders in 2 themes × 2 directions; passes axe in CI.                                                                                                               |
| `BR-1725`           | Phase 0 does not end until a deliberate rule violation is confirmed to fail the build. For each fitness function in `PH-0.16`: write the violation, show the failure, then remove it. Untested enforcement is not enforcement. |
| `BR-1524`           | Feature code imports from `@josam/ui` only. A native form control in a feature file fails the build.                                                                                                                           |
| `BR-1591`           | Dependencies pinned to exact versions. No ranges (`DEC-46`).                                                                                                                                                                   |
| `BR-1599`           | No vendor SDK imported outside `shared/providers`.                                                                                                                                                                             |

### Prohibited fixes (`BR-1512`)

Silencing a lint rule · loosening a type · `!important` · magic pixel offsets · `setTimeout` to
dodge a race · disabling a test · `overflow: hidden` to hide overflow · `z-index: 9999` ·
empty `try/catch` · blanket optional chaining · `@ts-ignore`.

> **If you reach for one of these, the design is wrong — stop and report.**

---

## 5. Phase 0 Task Queue — live status

**Legend:** ⬜ not started · 🟡 in progress · ✅ done (Output exists + verified) · 🔴 blocked
**Type:** A = executed here · B = founder-executed, artifact produced here

| ID        | Task                                                                                                                                                                                                                    | Type | Depends        | Est | Status | Actual | Output (proof required)                         |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--: | -------------- | --: | :----: | -----: | ----------------------------------------------- |
| `PH-0.1`  | Initialize monorepo: pnpm workspaces, Turborepo, base `tsconfig`                                                                                                                                                        |  A   | —              | 0.5 |   ✅   |   0.25 | `pnpm build` → 5 successful, 5 total            |
| `PH-0.2`  | Shared config package: ESLint flat config, Stylelint, Prettier                                                                                                                                                          |  A   | `0.1`          | 0.5 |   ✅   |   0.25 | `pnpm lint` → 6 successful, 6 total (6/6 ws)    |
| `PH-0.3`  | Scaffold `apps/api` (NestJS) with health endpoint                                                                                                                                                                       |  A   | `0.1`          | 0.5 |   ⬜   |      — | `GET /health` returns 200 locally               |
| `PH-0.4`  | Scaffold `apps/web` (Next.js 15, App Router, route groups)                                                                                                                                                              |  A   | `0.1`          | 0.5 |   ⬜   |      — | Public and admin route groups render            |
| `PH-0.5`  | Docker Compose: Postgres 16 + pgvector, Redis 7, MailHog                                                                                                                                                                |  A   | `0.1`          | 0.5 |   ⬜   |      — | `docker compose up` gives a working local stack |
| `PH-0.6`  | Prisma init, connection, first empty migration                                                                                                                                                                          |  A   | `0.5`          | 0.5 |   ⬜   |      — | `pnpm db:migrate` succeeds                      |
| `PH-0.7`  | **VPS hardening**: SSH keys, disable root, fail2ban, ufw, unattended-upgrades                                                                                                                                           |  B   | —              |   1 |   ⬜   |      — | Documented runbook committed                    |
| `PH-0.8`  | Cloudflare: DNS, proxied records, TLS, origin firewall rules                                                                                                                                                            |  B   | `0.7`          | 0.5 |   ⬜   |      — | Origin IP not publicly resolvable               |
| `PH-0.9`  | Coolify setup, container memory limits per `08 §11.1`                                                                                                                                                                   |  B   | `0.7`          | 0.5 |   ⬜   |      — | Containers start with declared limits           |
| `PH-0.10` | GitHub Actions: lint → typecheck → test → build → push to ghcr.io                                                                                                                                                       |  B   | `0.2`          |   1 |   ⬜   |      — | Push to main produces a tagged image            |
| `PH-0.11` | Coolify deploy from registry + rollback by tag verification                                                                                                                                                             |  B   | `0.9`, `0.10`  | 0.5 |   ⬜   |      — | Deploy < 2 min; rollback verified               |
| `PH-0.12` | `packages/tokens`: both themes → CSS vars + RN constants                                                                                                                                                                |  A   | `0.1`          |   1 |   ⬜   |      — | Token package consumed by web                   |
| `PH-0.13` | `packages/i18n`: AR/EN catalogs, 6-form Arabic plurals, locale utils                                                                                                                                                    |  A   | `0.1`          |   1 |   ⬜   |      — | Interpolation and plurals tested                |
| `PH-0.14` | Tailwind 4 bound to tokens; no palette utilities available                                                                                                                                                              |  A   | `0.12`         | 0.5 |   ⬜   |      — | `text-gray-500` is not a valid class            |
| `PH-0.15` | Storybook with theme + direction toolbars, axe addon                                                                                                                                                                    |  A   | `0.12`         |   1 |   ⬜   |      — | Stories render in 4 combinations                |
| `PH-0.16` | **Fitness functions**: boundaries, dependency-cruiser, custom lint rules                                                                                                                                                |  A   | `0.2`          | 1.5 |   ⬜   |      — | Deliberate violations fail CI (verified)        |
| `PH-0.17` | Primitives: `Text` `Heading` `Stack` `Inline` `Grid` `Box` `Icon` `Surface`                                                                                                                                             |  A   | `0.14`, `0.15` | 1.5 |   ⬜   |      — | Off-scale values are type errors                |
| `PH-0.18` | Architectural: `T` `Bidi` `Money` `Num` `Percent` `Duration` `When` `CopyableId`                                                                                                                                        |  A   | `0.13`, `0.17` |   1 |   ⬜   |      — | Bilingual + LTR isolation verified              |
| `PH-0.19` | Structured logging (Pino) with correlation IDs; Sentry wiring                                                                                                                                                           |  A   | `0.3`          | 0.5 |   ⬜   |      — | Request traced end to end                       |
| `PH-0.20` | `Button` `IconButton` all variants and states                                                                                                                                                                           |  A   | `0.17`         | 0.5 |   ⬜   |      — | 5 states in Storybook                           |
| `PH-0.21` | `Form` + `FormField` (label, hint, required, error, ARIA)                                                                                                                                                               |  A   | `0.17`         |   1 |   ⬜   |      — | Focus-first-error and dirty tracking work       |
| `PH-0.22` | Text fields: `TextField` `TextArea` `PasswordField` `NumberField` `CurrencyField` `CodeField`                                                                                                                           |  A   | `0.21`         |   1 |   ⬜   |      — | All with counters and states                    |
| `PH-0.23` | Identity fields: `PhoneField` `EmailField` `OTPField`                                                                                                                                                                   |  A   | `0.21`         |   1 |   ⬜   |      — | LTR isolation; OTP paste distribution           |
| `PH-0.24` | Choice fields: `Select` `Combobox` `MultiSelect` `RadioGroup` `RadioCard` `Checkbox` `Switch` `Slider` `TagsInput` `RatingInput`                                                                                        |  A   | `0.21`         |   2 |   ⬜   |      — | Radix-based, fully keyboard operable            |
| `PH-0.25` | Time/file fields: `DatePicker` `DurationField` `TimestampField` `FileDrop` `ImageDrop`                                                                                                                                  |  A   | `0.21`         | 1.5 |   ⬜   |      — | RTL calendar; MIME validation                   |
| `PH-0.26` | Layout & nav: `AppShell` `TopBar` `SideNav` `BottomNav` `PageHeader` `PageFooter` `Breadcrumb` `Tabs` `SkipLink`                                                                                                        |  A   | `0.17`         | 1.5 |   ⬜   |      — | `PageHeader` enforces one primary action        |
| `PH-0.27` | Feedback: `Toast` `InlineAlert` `Dialog` `ConfirmDialog` `Drawer` `Popover` `Tooltip` `DropdownMenu` `Skeleton` `ProgressBar` `ProgressRing` `EmptyState` `ErrorState` `OfflineBanner` `ReadOnlyBanner` `QueryBoundary` |  A   | `0.17`         |   2 |   ⬜   |      — | `QueryBoundary` requires all three states       |
| `PH-0.28` | **Backups + monitoring**: daily `pg_dump` → R2, weekly restore verify, UptimeRobot, push alerts                                                                                                                         |  B   | `0.9`          |   1 |   ⬜   |      — | Restore verified from a clean database          |

**Progress: 2 / 28 · 7.1%** · Estimated total 19.0 d · Actual to date 0.5 d

> **Estimate-ratio caution (`DEC-56`, `BR-1802`).** `PH-0.1` came in at half its estimate, but it
> is a Type-A task executed by AI with every version already resolved by the pre-`PH-0.1` pass.
> One data point, and the least representative kind. Do not recalibrate anything on it — the ratio
> only becomes meaningful once type-B tasks and the component tasks have real numbers against them.

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
☐ A raw hex color in a component fails the build (verified by deliberate violation)
☐ Health endpoint reports database, Redis, queue, storage, last backup
☐ STATUS.md shows 28/28 with honest actual-vs-estimate times per task
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
| `SB-05` | `PH-0.7` runbook is **not** in the repo at `docs/runbooks/vps-hardening.md`. Stated as placed a second time before `PH-0.1`; **re-checked at the end of `PH-0.1` — `docs/runbooks/` does not exist and no `*vps*` file exists anywhere in the tree.** Possibly saved outside the repo root.                                                            | `PH-0.7` review             | 🔴 Open — re-confirmed absent 2026-07-28                                                                              |
| `SB-06` | TypeScript pinned to **6.0.3**, not the newer 7.0.2, because `typescript-eslint` caps at `<6.1.0` and TS 7 would silently disable type-aware linting (`BR-1579`).                                                                                                                                                                                      | —                           | ✅ **Resolved** — `BR-1805`, `BR-1806`.                                                                               |
| `SB-07` | **Next.js**: `13 §4` states `15` (bare major = exact statement); current is **16.2.12**. Adopting 16 needs a document correction (`BR-1809`).                                                                                                                                                                                                          | `PH-0.4`                    | 🔴 Open — **not** blocking `PH-0.1`                                                                                   |
| `SB-08` | `12 §20.12` states **134** total components; a full `§20` census enumerates **151**. Wave 2/3 counts unrecounted (`BR-1813`).                                                                                                                                                                                                                          | Wave 2                      | 🟡 Open                                                                                                               |
| `SB-13` | `09 §9`'s monorepo tree omits **`packages/ui`**, though `12 §20` mandates it (`BR-1524` — feature code imports from `@josam/ui` only; `BR-1575` — it depends on no app). Created at `PH-0.1` on the authority of `12`. `09 §9` also still lists `contracts` and `abilities`, correctly deferred to `PH-1.8`/`PH-1.9`. `09 §9` needs a correction pass. | Nothing — `12` governs      | ✅ **Resolved** — `09 §9` corrected 2026-07-28                                                                        |
| `SB-14` | `13 §9` cites "custom rules (`§19`)" but `13` has no `§19` — it ends at `§18`. Dangling cross-reference, same class as `SB-11`. Custom lint rules are `PH-0.16`, which carries its own Refs, so nothing is lost.                                                                                                                                       | Nothing — `PH-0.16` governs | 🟡 Open — needs a target section or the citation removed                                                              |
| `OQ-24` | Renovate auto-merge policy for patch updates (`13 §16`). Needed during `PH-0.10`.                                                                                                                                                                                                                                                                      | `PH-0.10`                   | 🟡 Open                                                                                                               |

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
- **Prisma 7 is provisional** — probe at `PH-0.6` before pinning; fall back to Prisma 6 if it fails (`BR-1816`, `SB-09`).
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
