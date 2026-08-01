#!/usr/bin/env node
/**
 * check-ledgers — every summary figure is recomputed from its own table, and every deferral
 * names a task ID that has not started.
 *
 * ## Why this exists
 *
 * Phase 0 produced three ledger defects and two stale header totals, in one phase, and every
 * one of them was invisible to reading the summary and visible only by reading the rows:
 *
 *   - `12 §19` row 15 was recorded against `PH-0.11`, which closed without it. A row naming a
 *     COMPLETED task reads as scheduled — worse than an empty owner, which at least invites the
 *     question "who does this?"  (`BR-1840`)
 *   - `12 §19` row 20 named "Phase 1" — a phase, not a task. Nothing can be held to a phase.
 *   - The `12 §19` score line claimed three rows deferred that `PH-0.30` had already activated.
 *   - `CLAUDE.md`'s progress line read "Estimated total 20.5 d" when its own Est column summed
 *     to 27.5, and "16.65 d" when the Actual column summed to 16.90.
 *
 * That is a pattern, not three incidents. **A number written once and never recomputed is the
 * same class of defect as a fitness function that loads and enforces nothing** (`BR-1830`): it
 * occupies the place where a check should be, and it reports something reassuring.
 *
 * Founder decision, 2026-07-30, carried into Phase 1.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');

/**
 * `BR-1848` — status is matched against a CLOSED SET, never by substring.
 *
 * The first version used `status.includes('✅')`. A cell reading `🟡 partial, ✅ proven locally`
 * counted as done, and this figure decides the progress numerator and which deferrals are
 * considered closed. A permissive match that silently accepts a superset and reports full
 * coverage is the defect this whole check exists to prevent, and it was inside the check.
 *
 * Ambiguity throws rather than picking one. Two glyphs in a status cell means the table is
 * saying two things, and guessing which is the same error one layer down.
 */
const STATUS_GLYPHS = ['✅', '🟡', '⬜', '🔴', '⏸️'];

const statusOf = (cell, where) => {
  const present = STATUS_GLYPHS.filter((g) => cell.includes(g));
  if (present.length === 0) return null;
  if (present.length > 1) {
    throw new Error(
      `${where}: status cell carries ${String(present.length)} status glyphs — ${present.join(' ')}`,
    );
  }
  return present[0];
};

const failures = [];
const fail = (where, msg) => failures.push(`${where}: ${msg}`);
const near = (a, b) => Math.abs(a - b) < 0.005;

const claude = read('CLAUDE.md');

/**
 * ── Task-table parsing, by SHAPE rather than by a per-phase list ──────────────────────────
 *
 * Founder decision, 2026-07-31. The previous version carried one hand-written regex per phase —
 * `PH-0\.\d+` for `§5`, `PH-1\.\d+` for `§5b` — and every consumer below was fed the Phase 0 list
 * alone. **Every Phase 1 owner marked done therefore passed silently**, which is `12 §19` row 15's
 * original defect reproduced one phase over, inside the check written to prevent it. It was found
 * only because a probe for something else printed a failure nobody asked for.
 *
 * **A per-phase list has the defect built in.** It is correct exactly until a phase starts, and
 * then it is quietly wrong until somebody remembers to extend it — the extension being invisible
 * work that nothing demands. It would have reproduced at Phase 2 for the same reason it appeared
 * at Phase 1. So the phase is no longer named anywhere: any table with an `ID`/`Status` header
 * and `` `PH-N.M` `` in its first column is a task table, whatever N is.
 *
 * Columns are resolved **by header name**, not by position. `§5` and `§5b` order their columns
 * differently (`Type`/`Depends` are swapped), which is why the old code needed two regexes at all.
 * Position-independence also rules out the obvious alternative — "find the cell containing a
 * status glyph" — which is already wrong today: `PH-1.10`'s Note cell contains both 🟡 and ✅ in
 * prose, and would be read as the status column.
 */
