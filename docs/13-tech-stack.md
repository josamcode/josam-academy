# 13 — Tech Stack Finalization

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 13 — Tech Stack Finalization |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | `08-system-design.md`, `09-system-architecture.md`, `10-database-design`, `12-ui-ux-design.md` |
| **Feeds Into** | `14-security-design.md`, `15-implementation-roadmap.md`, `16-task-breakdown.md` |
| **Adds** | `BR-1577` – `BR-1604` · `BR-1805` – `BR-1811`, `BR-1814` – `BR-1818` (`§18`) · `DEC-44` – `DEC-52` |

---

## 1. Selection Principles

Five filters. A tool must pass all five.

| # | Filter | Why |
|---|---|---|
| 1 | **Runs within 2 vCPU / 8 GB** | `CON-03`. A tool that needs its own machine is disqualified. |
| 2 | **Operable by one person** | `CON-01`. Operational burden is a permanent cost. |
| 3 | **Free or near-free at this scale** | `CON-02`. ~$30/month total. |
| 4 | **Mature and maintained** | A one-person team cannot absorb a breaking upstream surprise. |
| 5 | **Replaceable behind an abstraction** | Every external dependency sits behind an interface (`BR-851`). |

- `BR-1577` — A dependency that fails any filter requires a documented exception approved by the founder.
- `BR-1578` — "Popular" is not a justification. Every choice below states what it beat and why.

---

## 2. Language & Runtime

| Concern | Choice | Version | Rationale |
|---|---|---|---|
| Language | **TypeScript** | 5.6+ | One language across API, web, mobile, and shared packages. Types are the primary enforcement mechanism for `§17` (`DEC-40`). |
| Runtime | **Node.js** | 24 LTS | Active LTS ("Krypton"), maintained through April 2028. Native fetch, stable test runner, best ecosystem fit. Node 22 moved to Maintenance LTS; see `§18`. |
| Package manager | **pnpm** | 9+ | Content-addressed store — dramatically less disk than npm on a 100 GB volume, and strict by default so phantom dependencies fail early. |
| Monorepo | **Turborepo** | 2+ | Task caching and dependency-aware builds (`DEC-25`). |

**Rejected:**

| Option | Why not |
|---|---|
| Bun | Fast and appealing, but ecosystem edge cases still surface. A one-person team cannot debug a runtime. |
| Deno | Smaller ecosystem for the specific integrations needed. |
| npm / yarn | Disk usage and hoisting looseness (`CON-03`). |
| Nx | More capable than needed; Turborepo's smaller surface fits a solo project. |

- `BR-1579` — `strict: true` in every `tsconfig`. `any` and `@ts-ignore` fail the build (`BR-1497`).

---

## 3. Backend

| Concern | Choice | Version | Rationale |
|---|---|---|---|
| Framework | **NestJS** | 10+ | Module boundaries are first-class, matching `09 §3` exactly. Guards, interceptors, and DI make the request pipeline in `08 §4.4` declarative rather than hand-wired. |
| ORM | **Prisma** | 5+ | Type-safe queries generated from the schema, and a migration system that supports the expand–contract discipline (`DEC-20`). |
| Validation | **Zod** | 3+ | Schemas shared between API and clients (`BR-925`). |
| Auth | **Custom** on `jose` + `argon2` | — | The token design (`08 §7`) is specific; an auth library would fight it. |
| Permissions | **CASL** | 6+ | Shared ability definitions across three clients (`FEAT-018`). |
| Queue | **BullMQ** | 5+ | Redis-backed, mature, with concurrency controls the CPU budget requires (`BR-873`). |
| API docs | **@nestjs/swagger** | — | Generates the OpenAPI spec that produces `packages/contracts` (`DEC-30`). |
| Logging | **Pino** | 9+ | Fastest structured JSON logger; low overhead matters on 2 vCPU. |

**Rejected:**

| Option | Why not |
|---|---|
| Express / Fastify raw | Would require hand-building module boundaries, DI, and the guard pipeline — the exact things NestJS provides. |
| Drizzle | Excellent and lighter, but Prisma's migration tooling and generated client are worth more here than the runtime savings. |
| TypeORM | Migration reliability history. |
| Passport | Adds abstraction over an auth flow we already specify precisely. |
| RabbitMQ / Kafka | A second service to operate for a workload Redis handles (`CON-01`). |

