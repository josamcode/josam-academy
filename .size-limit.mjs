import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `BR-1486` — initial JS ≤ 200 KB gzipped, measured on a mid-range Android over 4G (`02 §7`).
 *
 * Activated at `PH-0.30`. `12 §19` row 14 named `size-limit` and `13 §18.1` pinned it at
 * `PH-0.16`; it was never installed, and the row sat against a task that had already closed. It
 * had no owner until this one.
 *
 * ## Why this is computed rather than a glob
 *
 * The obvious configuration is `path: '.next/static/chunks/*.js'`. It reports **255.63 kB** here
 * and it is wrong: it sums every chunk Next emitted, including the ones for routes the first paint
 * never touches. Next code-splits per route, so a glob measures the whole application and calls it
 * "initial JS". It would fail this budget on day one for a reason that has nothing to do with what
 * a learner downloads, and the reasonable response — raising the limit until it passes — would
 * leave a budget that can never mean anything again.
 *
 * `build-manifest.json` names what actually loads: `rootMainFiles` is the framework and shared
 * runtime every route pulls, and `pages` lists each route's own chunks. The budget is the
 * **heaviest single route**, since that is the worst first load a real user can get.
 *
 * The file is JS rather than JSON precisely so this resolution happens at check time, against the
 * build that exists, rather than being frozen into content-hashed paths that change every build.
 */

const NEXT_DIR = join(process.cwd(), 'apps/web/.next');

function manifest() {
  try {
    return JSON.parse(readFileSync(join(NEXT_DIR, 'build-manifest.json'), 'utf8'));
  } catch {
    throw new Error(
      'apps/web/.next/build-manifest.json is missing. Run `pnpm build` first — a size budget ' +
        'checked against an absent build is a budget that always passes (BR-1838).',
    );
  }
}

const m = manifest();
const shared = m.rootMainFiles ?? [];
const routes = Object.entries(m.pages ?? {}).filter(([, files]) => files.length > 0);

/** The heaviest route, shared runtime included — the worst first load a user can actually get. */
const heaviest = routes.reduce(
  (worst, [route, files]) => (files.length > worst[1].length ? [route, files] : worst),
  ['/', []],
);

const toPath = (file) => join(NEXT_DIR, file);

export default [
  {
    name: `initial JS — shared runtime + heaviest route (${heaviest[0]})`,
    path: [...shared, ...heaviest[1]].map(toPath),
    limit: '200 KB',
    gzip: true,
  },
  {
    name: 'stylesheet — tokens plus the utilities actually used',
    path: join(NEXT_DIR, 'static/chunks/*.css'),
    limit: '12 KB',
    gzip: true,
  },
];
