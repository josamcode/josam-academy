# Josam Academy

Arabic-first online learning platform. `josamacademy.com`

**Status:** Phase 0 — Foundation. Nothing is deployed. See [`STATUS.md`](./STATUS.md) for what
actually works, which is the only place that answers that question honestly.

---

## Orientation

| File                                | What it is                                                            |
| ----------------------------------- | --------------------------------------------------------------------- |
| [`CLAUDE.md`](./CLAUDE.md)          | The operating protocol and the live Phase 0 task queue. The rules.    |
| [`STATUS.md`](./STATUS.md)          | Reality — progress, work log, blockers, divergences, debt.            |
| [`docs/`](./docs)                   | The specification: 16 documents, `01`–`16`, plus `BR-REGISTRY.md`.    |
| [`docs/runbooks/`](./docs/runbooks) | Operational procedures for the founder-executed infrastructure tasks. |

`docs/01`–`16` are frozen. They are corrected by the founder, never edited in passing.

## Requirements

Node **24.18.0** (`.nvmrc`) · pnpm **11.17.0** · Docker.

Exact versions for everything Phase 0 touches are pinned in `docs/13-tech-stack.md §18.1`, and are
binding across `engines`, `packageManager`, `.nvmrc`, the CI matrix and every Dockerfile base image
(`BR-1810`).

## Getting started

```bash
pnpm install
docker compose up -d          # Postgres 16 + pgvector, Redis 7, MailHog — 127.0.0.1 only
cp apps/api/.env.example apps/api/.env
pnpm --filter @josam/api run db:migrate
pnpm dev
```

## Workspaces

```
apps/api        NestJS 11 — modular monolith (08 §4.1)
apps/web        Next.js 16 — learner + admin in one app (DEC-16)
packages/config shared tsconfig, ESLint, Stylelint, Prettier
packages/tokens design tokens — the single source for colour, spacing, type, radius, motion
packages/i18n   AR/EN catalogs, Arabic 6-form plurals, locale utilities
packages/ui     the component library; feature code imports from here only (BR-1524)
```

`packages/contracts` and `packages/abilities` arrive at `PH-1.8`/`PH-1.9`. They are deliberately
absent — an empty package earns nothing while it waits.

## Verification

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

All four must be green before any task is marked done, and the output must have been _observed_ —
never claimed (`BR-1518`, `BR-1768`).

Locally, a pre-commit hook runs ESLint and Prettier over staged files, and commitlint enforces
`<type>(PH-0.x): <what>`. Note that the hook invokes ESLint from the repository root across all
workspaces, which is **not** equivalent to `turbo run lint`; both paths matter (`SB-15`).

## Licence

Proprietary. All rights reserved.
