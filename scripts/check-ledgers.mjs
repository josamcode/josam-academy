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
import { readFileSync } from 'node:fs';
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

// ── 1. CLAUDE.md §5 — the progress line against its own table ──────────────────────────────
const claude = read('CLAUDE.md');

const taskRows = [
  ...claude.matchAll(
    /^\|\s*`(PH-0\.\d+)`\s*\|[^|]*\|\s*([AB])\s*\|[^|]*\|\s*([\d.]+)\s*\|\s*([^|]*?)\s*\|\s*([\d.—-]+)\s*\|/gm,
  ),
].map((m) => ({ id: m[1], type: m[2], est: Number(m[3]), status: m[4], act: m[5] }));

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
  const phase0Done = new Set(
    taskRows.filter((r) => statusOf(r.status, `CLAUDE.md ${r.id}`) === '✅').map((r) => r.id),
  );
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
    if (phase0Done.has(id)) {
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
  'check-ledgers: OK — summary figures recomputed, every deferral owned by an unstarted task',
);
