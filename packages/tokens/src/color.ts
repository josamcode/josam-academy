/**
 * Colour, from `12 §3`. Two independently designed palettes — light is NOT an inversion of dark
 * (`BR-541`), which is why both are written out in full rather than one derived from the other.
 *
 * This file is the only place in the repository where a raw hex value is legitimate. Everywhere
 * else it fails the build (`BR-1220`, enforced at `PH-0.16`).
 *
 * Names describe purpose, never appearance: `accent`, never `gold` (`BR-1219`).
 */

/** The semantic colour roles. Every theme must supply all of them — see `ColorTokens`. */
export interface ColorTokens {
  bgBase: string;
  bgSurface: string;
  bgElevated: string;
  bgInset: string;

  borderSubtle: string;
  borderStrong: string;
  borderFocus: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  accent: string;
  accentHover: string;
  accentPressed: string;
  accentSubtle: string;

  /**
   * The foreground that pairs with `accent` — a **dark** foreground in both themes (`SB-18`).
   *
   * This replaces the former `accentForeground`, which was white in light mode and measured
   * 3.83:1 on the light accent: the primary button failed `BR-1216`. White cannot pass 4.5:1
   * without darkening the gold until it reads brown, which would destroy the identity the design
   * rests on. Dark mode was already using a dark foreground, so light mode was the inconsistent
   * one — not the hex values.
   *
   * The rule is uniform: `accentContrast` is the theme's own darkest text colour.
   * Components reference this token, never white and never a hex (`BR-1219`, `BR-1220`).
   */
  accentContrast: string;

  /**
   * Status colours come in pairs (`SB-18`). One value cannot serve both roles: `#CA8A04` measured
   * 2.84:1 on the light base — below the 3:1 UI-boundary threshold — and could never reach 4.5:1
   * as text.
   *
   *   `success`     — surfaces, borders, icons. Clears **3:1** against `bgBase`.
   *   `successText` — status text on `bgBase`. Clears **4.5:1**.
   *
   * Darkened only as far as each threshold requires, with hue held fixed (within 0.1°).
   */
  success: string;
  successText: string;
  warning: string;
  warningText: string;
  danger: string;
  dangerText: string;
  info: string;
  infoText: string;
}

/** `12 §3.1`. Near-black with a blue cast, not dead black. */
export const darkColors: ColorTokens = {
  bgBase: '#0A0A0B',
  bgSurface: '#131316',
  bgElevated: '#1B1B1F',
  bgInset: '#08080A',

  borderSubtle: '#232328',
  borderStrong: '#34343B',
  borderFocus: '#E8B04B',

  textPrimary: '#FAFAFA',
  textSecondary: '#A2A2AB',
  // PH-0.30 — was #6E6E78, which measured 3.40:1 at worst against the four surfaces. Muted
  // carries hints and counters at `text-xs`; that is body text and needs 4.5:1, not the 3:1
  // large-text allowance. Lightness raised until the worst surface cleared; hue and
  // saturation untouched, so it still reads as the same grey and stays clearly below
  // secondary (4.52 against 6.78).
  textMuted: '#82828D',
  textInverse: '#0A0A0B',

  accent: '#E8B04B',
  accentHover: '#F0BE63',
  accentPressed: '#D19E3C',
  accentSubtle: '#2A2115',
  accentContrast: '#0A0A0B', // 10.124:1 on accent

  // Every dark-mode status colour already clears both thresholds against the near-black base, so
  // the surface and text tokens hold the same value. They remain two tokens rather than one
  // shared token: a component must not have to know which theme makes them equal.
  success: '#4ADE80', // 11.357:1 on bgBase
  successText: '#4ADE80', // 11.357:1
  warning: '#FBBF24', // 11.855:1
  warningText: '#FBBF24', // 11.855:1
  danger: '#F87171', // 7.154:1
  dangerText: '#F87171', // 7.154:1
  info: '#60A5FA', // 7.784:1
  infoText: '#60A5FA', // 7.784:1
};

/**
 * `12 §3.2`. Warm white, never pure `#FFFFFF` for the base.
 *
 * `BR-1215` — the accent darkens from `#E8B04B` to `#A97A18` here. The dark-mode gold on white
 * fails contrast and reads as an unfinished theme.
 */
export const lightColors: ColorTokens = {
  bgBase: '#FBFBFA',
  bgSurface: '#FFFFFF',
  bgElevated: '#FFFFFF',
  bgInset: '#F4F4F2',

  borderSubtle: '#E6E6E2',
  borderStrong: '#D2D2CC',
  borderFocus: '#A97A18',

  textPrimary: '#18181B',
  textSecondary: '#52525B',
  // PH-0.30 — was #8A8A93, 3.11:1 at worst. Same reasoning as dark, darkened instead.
  textMuted: '#6F6F79',
  textInverse: '#FFFFFF',

  accent: '#A97A18',
  accentHover: '#916814',
  accentPressed: '#7A5710',
  accentSubtle: '#FBF4E4',
  accentContrast: '#18181B', // 4.627:1 on accent — was #FFFFFF at 3.83:1, which failed BR-1216

  // SB-18. Only `warning` needed its surface moved; `success` and `warning` both needed a
  // separate, darker text value. `danger` and `info` already cleared 4.5:1 as published.
  success: '#16A34A', // 3.183:1 on bgBase — unchanged from 12 §3.2
  successText: '#12843C', // 4.618:1 — darkened from #16A34A, hue held at 142.1°
  warning: '#C18404', // 3.087:1 — darkened from #CA8A04 (2.837:1), hue 40.6° → 40.5°
  warningText: '#9A6903', // 4.614:1 — darkened further, same hue
  danger: '#DC2626', // 4.664:1 — unchanged
  dangerText: '#DC2626', // 4.664:1 — already clears the text threshold
  info: '#2563EB', // 4.992:1 — unchanged
  infoText: '#2563EB', // 4.992:1 — already clears the text threshold
};

export const themes = { dark: darkColors, light: lightColors } as const;

export type ThemeName = keyof typeof themes;
export type ColorTokenName = keyof ColorTokens;