const parseTaskRows = (text, where) => {
  const cells = (line) =>
    line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
  const lines = text.split('\n');
  const rows = [];
  let cols = null;

  for (const [i, line] of lines.entries()) {
    if (!line.startsWith('|')) {
      cols = null; // a table ends at the first non-table line; headers never leak across tables
      continue;
    }
    const next = lines[i + 1] ?? '';
    if (/^\|[\s:|-]+\|$/.test(next) && next.includes('-')) {
      cols = cells(line).map((c) => c.replaceAll('*', '').trim().toLowerCase());
      continue;
    }
    if (cols === null) continue;

    const c = cells(line);
    const id = /^`(PH-(\d+)\.\d+)`$/.exec(c[0] ?? '');
    if (!id) continue;

    const at = (name) => {
      const idx = cols.indexOf(name);
      return idx === -1 ? undefined : (c[idx] ?? '');
    };
    rows.push({
      id: id[1],
      phase: Number(id[2]),
      status: at('status') ?? '',
      est: at('est') ?? '',
      act: at('actual') ?? '',
      where,
    });
  }
  return rows;
};

const allRows = parseTaskRows(claude, 'CLAUDE.md');

/**
 * A task id appearing as the first cell of two different tables means two tables are asserting
 * something about the same task, and nothing says they agree. Ambiguity throws rather than
 * picking one — the same reasoning as `statusOf`'s two-glyph case (`BR-1848`).
 */
{
  const seen = new Map();
  for (const r of allRows) {
    if (seen.has(r.id)) fail(r.where, `task ${r.id} appears in more than one task table`);
    else seen.set(r.id, r);
  }
}

/** id → status glyph, across every phase. The single notion of "what state is this task in". */
const stateOf = new Map(allRows.map((r) => [r.id, statusOf(r.status, `CLAUDE.md ${r.id}`)]));
const isDone = (id) => stateOf.get(id) === '✅';

const byPhase = (n) => allRows.filter((r) => r.phase === n);
const taskRows = byPhase(0).map((r) => ({ ...r, est: Number(r.est) }));
const phase1Rows = byPhase(1);

// ── 1. CLAUDE.md §5 — the progress line against its own table ──────────────────────────────

if (taskRows.length === 0) {
  fail('CLAUDE.md §5', 'no task rows parsed — the table shape changed and this check went blind');
} else {
  const total = taskRows.length;
  const done = taskRows.filter((r) => statusOf(r.status, `CLAUDE.md ${r.id}`) === '✅').length;
  const estSum = taskRows.reduce((n, r) => n + r.est, 0);
  const actSum = taskRows.reduce(
    (n, r) => n + (/^\d+(?:\.\d+)?$/.test(r.act) ? Number(r.act) : 0),
    0,
  );

  const prog = claude.match(/\*\*Progress:\s*(\d+)\s*\/\s*(\d+)/);
  if (!prog) fail('CLAUDE.md §5', 'no "Progress: N / M" line found');
  else {
    if (Number(prog[2]) !== total)
      fail('CLAUDE.md §5', `progress denominator is ${prog[2]}, table has ${total} tasks`);
    if (Number(prog[1]) !== done)
      fail('CLAUDE.md §5', `progress numerator is ${prog[1]}, table has ${done} rows marked done`);
  }

  const totals = claude.match(/Estimated total\s*([\d.]+)\s*d\s*·\s*actual\s*([\d.]+)\s*d/);
  if (!totals) fail('CLAUDE.md §5', 'no "Estimated total X d · actual Y d" line found');
  else {
    if (!near(Number(totals[1]), estSum))
      fail(
        'CLAUDE.md §5',
        `estimated total says ${totals[1]}, Est column sums to ${estSum.toFixed(2)}`,
      );
    if (!near(Number(totals[2]), actSum))
      fail(
        'CLAUDE.md §5',
        `actual total says ${totals[2]}, Actual column sums to ${actSum.toFixed(2)}`,
      );
  }
}

