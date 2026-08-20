import { describe, expect, it } from 'vitest';

import { darkColors } from './color.js';
import { generateTailwindTheme } from './css.js';
import { fontSize, radius, space } from './scale.js';

/**
 * BR-1342 — Tailwind palette utilities are prohibited in components.
 *
 * The mechanism is deletion, not discipline: `--color-*: initial` removes Tailwind's default
 * palette so `text-gray-500` has nothing to compile from. Verified end to end at PH-0.14 by
 * building apps/web with a deliberate violation and confirming no rule was emitted; these specs
 * guard the generator that makes that true.
 */
describe('BR-1342 — the Tailwind theme layer deletes the defaults', () => {
  const theme = generateTailwindTheme();

  it('wipes the default colour palette', () => {
    expect(theme).toContain('--color-*: initial;');
  });

  it('wipes the dynamic spacing scale, so off-scale values like p-5 cannot exist', () => {
    // 12 §5's scale is deliberately gappy — 5 is not a step, so 20px must be unreachable.
    expect(theme).toContain('--spacing: initial;');
    expect(theme).toContain('--spacing-*: initial;');
  });

  it.each(['--radius-*: initial;', '--text-*: initial;', '--font-*: initial;'])(
    'wipes %s',
    (directive) => {
      expect(theme).toContain(directive);
    },
  );

  it('binds every colour token to a utility', () => {
    for (const key of Object.keys(darkColors)) {
      const kebab = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
      expect(theme).toContain(`--color-${kebab}: var(--${kebab});`);
    }
  });

  it('uses @theme inline for colour so utilities follow a runtime theme switch', () => {
    // Resolved eagerly instead, every utility would freeze to whichever theme compiled first and
    // the data-theme toggle would move the custom properties while the utilities ignored them.
    const inlineBlock = theme.slice(theme.indexOf('@theme inline'), theme.indexOf('@theme {'));
    expect(inlineBlock).toContain('--color-accent: var(--accent);');
  });

  it('emits scale as literals, not vars — they are theme-invariant and --text-* would collide', () => {
    // Tailwind's font-size namespace is --text-*, and 12 §4.2 names our type tokens --text-* too.
    // As literals the two agree; as inline vars they would reference themselves.
    const scaleBlock = theme.slice(theme.indexOf('@theme {'));
    expect(scaleBlock).toContain(`--text-base: ${String(fontSize.base.size)}px;`);
    expect(scaleBlock).not.toContain('--text-base: var(');
  });

  it('pairs each font size with its line height (BR-1224)', () => {
    for (const [key, value] of Object.entries(fontSize)) {
      expect(theme).toContain(`--text-${key}--line-height: ${String(value.lineHeight)}px;`);
    }
  });

  it('emits only the documented spacing and radius steps', () => {
    for (const [key, value] of Object.entries(space)) {
      expect(theme).toContain(`--spacing-${key}: ${String(value)}px;`);
    }
    for (const [key, value] of Object.entries(radius)) {
      expect(theme).toContain(`--radius-${key}: ${String(value)}px;`);
    }
    // 5 is not a step in 12 §5.
    expect(theme).not.toContain('--spacing-5:');
  });

  it('the 12C radius set is 0 / 3 / full — the 12 §5 steps are gone (DT-1)', () => {
    expect(theme).toContain('--radius-none: 0px;');
    expect(theme).toContain('--radius-sm: 3px;');
    for (const dead of ['--radius-md:', '--radius-lg:', '--radius-xl:']) {
      expect(theme).not.toContain(dead);
    }
  });

  it('the 12C type scale is 52/35/22/16/14/12.5/11 + 10, and the dead steps are gone (DT-1)', () => {
    expect(theme).toContain('--text-eyebrow: 10px;');
    expect(theme).toContain('--text-xs: 12.5px;');
    expect(theme).toContain('--text-4xl: 52px;');
    for (const dead of ['--text-lg:', '--text-2xl:', '--text-3xl: 36px', '--text-5xl:']) {
      expect(theme).not.toContain(dead);
    }
  });

  it('font utilities reference the runtime stacks, so the English display swap reaches them', () => {
    // A literal Amiri stack here would freeze `font-display` to Arabic; the var is what lets
    // `html[lang="en"]` swap the display face to Newsreader (12C §3).
    expect(theme).toContain('--font-display: var(--font-family-display);');
    expect(theme).toContain('--font-body: var(--font-family-body);');
    expect(theme).toContain('--font-mono: var(--font-family-mono);');
    // No utility for the Latin display stack: the language swap is the only path to it.
    expect(theme).not.toContain('--font-display-latin:');
  });

  it('wipes the weight utilities down to the 12C set — 400 / 500 (mono) / 700 / 800 (DT-1)', () => {
    expect(theme).toContain('--font-weight-*: initial;');
    expect(theme).toContain('--font-weight-normal: 400;');
    expect(theme).toContain('--font-weight-medium: 500;');
    expect(theme).toContain('--font-weight-bold: 700;');
    expect(theme).toContain('--font-weight-extrabold: 800;');
    // No 600: Almarai has no semibold, and a synthesised fake must be unwritable.
    expect(theme).not.toContain('--font-weight-semibold:');
  });
});
