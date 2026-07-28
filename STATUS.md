# STATUS — Josam Academy

> **This file is the single source of truth for where the project actually is.**
> It is read at the start of every session and updated at the end of every task.
> The documents in `/docs` describe the plan. This file describes reality.

| Field | Value |
|---|---|
| **Last updated** | 2026-07-28 |
| **Updated by** | AI (`PH-0.1` execution) |
| **Current phase** | Phase 0 — Foundation |
| **Current task** | *None in progress* — `PH-0.1` complete |
| **Next task** | `PH-0.2` — Shared config package: ESLint flat config, Stylelint, Prettier (`13 §9`) |
| **Production URL** | *Not deployed* |
| **Blocked** | No — `PH-0.2` is unblocked. `SB-05`/`SB-07` block `PH-0.7` review and `PH-0.4` only. |

---

## 1. Progress

| Phase | Tasks | Done | Status |
|---|---:|---:|---|
| **0 — Foundation** | 28 | 1 | 🟡 In progress |
| 1 — Identity & Commerce | 32 | 0 | ⬜ Not started |
| 2 — Content & Learning | 34 | 0 | ⬜ Not started |
| 3 — Operations & Launch | 26 | 0 | ⬜ Not started |
| 4 — Motivation & Proof | 22 | 0 | ⬜ Not started |
| 5 — AI Mentor | 18 | 0 | ⬜ Not started |
| 6 — Mobile | 16 | 0 | ⬜ Not started |
| 7 — Growth | 14 | 0 | ⬜ Not started |
| **Total** | **191** | **1** | **0.5%** |

**Milestones**

| # | Milestone | Target | Actual |
|---|---|---|---|
| M1 | Deployable skeleton | Week 3 | — |
| M2 | First real payment | Week 8 | — |
| M3 | First lesson watched | Week 14 | — |
| M4 | 🚀 Public launch | Week 18 | — |
| M5 | First certificate | Week 22 | — |
| M6 | AI answers without founder | Week 26 | — |
| M7 | Apps in stores | Week 31 | — |
| M8 | Feature complete | Week 34 | — |

---

## 2. What Actually Works Right Now

> Only list what is **deployed and verified in production**. Not what is written.

| Capability | Status | Verified |
|---|---|---|
| — | Nothing deployed yet | — |

---

## 3. Environments

| Environment | URL | Status | Notes |
|---|---|---|---|
| Production | `josamacademy.com` | ⬜ Not provisioned | VPS exists, not hardened |
| Local | `localhost:3000` / `:4000` | ⬜ Not set up | — |
| Storybook | `localhost:6006` | ⬜ Not set up | — |

**Infrastructure state**

| Item | Status |
|---|---|
| VPS hardened (`PH-0.7`) | ⬜ Not done |
| Cloudflare configured | ⬜ Not done |
| Coolify installed | ⬜ Not done |
| CI pipeline | ⬜ Not done |
| Backups running | ⬜ Not done |
| Monitoring + alerts | ⬜ Not done |

---

## 4. Work Log

> Newest first. One entry per completed task. Never edit past entries — append corrections as new entries.

**Entry format:**

```
### YYYY-MM-DD · PH-X.Y — Task name
**By:** Founder / AI
**Time:** estimated Xd → actual Yd
**Output:** what now exists
**Verified:** what was actually checked
**Diverged:** anything different from the documents (or "none")
**Notes:** anything the next session needs to know
```

---

### 2026-07-28 · PH-0.1 — Initialize monorepo: pnpm workspaces, Turborepo, base `tsconfig`
**By:** AI
**Time:** estimated 0.5 d → actual 0.25 d
**Output:**
- Root: `package.json` (`packageManager` pnpm@11.17.0, `engines.node ">=24.18.0 <25.0.0"`),
  `pnpm-workspace.yaml`, `turbo.json`, `.nvmrc` (`24`), `.npmrc` (`save-exact`, `engine-strict`),
  `.gitignore` (contains `.turbo/`), `.gitattributes`, `pnpm-lock.yaml`.
- **Six** workspaces: `apps/api`, `apps/web`, `packages/config`, `packages/tokens`,
  `packages/i18n`, `packages/ui`. Each a compiling stub with `build` + `typecheck`.
- `packages/config/tsconfig/` — three presets: `base.json`, `node.json`, `library.json`.
- Local git repository initialized (`git init -b main`), first commit landed.

