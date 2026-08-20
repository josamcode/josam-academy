# Autonomous MVP Run — Josam Academy

Paste the block below into Claude Code, started from WSL in the repository root.

```
cd /mnt/d/MyProjects/josam_academy
```

---

```
You are running this project autonomously, from wherever it actually is now, to a complete MVP.
Read your way to the truth before you do anything — do not take any summary, including mine, as
the state of this repository.

## 0 — Establish reality first. No writing until this is done.

In this order:
1. Read CLAUDE.md in full. It is the operating protocol and it outranks your habits.
2. Read STATUS.md. It is reality. It is large — read the header, the progress tables, the last
   ten Work Log entries, every open blocker and every recorded divergence.
3. Read docs/16-task-breakdown.md and docs/15-implementation-roadmap.md. From those two, derive
   where the MVP boundary actually falls — which phase ends at public launch — and state it back
   to me as a phase range with the milestone that defines it. Do not assume; derive it.
4. Verify the queues against the working tree rather than believing them. For every task marked
   done in CLAUDE.md §5 and §5b, confirm its Output actually exists. For every task marked 🟡,
   read what is genuinely missing. The queues are maintained by hand and by `pnpm check:ledgers`;
   where the tree and the table disagree, the tree wins and you correct the table.
5. Run the full gate cold, before touching anything, so you know your true starting point:
   pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build
   then pnpm verify:fitness, pnpm check:ledgers, and the fk-order and catalog checks in scripts/.
   Paste the real output. If anything is red at the start, that is your first task, ahead of the
   queue.
6. git log --oneline -30 and git status. Reconcile what was committed against what the queue says.

Then, and only then, write me a Position Report: where the project actually is, where the queues
were wrong, what is red, what is blocked on something only I can supply, and the ordered task list
you are about to execute to reach MVP.

Then start. Do not wait for me to approve the report.

## 1 — Standing authority for this run

CLAUDE.md §2 requires approval before plans that touch more than ten files or add a dependency, and
its Session Start Block tells you to stop and wait. For this run, both are lifted. You have standing
approval to make product, scope and technical decisions yourself.

Where a decision would normally come to me:
- Make the call that best serves the specification in /docs and the MVP outcome.
- Prefer the smaller, reversible option when two are close.
- Write the decision into STATUS.md §7 as a divergence, with the reasoning and what would reverse it.
- Keep going.

Do not stop to ask. Do not end a turn with a question and no work behind it. If you find yourself
about to ask me something, answer it yourself, record it, and continue.

The only genuine stop is a secret or an external account I alone can create — Google OAuth
credentials, Twilio, the Paymob or Fawry merchant account, a DNS change. When you hit one:
park that task, mark it 🔴 with exactly what you need, build behind a feature flag that defaults
off so the rest of the phase is not held hostage, move to the next unblocked task, and collect
every such item in one list at the end. `PH-1.5` and `PH-1.6` are already in this category —
confirm that from the file rather than from me.

## 2 — What does not bend

Everything in CLAUDE.md §2 step 4 and §4 stays exactly as written. In particular:

- Every new assertion is made to fail once before it is trusted (BR-1835). A green test you have
  never seen red proves nothing. Show me the red.
- The local gate is not the gate. A task is not done until CI is green on the pushed commit
  (BR-1761). You are in WSL now, so check whether `gh` is available; if it is, authenticate and
  watch the run and treat a red run as the task still being open. If it is not available, install
  it. Do not report "committed and pushed" as though it were done.
- Touch the verification mechanism, run the verification mechanism. A change to
  scripts/verify-fitness.sh or to any check means running that check, not the standard gate.
- When something passes locally and fails in CI, the first question is what your machine supplies
  that CI does not — before you read the code or suspect the test.
- Never modify anything in /docs except by the rule in §3 below. A specification you disagree with
  is escalated in STATUS.md, not edited.
- Never invent an endpoint, a field, a permission key, an entitlement key or a reason code. If it
  is not in docs/11-api-contract or docs/05-roles-and-permissions, it does not exist.
- No mock data ships. No empty catch. No `any`, no @ts-ignore, no assertion used to silence an
  error. No console.* at merge.
- STATUS.md is updated in the same commit as the work it describes, with calendar days recorded
  separately from estimate days. The CLAUDE.md queue is updated in the same commit.

## 3 — The UI direction has changed. This is the part you would otherwise get wrong.

docs/12-ui-ux-design.md describes a dark, gold-accented visual system. **That visual system is
dead.** It was superseded on 2026-08-20. Three documents now sit above it:

- docs/12A-design-system-corrections.md — the audited token layer and the defects that forced it
- docs/12C-design-reference.md — the locked direction. Read this before you render one pixel.
- docs/design-reference/ — seven HTML reference screens plus josam-tokens.css and
  check-token-contrast.py

Precedence, absolutely:
1. For anything visual — palette, typography, surfaces, the progress motif, density, what a screen
   leads with — 12C and design-reference win. Doc 12 §3, §4, §5 and its §9–§11 mockups are
   historical and must not be implemented.
2. For everything behavioural — doc 12 §17 through §20 — the rules still stand in full: the
   prohibited-pattern list, the state matrix, `QueryBoundary`, `<Can>`, the component contract,
   RTL depth, forms, tables, permissions in the UI, the Definition of Done.

The direction in one paragraph, so you recognise a drift when you cause one: warm printed-agenda
feel, light theme as home, dark as a fully designed second theme, flat surfaces and **no gradients
anywhere**. Almarai for body and UI, Amiri 700 for the display tier only — dates, course and module
titles, the projection, the certificate, celebration numbers, never under 28px and never in dense
mode — IBM Plex Mono for figures, code, IDs and inline Latin technical terms. Type scale
52/35/22/16/14/12.5/11 plus 10 for mono eyebrows. Spacing on a base of 4. The signature motif is a
four-state sequence — done, current, available, locked — legible with colour removed, working at
three scales. Progress is always a finish date and days remaining, never a percentage headline.
Locked content always shows its title, its duration and its unlock condition at full legibility.

packages/tokens already exists from PH-0.12. Reconcile it against
docs/design-reference/josam-tokens.css. Where they disagree, the design reference wins, and you
migrate the token package rather than the other way round — then run every existing contrast spec
and Storybook story against the new values and fix what breaks. Wire
docs/design-reference/check-token-contrast.py into the verification chain so a failing pair blocks
the build.

The reference HTML files are references. Never copy a value out of them. If a screen needs
something the token layer does not have, add it to the token layer first.

## 4 — Work in parallel. You are the lead, not the only worker.

Create real subagents under .claude/agents/ and use them. Each gets a narrow brief, the files it is
allowed to touch, and the proof it must produce. Start from this roster and add to it when a real
need appears rather than up front:

- schema — Prisma models, migrations, FK ordering, seeds. Owns prisma/ only.
- api — NestJS modules, guards, interceptors, DTOs. Must conform to docs/11 exactly.
- ui-kit — packages/ui components with every variant and state, plus Storybook stories in both
  themes and both directions.
- web — Next.js App Router screens composed only from packages/ui, against docs/design-reference.
- tests — vitest and e2e specs. Owns the red-first proof for every assertion anyone writes.
- fitness — verify-fitness.sh cases, dependency-cruiser rules, ledger and catalog checks.
- reviewer — reads a finished branch adversarially against CLAUDE.md §4, the task's Refs documents
  and the Definition of Done, and tries to find the reason it should not merge. Nothing merges
  without this agent having failed to break it.
- scribe — STATUS.md Work Log, the CLAUDE.md queues, divergences, blockers.

How parallel work stays honest, because CLAUDE.md forbids batching for a reason:

- Parallelise across independent task IDs, never within one. Read the Depends column and build the
  real dependency graph; run every task whose dependencies are satisfied at the same time.
- Each task gets its own branch or git worktree so agents cannot collide in the working tree.
- Each task passes its own complete gate — lint, typecheck, test, build, its task-specific proof,
  the reviewer agent — before it merges. Merge one at a time, and re-run the gate after each merge,
  because green in isolation is not green together.
- One task, one commit topic, one Work Log entry. Parallel execution does not become batched
  reporting.
- Cap yourself at four concurrent tasks. Beyond that you stop being able to verify what you built.

## 5 — Cadence

Work in phase order, and inside a phase in dependency order. At the end of each phase produce a
closing report in the shape of PHASE-0-CLOSING-REPORT.md: what was built, the proof, the estimate
against the actual in both estimate-days and calendar days, every divergence and why, every
deferred item and what reopens it, and an honest exit position. Then start the next phase without
waiting for me.

Between phases, and every time you complete four tasks, post a short progress line: task IDs
completed, what is red, what is blocked on me. Two or three sentences. Not a report.

Stop only when the MVP boundary you derived in step 0.3 is reached and its exit criteria are met
with evidence, or when everything remaining is blocked on a credential only I can supply.

## 6 — Two things I care about more than speed

Do not report a check you did not run, and do not report a write you did not verify. If you are
uncertain whether something landed, read it back before you claim it.

And when you find that a document, a queue or a previous task's claim is wrong — say so plainly and
correct it. Finding the project is in worse shape than the paperwork says is a good outcome of this
run, not a failure of it.

Begin with step 0.
```