- `BR-1580` — Prisma is confined to repositories. It never appears in a service or controller (`BR-1497`, `BR-897`).

---

## 4. Frontend

| Concern | Choice | Version | Rationale |
|---|---|---|---|
| Framework | **Next.js** | 16 (App Router) | SSG/ISR for public pages, CSR for authenticated surfaces (`DEC-17`), and admin inside the same app (`DEC-16`). |
| UI runtime | **React** | 19 | Required by Next 16. |
| Styling | **Tailwind CSS** | 4 | Utility layer bound to our tokens (`DEC-34`). v4's CSS-first config maps cleanly to the token package. |
| Component behavior | **Radix Primitives** | latest | Unstyled behavior and ARIA (`DEC-39`). Never exposed to feature code (`BR-1528`). |
| Server state | **TanStack Query** | 5+ | Caching, invalidation, request cancellation, and background refresh — the mechanics `§17.17` requires. |
| Forms | **React Hook Form** + Zod | 7+ | Uncontrolled by default, so heavy forms do not re-render on every keystroke (`BR-1478` spirit). |
| Icons | **Lucide React** | latest | One library, consistent stroke (`BR-1487`). Tree-shakeable named imports (`BR-1478`). |
| Charts | **Recharts** | 2+ | Sufficient for the six reports in `11 §API-20`, React-native rendering, no canvas dependency. |
| Video | **hls.js** | 1.5+ | The playback layer under our custom player (`FEAT-063`). |
| Markdown | **react-markdown** + `rehype-sanitize` | — | Lesson Notes and learner notes. Sanitization is mandatory (`BR-1462`). |
| Code highlighting | **Shiki** | 1+ | Build-time highlighting — zero runtime cost, correct for a programming curriculum. |
| Component workshop | **Storybook** | 8+ | The component contract surface (`DEC-42`). |

**Rejected:**

| Option | Why not |
|---|---|
| shadcn/ui as-is | Copy-in components carry opinions that fight Arabic-first typography and the rail motif. We take the Radix layer directly instead (`DEC-34`). |
| MUI / Chakra / Ant | Heavy, opinionated, and would be overridden extensively — the worst of both (`BR-1350`). |
| Redux / Zustand for server data | Two sources of truth (`BR-924`). |
| Formik | Controlled-by-default re-render cost. |
| D3 directly | More power than six reports justify. |
| Prism / highlight.js | Runtime cost; Shiki does it at build time. |
| Video.js | Large, and we need custom controls anyway (`FEAT-063`). |

- `BR-1581` — Recharts and hls.js are dynamically imported. Neither belongs in the initial bundle (`BR-1486`).

---

## 5. Mobile

| Concern | Choice | Version | Rationale |
|---|---|---|---|
| Framework | **React Native** via **Expo** | SDK 52+ | One codebase, shared packages, OTA updates for JS changes (`BR-553`). |
| Navigation | **Expo Router** | 4+ | File-based, matching the web mental model. |
| Storage | **expo-secure-store** | — | Keychain / EncryptedSharedPreferences (`BR-554`). |
| Video | **expo-video** | — | Native playback with the protection hooks (`FEAT-194`). |
| Push | **expo-notifications** | — | Unified APNs/FCM. |
| Screen protection | Custom native module | — | `FLAG_SECURE` on Android, `isCaptured` on iOS (`FEAT-141`). No existing package covers both correctly. |

**Rejected:**

| Option | Why not |
|---|---|
| Flutter | A second language and a second UI system; no code sharing with web (`CON-01`). |
| Bare React Native | Expo's build service and OTA updates are worth more than the marginal control. |
| Capacitor / PWA | Cannot implement `FLAG_SECURE` or reliable capture detection (`GOAL-04`). |

- `BR-1582` — `DEC-44` — The screen-protection module is written and maintained by us. It is a `GOAL-04` requirement and too security-sensitive to delegate to an unmaintained package (`BR-1468`).

---

## 6. Data Layer