**Verified:** (real terminal output, `BR-1518`)
- `node -v` → `v24.18.0`; `pnpm -v` → `11.17.0` — checked **before** writing `engines`.
- Registry re-verification per `BR-1811`: `turbo` latest = **2.10.7** (pin matches exactly);
  `typescript@6.0.3` exists (latest is 7.0.2 — deliberately not taken, `BR-1805`);
  `@types/node` highest 24.x = **24.13.3**, pinned exact.
- `pnpm install` → `Done in 8.9s using pnpm v11.17.0`, 7 workspace projects in scope.
- `pnpm build` → `Tasks: 5 successful, 5 total`. Re-run → `5 cached, 5 total` / `FULL TURBO` (51ms).
- `pnpm typecheck` → `Tasks: 5 successful, 5 total`.
- `tsc --showConfig` in `apps/api` confirms the NestJS-critical flags resolve:
  `verbatimModuleSyntax: false`, `experimentalDecorators: true`, `emitDecoratorMetadata: true`,
  `types: ["node"]`, `outDir: "./dist"`, `moduleResolution: "nodenext"`.
- `${configDir}` verified: `rootDir`/`outDir` resolve against the **consuming** package, not
  against `packages/config/tsconfig/`. Without it a shared-preset `outDir` silently emits into
  the config package.
- Emitted module format checked by reading the output: `apps/api/dist/index.js` is CommonJS
  (correct for NestJS 11), `packages/ui/dist/index.js` is ESM.
- **`BR-1806` proven, not assumed:** a throwaway project with `moduleResolution: "node"` compiled
  under TS 6.0.3 → `error TS5107: Option 'moduleResolution=node10' is deprecated and will stop
  functioning in TypeScript 7.0`, exit 2.
- **`pnpm lint` and `pnpm test` do not exist and were not faked.** Real output:
  `[ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL] Command "lint" not found`. ESLint, Stylelint and Prettier
  arrive at `PH-0.2`; Vitest at `PH-0.2`. `turbo.json` declares only `build`, `typecheck`, `dev`.

**Diverged:**
1. **`packages/ui` created though `09 §9`'s tree omits it** — `12 §20` mandates it (`BR-1524`,
   `BR-1575`). Recorded as `SB-13`; `09 §9` needs a correction pass.
2. **`.gitattributes` added beyond the approved file list** — see §7. Founder may veto.
3. `BR-1818` rewritten on founder instruction — see §7.

**Notes:**
- `packages/contracts` and `packages/abilities` were **not** created. They are Phase 1 work
  (`PH-1.8` / `PH-1.9`); an empty package in the turbo graph for five weeks earns nothing.
- The `verbatimModuleSyntax: false` override lives in the **shared** `node.json`, not in
  `apps/api`, so it cannot be lost to a copy-paste. The reason is written in the file itself.
  `PH-0.3` must run the two-service DI probe before the health endpoint.
- `docs/runbooks/vps-hardening.md` was re-checked at the end of this task and is **still absent**
  from the tree — `SB-05` stands.

---

### 2026-07-28 · Planning complete
**By:** Founder + AI
**Output:** 23 documents — `00` through `16` plus this file and the HTML prototype
**Contents:** 220 features · 1,798 business rules · 60 decisions · 174 permissions · 85 tables · 248 endpoints · 134 components · 72 screens · 30 flows · 191 tasks
**Verified:** every feature maps to a goal; every module has a dependency tier; no orphan features
**Diverged:** none — this is the baseline
**Notes:** All documents are `Draft — Pending Approval`. Recommend one full read-through before `PH-0.1`. Execution begins at `PH-0.7` (VPS hardening) — deliberately before any code touches the server.

---

## 5. Blockers

> Anything stopping work right now. Empty is good.