// ── 1b. CLAUDE.md §5b — the Phase 1 progress line against its own table ────────────────────
if (phase1Rows.length === 0) {
  fail(
    'CLAUDE.md §5b',
    'no Phase 1 task rows parsed — the table shape changed and this went blind',
  );
} else {
  const p1Done = phase1Rows.filter((r) => statusOf(r.status, `CLAUDE.md ${r.id}`) === '✅').length;
  const p1 = claude.match(/\*\*Progress \(Phase 1\):\s*(\d+)\s*\/\s*(\d+)/);
  if (!p1) fail('CLAUDE.md §5b', 'no "Progress (Phase 1): N / M" line found');
  else {
    if (Number(p1[2]) !== phase1Rows.length)
      fail('CLAUDE.md §5b', `denominator is ${p1[2]}, table has ${phase1Rows.length} tasks`);
    if (Number(p1[1]) !== p1Done)
      fail('CLAUDE.md §5b', `numerator is ${p1[1]}, table has ${p1Done} rows marked done`);
  }
}

// ── 1c. REMOVE-AT markers whose expiry can no longer arrive ────────────────────────────────
//
// An exception that outlives its reason is how a warning list stops meaning anything, and this
// repository has already produced one — `12 §19` row 15, orphaned against a closed task. A
// `REMOVE-AT-PH-x.y` marker records WHY a suppression exists and WHEN it stops being justified;
// without a check, the marker is a comment nobody re-reads.
//
// ## The general form, recorded because it cost a real defect (founder, 2026-07-31)
//
// **A marker whose expiry condition depends on a task's STATE can become permanently unreachable
// when that state changes for an unrelated reason.** The marker does not move, nothing edits it,
// nothing warns — it simply stops being able to fire, and continues to read as governed.
//
// The instance: `.dependency-cruiser.mjs` suppressed the orphan rule for `packages/abilities` and
// named `PH-1.10` as its expiry. A scope decision then made `PH-1.10` close 🟡 **permanently**, so
// it can never be ✅, so this check — which fired only on ✅ — could never speak about that
// suppression again. The decision was about task ownership and had nothing to do with dependency
// rules; the damage landed two files away, in the relationship between a status glyph and a
// comment, which is a place no single-file review looks.
//
// Hence: **🟡 fails too.** Amber is a state that may never resolve — this repository has three
// tasks deliberately parked in it (`PH-0.9`, `PH-1.5`, `PH-1.10`) — so a marker naming an amber
// task is already dead and must be re-pointed at a task that can actually complete. An UNKNOWN
// task fails for the same reason: an expiry naming a task that exists nowhere can never arrive.
//
// NOT applied to the `12 §19` deferral owners in section 3 below, deliberately. A deferred
// enforcement row names the task that will ACTIVATE it, and naming an in-progress task there is
// legitimate — row 20 names `PH-1.10` on purpose, pending a judgement at `PH-1.12`'s close about
// whether fitness cases 46/47 already satisfy it. The two look alike and are not: a REMOVE-AT
// marker says "delete me when X finishes", a deferral says "X is who owes this".
{
  const scanned = ['.dependency-cruiser.mjs', 'turbo.json', 'scripts/verify-fitness.sh'];
  for (const file of scanned) {
    let text;
    try {
      text = read(file);
    } catch {
      continue;
    }
    for (const m of text.matchAll(/REMOVE[- ]?(?:THIS LINE )?AT[- ]+(PH-\d+\.\d+)/gi)) {
      const task = m[1];
      if (task === undefined) continue;
      const state = stateOf.get(task);

      if (state === undefined) {
        fail(
          file,
          `carries a REMOVE-AT marker for ${task}, which appears in NO task table. An expiry ` +
            'naming a task that does not exist can never arrive — the suppression is permanent ' +
            'and reads as temporary.',
        );
      } else if (state === '✅') {
        fail(
          file,
          `carries a REMOVE-AT marker for ${task}, which is DONE. The exception has outlived ` +
            'its reason — remove the suppression, or move the marker to the task that now ' +
            'justifies it.',
        );
      } else if (state === '🟡') {
        fail(
          file,
          `carries a REMOVE-AT marker for ${task}, which is 🟡 — a state that may never resolve. ` +
            'An expiry condition that cannot arrive is a permanent suppression wearing a ' +
            'temporary label. Re-point it at a task that can complete.',
        );
      }
    }
  }
}

