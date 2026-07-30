# 16 — Task Breakdown

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 16 — Task Breakdown |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | All prior documents |
| **Feeds Into** | Execution |
| **Contains** | `PH-0.1` – `PH-7.14` · 191 tasks · `BR-1761` – `BR-1790` |

---

## 1. How to Use This Document

Each task is sized to **one working session** — half a day to two days. A task larger than that is two tasks.

```
ID          PH-{phase}.{number}
Depends     tasks that must complete first
Est         working days (founder + AI assistance)
Output      the artifact that proves it is done
Refs        the documents that specify it
```

- `BR-1761` — A task is complete when its **Output** exists in the repository and CI is green. Not when the code is written.
- `BR-1762` — Every task that produces a screen passes the Definition of Done (`12 §18`) before it is closed.
- `BR-1763` — Every task that produces a component satisfies the Component Contract (`12 §20.3`).
- `BR-1764` — Tasks are executed in dependency order. Starting a task whose dependency is incomplete produces rework.
- `BR-1765` — When a task reveals that a document is wrong, the **document is corrected first**, then the task proceeds. Code that diverges silently from the specification is how the documentation dies (`BR-1748`).

### Working With AI Assistance

- `BR-1766` — Every AI-assisted task begins by reading the referenced documents. The `Refs` column exists for this purpose.
- `BR-1767` — AI output is reviewed against `12 §17` before merge. "It works" is not the standard (`BR-1287`).
- `BR-1768` — No task is marked done based on an AI claim of completion. The Output must be verified (`BR-1518`).

---

# Phase 0 — Foundation · 28 tasks · 3 weeks

## Week 1 — Infrastructure

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-0.1` | Initialize monorepo: pnpm workspaces, Turborepo, base `tsconfig` | — | 0.5 | `pnpm build` succeeds across empty apps | `13 §2` |
| `PH-0.2` | Shared config package: ESLint flat config, Stylelint, Prettier | `0.1` | 0.5 | `pnpm lint` runs in every workspace | `13 §9` |
| `PH-0.3` | Scaffold `apps/api` (NestJS) with health endpoint | `0.1` | 0.5 | `GET /health` returns 200 locally | `08 §4` |
| `PH-0.4` | Scaffold `apps/web` (Next.js 16, App Router, route groups) | `0.1` | 0.5 | Public and admin route groups render | `09 §7.1` |
| `PH-0.5` | Docker Compose: Postgres 16 + pgvector, Redis 7, MailHog | `0.1` | 0.5 | `docker compose up` gives a working local stack | `13 §12` |
| `PH-0.6` | Prisma init, connection, first empty migration | `0.5` | 0.5 | `pnpm db:migrate` succeeds | `10 §1` |
| `PH-0.7` | **VPS hardening**: SSH keys, disable root, fail2ban, ufw, unattended-upgrades | — | 1 | Documented runbook committed | `14 §12` |
| `PH-0.8` | Cloudflare: DNS, proxied records, TLS, origin firewall rules | `0.7` | 0.5 | Origin IP not publicly resolvable | `BR-1702` |
| `PH-0.9` | Coolify setup, container memory limits per `08 §11.1` | `0.7` | 0.5 | Containers start with declared limits | `BR-878` |
| `PH-0.10` | GitHub Actions: lint → typecheck → test → build → push to ghcr.io | `0.2` | 1 | Push to main produces a tagged image | `BR-1885` → `BR-885` |
| `PH-0.11` | Coolify deploy from registry + rollback by tag verification | `0.9`, `0.10` | 0.5 | Deploy < 2 min; rollback verified | `BR-886` |

## Week 2 — Standards & Primitives

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-0.12` | `packages/tokens`: both themes → CSS vars + RN constants | `0.1` | 1 | Token package consumed by web | `12 §3`, `BR-1583` |
| `PH-0.13` | `packages/i18n`: AR/EN catalogs, 6-form Arabic plurals, locale utils | `0.1` | 1 | Interpolation and plurals tested | `BR-525` |
| `PH-0.14` | Tailwind 4 bound to tokens; no palette utilities available | `0.12` | 0.5 | `text-gray-500` is not a valid class | `BR-1342` |
| `PH-0.15` | Storybook with theme + direction toolbars, axe addon | `0.12` | 1 | Stories render in 4 combinations | `DEC-42` |
| `PH-0.16` | **Fitness functions**: boundaries, dependency-cruiser, custom lint rules | `0.2` | 1.5 | Deliberate violations fail CI (verified) | `12 §19`, `BR-1725` |
| `PH-0.17` | Primitives: `Text` `Heading` `Stack` `Inline` `Grid` `Box` `Icon` `Surface` | `0.14`, `0.15` | 1.5 | Off-scale values are type errors | `DEC-40` |
| `PH-0.18` | Architectural: `T` `Bidi` `Money` `Num` `Percent` `Duration` `When` `CopyableId` | `0.13`, `0.17` | 1 | Bilingual + LTR isolation verified | `12 §20.6` |
| `PH-0.19` | Structured logging (Pino) with correlation IDs; Sentry wiring | `0.3` | 0.5 | Request traced end to end | `BR-627` |

