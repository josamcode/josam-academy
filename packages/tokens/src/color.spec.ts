import { describe, expect, it } from 'vitest';

import { type ColorTokens, darkColors, lightColors, themes } from './color.js';
import { generateCss } from './css.js';

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
  const int = parseInt(hex.slice(1), 16);
  const channels = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const [r, g, b] = channels as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * BR-1216 — contrast meets WCAG AA in both modes: 4.5:1 body, 3:1 large text and UI boundaries.
 *
 * These assertions are on the values in `12 §3`, so a failure here is a finding about the
 * specification, not about this file. That is exactly why it is worth asserting: a palette
 * nobody measured is a palette that fails an audit later, after 69 components are built on it.
 */
describe.each([
  ['dark', darkColors],
  ['light', lightColors],
])('BR-1216 — %s mode contrast', (_name, c: ColorTokens) => {
  const surfaces: [string, string][] = [
    ['bgBase', c.bgBase],
    ['bgSurface', c.bgSurface],
    ['bgElevated', c.bgElevated],
    ['bgInset', c.bgInset],
  ];

  it.each(surfaces)('body text reaches 4.5:1 on %s', (_surfaceName, surface) => {
    expect(contrast(c.textPrimary, surface)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(surfaces)('secondary text reaches 4.5:1 on %s', (_surfaceName, surface) => {
    expect(contrast(c.textSecondary, surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('text on the accent reaches 4.5:1 — this is the primary button', () => {
    // SB-18: light mode measures 3.83:1 and is asserted separately below, not skipped.
    if (c === lightColors) return;
    expect(contrast(c.accentForeground, c.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('the accent itself reaches 3:1 on the base — it is a UI boundary and large text', () => {
    expect(contrast(c.accent, c.bgBase)).toBeGreaterThanOrEqual(3);
  });

  it('the focus ring reaches 3:1 on the base — a focus ring nobody can see is not a focus ring', () => {
    expect(contrast(c.borderFocus, c.bgBase)).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ['success', c.success],
    ['warning', c.warning],
    ['danger', c.danger],
    ['info', c.info],
  ])('status colour %s reaches 3:1 on the base', (statusName, colour) => {
    // SB-18: light-mode warning measures 2.84:1 and is asserted separately below, not skipped.
    if (c === lightColors && statusName === 'warning') return;
    expect(contrast(colour, c.bgBase)).toBeGreaterThanOrEqual(3);
  });
});

/**
 * SB-18 — two values in `12 §3.2` do not meet the contrast `BR-1216` requires.
 *
 * These are NOT skipped tests. Each pins the measured ratio, so the day the founder corrects the
 * palette this file fails and forces the divergence record to be closed. A skipped test would go
 * quiet instead, and the failure would be rediscovered in an accessibility audit after 69
 * components had been built on the palette.
 *
 * No replacement hex is invented here: `12 §3` is the design specification and correcting it is
 * a founder decision (`BR-1765`).
 */
describe('SB-18 — known BR-1216 shortfalls in the light palette (12 §3.2)', () => {
  it('white on the light accent is 3.83:1, short of the 4.5:1 AA body minimum', () => {
    const measured = contrast(lightColors.accentForeground, lightColors.accent);
    expect(measured).toBeCloseTo(3.829, 2);
    expect(measured).toBeLessThan(4.5);
  });

  it('the light warning colour is 2.84:1 on the base, short of the 3:1 UI minimum', () => {
    const measured = contrast(lightColors.warning, lightColors.bgBase);
    expect(measured).toBeCloseTo(2.837, 2);
    expect(measured).toBeLessThan(3);
  });

  it('both are light-mode only — dark mode passes comfortably', () => {
    expect(contrast(darkColors.accentForeground, darkColors.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(darkColors.warning, darkColors.bgBase)).toBeGreaterThanOrEqual(3);
  });
});

describe('BR-1215 — the accent darkens in light mode', () => {
  it('is a different value, not the dark-mode gold reused', () => {
    expect(lightColors.accent).not.toBe(darkColors.accent);
  });

  it('the dark-mode gold would have failed on the light surface, which is why', () => {
    // The rule states it; this records the measurement behind it.
    expect(contrast(darkColors.accent, lightColors.bgSurface)).toBeLessThan(3);
    expect(contrast(lightColors.accent, lightColors.bgSurface)).toBeGreaterThanOrEqual(3);
  });
});

describe('BR-541 — light is not an inversion of dark', () => {
  it('differs in more than lightness ordering', () => {
    // A pure inversion would make bgBase pure white; 12 §3.2 specifies a warm white.
    expect(lightColors.bgBase).not.toBe('#FFFFFF');
    expect(lightColors.bgBase.toUpperCase()).toBe('#FBFBFA');
  });
});

describe('BR-1583 — generated CSS carries every token', () => {
  const css = generateCss();

  it('emits every colour role for both themes', () => {
    for (const key of Object.keys(darkColors)) {
      const custom = `--${key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;
      expect(css).toContain(custom);
    }
    expect(css).toContain(themes.light.accent);
    expect(css).toContain(themes.dark.accent);
  });

  it('names tokens by purpose, never by appearance (BR-1219)', () => {
    expect(css).toContain('--accent:');
    // Only declarations count. The header comment legitimately mentions `--gold` while telling
    // the reader not to use it, and matching raw text made this assertion fail against itself.
    const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(declarations).not.toContain('--gold');
    expect(declarations).not.toContain('--yellow');
  });

  it('collapses durations under prefers-reduced-motion (BR-1231)', () => {
    expect(css).toContain('prefers-reduced-motion');
  });

  it('lets an explicit theme choice beat the OS preference', () => {
    // The data-theme blocks must come after :root, or a toggle silently does nothing.
    expect(css.indexOf("[data-theme='light']")).toBeGreaterThan(css.indexOf(':root {'));
  });
});
