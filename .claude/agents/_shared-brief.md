# Shared brief — every Josam Academy agent

This file is referenced by every agent definition in this directory. It is not an agent itself
(the leading underscore keeps it out of the roster).

## Toolchain — WSL host, Windows node_modules. Non-negotiable.

`node_modules` is a **Windows** pnpm install. Running bare `pnpm`/`npx` from WSL detects a
virtualStoreDir mismatch and PURGES the install. Therefore:

- Every `pnpm`/`turbo`/`node` package command runs through interop:
  `cmd.exe /c "pnpm exec turbo run test --force --filter=@josam/api"`
- **Never pipe a verification command.** `| tail` replaces the exit code. Redirect to a file,
  echo `EXIT=$?`, then read the file:
  `cmd.exe /c "pnpm lint" > /tmp/out.log 2>&1; echo "EXIT=$?"`
- Turbo caches green results. When the run is the evidence, add `--force` (BR-1768/BR-1832).
- Docker is Windows-side: `docker.exe`. The compose DB/Redis publish to `127.0.0.1` and are
  reachable from tests run through Windows node.
- Pure-JS scripts (`node scripts/check-*.mjs`) may run under WSL node, but prefer interop for
  consistency.

## Rules that bind every line you write (CLAUDE.md §4)

- `strict: true`; `any`, `@ts-ignore`, `eslint-disable`-to-get-green all fail the build (BR-1579).
- Semantic tokens only; no raw hex, no Tailwind palette utilities (BR-1220, BR-1342).
- Logical CSS properties only (BR-1232). No hardcoded user-facing strings (BR-525).
- Prisma only in repositories (BR-1580). Radix only inside `packages/ui` (BR-1528).
- Feature code imports UI from `@josam/ui` only (BR-1524). Exact dependency pins (BR-1591).
- Prohibited fixes (BR-1512): silencing lint, loosening a type, `!important`, magic offsets,
  `setTimeout` for races, disabling a test, `z-index:9999`, empty catch, blanket `?.`,
  `@ts-ignore`. If you reach for one, the design is wrong — stop and report.
- Never invent an endpoint, field, permission key, entitlement key, or reason code. If it is not
  in `docs/11-api-contract*` or `docs/05-roles-and-permissions.md`, it does not exist.
- **Never modify anything in `/docs`** (BR-1765). A wrong document is reported, not edited.
- No mock data ships. No `console.*` at merge.

## Proof discipline

- Every new assertion is made to FAIL once before it is trusted (BR-1835). Show the red run in
  your report: what you broke, the failing output, the restore.
- Paste real terminal output. Never claim a check you did not run (BR-1518, BR-1768).
- If you touch a verification mechanism (`scripts/verify-fitness.sh`, `scripts/check-*.mjs`,
  `.dependency-cruiser.mjs`, lint rules), you run that mechanism, not just the standard gate.

## Team discipline (founder rules, 2026-08-20 — every agent inherits these)

- **Never `git add -A` and never `git add .`.** Stage by explicit path, only files you own.
- Never commit while another agent is mid-flight in a directory your commit would touch.
- If you need a file another agent owns, ask the lead. Do not edit it.
- **Verify scoped first** — only the projects your change affects
  (`--filter=<pkg>`). The full-tree gate is the LEAD's job at the merge point; running it while
  someone else is editing proves nothing.
- Report back with what you built, the proof you observed, and anything you could not verify.
  Never report a check you did not run or a write you did not read back.
- You have the same standing authority the lead has: make the call, record it in your report so
  the lead can put it in STATUS.md §7, keep going. The only hard stop is a secret or an external
  account only the founder can create — park it, flag it 🔴, continue with the next thing.
- Work in the worktree the lead assigned you. `pnpm install` there runs via Git Bash:
  `"/mnt/c/Program Files/Git/bin/bash.exe" -c 'cd /d/MyProjects/<worktree> && pnpm install'`.
- STATUS.md and CLAUDE.md belong to the scribe; /docs belongs to nobody.

## Report format

End with: WHAT EXISTS NOW (files), WHAT WAS VERIFIED (commands + real output), WHAT DIVERGED
(and why), RED-FIRST PROOF (per new assertion or spec file), COULD NOT VERIFY (and why).
Raw data over prose.