## Week 3 — Components & Safety Net

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-0.20` | `Button` `IconButton` all variants and states | `0.17` | 0.5 | 5 states in Storybook | `12 §20.9` |
| `PH-0.21` | `Form` + `FormField` (label, hint, required, error, ARIA) | `0.17` | 1 | Focus-first-error and dirty tracking work | `BR-1402` |
| `PH-0.22` | Text fields: `TextField` `TextArea` `PasswordField` `NumberField` `CurrencyField` `CodeField` | `0.21` | 1 | All with counters and states | `12 §20.7` |
| `PH-0.23` | Identity fields: `PhoneField` `EmailField` `OTPField` | `0.21` | 1 | LTR isolation; OTP paste distribution | `BR-1542` |
| `PH-0.24` | Choice fields: `Select` `Combobox` `MultiSelect` `RadioGroup` `RadioCard` `Checkbox` `Switch` `Slider` `TagsInput` `RatingInput` | `0.21` | 2 | Radix-based, fully keyboard operable | `DEC-39` |
| `PH-0.25` | Time/file fields: `DatePicker` `DurationField` `TimestampField` `FileDrop` `ImageDrop` | `0.21` | 1.5 | RTL calendar; MIME validation | `BR-1543` |
| `PH-0.26` | Layout & nav: `AppShell` `TopBar` `SideNav` `BottomNav` `PageHeader` `PageFooter` `Breadcrumb` `Tabs` `SkipLink` | `0.17` | 1.5 | `PageHeader` enforces one primary action | `BR-1549` |
| `PH-0.27` | Feedback: `Toast` `InlineAlert` `Dialog` `ConfirmDialog` `Drawer` `Popover` `Tooltip` `DropdownMenu` `Skeleton` `ProgressBar` `ProgressRing` `EmptyState` `ErrorState` `OfflineBanner` `ReadOnlyBanner` `QueryBoundary` | `0.17` | 2 | `QueryBoundary` requires all three states | `DEC-41` |
| `PH-0.28` | **Backups + monitoring**: daily `pg_dump` → R2, weekly restore verify, UptimeRobot, push alerts | `0.9` | 1 | Restore verified from a clean database | `DEC-57` |
| `PH-0.29` | **`BR-1544` conformance** across the `PH-0.22`–`PH-0.24` fields: `readOnly` and `disabled` distinct on all 24, `disabled` carrying a reason, stories and specs updated, plus a fitness function so it cannot recur | `0.27` | 0.5 | A bare `disabled?: boolean` fails the build | `BR-1544`, `BR-1347` |

**`PH-0.29` is remedial, and added after `PH-0.27` rather than planned.** `BR-1544` has been in
`12 §20.7` throughout, and `Button` has enforced `BR-1347` through its type since `PH-0.20` — yet
nineteen of the twenty-four fields shipped with a bare `disabled?: boolean` and no `readOnly` at
all. The two states are not synonyms: a **disabled** control is removed from the keyboard and from
the accessibility tree, so a screen-reader user cannot reach it, while a **read-only** one stays
focusable and its value stays readable and copyable. Rendering a value the user is meant to read as
`disabled` makes it, to them, simply absent.

It runs **before** the exit check rather than after Phase 1, because every form built in Phase 1
inherits these components, and the same change costs more with each screen that consumes them.

| `PH-0.30` | **Phase 0 conformance closure**: criterion 6 automated in a real browser, a roster gate, the four unowned enforcement items, the Redis health indicator | `0.27`, `0.10` | 1 | Every story passes axe in 4 combinations; 69/69 checked | `BR-1571`, `BR-1486`, `BR-1502`, `BR-892` |

**`PH-0.30` is the second remedial task**, added after the Phase 0 status report. It closes the two
exit criteria that were failing on evidence and the four `12 §19` checks that had no owning task —
each of which was keyed to a task that had already closed, so none of them would ever have happened.

---

## Type-B estimates, split (`PH-0.30`)

The `16 §Phase 0` estimates were single figures covering **authoring and execution together**, so
the Phase 0 report could not produce a Type-B ratio: the one recorded number (`PH-0.7`, 0.3 d) was
the founder's execution measured against an estimate that included the authoring too. Split here so
the remaining four produce a usable ratio.

The split is a judgement, and the reasoning matters more than the numbers:

| Task | Total | Authoring | Execution | Why this split |
| --- | ---: | ---: | ---: | --- |
| `PH-0.8` Cloudflare Tunnel | 0.5 | **0.35** | **0.15** | Authoring-heavy. The runbook has to solve the ordering problem — the tunnel proven working *before* port 8000 closes, never the reverse — and document recovery for a founder whose clients' control panel depends on it. Execution is a `cloudflared` install and a DNS record. |
| `PH-0.9` Coolify hardening | 0.5 | **0.2** | **0.3** | Execution-heavy, and the only one where that is true. The authoring is short because the OOM constraint is already written; the execution is measuring real headroom on a shared box, sizing five limits against it, and rotating a credential on a machine serving five live client apps. |
| `PH-0.11` Deploy + rollback | 0.5 | **0.3** | **0.2** | Authoring covers the Coolify wiring, the migration-before-cutover order (`BR-887`) and a rollback procedure that must be *tested*, not described. Execution is two deploys and one rollback. |
| `PH-0.28` Backups + monitoring | 1.0 | **0.65** | **0.35** | Authoring-heavy: `scripts/backup.sh`, `scripts/restore-verify.sh`, the R2 wiring and the alert configuration are all code, and `DEC-57` requires the restore to be *verified from a clean database*, which is the script that takes the time. Execution is running them and confirming an alert arrives. |
| **Total** | **2.5** | **1.5** | **1.0** | |

### What the first real execution number says — 2026-07-30

`PH-0.11` executed. **Authoring 0.35 d against 0.35 estimated. Execution ≈2 hours (0.25 d) against
0.2 d estimated.**

Read naively that is a 1.25 ratio on execution and a validated split. **Both readings are wrong, and
the distinction is the only useful thing this number carries.**

**Authoring behaves like Type-A work.** It came in on estimate, as `PH-0.10` did at 1.15 against 1.0.
It is writing, against documents, verifiable locally, and it can be estimated for the same reason the
component tasks could.

**Execution does not behave like anything estimable, and the matching number is a coincidence.** The
0.2 d estimate was for *running the steps*. Roughly twenty minutes of the two hours were steps. The
rest went into **six divergences, three of which were defects in the authoring** — a migration hook
that ran in the wrong container, a health field that reported a constant, and a runbook that assumed
a group membership the server did not have. Had the runbook been correct, execution would have been
under half an hour. Had there been ten divergences it would have been four hours.

So:

> **Type-B execution time is dominated by the defect count in the runbook, not by the number of
> steps in it.** Estimating it is estimating how wrong the authoring was, which cannot be known while
> authoring it.

Three consequences, recorded rather than averaged away:

1. **The execution figures below are not forecasts.** They are the cost *if the runbook is right*.
   Treat them as a floor.
2. **The two halves must never be averaged into one Type-B ratio.** 0.6 d against 0.5 d looks like a
   1.2 ratio on a task that was really on-estimate for the predictable half and unbounded on the
   other. An averaged number hides exactly the thing worth knowing.
3. **The lever on execution time is authoring quality, not scheduling.** Every hour spent proving a
   runbook's steps before handing it over — running the migration inside the image, building the
   backup container and checking its tooling — is an hour removed from a session where the founder is
   the only person who can act.

`PH-0.28`'s authoring was done that way deliberately: the scripts were run, the image was built, and
its toolchain assertion caught a missing binary before the runbook shipped. Whether that shows up as
a lower divergence count is the measurement to watch next.

Two things this split assumes, stated so they can be checked rather than discovered:

- **Authoring is measured the way Type-A work is** — written, reviewed against the Refs, and
  verified as far as it can be without the server. `PH-0.10` is the calibration point: 1.15 d
  actual against 1.0 estimated, and both overruns were `BR-1838`-class defects rather than the
  writing.
- **Execution excludes waiting.** A DNS propagation window or an R2 bucket provisioning is not
  founder time and is not in these figures. If it turns out to dominate, that is worth knowing and
  is not what these numbers measure.

---

**Phase 0 exit:** `15 §Phase 0` criteria all passing.

---

# Phase 1 — Identity & Commerce · 32 tasks · 5 weeks

## Week 1 — Identity

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-1.1` | Schema: `users` `user_identities` `refresh_tokens` `verification_tokens` `otp_codes` `login_activity` | `0.6` | 1 | Migration applied, seeds run | `TBL-001`–`006` |
| `PH-1.2` | Argon2id hashing, breach-list check, password policy | `1.1` | 0.5 | ~100 ms hash time verified | `DEC-48` |
| `PH-1.3` | JWT access + refresh rotation with family reuse detection | `1.1` | 1 | Reuse revokes the family (tested) | `BR-1623` |
| `PH-1.4` | Email registration + verification + password reset | `1.2`, `1.3` | 1 | Enumeration-resistant responses | `BR-1611` |
| `PH-1.5` | Google OAuth with PKCE and `id_token` verification | `1.3` | 0.5 | Auto-link on verified email | `BR-1620` |
| `PH-1.6` | `SmsProvider` abstraction + Twilio Verify + phone OTP behind a flag | `1.3` | 1 | OTP flow works; flag disables cleanly | `DEC-45` |

