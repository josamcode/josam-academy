import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateCss } from './css.js';

/**
 * Emits `dist/tokens.css`. Run as part of this package's `build`, so web always consumes CSS
 * generated from the same TypeScript the React Native constants come from — the drift `BR-1583`
 * exists to prevent cannot happen through inattention.
 */
const outDir = join(dirname(fileURLToPath(import.meta.url)));
const target = join(outDir, 'tokens.css');

mkdirSync(outDir, { recursive: true });
writeFileSync(target, generateCss(), 'utf8');

console.log(`@josam/tokens → ${target}`);