| ID | Blocker | Blocks | Since | Owner | Action needed |
|---|---|---|---|---|---|
| `SB-05` | `docs/runbooks/vps-hardening.md` is not in the repository. Stated as placed twice; **re-checked at the end of `PH-0.1` — `docs/runbooks/` does not exist and a tree-wide search for `*vps*` returns nothing.** Likely saved outside `D:\MyProjects\josam_academy\`. | `PH-0.7` review | 2026-07-28 | Founder | Confirm the path the file was saved to. Once it is under `docs/runbooks/`, the reconciliation against `14 §12` runs. |
| `SB-07` | **Next.js major.** `13 §4` states `15` (a bare major, i.e. an exact statement); the current release is **16.2.12**. Adopting 16 is a divergence needing a document correction (`BR-1809`). | `PH-0.4` | 2026-07-28 | Founder | Decide: hold at Next 15.x, or authorise correcting `13 §4` to 16. **Not blocking `PH-0.1`.** |
| `SB-01` | No GitHub remote. Local `git init -b main` **done at `PH-0.1`**; the remote needs founder credentials. | `PH-0.10` | 2026-07-28 | Founder | Create the GitHub repository and add the remote. |
| `SB-13` | `09 §9`'s monorepo tree omits `packages/ui`, which `12 §20` mandates (`BR-1524`, `BR-1575`). Created at `PH-0.1` on the authority of `12`. | Nothing — `12` governs | 2026-07-28 | Founder | Authorise a correction pass on `09 §9`. Not urgent. |
| `OQ-24` | Renovate auto-merge policy for patch updates (`13 §16`). | `PH-0.10` | 2026-07-28 | Founder | Decide auto-merge vs review. |

---

## 6. Open Questions

| ID | Question | Owner | Needed by | Status |
|---|---|---|---|---|
| `OQ-01` | Commercial registration for Paymob merchant account | Founder | Phase 1 | 🟡 **Start now** — longest lead time |
| `OQ-21` | Certificate PDF layout — portrait/landscape, QR placement | Founder | Phase 4 | ⬜ Open |
| `OQ-22` | Week start day default (Saturday vs locale) | Founder | Phase 4 | ⬜ Open |
| `OQ-23` | PDF rendering approach on 2 vCPU | Joint | Phase 4 | ⬜ Open |
| `OQ-24` | Renovate auto-merge policy for patch updates | Founder | Phase 0 | ⬜ Open |
| `OQ-25` | Learner 2FA — offer or staff-only | Founder | Phase 3 | ⬜ Open |
| `OQ-26` | Breach notification commitment (72h proposed) | Founder | Phase 3 | ⬜ Open |
| `OQ-27` | Soft launch pricing — free / discounted / full | Founder | Phase 3 | ⬜ Open |
| `OQ-28` | Mobile before Growth, or reverse | Founder | Phase 5 exit | ⬜ Open |

**Resolved:** `OQ-02` – `OQ-20` — see `DEC-01` through `DEC-55` in their respective documents.

---

## 7. Divergences From The Documents

> Where the built system differs from the specification, and why. Every entry must either be corrected in the document or justified here.

| Date | Document | What diverged | Why | Resolution |
|---|---|---|---|---|
| 2026-07-28 | `13 §2` | **`SB-02` — Node runtime.** Document specified **Node 22 LTS**; the pinned runtime is **Node 24 LTS ("Krypton") 24.18.0**. | Node 22 moved to Maintenance LTS. Node 24 is the current Active LTS, maintained through April 2028, and is what is installed on the development machine. `13 §2` was stale, not wrong in principle. | ✅ **Resolved.** Founder authorised the document edit. `13 §2` version cell and rationale corrected; the stale "Node 22" in the `§17` approval table corrected for internal consistency; appendix `13 §18` "Resolved Versions (Phase 0)" added with the full pin table. Binding on `engines`, `packageManager`, `.nvmrc`, the CI Node matrix, and every Dockerfile base image (`BR-1810`). |
| 2026-07-28 | `12 §20.12`, `15 §2`, `15 §Phase 0` | **`SB-04` — Wave 1 component count.** Documents stated **62**; `16-task-breakdown.md` tasks `PH-0.17`–`PH-0.27` enumerate **69**. | The 62 was an aggregate that never reconciled with any enumeration. `16` is the executable artifact, so `16` wins. | ✅ **Resolved.** Founder authorised the document edit. Count corrected to **69** in `12 §20.12`, `15 §2`, and the `15` Phase 0 exit criteria. New `12 §20.12.1` records the authoritative 69-component roster by task; `12 §20.12.2` reassigns by name every `§20` component with no Phase 0 task (`Can` and `Reason` → Phase 1, they read `_can` from `PH-1.11`; 9 → Wave 2; `VideoUploader` → Wave 3; `Confirm` and `ToastProvider` folded as naming duplicates). Added `BR-1812`, `BR-1813`. |
| 2026-07-28 | `13 §2` | **`SB-06` — TypeScript major.** Floor is `5.6+`; the newest release is **7.0.2**, but the pin is **6.0.3**. | `typescript-eslint@8.65.0` declares `typescript: ">=4.8.4 <6.1.0"`. TypeScript 7 would silently disable type-aware linting, which is the mechanism enforcing `BR-1579`. Verified against the live registry, not assumed. | ✅ **Not a divergence** — `5.6+` is a floor and 6.0.3 satisfies it. Recorded because the pin is deliberately *not* the newest available. `BR-1805` states the condition for raising it. Also `BR-1806`: TS 6 removes `moduleResolution: "node"`, so every `tsconfig` uses `nodenext`/`bundler`. |
| 2026-07-28 | `13 §18.2` | **`BR-1818` rewritten.** The superseded text left open whether `QueryBoundary` (`PH-0.27`) and `Form` (`PH-0.21`) would be built on TanStack Query / React Hook Form or against a library-agnostic interface, and cited `BR-1528` in favour of the wrapper. | That reading of `BR-1528` was wrong. `BR-1528` is about **Radix** — a headless behaviour library supplying keyboard handling and ARIA for a *visible control*, which is why it belongs inside our components. TanStack Query and React Hook Form are not visible controls. `09 §7.2` names TanStack Query as **the** server-state mechanism and React Hook Form + Zod as **the** form mechanism, and `07`/`12` assume its cache semantics directly. A wrapper would be an abstraction at first use — prohibited by `BR-1355`. | ✅ **Resolved.** Founder-instructed correction made during `PH-0.1`. `BR-1818` now states both libraries are used **directly**, no abstraction is built over either, and only the *version* is deferred to `PH-0.21`/`PH-0.27`. The superseded text is quoted in the rule so the change is auditable. |
| 2026-07-28 | `09 §9` | **`SB-13` — `packages/ui` absent from the documented monorepo tree.** `09 §9` lists `contracts`, `abilities`, `tokens`, `i18n`, `config` — no `ui`. | `12 §20` mandates `packages/ui` and two rules depend on it existing: `BR-1524` (feature code imports from `@josam/ui` only) and `BR-1575` (`packages/ui` depends on no app). `09 §9`'s tree is illustrative and predates the `12 §20` component work. | 🟡 **Open — not corrected.** `packages/ui` was created at `PH-0.1` on the authority of `12`. Correcting `09 §9` is outside this task's authorisation. Blocks nothing. |
| 2026-07-28 | *(none — new file)* | **`.gitattributes` added beyond the approved `PH-0.1` file list.** Forces LF in the repository and the working tree. | Development is Windows, every deployment target is Linux. Without it, `scripts/backup.sh` (`PH-0.28`) and the Dockerfiles (`PH-0.10`) are checked out CRLF and `COPY`ed into containers where `#!/bin/bash\r` is not a valid interpreter — a failure that appears only in the container. Cheaper to prevent at repo init than to diagnose at `PH-0.28`. | 🟡 **Flagged for founder review.** One unapproved file; trivially revertable if unwanted. |
| 2026-07-28 | `12 §20.12` | **Component library total.** `§20.12` states **134** components; a full census of `§20.4`–`§20.10` enumerates **151** distinct names. | The 134 total predates the Wave 1 reconciliation and has never been recounted. | 🟡 **Open — not corrected.** Outside the authorised edit. Recorded as `BR-1813`. Nothing in Phase 0 depends on the Wave 2/3 counts. Needs a founder-authorised recount pass before Wave 2 begins. |