## Week 2 — Permissions

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-1.7` | Schema: `roles` `permissions` `role_permissions` `user_permission_overrides` | `1.1` | 0.5 | Migration applied | `TBL-007`–`010` |
| `PH-1.8` | Permission registry in code + startup sync + orphan flagging | `1.7` | 1 | 174 permissions synced | `FEAT-014` |
| `PH-1.9` | `packages/abilities` (CASL) shared across API and clients | `1.8` | 1 | Same rules on both sides | `BR-708` |
| `PH-1.10` | Permission guard + scope decorator at the data layer | `1.9` | 1 | Forgotten `where` cannot leak | `BR-1632` |
| `PH-1.11` | Capability interceptor computing `_can` + `_reason` on every response | `1.9` | 1 | Reason codes from the fixed enum | `BR-1107` |
| `PH-1.12` | Generated permission tests: every endpoint × every role | `1.10` | 1 | Matrix green | `DEC-28` |
| `PH-1.13` | Admin: role list, permission matrix editor, per-user overrides | `1.11`, `0.26` | 1.5 | Full replacement semantics | `BR-1125` |

## Week 3 — Entitlements & Products

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-1.14` | Schema: `entitlements` `entitlement_events` | `1.1` | 0.5 | Hot lookup index in place | `TBL-021`–`022` |
| `PH-1.15` | Entitlement engine: resolve, additive merge, expiry at read time, Redis cache | `1.14` | 1.5 | p95 < 20 ms | `BR-981` |
| `PH-1.16` | Quota entitlements with atomic consumption | `1.15` | 1 | Concurrent requests cannot overrun | `BR-798` |
| `PH-1.17` | Schema: `products` `product_prices` `product_entitlements` `coupons` | `1.14` | 0.5 | Migration applied | `TBL-011`–`014` |
| `PH-1.18` | Admin: product editor + entitlement composer with live preview | `1.17`, `1.13` | 1.5 | New offer in < 15 min (`MET-05`) | `FLOW-25` |
| `PH-1.19` | Coupon engine: constraints, redemption tracking, friendly errors | `1.17` | 1 | Specific reason on invalid code | `BR-079` |