// ── 2. STATUS.md — the `12 §19` score line against its own 20 rows ─────────────────────────
const status = read('STATUS.md');

const ledgerStart = status.indexOf('### `12 §19` — all 20 rows');
if (ledgerStart === -1) {
  fail('STATUS.md', 'the `12 §19` ledger heading is missing');
} else {
  const block = status.slice(ledgerStart, status.indexOf('### `09 §enforcement`', ledgerStart));
  const rows = block
    .split('\n')
    .filter((l) => /^\|\s*\d+\s*\|/.test(l))
    .map((l) => {
      const c = l.split('|').map((x) => x.trim());
      return { n: Number(c[1]), name: c[2], status: c[4], proof: c[5] ?? '' };
    });

  if (rows.length !== 20) fail('STATUS.md `12 §19`', `expected 20 rows, found ${rows.length}`);

  const active = rows.filter(
    (r) => statusOf(r.status, `12 §19 row ${String(r.n)}`) === '✅',
  ).length;
  const deferred = rows.length - active;

  const score = block.match(
    /`12 §19` score:\s*\*?\*?(\d+)\s*active[^·]*·\s*\*?\*?(\d+)\s*not active/,
  );
  if (!score)
    fail('STATUS.md `12 §19`', 'no parseable score line — it must state "N active · M not active"');
  else {
    if (Number(score[1]) !== active)
      fail('STATUS.md `12 §19`', `score line says ${score[1]} active, rows show ${active}`);
    if (Number(score[2]) !== deferred)
      fail('STATUS.md `12 §19`', `score line says ${score[2]} not active, rows show ${deferred}`);
  }

  // ── 3. BR-1833 + BR-1840 — every deferral names a task that has NOT started ──────────────
  //
  // `isDone` covers EVERY phase. It was `phase0Done` until 2026-07-31 and built from the `PH-0.x`
  // rows alone, so a deferral owned by a completed PHASE 1 task passed silently — which row 19
  // was, naming `PH-1.8` (done, and never the task that would have discharged it). The check
  // written to catch row 15's orphaned owner had row 15's defect.
  const breakdown = read('docs/16-task-breakdown.md');

  for (const row of rows.filter((r) => statusOf(r.status, `12 §19 row ${String(r.n)}`) !== '✅')) {
    // The owner is the task named in the STATUS column — not the first ID appearing in prose,
    // which is usually the task the row was moved AWAY from.
    const owner = row.status.match(/`(PH-\d+\.\d+)`/);
    if (!owner) {
      fail(
        'STATUS.md `12 §19`',
        `row ${row.n} (${row.name}) is deferred without a task ID in its Status column — ` +
          `"deferred" without a named task is indistinguishable from forgotten (BR-1833)`,
      );
      continue;
    }
    const id = owner[1];
    if (isDone(id)) {
      fail(
        'STATUS.md `12 §19`',
        `row ${row.n} (${row.name}) is owned by ${id}, which is DONE — ` +
          `an owner that has already closed cannot act, and the row reads as scheduled (BR-1840)`,
      );
      continue;
    }
    if (!id.startsWith('PH-0.') && !breakdown.includes(`\`${id}\``)) {
      fail('STATUS.md `12 §19`', `row ${row.n} names ${id}, which is not in 16-task-breakdown.md`);
    }
  }
}