- **Rule:** a divergence is either fixed in the code or corrected in the document. It is never left as an undocumented difference (`BR-1789`).

---

## 8. Technical Debt

> Things deliberately deferred. Not bugs — decisions with a date.

| ID | Item | Reason deferred | Revisit at |
|---|---|---|---|
| `SB-08` | **Component library census.** `12 §20.12` states **134** total components; a full census of `§20.4`–`§20.10` enumerates **151** distinct names. Wave 2 (44) and Wave 3 (28) counts have never been reconciled against any enumeration either. Wave 1 is settled at 69 (`SB-04`); only the downstream totals are unverified. | Outside Phase 0 authorisation, and blocks nothing before Wave 2. Recorded as `BR-1813`. | **Phase 0 exit** |
| `SB-09` | **Prisma 7 pin is provisional.** Prisma 7 is a rewrite. Pinned provisionally pending a probe at `PH-0.6` against the NestJS CommonJS build, the generated client location, and the repository-only pattern (`BR-1580`). Fallback is the latest Prisma 6. | Cannot be settled before `PH-0.6` exists to probe against. Recorded as `BR-1816`. | **`PH-0.6`** |
| `SB-11` | **13 dangling BR references** — rules cited but never written (`docs/BR-REGISTRY.md §5`). Most are off-by-1000 typos the author already annotated inline. **`BR-895`–`BR-899` are the exception**: they are not typos, they are citations to rules that were never authored, and `PH-0.16` is scheduled to enforce two of them (layer direction; no vendor SDK outside `providers/`). | Each needs an authoring decision by the founder, not an inferred fix. Correcting them is a multi-document pass outside current authorisation (`BR-1824`). | **`PH-0.16`** for `BR-895`–`899`; Phase 0 exit for the rest |
| `SB-12` | **Six document headers declare BR ranges that do not match their contents** (`docs/BR-REGISTRY.md §3`). `13` declared a range overlapping 114 live rules in `14` — this caused a real collision during this session. | `BR-REGISTRY.md §3`/`§4` is now the allocation authority, so the wrong headers are documented rather than trusted. Fixing them is a six-document edit. | **Phase 0 exit** |
| `SB-10` | **Deferred version pins.** ~20 dependencies are recorded in `13 §18.2` as dated observations, explicitly non-binding. Each is pinned by the phase that installs it. | Pinning a Phase 6 dependency in Phase 0 uses information that will be seven months stale and violates `13 §1` filter 4. Recorded as `BR-1814`, `BR-1815`. | **each named phase** |