## Week 4 — Payments

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-1.20` | Schema: `orders` `order_items` `transactions` `invoices` `refund_requests` `subscriptions` | `1.17` | 1 | Migration applied | `TBL-015`–`020` |
| `PH-1.21` | `PaymentProvider` abstraction | `1.20` | 0.5 | Interface with two implementations stubbed | `BR-1600` |
| `PH-1.22` | Stripe: checkout, webhooks, subscriptions, customer portal | `1.21` | 1.5 | Real payment grants an entitlement | `BR-1727` |
| `PH-1.23` | Idempotent webhook pipeline: verify → dedupe → enqueue → 200 | `1.22` | 1 | Duplicate events produce one grant | `BR-1674` |
| `PH-1.24` | Checkout flow UI: summary, coupon, method selection, success routing | `1.22`, `0.27` | 1 | Routes into lesson 1 on success | `BR-1131` |
| `PH-1.25` | Invoice generation (queued PDF) with gapless numbering | `1.20` | 1 | Sequential numbers, stored on R2 | `BR-976` |

## Week 5 — Local Payments & Lifecycle

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-1.26` | Paymob: cards, wallets, installments | `1.21` | 1.5 | Real EGP payment succeeds | `FEAT-028` |
| `PH-1.27` | Fawry deferred flow + reference display + 72h expiry | `1.26` | 1 | Payment hours later still grants | `BR-1133` |
| `PH-1.28` | Reconciliation job for pending orders every 15 min | `1.27` | 0.5 | Lost webhook recovered | `BR-069` |
| `PH-1.29` | Subscription lifecycle: renewal, grace, retries, pause, cancel routing | `1.22` | 1.5 | Reason-gated remedy works | `DEC-11` |
| `PH-1.30` | Refund request workflow: request → recommend → approve | `1.20`, `1.13` | 1 | Entitlement revoked, progress preserved | `BR-091` |
| `PH-1.31` | Account area: profile, sessions, identities, devices, billing | `1.4`, `0.26` | 1 | Sections absent when empty | `BR-024` |
| `PH-1.32` | Manual entitlement grant + bulk grant with required reason | `1.15`, `1.13` | 0.5 | Audit-logged | `FLOW-26` |

**Phase 1 exit:** real money paid and refunded; permission matrix green.

---

# Phase 2 — Content & Learning · 34 tasks · 6 weeks

## Week 1 — Content Model

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-2.1` | Schema: `courses` `categories` `sections` `lessons` `video_assets` | `1.14` | 1 | Arabic `CHECK` constraints active | `TBL-023`–`027` |
| `PH-2.2` | Course CRUD with bilingual `jsonb` and publish validation | `2.1` | 1 | Publish blocked with a list of what is missing | `BR-1763` → `BR-763` |
| `PH-2.3` | Section and lesson CRUD with fractional ordering | `2.2` | 1 | Single-row reorder writes | `BR-989` |
| `PH-2.4` | `CurriculumTree` component: drag-and-drop, inline edit, status | `2.3`, `0.27` | 2 | Reorder persists optimistically | `FEAT-050` |

## Week 2 — Video & Notes

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-2.5` | `VideoProvider` abstraction + Bunny implementation | `2.1` | 1 | No SDK outside providers | `BR-1599` |
| `PH-2.6` | Direct-to-provider upload authorization + `VideoUploader` component | `2.5` | 1.5 | No video byte touches the VPS | `BR-1173` |
| `PH-2.7` | Transcoding webhook → lesson status transitions | `2.6` | 0.5 | `processing` → `ready` verified | `BR-137` |
| `PH-2.8` | Schema + API: `lesson_note_blocks` | `2.1` | 0.5 | Structural storage, not HTML | `BR-993` |
| `PH-2.9` | `BlockEditor`: 7 block types, bilingual, autosave | `2.8`, `0.27` | 2.5 | Blocks stored structurally | `FEAT-053` |
| `PH-2.10` | Timestamp capture from inline player + validation | `2.9` | 1 | Non-overlapping ascending enforced | `BR-147` |

## Week 3 — Resources & Storage

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-2.11` | `StorageProvider` (R2) + signed URL generation | `0.28` | 1 | Buckets private; 5-min URLs | `BR-1641` |
| `PH-2.12` | Schema + API: `resources` (5 types) + `media_assets` | `2.1`, `2.11` | 1 | Type-specific validation | `TBL-029`–`030` |
| `PH-2.13` | Resource manager UI + media library with usage counts | `2.12`, `0.25` | 1.5 | In-use assets cannot be deleted | `BR-998` |
| `PH-2.14` | Timestamp binding + resource-level entitlements | `2.12` | 1 | Gated resources visible with unlock path | `BR-1157` → `BR-157` |
| `PH-2.15` | Content versioning: snapshot on publish, diff, restore | `2.2` | 1 | Last 20 versions retained | `BR-999` |

## Week 4 — The Player

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-2.16` | Playback token endpoint implementing the full decision table | `2.5`, `1.15` | 1.5 | Every denial returns reason + action | `07 §6.2` |
| `PH-2.17` | `VideoPlayer` + `PlayerControls`: hls.js, keyboard, preferences | `2.16`, `0.27` | 2.5 | LTR controls, dark in both themes | `BR-1556` |
| `PH-2.18` | `ChapterRail` generated from heading blocks | `2.10`, `2.17` | 1 | Hidden below 2 chapters | `BR-150` |
| `PH-2.19` | `SyncedNotes` + `NoteComposer` + `ResourceCue` | `2.9`, `2.17` | 1.5 | Bidirectional seek; no playback interruption | `BR-1250` |
| `PH-2.20` | Resume-to-second: batched position writes, cross-device merge | `2.17` | 1 | Accurate across reload and devices | `BR-1006` |