// ── 4. The domain string — one value, checked everywhere it appears ────────────────────────
//
// Founder instruction, 2026-07-31, after a real accident: an editor fumble turned the domain in
// `docs/16-task-breakdown.md` into `jocsamacademy.com` and nothing in the repository objected.
//
// **That is the whole reason this check exists.** The corrupted value is well-formed, lowercase,
// ends in `.com`, and reads correctly at a glance — a human proofreader scanning a frozen
// specification does not catch it, and no build step consumes the string, so it would have sat
// there until something finally used it. A wrong domain is not a typo when it reaches a
// certificate, a redirect URI, or a CORS allowlist.
//
// The check is deliberately WIDER than the accident. Matching only the `**Domain**` header row
// would have caught this one instance and missed the same corruption in prose, in a runbook
// command, or in an example URL — the permissive-mechanism failure of `BR-1849`, where a check
// reports full coverage of a class while inspecting one member of it. Every occurrence of a
// `*academy.com` token is compared, wherever it appears.
{
  const domainRow = claude.match(/^\|\s*\*\*Domain\*\*\s*\|\s*`?([a-z0-9.-]+)`?\s*\|/m);

  if (!domainRow) {
    // Blind-check protection, the same as the task-row parse above: if the header shape changes,
    // this must fail loudly rather than silently comparing every file against nothing.
    fail(
      'CLAUDE.md',
      'no `| **Domain** | ... |` header row found — the canonical domain cannot be read, ' +
        'so the consistency check below would pass vacuously',
    );
  } else {
    const canonical = domainRow[1];
    const files = [
      'CLAUDE.md',
      'STATUS.md',
      ...readdirSync(join(root, 'docs'), { recursive: true })
        .map((f) => String(f).replaceAll('\\', '/'))
        .filter((f) => f.endsWith('.md'))
        .map((f) => `docs/${f}`),
    ];

    /**
     * Counterexample regions. A document that RECORDS a domain corruption has to quote the
     * corrupted value, so the incident write-up in `STATUS.md` fails this check by existing —
     * the standard problem of a test corpus containing the value the test forbids.
     *
     * The suppression is a bounded region rather than a whole-file or whole-pattern exemption:
     *
     *   <!-- domain-check: off — reason -->   ...   <!-- domain-check: on -->
     *
     * so every suppression is greppable, carries its reason inline, and cannot silently grow to
     * cover text written after it. An UNCLOSED region is a failure, not a shrug: `off` with no
     * matching `on` disables the rest of the file, which is the permissive-mechanism failure this
     * check exists to prevent (`BR-1849`) reintroduced through its own escape hatch.
     */
    const suppressedLines = (file, text) => {
      const suppressed = new Set();
      let openedAt = null;
      text.split('\n').forEach((line, i) => {
        if (/<!--\s*domain-check:\s*off\b/i.test(line)) openedAt ??= i + 1;
        else if (/<!--\s*domain-check:\s*on\b/i.test(line)) openedAt = null;
        if (openedAt !== null) suppressed.add(i + 1);
      });
      if (openedAt !== null) {
        fail(
          `${file}:${String(openedAt)}`,
          'opens a `domain-check: off` region that is never closed — an unbounded suppression ' +
            'silently exempts everything written after it',
        );
      }
      return suppressed;
    };

    let occurrences = 0;
    for (const file of files) {
      let text;
      try {
        text = read(file);
      } catch {
        continue;
      }
      const suppressed = suppressedLines(file, text);
      for (const m of text.matchAll(/\b[a-z0-9-]*academy\.com\b/gi)) {
        const line = text.slice(0, m.index).split('\n').length;
        if (suppressed.has(line)) continue;
        occurrences += 1;
        if (m[0].toLowerCase() !== canonical.toLowerCase()) {
          fail(
            `${file}:${String(line)}`,
            `domain reads "${m[0]}", CLAUDE.md's header says "${canonical}" — ` +
              'a well-formed wrong domain is invisible to proofreading and to every build step ' +
              'until something uses it',
          );
        }
      }
    }

    if (occurrences === 0) {
      fail(
        'docs/',
        'no domain string matched anywhere — the pattern went blind and this check is ' +
          'asserting nothing',
      );
    }
  }
}

