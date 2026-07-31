#!/usr/bin/env node
/**
 * check-scope-exceptions — `PH-1.10`. The number of data-layer scope exceptions is PINNED.
 *
 * ## What this defends
 *
 * `PH-1.10` made a forgotten `where` a compile error: owned-model delegates demand a `ScopedWhere`
 * that only `applyScope` can produce, and `applyScope` applies the ownership predicate itself. The
 * one way around it is `prisma.unscoped(reason)`, which exists because it must — a login query
 * establishes the actor it would otherwise be scoped by.
 *
 * **An escape hatch nobody counts becomes the way things are done.** Each call is individually
 * defensible at the moment it is written, and the twentieth looks exactly like the first. Nothing
 * in a diff distinguishes "this query genuinely runs before authentication" from "scoping this was
 * awkward", because both are one identical line.
 *
 * So the count is pinned. Adding an exception is then a deliberate edit to THIS file, in the same
 * commit, which a reviewer sees as a line that says the number of ways round the guarantee just
 * went up. That is the whole mechanism: not prevention, visibility.
 *
 * ## `BR-1849` — the pattern this check emits shares no token with the command that runs it
 *
 * Audited before being trusted, because `PH-1.7`'s case 40 asserted on a string that appeared in
 * its own command line and therefore reported CAUGHT for a mechanism that never ran.
 *
 * This script is `check-scope-exceptions`, invoked as `pnpm check:scope-exceptions`. The failure
 * text below says **"count changed: pinned at N, found M"**. No part of that phrase occurs in the
 * script name, the pnpm task name, the file paths, or any argument — so a fitness case grepping
 * for it cannot match pnpm echoing the command back, which is precisely how case 40 passed while
 * observing nothing. The word `unscoped` is deliberately ABSENT from the command name for the
 * same reason.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The pinned number of `unscoped(...)` call sites in `apps/api/src`.
 *
 * Raising this is a decision, not a formality. Before you do: can the query be `scoped()`? If it
 * runs before authentication it cannot, and this number goes up by one with a comment at the call
 * site saying which reason applies and why it is still true.
 */
const PINNED = 18;

/** Where the exception is DEFINED rather than used. Excluded, or the definition counts itself. */
const DEFINITION_FILES = ['shared/database/scope.ts', 'shared/database/prisma.service.ts'];

const apiSrc = join(root, 'apps/api/src');

const sources = readdirSync(apiSrc, { recursive: true })
  .map((f) => String(f).replaceAll('\\', '/'))
  .filter((f) => f.endsWith('.ts') && !f.startsWith('generated/'))
  .filter((f) => !DEFINITION_FILES.some((d) => f.endsWith(d)));

const sites = [];
for (const rel of sources) {
  const text = readFileSync(join(apiSrc, rel), 'utf8');
  for (const m of text.matchAll(/\.unscoped\(\s*'([a-z-]+)'/g)) {
    sites.push({
      file: `apps/api/src/${rel}`,
      line: text.slice(0, m.index).split('\n').length,
      reason: m[1],
    });
  }
}

if (sites.length !== PINNED) {
  const direction = sites.length > PINNED ? 'ADDED' : 'REMOVED';
  console.error('check-scope-exceptions: FAILED\n');
  console.error(
    `  x scope-exception count changed: pinned at ${String(PINNED)}, found ${String(sites.length)}\n`,
  );
  console.error(`    ${direction} since the pin was set. Every call site:\n`);
  for (const s of sites) console.error(`      ${s.file}:${String(s.line)}  ${s.reason}`);
  console.error(
    `\n    Each of these is a query that bypasses the PH-1.10 scope proof. If the new one runs\n` +
      '    before authentication it is legitimate — raise PINNED in scripts/check-scope-exceptions.mjs\n' +
      '    in THIS commit, so the increase is visible in review rather than absorbed silently.\n' +
      '    If an actor is available, use scoped() instead (BR-1632).\n',
  );
  process.exit(1);
}

const byReason = sites.reduce((acc, s) => ({ ...acc, [s.reason]: (acc[s.reason] ?? 0) + 1 }), {});
console.log(
  `check-scope-exceptions: OK — ${String(PINNED)} pinned data-layer exceptions ` +
    `(${Object.entries(byReason)
      .map(([r, n]) => `${r}: ${String(n)}`)
      .join(', ')})`,
);
