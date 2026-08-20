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
 * This is the full `12C §3` pair matrix (DT-1): every text token × every surface, the accent
 * foreground on both accent states, both interactive borders, every feedback colour on every
 * surface AND on its own tint, and the code colours on the surface they render on. A palette edit
 * that breaks a threshold must break this suite rather than going quiet — the mechanism that
 * surfaced SB-18, extended rather than narrowed.
 *
 * This suite runs in `pnpm test`, so it sits in the CI verification chain; it replaces the role of
 * the reference set's `check-token-contrast.py`, which checks the STALE 12A-era file and gates
 * nothing here.
 */
describe.each([
  ['light', lightColors],
  ['dark', darkColors],
])('BR-1216 — %s mode contrast (12C §3 matrix)', (_name, c: ColorTokens) => {
  const surfaces: [string, string][] = [
    ['bgBase', c.bgBase],
    ['bgSurface', c.bgSurface],
    ['bgElevated', c.bgElevated],
    ['bgInset', c.bgInset],
    ['bgSelected', c.bgSelected],
  ];

  it.each(surfaces)('body text reaches 4.5:1 on %s', (_surfaceName, surface) => {
    expect(contrast(c.textPrimary, surface)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(surfaces)('secondary text reaches 4.5:1 on %s', (_surfaceName, surface) => {
    expect(contrast(c.textSecondary, surface)).toBeGreaterThanOrEqual(4.5);
  });

  // `textMuted` holds `textSecondary`'s value under 12C, but it stays independently asserted:
  // the token is still separately editable, and an unchecked text token sitting at 3.x:1 for
  // twenty-two tasks is exactly how PH-0.30 happened.
  it.each(surfaces)('muted text reaches 4.5:1 on %s', (_surfaceName, surface) => {
    expect(contrast(c.textMuted, surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('the accent itself reaches 3:1 on the base — it is a UI boundary and large text', () => {
    expect(contrast(c.accent, c.bgBase)).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ['accent', c.accent],
    ['accentHover', c.accentHover],
    ['accentPressed', c.accentPressed],
  ])('textOnAccent reaches 4.5:1 on %s', (_state, bg) => {
    expect(contrast(c.textOnAccent, bg)).toBeGreaterThanOrEqual(4.5);
  });

  /**
   * BR-1577 — `borderControl` is for the boundary of interactive elements and meets 3:1;
   * `borderSubtle` (border.hairline) is decorative and DELIBERATELY does not. Both directions are
   * pinned so a swap fails loudly whichever way it happens.
   */
  it.each([
    ['bgBase', c.bgBase],
    ['bgSurface', c.bgSurface],
  ])('borderControl reaches the 3:1 UI-boundary threshold on %s', (_surfaceName, surface) => {
    expect(contrast(c.borderControl, surface)).toBeGreaterThanOrEqual(3);
  });

  it('borderSubtle stays BELOW 3:1 on the base — a hairline that meets 3:1 has been swapped', () => {
    expect(contrast(c.borderSubtle, c.bgBase)).toBeLessThan(3);
  });

  it.each([
    ['bgBase', c.bgBase],
    ['bgSurface', c.bgSurface],
  ])('the focus ring reaches 3:1 on %s (DT-1: accent.rest per theme)', (_n, surface) => {
    expect(contrast(c.borderFocus, surface)).toBeGreaterThanOrEqual(3);
  });

  // The x/xText pairs hold one value per theme ONLY because that value clears 4.5:1 on every
  // surface — measured here. If a palette edit erodes that, the pair must split again (SB-18's
  // shape), not ship at 3.x:1.
  for (const status of ['success', 'warning', 'danger', 'info'] as const) {
    it.each(surfaces)(`${status} reaches 4.5:1 on %s`, (_surfaceName, surface) => {
      expect(contrast(c[status], surface)).toBeGreaterThanOrEqual(4.5);
    });

    it.each(surfaces)(`${status}Text reaches 4.5:1 on %s`, (_surfaceName, surface) => {
      expect(contrast(c[`${status}Text`], surface)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('danger holds 4.5:1 on its own tint — the inline critical alert is legible', () => {
    expect(contrast(c.danger, c.tintCritical)).toBeGreaterThanOrEqual(4.5);
  });

  it('info holds 4.5:1 on its own tint — the inline info alert is legible', () => {
    expect(contrast(c.info, c.tintInfo)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['tintCritical', c.tintCritical],
    ['tintInfo', c.tintInfo],
  ])(
    'body text reaches 4.5:1 on %s — alerts carry prose, not just the status colour',
    (_n, tint) => {
      expect(contrast(c.textPrimary, tint)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each([
    ['codeKeyword', c.codeKeyword],
    ['codeCall', c.codeCall],
    ['codeLiteral', c.codeLiteral],
  ])('%s reaches 4.5:1 on bgSurface — the code surface it renders on', (_n, code) => {
    expect(contrast(code, c.bgSurface)).toBeGreaterThanOrEqual(4.5);
  });

  it('a filled danger control has a legible foreground (textInverse on danger, 4.5:1)', () => {
    expect(contrast(c.textInverse, c.danger)).toBeGreaterThanOrEqual(4.5);
  });
});

/**
 * 12C §3 — the locked values, pinned hex by hex (DT-1).
 *
 * The document is frozen and the palette is a LOCK, not a starting point. Any edit to a locked
 * value fails here first, with the token named. The two derived dark tints are pinned separately
 * below because they are NOT in 12C — they are this migration's derivation, awaiting founder eyes.
 */
describe('12C §3 — the locked values are pinned', () => {
  it.each([
    ['bgBase', '#EDE7DA', '#1D1B17'],
    ['bgSurface', '#F5F1E7', '#26231D'],
    ['bgInset', '#E4DCCB', '#141310'],
    ['bgSelected', '#E4E8D8', '#2A2D20'],
    ['borderSubtle', '#DCD3C1', '#35312A'],
    ['borderControl', '#7D7364', '#7C7666'],
    ['textPrimary', '#23201B', '#EDE7DA'],
    ['textSecondary', '#635A4D', '#A79C88'],
    ['textOnAccent', '#FFFFFF', '#1D1B17'],
    ['accent', '#3F5B22', '#A9C57E'],
    ['accentHover', '#2E4318', '#C2DA97'],
    ['warning', '#7A4F00', '#E0B060'],
    ['danger', '#8E2A21', '#E8907F'],
    ['info', '#2A4E7A', '#93B4DE'],
    ['codeKeyword', '#7A2E86', '#C79BE0'],
    ['codeCall', '#1F3A5C', '#93B4DE'],
    ['codeLiteral', '#8E2A21', '#E8907F'],
  ] satisfies [keyof ColorTokens, string, string][])('%s is %s / %s', (token, light, dark) => {
    expect(lightColors[token]).toBe(light);
    expect(darkColors[token]).toBe(dark);
  });

  it('the light tints are 12C values; the dark tints are DERIVED (12C lists none)', () => {
    expect(lightColors.tintCritical).toBe('#F6E7E4');
    expect(lightColors.tintInfo).toBe('#E7ECF3');
    // bgSurface pulled 12% toward the feedback colour — see color.ts. Founder review pending.
    expect(darkColors.tintCritical).toBe('#3D3029');
    expect(darkColors.tintInfo).toBe('#333434');
  });

  it('accentPressed is DERIVED (BR-1346 — 12C defines rest and hover only)', () => {
    // Each theme's hover continued one step in its own direction: mixed 12% toward that theme's
    // textPrimary — see color.ts. Founder review pending, like the tints.
    expect(lightColors.accentPressed).toBe('#2D3F18');
    expect(darkColors.accentPressed).toBe('#C7DC9F');
  });
});

/**
 * DT-1 mapping decisions — each one an equality the palette must keep until a document says
 * otherwise. These are how "12C has no such token" is expressed without deleting the token.
 */
describe('DT-1 — mapping decisions hold', () => {
  it.each([
    ['light', lightColors],
    ['dark', darkColors],
  ])('%s: bgElevated equals bgSurface — 12C is flat, elevation is not a colour', (_n, c) => {
    expect(c.bgElevated).toBe(c.bgSurface);
  });

  it.each([
    ['light', lightColors],
    ['dark', darkColors],
  ])(
    '%s: borderStrong holds the hairline value — its control usages moved to borderControl',
    (_n, c) => {
      expect(c.borderStrong).toBe(c.borderSubtle);
    },
  );

  it.each([
    ['light', lightColors],
    ['dark', darkColors],
  ])('%s: textMuted equals textSecondary — 12C registers no third text level', (_n, c) => {
    expect(c.textMuted).toBe(c.textSecondary);
  });

  it.each([
    ['light', lightColors],
    ['dark', darkColors],
  ])('%s: pressed is DISTINCT from hover — BR-1346, every state visually distinct', (_n, c) => {
    // 12C defines rest and hover only; pressed is derived (see color.ts). It must never silently
    // collapse back onto hover — that is the exact defect this assertion exists to catch.
    expect(c.accentPressed).not.toBe(c.accentHover);
    expect(c.accentPressed).not.toBe(c.accent);
  });

  it.each([
    ['light', lightColors],
    ['dark', darkColors],
  ])('%s: accentSubtle equals bgSelected — both are surface.selected', (_n, c) => {
    expect(c.accentSubtle).toBe(c.bgSelected);
  });

  it.each([
    ['light', lightColors],
    ['dark', darkColors],
  ])("%s: success IS the accent — green is this design's done/positive family", (_n, c) => {
    expect(c.success).toBe(c.accent);
  });

  it.each([
    ['light', lightColors],
    ['dark', darkColors],
  ])('%s: the x/xText pairs hold one value — licensed by the 4.5:1 matrix above', (_n, c) => {
    expect(c.successText).toBe(c.success);
    expect(c.warningText).toBe(c.warning);
    expect(c.dangerText).toBe(c.danger);
    expect(c.infoText).toBe(c.info);
  });

  it("textInverse is the other theme's textPrimary — text on an inverted surface", () => {
    expect(lightColors.textInverse).toBe(darkColors.textPrimary);
    expect(darkColors.textInverse).toBe(lightColors.textPrimary);
  });

  it('borderFocus is accent.rest per theme (lead decision; 12C is silent)', () => {
    expect(lightColors.borderFocus).toBe(lightColors.accent);
    expect(darkColors.borderFocus).toBe(darkColors.accent);
  });
});

describe('BR-541 — light is not an inversion of dark', () => {
  it('is warm paper, never pure white', () => {
    expect(lightColors.bgBase).not.toBe('#FFFFFF');
    expect(lightColors.bgBase.toUpperCase()).toBe('#EDE7DA');
  });

  it('dark is a designed theme, not the light palette flipped', () => {
    // The dark accent is a different colour from the light accent, not its complement or its
    // lightness inverse — 12C designed both columns.
    expect(darkColors.accent).not.toBe(lightColors.accent);
    expect(darkColors.bgBase.toUpperCase()).toBe('#1D1B17');
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

  it('emits the renamed accent foreground and the 12C-new tokens by their semantic names', () => {
    expect(css).toContain('--text-on-accent:');
    expect(css).toContain('--border-control:');
    expect(css).toContain('--bg-selected:');
    expect(css).toContain('--tint-critical:');
    expect(css).toContain('--tint-info:');
    expect(css).toContain('--code-keyword:');
    for (const status of ['success', 'warning', 'danger', 'info']) {
      expect(css).toContain(`--${status}:`);
      expect(css).toContain(`--${status}-text:`);
    }
  });

  it('no longer emits the dead accent-contrast token (renamed at DT-1)', () => {
    const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(declarations).not.toContain('--accent-contrast');
  });

  it('names tokens by purpose, never by appearance (BR-1219)', () => {
    expect(css).toContain('--accent:');
    const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(declarations).not.toContain('--gold');
    expect(declarations).not.toContain('--green');
  });

  it('LIGHT is home — :root carries the paper palette, dark only behind an explicit choice or the OS', () => {
    const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('[data-theme'));
    expect(rootBlock).toContain(lightColors.bgBase);
    expect(rootBlock).not.toContain(darkColors.bgBase);
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).not.toContain('@media (prefers-color-scheme: light)');
  });

  it('lets an explicit theme choice beat the OS preference', () => {
    expect(css.indexOf("[data-theme='dark']")).toBeGreaterThan(css.indexOf(':root {'));
    expect(css).toContain(':root:not([data-theme])');
  });

  it('swaps the display stack to Newsreader for the English interface only (12C §3)', () => {
    const swap = css.slice(css.indexOf("html[lang='en']"));
    expect(swap).toContain('--font-family-display:');
    expect(swap).toContain('Newsreader');
    // Arabic keeps Amiri: the default declaration, before the swap, must not name Newsreader.
    const beforeSwap = css.slice(0, css.indexOf("html[lang='en']"));
    const displayDecl = /--font-family-display:[^;]*;/.exec(beforeSwap)?.[0] ?? '';
    expect(displayDecl).toContain('Amiri');
    expect(displayDecl).not.toContain('Newsreader');
  });

  it('every font stack names an explicit Arabic-capable fallback — a bare serif is a defect (12C)', () => {
    for (const decl of css.match(/--font-family-[a-z-]+:[^;]*;/g) ?? []) {
      expect(decl).toMatch(/Amiri|Noto Naskh Arabic|Noto Sans Arabic/);
    }
    expect(css.match(/--font-family-/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('collapses durations under prefers-reduced-motion (BR-1231)', () => {
    expect(css).toContain('prefers-reduced-motion');
  });
});
