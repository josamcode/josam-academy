import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * A canary for the failure found at PH-0.17.
 *
 * `stylelint --fix` — run by our own pre-commit hook — rewrote `@import 'tailwindcss'` into
 * `@import url('tailwindcss')`. Tailwind's PostCSS plugin only processes the bare form, so the
 * wrapped one is an ordinary CSS import it ignores. The build kept succeeding, the page kept
 * rendering, and the emitted stylesheet contained every token custom property and **not one
 * utility class**. Nothing failed. The site was simply unstyled.
 *
 * `import-notation: 'string'` in the shared Stylelint config prevents the rewrite. This asserts
 * the outcome rather than the setting, because the next way this breaks will not be that setting.
 */
const GLOBALS = join(import.meta.dirname, 'globals.css');

describe('globals.css keeps Tailwind switched on', () => {
  // Comments are stripped first. The header legitimately mentions `@import url(...)` while
  // warning against it, and matching raw text made this assertion fail against its own
  // documentation — the same trap the `--gold` check hit in packages/tokens.
  const css = readFileSync(GLOBALS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  it('imports Tailwind in the bare form, never wrapped in url()', () => {
    expect(css).toMatch(/@import\s+['"]tailwindcss['"]/);
    expect(css).not.toMatch(/@import\s+url\(\s*['"]tailwindcss/);
  });

  it('imports every generated file in the bare form too', () => {
    expect(css).not.toMatch(/@import\s+url\(/);
  });

  it('scans packages/ui, which automatic detection does not reach through the symlink', () => {
    expect(css).toMatch(/@source\s+['"][^'"]*packages\/ui\/src['"]/);
  });

  it('imports the theme layer AFTER tailwindcss, or the defaults win (BR-1342)', () => {
    expect(css.indexOf('tailwind.css')).toBeGreaterThan(css.indexOf("'tailwindcss'"));
  });
});