| Concern | Choice | Version | Rationale |
|---|---|---|---|
| Database | **PostgreSQL** | 16 | `jsonb` for bilingual fields, Arabic full-text search, and `pgvector` in one engine (`DEC-18`). |
| Vector | **pgvector** | 0.7+ | HNSW indexing inside the existing database (`BR-1095`). |
| Cache / queue | **Redis** | 7+ | Three roles, one service (`08 §5.2`). |
| Migrations | **Prisma Migrate** | — | Expand–contract enforced by review and a custom check (`BR-1097`). |

**Rejected:**

| Option | Why not |
|---|---|
| MongoDB | The domain is deeply relational — entitlements, progress, unlock rules. |
| Pinecone / Qdrant / Weaviate | A second service and a monthly cost for a few thousand chunks (`DEC-18`). |
| Elasticsearch | Would consume more RAM than the entire application (`CON-03`). |
| MySQL | Weaker `jsonb`, no `pgvector`. |

---

## 7. Shared Packages

```
packages/
├── contracts/   generated from OpenAPI + Zod schemas   (DEC-30)
├── abilities/   CASL definitions                        (BR-708)
├── tokens/      design tokens → CSS vars + RN constants (BR-1533)
├── ui/          134 components                          (§20)
├── i18n/        AR/EN catalogs + plural rules           (BR-525)
└── config/      tsconfig · eslint · prettier · tailwind
```

- `BR-1583` — `packages/tokens` is the single source for color, spacing, type, radius, and motion. Web consumes CSS custom properties; mobile consumes generated constants (`BR-190`).
- `BR-1584` — `packages/contracts` is generated in CI. Hand-editing it fails the build (`BR-931`).

---

## 8. Infrastructure & External Services

| Concern | Provider | Plan | Monthly |
|---|---|---|---|
| Server | Hostinger VPS (KVM 2) | Prepaid to 2027 | $0 |
| Container platform | Coolify (self-hosted) | — | $0 |
| DNS · CDN · WAF | Cloudflare | Free | $0 |
| Domain | `josamacademy.com` | Annual | ~$1 |
| Video | **Bunny Stream** | Pay-as-you-go | ~$8 |
| Object storage | **Cloudflare R2** | Pay-as-you-go | ~$2 |
| Email | **Resend** | Free (3,000/mo) | $0 |
| Push | Expo Push | Free | $0 |
| AI — chat | Configurable (`FEAT-107`) | Pay-as-you-go | ~$8–12 |
| AI — embeddings | OpenAI `text-embedding-3-large` | Pay-as-you-go | < $1 |
| SMS / OTP | See `DEC-45` | Pay-as-you-go | ~$5–10 |
| Payments — Egypt | Paymob (or Kashier, `DEC-01`) | Per transaction | % of revenue |
| Payments — International | Stripe | Per transaction | % of revenue |
| CI | GitHub Actions | Free tier | $0 |
| Registry | GitHub Container Registry | Free | $0 |
| Error tracking | Sentry | Free (5k events) | $0 |
| Uptime | UptimeRobot | Free | $0 |
| Alerts | ntfy or Telegram bot | Free | $0 |
| **Total** | | | **~$25–35** |

- `BR-1585` — Every paid service has a spend alert configured before it is used in production.
- `BR-1586` — Payment processing fees are revenue-proportional and excluded from the infrastructure budget (`CON-02`).

### 8.1 `DEC-45` — SMS Provider (resolves `OQ-17`)

Phone OTP is a real cost: at 100 learners with roughly two verifications each, this is 200 SMS/month.

| Provider | Cost per SMS (EG) | Requires local registration | Available now |
|---|---|---|---|
| **Twilio Verify** | ~$0.05 | No | ✔ |
| SMSMisr / Victory Link | ~$0.004 | Yes | Blocked by `OQ-01` |
| Unifonic (Gulf) | ~$0.02 | Yes | Blocked |

**Decision:** implement the `SmsProvider` abstraction in Phase 1 with **Twilio Verify** as the reference implementation, because it is available immediately and unblocked by registration. Migrate to a regional provider once commercial registration exists — a config change, cutting cost by roughly 90%.

- `BR-1587` — Phone authentication ships behind a feature flag. If SMS spend exceeds its budget, it can be disabled without a deployment while Google and email login continue (`BR-889`).
- `BR-1588` — OTP rate limits (`BR-007`) are cost controls as much as security controls.