## Week 5 — Protection

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-2.21` | Schema: `devices` `device_transfers` `playback_sessions` `playback_log` `download_log` `abuse_flags` | `1.1` | 1 | Partial unique indexes enforce limits | `TBL-060`–`065` |
| `PH-2.22` | Signed device tokens (HMAC) + fingerprint as secondary signal | `2.21` | 1 | Forged token fails signature | `BR-1642` |
| `PH-2.23` | Device binding enforcement in the playback path | `2.22`, `2.16` | 1 | Playback-only; everything else unaffected | `BR-1052` |
| `PH-2.24` | Transfer request flow + automatic policy + `DeviceCard` UI | `2.23`, `0.27` | 1.5 | Auto-approval under 5 s | `BR-1166` |
| `PH-2.25` | Dynamic watermarking via provider; payload server-constructed | `2.16` | 1 | Identity visible in a screen recording | `BR-1639` |
| `PH-2.26` | Concurrent stream limit with heartbeat and takeover | `2.21` | 1 | One stream enforced by index | `BR-1055` |
| `PH-2.27` | Playback and download logging + abuse scoring job | `2.21` | 1 | Score computed; no auto-action | `BR-1643` |

## Week 6 — Learning

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-2.28` | Schema: `enrollments` `lesson_progress` `learning_sessions` `learner_notes` `bookmarks` | `2.1` | 1 | Migration applied | `TBL-033`–`037` |
| `PH-2.29` | Progress tracking, completion threshold, manual toggle, aggregates | `2.28` | 1.5 | Item-count percentage; monotonic completion | `BR-1005` |
| `PH-2.30` | Schema + engine: `unlock_rules` — 5 rule types, fail-open, cycle detection | `2.28` | 1.5 | Deleted target evaluates satisfied | `BR-1000` |
| `PH-2.31` | `RailSpine` `RailNode` `LessonRow` `LockedLessonRow` with 4 states | `2.30`, `0.17` | 1.5 | States distinguishable without color | `BR-1554` |
| `PH-2.32` | Continue Learning: pointer, `ContinueCard`, advance on completion | `2.29` | 1 | Exact-second resume from dashboard | `BR-1002` |
| `PH-2.33` | Learner notes with timestamps + notes hub + export | `2.28`, `2.19` | 1 | Private; survives expiry | `BR-1009` |
| `PH-2.34` | Learning session tracking + in-course full-text search (AR/EN) | `2.28` | 1 | Sessions under 60 s discarded | `BR-1008` |

**Phase 2 exit:** one real course authored and watched end to end.

---

# Phase 3 — Operations & Launch · 26 tasks · 4 weeks

## Week 1 — Public Site

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-3.1` | Landing page: outcome-led, trust above fold, SSG | `0.26` | 1.5 | LCP ≤ 2.5 s on mid-range Android | `BR-1486` |
| `PH-3.2` | Course catalog with URL-synced filters, ISR | `2.2` | 1 | Filters shareable and indexable | `BR-1584` |
| `PH-3.3` | Course detail: full curriculum, entitlement-generated grants panel | `2.30`, `1.18` | 1.5 | Marketing cannot diverge from reality | `BR-1179` |
| `PH-3.4` | Free preview playback without registration | `2.16` | 1 | Generic watermark; no device binding | `BR-590` |
| `PH-3.5` | SEO: metadata, structured data, `hreflang`, sitemap | `3.2` | 1 | Paid notes excluded from crawling | `BR-592` |
| `PH-3.6` | Legal pages + contact form → ticket | `0.26` | 0.5 | Bilingual, versioned | `FEAT-209` |

## Week 2 — Admin Core

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-3.7` | Admin shell with permission-derived navigation | `1.11`, `0.26` | 1 | Absent sections render nothing | `BR-1711` → `BR-711` |
| `PH-3.8` | `DataTable` + `TableToolbar` + `FilterBar` + `Pagination` + `BulkActionBar` | `0.27` | 2 | Server-driven, URL-synced, column priority | `BR-1547` |
| `PH-3.9` | Operations dashboard with attention queue | `3.8` | 1.5 | Every item one-click | `BR-1181` |
| `PH-3.10` | Student directory + profile with PII gating | `3.8`, `1.15` | 1.5 | Money omitted for `ROLE-04` | `BR-1180` |
| `PH-3.11` | Device transfer queue with evidence panel and assessment | `2.24`, `3.8` | 1 | Decision without a second lookup | `BR-1185` |
| `PH-3.12` | Publish approval queue with required feedback | `2.2`, `3.8` | 0.5 | Return requires a reason | `BR-1080` |
| `PH-3.13` | Global audit log (append-only) + viewer | `1.13` | 1 | Update and delete denied at DB level | `BR-1077` |

## Week 3 — Admin Operations

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-3.14` | Settings registry: all ~60 values editable, audit-logged | `3.7` | 1.5 | No magic numbers remain in code | `BR-1075` |
| `PH-3.15` | Staff management: invite, roles, deactivate | `1.13` | 1 | Last Super Admin protected | `BR-1637` |
| `PH-3.16` | Read-only impersonation with required reason and 30-min expiry | `3.10` | 1 | Playback disabled during session | `BR-1189` |
| `PH-3.17` | Abuse flag queue with evidence and human-only action | `2.27`, `3.8` | 0.5 | No automatic suspension | `BR-1643` |
| `PH-3.18` | Order, coupon, and refund admin views | `1.30`, `3.8` | 1 | Amounts hidden without `payment:read` | `BR-1180` |

## Week 4 — Support, Email, Launch

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-3.19` | Schema + API: `tickets` `ticket_messages` `canned_responses` | `1.1` | 1 | Context auto-capture | `BR-1070` |
| `PH-3.20` | Ticket UI both sides: threading, internal notes, status, priority | `3.19`, `3.8` | 1.5 | Internal notes never leak | `BR-1073` |
| `PH-3.21` | `EmailProvider` (Resend) + bilingual RTL-correct templates | `0.13` | 1 | All transactional templates render | `BR-412` |
| `PH-3.22` | Email priority tiers + budget counters + alerts | `3.21` | 1 | P0 sends when P3 is exhausted | `BR-1069` |
| `PH-3.23` | Load test: dashboard + playback token, 50 concurrent | `3.9` | 0.5 | p95 < 500 ms | `BR-1590` |
| `PH-3.24` | Security review: headers, CSP enforced, rate limits, VPS re-check | `3.1` | 1 | CSP enforcing, not report-only | `BR-1665` |
| `PH-3.25` | **Disaster recovery rehearsal** from a clean server | `0.28` | 1 | Full restore performed and timed | `BR-1731` |
| `PH-3.26` | Soft launch: limited cohort, monitoring, feedback loop | all | 1 | First real learners onboarded | `DEC-59` |

