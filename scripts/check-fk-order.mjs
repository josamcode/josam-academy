#!/usr/bin/env node
/**
 * check-fk-order — `BR-1842`. A task's dependency order must be consistent with its tables'
 * foreign-key direction.
 *
 * ## Why this exists
 *
 * `16` groups tasks by FEATURE — identity first, permissions second. That is the right order for
 * a human reading a plan. `10` declares the DATA structure, and data does not respect feature
 * boundaries: `users.role_id NOT NULL REFERENCES roles(id)`, while `roles` sat in the permissions
 * task, which depended on the identity task. The graph was circular, and `PH-1.1`'s own stated
 * output — "seeds run" — was unachievable inside its own scope.
 *
 * **The migration would have succeeded.** Prisma orders `CREATE TABLE` correctly inside a single
 * migration, so nothing complains while the tables are empty. The failure appears at the first
 * INSERT, as a foreign-key violation during seeding, three tasks after the decision that caused
 * it, looking like a bad seed script. That distance between defect and symptom is the whole cost.
 *
 * ## What it compares
 *
 * Both sides are derived from the documents, never from a hand-written list here — a third copy
 * of the mapping would be a third thing to keep in sync, and the defect this catches IS things
 * drifting out of sync:
 *
 *   - task -> tables   from `16`'s own `Schema:` rows
 *   - table -> FKs     from `10`'s `CREATE TABLE` bodies
 *   - task order       from the task IDs themselves
 *
 * Run: pnpm check:fk-order
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');

const schema =
  read('docs/10-database-design-part-1.md') + read('docs/10-database-design-part-2.md');
const breakdown = read('docs/16-task-breakdown.md');

// ── table -> the tables it references ───────────────────────────────────────────────────────
const fks = new Map();
for (const m of schema.matchAll(/CREATE TABLE (\w+) \(([\s\S]*?)\n\);/g)) {
  const [, table, body] = m;
  const targets = [...body.matchAll(/REFERENCES\s+(\w+)\s*\(/g)]
    .map((r) => r[1])
    .filter((t) => t !== table); // a self-reference is satisfied by its own CREATE TABLE
  fks.set(table, [...new Set(targets)]);
}

// ── task -> the tables it creates, from `16`'s `Schema:` rows ───────────────────────────────
const taskTables = [];
for (const m of breakdown.matchAll(/^\|\s*`(PH-\d+\.\d+)`\s*\|\s*Schema:\s*([^|]+)\|/gm)) {
  const tables = [...m[2].matchAll(/`(\w+)`/g)].map((t) => t[1]);
  taskTables.push({ id: m[1], tables });
}

if (taskTables.length === 0) {
  console.error('check-fk-order: FAILED — no `Schema:` rows parsed from 16. The check went blind.');
  process.exit(1);
}

// Task order is the ID order: phase, then task number.
const key = (id) => {
  const [, ph, n] = id.match(/PH-(\d+)\.(\d+)/);
  return Number(ph) * 1000 + Number(n);
};
taskTables.sort((a, b) => key(a.id) - key(b.id));

const owner = new Map();
for (const t of taskTables) for (const tbl of t.tables) owner.set(tbl, t.id);

// ── the check ───────────────────────────────────────────────────────────────────────────────
const problems = [];
let checked = 0;

for (const task of taskTables) {
  for (const table of task.tables) {
    if (!fks.has(table)) {
      problems.push(
        `${task.id} claims to create \`${table}\`, which has no CREATE TABLE in 10 — ` +
          `either 16 names a table that does not exist, or 10 is missing one`,
      );
      continue;
    }
    for (const target of fks.get(table)) {
      checked++;
      const targetOwner = owner.get(target);
      if (!targetOwner) continue; // created outside any `Schema:` task — not this check's business
      if (key(targetOwner) > key(task.id)) {
        problems.push(
          `${task.id} creates \`${table}\` which REFERENCES \`${target}\`, ` +
            `but \`${target}\` is not created until ${targetOwner}. ` +
            `The migration will apply and the SEED will fail (BR-1842). ` +
            `If \`${target}\` has no foreign keys of its own it is a leaf and can move earlier.`,
        );
      }
    }
  }
}

if (problems.length > 0) {
  console.error('check-fk-order: FAILED\n');
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error(
    `\n${problems.length} problem(s). A dependency graph derived from feature grouping rather\n` +
      'than from data structure will be circular, and the symptom appears at seed time in a task\n' +
      'that looks unrelated to the one that is wrong (BR-1842).\n',
  );
  process.exit(1);
}

console.log(
  `check-fk-order: OK — ${taskTables.length} schema tasks, ` +
    `${checked} foreign keys, every target created no later than the table that references it`,
);