// ── 5. The task census — every stated count against the enumerated rows ────────────────────
//
// Founder-authorised, 2026-08-01, after the census. `docs/16` stated **191 tasks** in three
// places and enumerated **190** at its own first commit: wrong before a single task was executed,
// never recomputed, and briefly correct BY COINCIDENCE at `8e07222` when `PH-0.29` brought the
// enumeration up to meet it. A number that is right by accident is worse than one that is plainly
// wrong, because checking it once confirms it.
//
// Both remedial Phase 0 tasks and `PH-1.33` moved the enumeration and none of them moved the
// stated figure — three chances to notice, taken by nobody, because nothing recomputed it.
//
// Counts are enumerated from `docs/16` — the specification is the census, not `CLAUDE.md`, which
// carries only the two phases in flight. Every stated figure is then compared against it:
//   · each `# Phase N — ... · M tasks` heading, against that phase's rows
//   · every OTHER "N tasks" mention (the `Contains` row, the `Totals:` line, the approval row),
//     against the grand total
//   · `STATUS.md §1`'s progress table, per phase and in total
//   · `STATUS.md §1`'s Done column against the two MACHINE-CHECKED numerators above, which is
//     the drift that actually happened: it read 28 against §5's 29 and 0 against §5b's 7.
{
  const breakdown = read('docs/16-task-breakdown.md');

  /**
   * The census scans for IDS ONLY, deliberately NOT reusing `parseTaskRows`.
   *
   * `parseTaskRows` requires a header row so it can resolve `Status`/`Est` by name — correct for
   * `CLAUDE.md`, where those columns are the point. Here the columns are irrelevant and the header
   * requirement is a liability: `PH-0.30` sits in a HEADERLESS one-row table embedded in prose
   * (`docs/16` line ~101), so the strict parser silently dropped it and this check's first run
   * enumerated 192 against a true 193. Reusing a parser built for a different job is how a check
   * acquires a blind spot it did not intend and cannot see.
   *
   * It was caught only because the count was already known independently. Two measurements that
   * disagree is the cheapest defect-finder there is; one measurement is a number nobody can check.
   *
   * The exact-match anchor is load-bearing: `docs/16` has a discussion table whose first cells read
   * `` `PH-0.8` Cloudflare Tunnel ``. Those are not task rows and must not be counted — they are
   * four of the five rows that produced the phantom "196".
   */
  const censusRows = [];
  for (const line of breakdown.split('\n')) {
    if (!line.startsWith('|')) continue;
    const first = line.split('|').slice(1, -1)[0]?.trim() ?? '';
    const m = /^`(PH-(\d+)\.\d+)`$/.exec(first);
    if (m) censusRows.push({ id: m[1], phase: Number(m[2]) });
  }

  // A duplicated id is either a task counted twice in every estimate, or a real task hidden
  // behind a reused id. Both change what the remaining work is, so neither may pass quietly.
  {
    const seen = new Set();
    for (const r of censusRows) {
      if (seen.has(r.id))
        fail(
          'docs/16',
          `task ${r.id} is listed more than once — a task counted twice, or one hidden behind a reused id`,
        );
      seen.add(r.id);
    }
  }

  const census = new Map();
  for (const r of censusRows) census.set(r.phase, (census.get(r.phase) ?? 0) + 1);
  const grandTotal = censusRows.length;

  if (grandTotal === 0) {
    fail('docs/16', 'no task rows enumerated — the census went blind and asserts nothing');
  } else {
    // Per-phase headings.
    const headings = [...breakdown.matchAll(/^# Phase (\d+)\b[^\n·]*·\s*(\d+)\s*tasks/gm)];
    if (headings.length === 0)
      fail('docs/16', 'no `# Phase N — ... · M tasks` headings found — this check went blind');
    for (const h of headings) {
      const phase = Number(h[1]);
      const stated = Number(h[2]);
      const actual = census.get(phase) ?? 0;
      if (stated !== actual)
        fail(
          'docs/16',
          `Phase ${phase} heading says ${stated} tasks, the file enumerates ${actual}`,
        );
    }

    // Every remaining "N tasks" mention refers to the whole document.
    const headingLines = new Set(
      headings.map((h) => breakdown.slice(0, h.index).split('\n').length),
    );
    let totalMentions = 0;
    for (const m of breakdown.matchAll(/\b(\d+)\s*tasks\b/g)) {
      const line = breakdown.slice(0, m.index).split('\n').length;
      if (headingLines.has(line)) continue;
      totalMentions += 1;
      if (Number(m[1]) !== grandTotal)
        fail(`docs/16:${String(line)}`, `states ${m[1]} tasks, the file enumerates ${grandTotal}`);
    }
    if (totalMentions === 0)
      fail('docs/16', 'no document-wide "N tasks" figure found — this check went blind');

    // STATUS.md §1's progress table.
    const PHASE_ROW = /^\|\s*\*{0,2}(\d)\s*—[^|]*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/gm;
    const s1 = status.slice(status.indexOf('## 1. Progress'), status.indexOf('## 2.'));
    const s1Rows = [...s1.matchAll(PHASE_ROW)].map((m) => ({
      phase: Number(m[1]),
      tasks: Number(m[2]),
      done: Number(m[3]),
    }));

    if (s1Rows.length === 0) {
      fail('STATUS.md §1', 'no phase rows parsed from the progress table — this check went blind');
    } else {
      for (const r of s1Rows) {
        const actual = census.get(r.phase);
        if (actual !== undefined && r.tasks !== actual)
          fail(
            'STATUS.md §1',
            `Phase ${r.phase} says ${r.tasks} tasks, docs/16 enumerates ${actual}`,
          );
        if (r.done > r.tasks)
          fail(
            'STATUS.md §1',
            `Phase ${r.phase} shows ${r.done} done of ${r.tasks} — done exceeds total`,
          );
      }

      // The two phases in flight are machine-checked in §5/§5b; §1 must agree with them.
      const doneIn = (n) =>
        byPhase(n).filter((r) => statusOf(r.status, `CLAUDE.md ${r.id}`) === '✅').length;
      for (const n of [0, 1]) {
        const row = s1Rows.find((r) => r.phase === n);
        if (row && row.done !== doneIn(n))
          fail(
            'STATUS.md §1',
            `Phase ${n} shows ${row.done} done, CLAUDE.md §5${n === 1 ? 'b' : ''} has ${doneIn(n)}`,
          );
      }

      const totalRow =
        /^\|\s*\*{0,2}Total\*{0,2}\s*\|\s*\*{0,2}(\d+)\*{0,2}\s*\|\s*\*{0,2}(\d+)\*{0,2}\s*\|/m.exec(
          s1,
        );
      if (!totalRow) fail('STATUS.md §1', 'no Total row parsed — this check went blind');
      else {
        const rowSum = s1Rows.reduce((a, r) => a + r.tasks, 0);
        const doneSum = s1Rows.reduce((a, r) => a + r.done, 0);
        if (Number(totalRow[1]) !== rowSum)
          fail('STATUS.md §1', `Total says ${totalRow[1]} tasks, its own rows sum to ${rowSum}`);
        if (Number(totalRow[1]) !== grandTotal)
          fail('STATUS.md §1', `Total says ${totalRow[1]} tasks, docs/16 enumerates ${grandTotal}`);
        if (Number(totalRow[2]) !== doneSum)
          fail('STATUS.md §1', `Total says ${totalRow[2]} done, its own rows sum to ${doneSum}`);
      }
    }
  }
}

// ── Report ─────────────────────────────────────────────────────────────────────────────────
if (failures.length > 0) {
  console.error('check-ledgers: FAILED\n');
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error(
    `\n${failures.length} problem(s). A summary figure that is not recomputed from its own\n` +
      'table is a number nobody is checking — the same class as a check that loads and enforces\n' +
      'nothing (BR-1830). Recompute it, or fix the row it disagrees with.\n',
  );
  process.exit(1);
}

console.log(
  'check-ledgers: OK — summary figures recomputed from their tables, every deferral owned by ' +
    'an unstarted task, no REMOVE-AT marker outliving its reason',
);