**Phase 3 exit:** 🚀 **the platform earns.**

---

# Phase 4 — Motivation & Proof · 22 tasks · 4 weeks

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-4.1` | Schema: `learning_goals` `goal_history` `streaks` `achievements` | `2.28` | 1 | One active goal enforced by index | `TBL-038`–`041` |
| `PH-4.2` | Onboarding flow: 4 steps, one question per screen, skippable | `4.1`, `0.24` | 1.5 | ≥ 70% completion target | `BR-722` |
| `PH-4.3` | Projected completion date: formula, blending, ±7 day clamp | `4.1`, `2.34` | 1.5 | Plausible against real sessions | `BR-792` |
| `PH-4.4` | Onboarding projection screen — the payoff moment | `4.3` | 0.5 | Date shown immediately | `BR-725` |
| `PH-4.5` | Goal editing with history and recalculation | `4.3` | 0.5 | Delta shown on change | `BR-216` |
| `PH-4.6` | `GoalHorizon` component: horizontal rail with momentum gradient | `4.3`, `0.17` | 1 | Only permitted gradient | `BR-1213` |
| `PH-4.7` | Streak engine: qualifying activity, timezone buckets, silent freezes | `2.34` | 1.5 | Freeze applied then reported | `BR-796` |
| `PH-4.8` | `StreakBadge` + `WeekStrip` with no deficit framing | `4.7` | 1 | Missed days neutral | `BR-1244` |
| `PH-4.9` | Motivation dashboard assembling all blocks in fixed order | `4.6`, `4.8`, `2.32` | 1.5 | Single aggregated request | `BR-227` |
| `PH-4.10` | Distance-to-goal + recovery messaging (server-generated copy) | `4.3` | 1 | No `behind` status value exists | `BR-1138` |
| `PH-4.11` | Milestones + `MilestoneToast` + achievement history | `4.1` | 1 | Non-blocking celebrations | `BR-239` |
| `PH-4.12` | Next-step recommendations | `4.1`, `2.29` | 1 | Max 3, with stated reason | `BR-242` |
| `PH-4.13` | Schema: `quizzes` `questions` `question_options` `quiz_questions` `quiz_attempts` `attempt_answers` | `2.1` | 1 | Migration applied | `TBL-042`–`047` |
| `PH-4.14` | Quiz builder + configuration UI | `4.13`, `3.8` | 1.5 | Draft-only for `ROLE-03` | `BR-247` |
| `PH-4.15` | Question components: 5 types with Arabic normalization | `4.13`, `0.24` | 2 | Alef and diacritic normalization | `BR-256` |
| `PH-4.16` | Attempt engine: snapshots, incremental save, interruption handling | `4.13` | 1.5 | Never auto-fails on interruption | `BR-1018` |
| `PH-4.17` | `QuizResult` with closed outcome vocabulary and lesson links | `4.16` | 1 | Cannot render "failed" | `BR-1558` |
| `PH-4.18` | Question bank + randomized selection | `4.13` | 0.5 | Fresh draw per attempt | `BR-272` |
| `PH-4.19` | Schema + eligibility engine: `certificates` | `4.16`, `2.29` | 1 | Evaluated on completion event | `BR-274` |
| `PH-4.20` | Synchronous issuance + verification code + celebration | `4.19` | 1 | No processing wait state | `BR-1150` |
| `PH-4.21` | PDF generation (queued, off-peak, concurrency 1) + R2 storage | `4.20` | 1.5 | CPU under 60% during batch | `BR-1602` |
| `PH-4.22` | Public verification page + sharing | `4.20` | 1 | Valid / revoked / not-found correct | `BR-1130` |

---

# Phase 5 — AI Mentor · 18 tasks · 4 weeks

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-5.1` | `AIProvider` abstraction + 4 implementations + failover | `0.3` | 1.5 | Normalized errors across vendors | `BR-1592` → `BR-292` |
| `PH-5.2` | Schema: `ai_task_configs` `ai_model_costs` `ai_usage_daily` | `1.1` | 0.5 | Migration applied | `TBL-049`–`054` |
| `PH-5.3` | Admin AI configuration panel + test console | `5.2`, `3.14` | 1.5 | Effective within 60 s, no restart | `BR-1025` |
| `PH-5.4` | Cost tracking per request + daily aggregation + budget alerts | `5.2` | 1 | Projection with 80% alert | `BR-1699` |
| `PH-5.5` | Schema + index: `content_chunks` with pgvector HNSW | `2.8` | 1 | Generated `tsvector` column works | `BR-1032` |
| `PH-5.6` | Chunking pipeline: block-aware, metadata-preserving, queued | `5.5`, `2.9` | 1.5 | No chunk spans lessons | `BR-1030` |
| `PH-5.7` | Embedding job with per-row model tagging + re-index on edit | `5.6`, `5.1` | 1 | Stale marking works | `BR-1029` |
| `PH-5.8` | Hybrid retrieval: vector + Arabic FTS, merge, rerank, threshold | `5.7` | 2 | Entitlement scoping before search | `BR-1692` |
| `PH-5.9` | Schema: `ai_conversations` `ai_messages` `ai_feedback` | `1.1` | 0.5 | Migration applied | `TBL-052`–`055` |
| `PH-5.10` | Context assembly: student context, spoiler boundary, rolling summary | `5.8`, `4.1` | 1.5 | No content beyond learner position | `BR-1693` |
| `PH-5.11` | Grounded generation with SSE streaming + metadata citations | `5.10` | 1.5 | Citations never model-generated | `BR-1691` |
| `PH-5.12` | Prompt injection defenses + adversarial verification | `5.11` | 1 | Deliberate injection ignored (tested) | `BR-1736` |
| `PH-5.13` | Quota enforcement on stream completion + `QuotaMeter` | `5.11`, `1.16` | 1 | Failed stream consumes nothing | `BR-1153` |
| `PH-5.14` | `AIPanel` `MessageBubble` `CitationChip` `StreamingText` `OutOfScopeCard` | `5.11`, `0.27` | 1.5 | Timestamp jump works | `BR-1111` → `FEAT-111` |
| `PH-5.15` | Schema + API: `qa_questions` `qa_answers` `qa_votes` | `2.1` | 0.5 | Migration applied | `TBL-056`–`058` |
| `PH-5.16` | Lesson Q&A with AI-first response and escalation | `5.15`, `5.11` | 1.5 | AI answers do not consume quota | `BR-1160` |
| `PH-5.17` | Instructor answer queue + knowledge-base promotion loop | `5.16`, `3.8` | 1 | Promoted answer becomes a chunk | `BR-1045` |
| `PH-5.18` | Model comparison tool + content gap report | `5.3`, `5.8` | 1 | Identical context to both models | `BR-1190` |