---

## 9. Development Tooling

| Concern | Choice | Notes |
|---|---|---|
| Lint | ESLint 9 (flat config) | Plus `boundaries`, `jsx-a11y`, and custom rules (`§19`) |
| Style lint | Stylelint 16 | Token and logical-property enforcement |
| Format | Prettier 3 | Including Tailwind class sorting |
| Git hooks | Husky + lint-staged | Fast pre-commit checks only |
| Commits | Conventional Commits | Enables changelog generation |
| Local stack | Docker Compose | Postgres + Redis + MailHog |
| Env validation | Zod at startup | Fails fast on a missing secret (`BR-943`) |
| Dependency audit | `pnpm audit` + Renovate | Weekly, grouped updates |

---

## 10. Testing

| Level | Tool | Scope |
|---|---|---|
| Unit | **Vitest** | Formulas, state machines, domain logic |
| Integration | **Vitest** + Testcontainers | Module interfaces against a real Postgres |
| Contract | Generated from OpenAPI | Response shape conformance |
| Permission matrix | Vitest, generated | Every endpoint × every role (`DEC-28`) |
| Component | Storybook test runner | Every story, all states |
| Accessibility | axe via Storybook + Playwright | Every story and every critical flow |
| Visual regression | Playwright screenshots | Per story, both themes, both directions |
| E2E | **Playwright** | `FLOW-01`, `04`, `06`, `09`, `13` only (`BR-938`) |
| Load | k6 | Dashboard and playback-token endpoints |

