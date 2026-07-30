import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * `tsc` copies `.ts` and nothing else. Runtime assets that live beside their code have to be
 * carried into `dist/` explicitly, or the compiled build looks correct and fails at runtime —
 * `BR-1838`, generated state that verification silently depends on.
 *
 * `breach-corpus.txt` is the case that matters: without it `BreachList` boots, logs an error and
 * REFUSES every check (`BR-1609`). Registration would break in production and pass every test
 * here, because the source tree has the file and `dist/` does not.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = ['shared/security/breach-corpus.txt'];

for (const rel of ASSETS) {
  const to = join(root, 'dist', rel);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(join(root, 'src', rel), to);
  console.log(`copied ${rel}`);
}