---

## 9. Metrics

> Populated after launch. Targets from `01 §5`.

| Metric | Target (6mo) | Current | Trend |
|---|---|---|---|
| `MET-01` Course completion | ≥ 35% | — | — |
| `MET-02` Goal set rate | ≥ 70% | — | — |
| `MET-03` AI deflection | ≥ 60% | — | — |
| `MET-06` Founder ops hours/week | < 3 | — | — |
| `MET-09` 7-day activation | ≥ 65% | — | — |
| `MET-11` Weekly active learners | ≥ 40% | — | — |

**Infrastructure**

| Item | Budget | Current |
|---|---|---|
| Monthly spend | ~$30 | $0 |
| Learners | — | 0 |
| Courses published | — | 0 |

---

## 10. Content Status

> Tracked separately because content is a parallel track and a top risk (`RSK-05`).

| Course | Lessons | Video | Lesson Notes | Quizzes | Status |
|---|---:|---|---|---|---|
| — | — | — | — | — | No courses yet |

**Reminder:** `DEC-58` — the founder authors one complete course **during** Phase 2, not after it.

---

## 11. How To Update This File

At the end of **every** task:

```
1  Add a Work Log entry (§4) — newest at the top
2  Update the phase task count and percentage (§1)
3  Update "What Actually Works" if something new is live (§2)
4  Update Current task / Next task in the header
5  Add any new blocker (§5) or divergence (§7)
6  Update Last updated and Updated by
7  Commit this file with the task's code — same commit
```

**Rules:**

- `BR-1799` — `STATUS.md` is updated in the **same commit** as the work it describes. A separate "update status" commit means it will eventually be skipped.
- `BR-1800` — Work Log entries are append-only. Corrections are new entries, never edits to old ones.
- `BR-1801` — `§2` lists only what is **verified in production**. Written code that is not deployed does not appear there.
- `BR-1802` — Record **actual** time against the estimate. After Phase 0 this ratio recalibrates the whole roadmap (`DEC-56`).
- `BR-1803` — If a session ends mid-task, say so explicitly in the log, including exactly where it stopped and what remains.
- `BR-1804` — Never mark a task done to make the table look better. An honest 0% is more useful than a false 40%.

---

## 12. Session Checklist

**Starting a session:**

```
☐ Read docs/00-START-HERE.md
☐ Read this file — especially §4 (last entry), §5, §7
☐ Confirm the next task and its dependencies
☐ Read the task's Refs documents
```

**Ending a session:**

```
☐ Build · typecheck · lint · tests all green
☐ Definition of Done filled for any screen
☐ Work Log entry written
☐ Progress table updated
☐ Blockers and divergences recorded
☐ Committed together
```

---

*This file is the project's memory. Keep it honest — its only value is accuracy.*