**Rejected:** Jest (slower, heavier config than Vitest in a Vite/TS monorepo) · Cypress (Playwright's multi-browser and trace tooling are stronger).

- `BR-1589` — Visual regression runs in both themes and both directions (`BR-1570`).
- `BR-1590` — Load testing targets `GET /me/dashboard` and `POST /lessons/:id/playback-token` — the two endpoints whose latency the entire product experiences (`BR-1210`).

---

## 11. Version Policy

- `BR-1591` — `DEC-46` — Dependencies are pinned to exact versions in `package.json`. Ranges are how a working build breaks overnight without a code change.
- `BR-1592` — Renovate opens grouped update PRs weekly. Patch and minor updates merge on green CI; major updates are reviewed individually.
- `BR-1593` — Node and PostgreSQL track LTS only.
- `BR-1594` — No experimental or canary release reaches production (`BR-1468`).
- `BR-1595` — A dependency unmaintained for 12 months is scheduled for replacement.

---

## 12. Local Development

```bash
# Prerequisites: Node 24 LTS, pnpm 11, Docker   (exact pins: §18)

git clone git@github.com:<org>/josam-academy.git
cd josam-academy
pnpm install

cp .env.example .env          # fill in local values
docker compose up -d          # postgres · redis · mailhog

pnpm db:migrate               # apply migrations
pnpm db:seed                  # roles · permissions · settings · templates
pnpm dev                      # api :4000 · web :3000 · storybook :6006
```

| Service | Port | Notes |
|---|---|---|
| API | 4000 | NestJS with hot reload |
| Web + Admin | 3000 | Next.js |
| Storybook | 6006 | Component workshop |
| PostgreSQL | 5432 | Docker, with pgvector |
| Redis | 6379 | Docker |
| MailHog | 8025 | Catches all outbound email locally |

- `BR-1596` — `DEC-47` — No developer ever sends real email or SMS locally. MailHog captures email; SMS logs to the console in development.
- `BR-1597` — Local development never points at production services. Environment validation refuses production URLs when `NODE_ENV=development` (`BR-1454`).
- `BR-1598` — Seeds are idempotent and produce a fully usable local environment in one command (`BR-1103`).

---

## 13. Provider Abstractions

Every external service is reached through an interface. This is what makes the stack survivable.

| Interface | Current | Migration path |
|---|---|---|
| `VideoProvider` | Bunny Stream | VdoCipher when DRM is funded (`NG-06`) |
| `StorageProvider` | Cloudflare R2 | Any S3-compatible |
| `PaymentProvider` | Paymob + Stripe | Kashier (`DEC-01`) |
| `AIProvider` | Configurable per task | Any vendor (`FEAT-107`) |
| `EmailProvider` | Resend | Any SMTP or API provider |
| `SmsProvider` | Twilio Verify | Regional provider (`DEC-45`) |
| `PushProvider` | Expo Push | FCM / APNs direct |

- `BR-1599` — No vendor SDK is imported outside `shared/providers` (`BR-899`).
- `BR-1600` — Each interface has at least one alternative implementation stubbed in tests, proving the abstraction is real rather than decorative.

---

## 14. Complete Dependency Inventory

**API** — `@nestjs/*` · `prisma` `@prisma/client` · `zod` · `jose` · `argon2` · `@casl/ability` · `bullmq` `ioredis` · `pino` · `@aws-sdk/client-s3` (R2) · `resend` · `stripe` · `nanoid` `ulid` · `date-fns` `date-fns-tz` · `sharp` · `puppeteer-core` (certificate PDF)

**Web** — `next` · `react` `react-dom` · `tailwindcss` · `@radix-ui/react-*` · `@tanstack/react-query` · `react-hook-form` `@hookform/resolvers` · `zod` · `lucide-react` · `recharts` · `hls.js` · `react-markdown` `rehype-sanitize` · `shiki` · `next-intl`

**Mobile** — `expo` · `expo-router` · `expo-secure-store` · `expo-video` · `expo-notifications` · `react-native-mmkv` · shared packages

**Shared** — `typescript` · `@casl/ability` · `zod` · `date-fns`

**Dev** — `turbo` · `vitest` · `@playwright/test` · `storybook` · `eslint` `stylelint` `prettier` · `husky` `lint-staged` · `dependency-cruiser` · `size-limit` · `@axe-core/playwright` · `testcontainers`

- `BR-1601` — Every package above was verified to exist and be actively maintained before inclusion (`BR-1468`).
- `BR-1602` — `puppeteer-core` runs in the `media` queue with concurrency 1 and only off-peak. Headless Chrome is the single heaviest process in the stack on 2 vCPU (`BR-882`).

---

## 15. Cost Summary

| Scenario | Monthly |
|---|---|
| Launch (0–100 learners) | **~$18** |
| 300 learners | ~$32 |
| 500 learners | ~$48 |
| 1,000 learners | ~$85 |

**Growth drivers, in order:** video bandwidth → AI usage → SMS → email tier.

- `BR-1603` — At 300 learners the video and AI budgets are reviewed. Both are usage-proportional, and both have cheaper configurations available (`BR-334`, regional SMS).
- `BR-1604` — Infrastructure spend is reported on the operations dashboard alongside revenue so the ratio is always visible (`FEAT-163`).

---

## 16. Open Questions

| ID | Question | Blocking | Owner |
|---|---|---|---|
| `OQ-23` | Certificate PDF generation via headless Chrome is CPU-heavy. Alternative: generate on a scheduled off-peak batch, or use an external rendering service (~$0 at this volume). Decide before Phase 4. | `15-implementation-roadmap` | Joint |
| `OQ-24` | Should Renovate auto-merge patch updates on green CI, or require review? Auto-merge saves time but removes a checkpoint. | `16-task-breakdown` | Founder |

---

## 17. Approval

| Item | Status |
|---|---|
| TypeScript + Node 24 + pnpm + Turborepo is accepted | ☐ Approved |
| NestJS + Prisma + PostgreSQL 16 + Redis is accepted | ☐ Approved |
| Next.js 15 + Tailwind 4 + Radix + TanStack Query is accepted | ☐ Approved |
| Expo for mobile with a custom screen-protection module (`DEC-44`) | ☐ Approved |
| Twilio Verify now, regional SMS provider later (`DEC-45`) | ☐ Approved |
| Exact version pinning with weekly Renovate (`DEC-46`) | ☐ Approved |
| Local development never touches real services (`DEC-47`) | ☐ Approved |
| Every external service sits behind an abstraction | ☐ Approved |
| Rejected alternatives and their reasons are accepted | ☐ Approved |
| Cost projection is acceptable | ☐ Approved |

**Next document:** `14-security-design.md` — authentication hardening, authorization enforcement, content protection depth, data protection, input validation, secrets management, and the threat model.

---

## 18. Appendix — Resolved Versions (Phase 0)

| Field | Value |
|---|---|
| **Resolved on** | 2026-07-28 |
| **Resolved during** | Phase 0, before `PH-0.1` |
| **Authority** | Founder-authorised reconciliation pass over `§2` – `§7`, narrowed to Phase 0 scope |
| **Method** | Every version queried live from the npm registry / nodejs.org / Docker Hub and verified to exist (`BR-1468`). Interoperability probed, not assumed. |

**How to read this appendix.** A `+` in the Documented column is a **floor**: any version at or
above it satisfies the specification, and choosing a current major is a *resolved pin*, not a
divergence. A bare version with no `+` is an **exact statement**: changing its major is a
divergence and requires a document correction (`BR-1765`).

- `BR-1814` — Only `§18.1` is binding. A version in `§18.2` is an observation with a date on it,
  not a commitment, and carries no authority over the phase that installs it.
- `BR-1815` — A dependency is pinned by the phase that first installs it, using the versions
  current at that moment — not by a pass months earlier. Pinning Expo in Phase 0 for a Phase 6
  task is a decision made with stale information that will be remade anyway, and it violates
  `§1` filter 4: a one-person team cannot absorb a breaking upstream surprise it adopted early
  for no reason.

---

### 18.1 BINDING NOW — what Phase 0 actually touches

These are committed. **Pinned at** names the task that writes the version into a manifest;
until then the version is fixed but not yet installed. Every entry is re-verified at that task
(`BR-1811`).

#### Runtime and monorepo

| Concern | Documented | Pinned | Pinned at | Kind |
|---|---|---|---|---|
| Node.js | 24 LTS *(was 22)* | **24.18.0** — `.nvmrc` = `24` | `PH-0.1` | **Divergence — corrected in `§2` (`SB-02`)** |
| pnpm | 9+ | **11.17.0** | `PH-0.1` | Floor satisfied |
| Turborepo | 2+ | **2.10.7** | `PH-0.1` | Floor satisfied |
| TypeScript | 5.6+ | **6.0.3** | `PH-0.1` | Floor satisfied — capped, see `BR-1805` |

#### Lint, format, test (`PH-0.2`, `PH-0.16`)

| Concern | Documented | Pinned | Pinned at |
|---|---|---|---|
| ESLint | 9 (flat config) | **10.8.0** — flat config is the default | `PH-0.2` |
| typescript-eslint | — | **8.65.0** — *caps TypeScript at `<6.1.0`* | `PH-0.2` |
| Stylelint | 16 | **17.14.1** | `PH-0.2` |
| Prettier | 3 | **3.9.6** | `PH-0.2` |
| husky / lint-staged | — | **9.1.7** / **17.2.0** | `PH-0.2` |
| dependency-cruiser | — | **18.1.0** | `PH-0.16` |
| eslint-plugin-boundaries | — | **7.1.0** | `PH-0.16` |
| size-limit | — | **13.0.1** | `PH-0.16` |
| Vitest | — | **4.1.10** | `PH-0.2` |
| Playwright | — | **1.62.0** | `PH-0.15` |
| testcontainers | — | **12.0.4** | `PH-0.6` |

#### API (`PH-0.3`, `PH-0.6`, `PH-0.19`)

| Concern | Documented | Pinned | Pinned at | Note |
|---|---|---|---|---|
| NestJS | 10+ | **11.1.28** | `PH-0.3` | Floor satisfied |
| Pino | 9+ | **10.3.1** | `PH-0.19` | Floor satisfied |
| Zod | 3+ | **4.4.3** | `PH-0.3` | **Env validation only** (`§9`, `BR-943`). Shared/API schema use is Phase 1 and re-decided there. |
| Prisma / `@prisma/client` | 5+ | **7.9.1 — provisional** | `PH-0.6` | ⚠️ Probe required, see `BR-1816` |
| `ioredis` | — | **5.11.1** | `PH-0.5` | |

#### Web and design system (`PH-0.4`, `PH-0.12`–`PH-0.15`, `PH-0.17`, `PH-0.24`, `PH-0.27`)

| Concern | Documented | Pinned | Pinned at | Note |
|---|---|---|---|---|
| Next.js | 15 *(bare major)* | **16.2.12 — probe passed** | `PH-0.4` | Adopted. All four probe parts verified at `PH-0.4`; `§4` corrected to 16 (`BR-1809`). |
| React | 19 *(bare major)* | **19.2.8** | `PH-0.4` | Within the stated major |
| Tailwind CSS | 4 *(bare major)* | **4.3.3** | `PH-0.14` | Within the stated major |
| Storybook | 8+ | **10.5.5** | `PH-0.15` | Floor satisfied |
| `@storybook/addon-a11y` | — | **10.5.5** | `PH-0.15` | Carries axe for `BR-1571` |
| Radix Primitives | latest | per-package, **`react-dialog` 1.1.23** as reference | `PH-0.24`, `PH-0.27` | See `BR-1817` — Phase 0 **does** require Radix |
| Lucide React | latest | **1.27.0** | `PH-0.17` | `Icon` primitive, `BR-1487` |

#### Containers (`PH-0.5`)

| Concern | Documented | Pinned | Pinned at |
|---|---|---|---|
| PostgreSQL + pgvector | 16 / 0.7+ | **`pgvector/pgvector:0.8.5-pg16`** | `PH-0.5` |
| Redis | 7+ | **`redis:7.4.10-alpine`** | `PH-0.5` |
| Node base image | — | **`node:24.18-bookworm-slim`** | `PH-0.10` |

#### Binding constraints carried forward

- `BR-1805` — TypeScript is pinned to **6.0.3**, not the newer 7.0.2, because `typescript-eslint`
  declares `typescript: ">=4.8.4 <6.1.0"`. TypeScript 7 would silently disable type-aware linting,
  which is the mechanism that enforces `BR-1579`. The pin is raised only when `typescript-eslint`
  supports TypeScript 7. Verified against the registry, including the `canary` tag.
- `BR-1806` — TypeScript 6 **errors** on `moduleResolution: "node"` (node10); TypeScript 7 removes
  it outright. The error is silenceable with `ignoreDeprecations: "6.0"` — which `BR-1512`
  prohibits — so within this repository the effect is identical to removal. Every `tsconfig` in the
  monorepo uses `nodenext` or `bundler`. Verified at `PH-0.1` by compiling a deliberate `node10`
  config under TS 6.0.3: `error TS5107: Option 'moduleResolution=node10' is deprecated and will
  stop functioning in TypeScript 7.0`, **exit code 2**.
- `BR-1807` — PostgreSQL is held at the documented major 16 (supported to November 2028).
  `pgvector` is available for 16, so nothing forces a move, and a database major upgrade is not
  Phase 0 work.
- `BR-1808` — Redis is held on the 7.x line (7.4.10). It satisfies `7+`, is the last BSD-licensed
  line before the Redis 8 licence change, and is fully supported by BullMQ 5.
- `BR-1816` — **Prisma 7 is provisional.** Prisma 7 is a rewrite, not a bump, and it is the one
  deferred-risk dependency Phase 0 touches. Before it is pinned at `PH-0.6` it must be probed
  against: (a) the NestJS CommonJS build, (b) the generated client location, (c) whether the
  repository-only pattern of `BR-1580` still holds without leaking Prisma types upward. If any
  fails, drop to the latest Prisma 6 and record the reason. This is not discovered in Phase 1.
- `BR-1817` — Radix is a **Phase 0** dependency, not a deferred one: `PH-0.24` requires
  Radix-based choice fields (`DEC-39`) and `PH-0.27` requires `Dialog`, `Popover`, `Tooltip`, and
  `DropdownMenu`, which are Radix primitives per `12 §20.2`. Radix is versioned per package, so
  each package is pinned by the task that installs it, never as a blanket range.
- `BR-1809` — **Next.js 16 is adopted.** `§4` states `15`; a greenfield project starting on a
  superseded major buys itself a migration mid-build. The pin, and the corresponding correction to
  `§4`, are made at `PH-0.4` and are **gated on a probe** proving all four of: route groups render ·
  ISR works · Tailwind 4 binds · Storybook 10 with the a11y addon runs against it. If any fails,
  the result is reported and the pin holds at 15.x — the failure is never worked around.
- `BR-1811` — Every pin in `§18.1` is re-verified at the task named in its **Pinned at** column,
  against the registry as it exists at that moment. A version resolved weeks earlier is a starting
  point, not a fact.
- `BR-1810` — These pins are binding on, and must be identical across: `engines` ·
  `packageManager` · `.nvmrc` · the CI Node matrix · every Dockerfile base image. A mismatch
  between any two is a defect, not a preference (`BR-1591`, `DEC-46`).

---

### 18.2 DEFERRED — decided by the phase that introduces it

**Non-binding.** The version column records what was observed on 2026-07-28 as a reference point
only. It confers no decision. The named phase pins the real version, against the ecosystem as it
exists then (`BR-1814`, `BR-1815`).

| Concern | Documented floor | Observed 2026-07-28 | Decided at |
|---|---|---|---|
| CASL | 6+ | 7.0.1 | **Phase 1** — `PH-1.9` `packages/abilities` |
| `jose` | — | 6.2.4 | **Phase 1** — `PH-1.3` tokens |
| `argon2` | — | 0.45.1 | **Phase 1** — `PH-1.2` hashing |
| `@nestjs/swagger` | — | 11.4.6 | **Phase 1** — contracts generation |
| BullMQ | 5+ | 5.81.2 | **Phase 1** — first queued job |
| Stripe / payment SDKs | — | not queried | **Phase 1** — `PH-1.22` |
| TanStack Query | 5+ | 5.101.4 | **`PH-0.27`** — see `BR-1818` |
| React Hook Form + resolvers | 7+ | 7.83.0 / 5.5.7 | **`PH-0.21`** — see `BR-1818` |
| next-intl | — | 4.13.4 | **`PH-0.13`** — `packages/i18n` may not need it; `Intl.PluralRules` is native |
| `@axe-core/playwright` | — | 4.12.1 | **Phase 3** — E2E flows (`BR-938`). Phase 0 a11y runs via the Storybook addon. |
| react-markdown / rehype-sanitize | — | 10.1.0 / 6.0.0 | **Phase 2** — `PH-2.9` Lesson Notes |
| Shiki | 1+ | 4.3.1 | **Phase 2** — code highlighting in notes |
| hls.js | 1.5+ | 1.6.16 | **Phase 2** — `PH-2.17` player |
| Recharts | 2+ | 3.10.1 | **Phase 7** — `PH-7.12` reports |
| Expo SDK / Expo Router | 52+ / 4+ | 57.0.8 | **Phase 6** — `PH-6.1`, ~7 months out |
| `expo-secure-store` · `expo-video` · `expo-notifications` | — | not queried | **Phase 6** |
| `@aws-sdk/client-s3` (R2) | — | not queried | **Phase 2** — `PH-2.11` storage |
| `resend` | — | not queried | **Phase 3** — `PH-3.21` email |
| `puppeteer-core` | — | not queried | **Phase 4** — `PH-4.21` certificate PDF |
| `sharp` · `nanoid` · `ulid` · `date-fns` | — | not queried | at first use |

- `BR-1818` — **TanStack Query and React Hook Form are used directly. No library-agnostic
  abstraction is built over either.** `QueryBoundary` (`PH-0.27`) is built on TanStack Query and
  `Form` (`PH-0.21`) on React Hook Form; both are named as the mechanism, not as one candidate
  among several. `09 §7.2` states server data is TanStack Query and forms are React Hook Form +
  Zod, and `07` and `12` assume its cache and invalidation semantics directly rather than through
  an interface. Only the **version** is deferred — to `PH-0.27` and `PH-0.21` respectively —
  because neither is installed before then.

  This does **not** contradict `BR-1528`. That rule is about **Radix**: a headless behaviour
  library that supplies keyboard handling and ARIA wiring for a visible control, and therefore
  belongs *inside* our components where feature code never sees it. TanStack Query and React Hook
  Form are not visible controls and have no such surface to hide. Wrapping them would create an
  abstraction at its first use, which `BR-1355` prohibits — and a wrapper that re-exports one
  library's cache semantics under different names serves no one, because the thing it would be
  protecting against, a swap, is not planned and would not be made easier by it.

  *Corrected 2026-07-28 during `PH-0.1` on founder instruction. The superseded text said the
  choice between direct use and a library-agnostic interface was an open component-design
  decision, citing `BR-1528` in support of the wrapper. That reading of `BR-1528` was wrong.*

---

