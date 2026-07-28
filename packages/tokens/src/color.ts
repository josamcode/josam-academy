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
  accentForeground: string;

  success: string;
  warning: string;
  danger: string;
  info: string;
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
  textMuted: '#6E6E78',
  textInverse: '#0A0A0B',

  accent: '#E8B04B',
  accentHover: '#F0BE63',
  accentPressed: '#D19E3C',
  accentSubtle: '#2A2115',
  accentForeground: '#0A0A0B',

  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',
  info: '#60A5FA',
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
  textMuted: '#8A8A93',
  textInverse: '#FFFFFF',

  accent: '#A97A18',
  accentHover: '#916814',
  accentPressed: '#7A5710',
  accentSubtle: '#FBF4E4',
  accentForeground: '#FFFFFF',

  success: '#16A34A',
  warning: '#CA8A04',
  danger: '#DC2626',
  info: '#2563EB',
};

export const themes = { dark: darkColors, light: lightColors } as const;

export type ThemeName = keyof typeof themes;
export type ColorTokenName = keyof ColorTokens;