**Gate:** `BR-1735` — Arabic answer quality reviewed on 50 real questions before this phase closes.

---

# Phase 6 — Mobile · 16 tasks · 5 weeks

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-6.1` | Expo project, shared packages, Expo Router navigation | `0.12` | 1.5 | Tokens render natively | `BR-1576` |
| `PH-6.2` | Secure token storage (Keychain / EncryptedSharedPreferences) | `6.1`, `1.3` | 1 | Never in plain storage | `BR-1624` |
| `PH-6.3` | Authentication: Google, email, phone + optional biometric unlock | `6.2` | 1.5 | Parity with web | `FEAT-193` |
| `PH-6.4` | Native primitives and form components from shared definitions | `6.1` | 2 | Same API as web | `BR-1576` |
| `PH-6.5` | Dashboard with identical block order + cache-first render | `6.4`, `4.9` | 1.5 | No spinner on open | `BR-1280` |
| `PH-6.6` | Course and lesson lists with rail components | `6.4`, `2.31` | 1.5 | Locked states without commercial language | `BR-1281` |
| `PH-6.7` | Native video playback with token flow | `6.3`, `2.16` | 2 | No caching to device | `BR-557` |
| `PH-6.8` | Watermarking and device binding on mobile | `6.7`, `2.25` | 1 | Same enforcement as web | `FEAT-194` |
| `PH-6.9` | **Screen protection module**: `FLAG_SECURE` + `isCaptured` | `6.7` | 2 | Black frame on Android; pause on iOS | `DEC-44` |
| `PH-6.10` | Notes with timestamp capture + offline drafts | `6.7`, `2.33` | 1.5 | Input under one-third of screen | `BR-1253` |
| `PH-6.11` | AI tutor with streaming | `6.4`, `5.14` | 1 | Streaming mandatory | `BR-1566` |
| `PH-6.12` | Quizzes with interruption-safe attempts | `6.4`, `4.16` | 1.5 | Incremental submission | `BR-1569` |
| `PH-6.13` | Cross-device sync with offline queue and monotonic completion | `6.5` | 1.5 | Mid-lesson switch works | `BR-1930` → `BR-930` |
| `PH-6.14` | Push notifications, deep links, permission timing | `6.5` | 1.5 | Requested after first lesson | `BR-1282` |
| `PH-6.15` | Purchase redirection compliance: no prices, no purchase UI | `6.6` | 0.5 | Verified against current policy | `BR-1737` |
| `PH-6.16` | Store assets, submission, review response | all | 2 | Approved in both stores | `BR-1738` |

---

# Phase 7 — Growth · 14 tasks · 3 weeks

| ID | Task | Depends | Est | Output | Refs |
|---|---|---|---:|---|---|
| `PH-7.1` | Schema + eligibility: `reviews` | `2.29` | 0.5 | Configurable thresholds | `DEC-10` |
| `PH-7.2` | Review submission with eligibility endpoint | `7.1`, `0.24` | 1 | Form absent when ineligible | `BR-1162` |
| `PH-7.3` | Moderation queue + auto-approve after 7 days | `7.1`, `3.8` | 1 | Low rating cannot be rejected | `BR-1047` |
| `PH-7.4` | Display threshold + aggregate rating + instructor reply | `7.3` | 1 | Hidden below 5 approved | `BR-1049` |
| `PH-7.5` | Schema + API: `notifications` `notification_preferences` `push_tokens` | `1.1` | 0.5 | Migration applied | `TBL-066`–`068` |
| `PH-7.6` | Notification center + preferences matrix | `7.5`, `0.27` | 1 | Transactional not disableable | `BR-1064` |
| `PH-7.7` | Lifecycle sequences: inactivity 3/7/14/30 with hard stop | `7.5`, `3.22` | 1.5 | Names a specific lesson each time | `BR-757` |
| `PH-7.8` | Milestone and subscription lifecycle email | `7.7` | 1 | Only 50% and completion by email | `BR-429` |
| `PH-7.9` | Push integration with email suppression | `7.6`, `6.14` | 1 | Push suppresses equivalent email | `BR-1759` → `BR-759` |
| `PH-7.10` | Analytics read model schema + event projections | `1.1` | 1.5 | No cross-module reads | `DEC-23` |
| `PH-7.11` | Scheduled reconciliation jobs for projections | `7.10` | 1 | Rebuildable from source | `BR-905` |
| `PH-7.12` | Reports: revenue, funnel, completion, drop-off, engagement, AI, quiz, support | `7.10`, `3.8` | 2.5 | Each answers a stated metric | `BR-1436` |
| `PH-7.13` | At-risk learners report with direct actions | `7.12` | 0.5 | Actionable per row | `BR-517` |
| `PH-7.14` | Data export as background jobs with PII gating | `7.12` | 1 | Audit-logged, PII flagged | `BR-1198` |

**Phase 7 exit:** 🏁 **all 220 features shipped.**

---

## 2. Task Summary

| Phase | Tasks | Days | Weeks |
|---|---:|---:|---:|
| 0 — Foundation | 28 | ~19 | 3 |
| 1 — Identity & Commerce | 32 | ~30 | 5 |
| 2 — Content & Learning | 34 | ~38 | 6 |
| 3 — Operations & Launch | 26 | ~26 | 4 |
| 4 — Motivation & Proof | 22 | ~25 | 4 |
| 5 — AI Mentor | 18 | ~22 | 4 |
| 6 — Mobile | 16 | ~24 | 5 |
| 7 — Growth | 14 | ~16 | 3 |
| **Total** | **191** | **~200** | **34** |

- `BR-1769` — Estimates assume focused working days. A day with three hours of authoring is not a task day.
- `BR-1770` — Actual duration is recorded per task. After Phase 0, estimates are recalibrated against the measured ratio (`DEC-56`).

---

## 3. The First Week

Concretely, to start:

```
Day 1   PH-0.7   VPS hardening — before anything else touches the server
Day 2   PH-0.1   Monorepo · PH-0.2 shared config
Day 3   PH-0.3   API scaffold · PH-0.4 web scaffold · PH-0.5 Docker Compose
Day 4   PH-0.6   Prisma · PH-0.8 Cloudflare
Day 5   PH-0.9   Coolify · PH-0.10 CI pipeline
Day 6   PH-0.11  Deploy + rollback verification
```

- `BR-1771` — `PH-0.7` is first. Hardening a server that already holds data is a different and worse task.

---

## 4. Execution Discipline

- `BR-1772` — One task at a time. Parallel half-finished tasks are how solo projects stall.
- `BR-1773` — Every task ends with a commit on a green build (`BR-1518`).
- `BR-1774` — A task blocked by an unanswered question stops. The question is escalated, not guessed.
- `BR-1775` — Tasks are not reordered for interest. Dependency order exists for a reason (`BR-1764`).
- `BR-1776` — At each phase boundary the founder pauses, recalibrates, and records what diverged (`BR-1748`).

---

## 5. Documentation Set — Complete

| # | Document | Contents |
|---|---|---|
| 01 | Problem & Goals | 8 goals · 12 metrics · 10 non-goals · 7 principles |
| 02 | Target Users | 5 learner personas · 6 segments · 4 staff roles · 5 anti-personas |
| 03 | Features Identification | 220 features · 21 modules |
| 04 | Feature Catalog (5 parts) | Every feature specified · 638 rules |
| 05 | Roles & Permissions | 174 permissions · 5 roles · capability map |
| 06 | User Flows | 30 end-to-end flows |
| 07 | Business Logic | 11 state machines · 9 formulas · copy specification · 60 settings |
| 08 | System Design | Applications · data stores · providers · resource allocation |
| 09 | System Architecture | Tier model · dependency matrix · fitness functions |
| 10 | Database Design (2 parts) | 85 tables · 42 enums · indexing · migrations |
| 11 | API Contract (2 parts) | 248 endpoints · conventions · error model |
| 12 | UI/UX Design | 72 screens · design system · implementation standard · 134 components |
| 13 | Tech Stack | Every tool with rationale and rejected alternatives |
| 14 | Security Design | Threat model · 8 defense areas · incident response |
| 15 | Implementation Roadmap | 8 phases · milestones · risk register |
| 16 | Task Breakdown | 191 executable tasks |

**Totals:** 220 features · 1,790 business rules · 60 decisions · 174 permissions · 85 tables · 248 endpoints · 134 components · 72 screens · 30 flows · 191 tasks.

- `BR-1777` — These documents are the specification of record. Where code and documents disagree, one of them is wrong and it is resolved, not tolerated (`BR-1765`).
- `BR-1778` — Every document is versioned. Material changes bump the version and note what changed.

---

## 6. Open Questions — Outstanding

| ID | Question | Owner | Needed by |
|---|---|---|---|
| `OQ-01` | Commercial registration for Paymob | Founder | Phase 1 |
| `OQ-21` | Certificate PDF layout | Founder | Phase 4 |
| `OQ-22` | Week start day default | Founder | Phase 4 |
| `OQ-23` | PDF rendering approach on 2 vCPU | Joint | Phase 4 |
| `OQ-24` | Renovate auto-merge policy | Founder | Phase 0 |
| `OQ-25` | Learner 2FA | Founder | Phase 3 |
| `OQ-26` | Breach notification commitment | Founder | Phase 3 |
| `OQ-27` | Soft launch pricing | Founder | Phase 3 |
| `OQ-28` | Mobile before growth | Founder | Phase 5 exit |

- `BR-1779` — No open question blocks Phase 0. Work begins now.
- `BR-1780` — `OQ-01` is the only one with an external dependency and a long lead time. It is started in parallel from day one (`15 §7`).

---

## 7. Approval

| Item | Status |
|---|---|
| Task granularity (half a day to two days) is right | ☐ Approved |
| 191 tasks cover all 220 features and 134 components | ☐ Approved |
| Dependency ordering is correct | ☐ Approved |
| VPS hardening as task one (`BR-1771`) is accepted | ☐ Approved |
| Estimates are realistic for solo + AI execution | ☐ Approved |
| Execution discipline rules (`§4`) are binding | ☐ Approved |
| Documentation set is complete and no document is missing | ☐ Approved |
| **Ready to begin execution at `PH-0.7`** | ☐ Approved |

---

**End of the planning documentation set.**

---
