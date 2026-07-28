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

/** Hue in degrees, for asserting that a darkened token kept its identity. */
function hue(hex: string): number {
  const int = parseInt(hex.slice(1), 16);
  const [r, g, b] = [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255] as [
    number,
    number,
    number,
  ];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return h * 360;
}

/**
 * BR-1216 — contrast meets WCAG AA in both modes: 4.5:1 body, 3:1 large text and UI boundaries.
 *
 * Every pair below is pinned. A palette edit that breaks a threshold must break this suite rather
 * than going quiet — that mechanism is what surfaced SB-18 in the first place, so it is extended
 * here rather than narrowed.
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

  it('the accent itself reaches 3:1 on the base — it is a UI boundary and large text', () => {
    expect(contrast(c.accent, c.bgBase)).toBeGreaterThanOrEqual(3);
  });

  it('the focus ring reaches 3:1 on the base — a focus ring nobody can see is not a focus ring', () => {
    expect(contrast(c.borderFocus, c.bgBase)).toBeGreaterThanOrEqual(3);
  });

  it.each(['success', 'warning', 'danger', 'info'] as const)(
    '%s surface reaches the 3:1 UI-boundary threshold on the base',
    (status) => {
      expect(contrast(c[status], c.bgBase)).toBeGreaterThanOrEqual(3);
    },
  );

  it.each(['successText', 'warningText', 'dangerText', 'infoText'] as const)(
    '%s reaches the 4.5:1 body-text threshold on the base',
    (status) => {
      expect(contrast(c[status], c.bgBase)).toBeGreaterThanOrEqual(4.5);
    },
  );
});

/**
 * SB-18 — the resolution, with every ratio pinned.
 *
 * These were failures before the founder's decision of 2026-07-29. They are now assertions that
 * the fix holds, and they are pinned to the computed value so that any future palette edit which
 * erodes the margin fails here first.
 */
describe('SB-18 — accent contrast, resolved', () => {
  it('dark: a dark foreground on the accent measures 10.12:1', () => {
    expect(contrast(darkColors.accentContrast, darkColors.accent)).toBeCloseTo(10.124, 2);
  });

  it('light: a dark foreground on the accent measures 4.63:1, clearing AA body', () => {
    const measured = contrast(lightColors.accentContrast, lightColors.accent);
    expect(measured).toBeCloseTo(4.627, 2);
    expect(measured).toBeGreaterThanOrEqual(4.5);
  });

  it('both themes use a DARK foreground — light mode is no longer the odd one out', () => {
    for (const theme of [darkColors, lightColors]) {
      expect(luminance(theme.accentContrast)).toBeLessThan(luminance(theme.accent));
    }
  });

  it('records why white was abandoned rather than the gold darkened', () => {
    // Darkening the gold until white passes would push it towards brown and destroy the identity
    // the design rests on. This is the measurement that decided it.
    expect(contrast('#FFFFFF', lightColors.accent)).toBeLessThan(4.5);
    expect(lightColors.accent).toBe('#A97A18'); // the accent hex itself did NOT change
  });
});

describe('SB-18 — status surface/text split, resolved', () => {
  it.each([
    ['dark success', darkColors.success, darkColors.successText, darkColors.bgBase, 11.357, 11.357],
    ['dark warning', darkColors.warning, darkColors.warningText, darkColors.bgBase, 11.855, 11.855],
    ['dark danger', darkColors.danger, darkColors.dangerText, darkColors.bgBase, 7.154, 7.154],
    ['dark info', darkColors.info, darkColors.infoText, darkColors.bgBase, 7.784, 7.784],
    [
      'light success',
      lightColors.success,
      lightColors.successText,
      lightColors.bgBase,
      3.183,
      4.618,
    ],
    [
      'light warning',
      lightColors.warning,
      lightColors.warningText,
      lightColors.bgBase,
      3.087,
      4.614,
    ],
    ['light danger', lightColors.danger, lightColors.dangerText, lightColors.bgBase, 4.664, 4.664],
    ['light info', lightColors.info, lightColors.infoText, lightColors.bgBase, 4.992, 4.992],
  ])('%s — surface and text ratios are pinned', (_n, surface, text, base, sExp, tExp) => {
    expect(contrast(surface, base)).toBeCloseTo(sExp, 2);
    expect(contrast(text, base)).toBeCloseTo(tExp, 2);
  });

  it('keeps the hue when darkening — a status colour that shifts hue stops meaning what it meant', () => {
    const pairs: [string, string][] = [
      [lightColors.success, lightColors.successText],
      [lightColors.warning, lightColors.warningText],
      ['#CA8A04', lightColors.warning], // the published value vs the corrected surface
    ];
    for (const [from, to] of pairs) {
      expect(Math.abs(hue(from) - hue(to))).toBeLessThan(1);
    }
  });

  it('changed only what had to change — danger and info kept their published values', () => {
    expect(lightColors.danger).toBe('#DC2626');
    expect(lightColors.info).toBe('#2563EB');
    expect(lightColors.success).toBe('#16A34A');
    // Only the light warning surface moved, and only far enough to clear 3:1.
    expect(lightColors.warning).not.toBe('#CA8A04');
    expect(contrast('#CA8A04', lightColors.bgBase)).toBeLessThan(3);
  });
});

describe('BR-1215 — the accent darkens in light mode', () => {
  it('is a different value, not the dark-mode gold reused', () => {
    expect(lightColors.accent).not.toBe(darkColors.accent);
  });

  it('the dark-mode gold would have failed on the light surface, which is why', () => {
    expect(contrast(darkColors.accent, lightColors.bgSurface)).toBeLessThan(3);
    expect(contrast(lightColors.accent, lightColors.bgSurface)).toBeGreaterThanOrEqual(3);
  });
});

describe('BR-541 — light is not an inversion of dark', () => {
  it('differs in more than lightness ordering', () => {
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

  it('emits the SB-18 tokens by their semantic names', () => {
    expect(css).toContain('--accent-contrast:');
    for (const status of ['success', 'warning', 'danger', 'info']) {
      expect(css).toContain(`--${status}:`);
      expect(css).toContain(`--${status}-text:`);
    }
  });

  it('no longer emits the failing accent-foreground token', () => {
    expect(css).not.toContain('--accent-foreground');
  });

  it('names tokens by purpose, never by appearance (BR-1219)', () => {
    expect(css).toContain('--accent:');
    const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(declarations).not.toContain('--gold');
    expect(declarations).not.toContain('--yellow');
  });

  it('collapses durations under prefers-reduced-motion (BR-1231)', () => {
    expect(css).toContain('prefers-reduced-motion');
  });

  it('lets an explicit theme choice beat the OS preference', () => {
    expect(css.indexOf("[data-theme='light']")).toBeGreaterThan(css.indexOf(':root {'));
  });
});
