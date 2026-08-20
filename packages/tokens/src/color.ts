/**
 * Colour, from `12C §3` — the locked direction (DT-1, founder-directed 2026-08-20). The former
 * `12 §3` palette (near-black + gold) is dead; nothing here derives from it.
 *
 * Two independently designed palettes — light is NOT an inversion of dark (`BR-541`), which is why
 * both are written out in full rather than one derived from the other. **Light is home** (`12C §2`):
 * dark is a fully designed second theme, never the default.
 *
 * This file is the only place in the repository where a raw hex value is legitimate. Everywhere
 * else it fails the build (`BR-1220`, enforced at `PH-0.16`).
 *
 * Names describe purpose, never appearance: `accent`, never `green` (`BR-1219`).
 */

/** The semantic colour roles. Every theme must supply all of them — see `ColorTokens`. */
export interface ColorTokens {
  /** `12C surface.page` — the paper. */
  bgBase: string;
  /** `12C surface.raised`. */
  bgSurface: string;
  /**
   * `12C` has no elevated surface — the design is flat, and flatness comes from how components
   * use elevation, not from a colour. The token survives so consumers compile; it holds
   * `surface.raised`'s value in both themes (DT-1 mapping decision).
   */
  bgElevated: string;
  /** `12C surface.sunken`. */
  bgInset: string;
  /** `12C surface.selected` — the selected row, the checked card, the active filter. */
  bgSelected: string;

  /** `12C border.hairline` — decorative rules and separators. Deliberately below 3:1 (`BR-1577`). */
  borderSubtle: string;
  /**
   * Decorative, like `borderSubtle` — holds `border.hairline`'s value. The DT-1 audit moved every
   * control boundary that sat on this token to `borderControl`; what remains on it (floating-panel
   * edges, the strong Surface border) is separation, not an interactive boundary.
   */
  borderStrong: string;
  /**
   * `12C border.control` — the boundary of interactive elements ONLY. Meets 3:1 (`BR-1577`).
   * `borderSubtle` is decorative and deliberately does not. Never swap them.
   */
  borderControl: string;
  /** `12C` is silent; `accent.rest` per theme (DT-1 lead decision). ≥3:1 on base and surface. */
  borderFocus: string;

  textPrimary: string;
  textSecondary: string;
  /**
   * `12C`'s registered set has no third text level — the screens use `text.secondary` for meta.
   * Holds `textSecondary`'s value; kept so consumers compile (DT-1 mapping decision).
   */
  textMuted: string;
  /** Text on an inverted surface: the other theme's `textPrimary` (DT-1 mapping decision). */
  textInverse: string;

  /** `12C accent.rest`. */
  accent: string;
  /** `12C accent.hover`. */
  accentHover: string;
  /** `12C` defines rest and hover only; pressed holds the hover value (DT-1 mapping decision). */
  accentPressed: string;
  /** `12C surface.selected` — the accent-adjacent wash for highlighted rows and chips. */
  accentSubtle: string;
  /**
   * `12C text.onAccent` — the foreground that pairs with `accent` and `accentHover`.
   *
   * Replaces the former `accentContrast`, which was pinned against the dead gold accent (`SB-18`).
   * The locked green accent is dark enough in light theme for white to clear 4.5:1 (7.69 measured),
   * and dark theme pairs the pale green with near-black ink. Both pinned in `color.spec.ts`.
   */
  textOnAccent: string;

  /**
   * Status colours still come in `x` / `xText` pairs (`SB-18`'s shape): `x` for surfaces, borders
   * and icons at the 3:1 UI threshold, `xText` for status text at 4.5:1. Under the `12C` palette
   * every feedback colour clears 4.5:1 on all four surfaces in both themes — measured, not assumed
   * (`color.spec.ts`) — so each pair holds one value. They remain two tokens: a component must not
   * have to know which palette makes them equal.
   *
   * `success` is `accent.rest` per theme — green IS this design's done/positive family, the
   * motif's done state (DT-1 lead decision). `warning` ← `feedback.attention`, `danger` ←
   * `feedback.critical`, `info` ← `feedback.info`.
   */
  success: string;
  successText: string;
  warning: string;
  warningText: string;
  danger: string;
  dangerText: string;
  info: string;
  infoText: string;

  /** `12C tint.critical` — the inline-alert wash behind `danger` content. */
  tintCritical: string;
  /** `12C tint.info` — the inline-alert wash behind `info` content. */
  tintInfo: string;

  /** `12C code.*` — the code surface's three-colour syntax set. ≥4.5:1 on `bgSurface`. */
  codeKeyword: string;
  codeCall: string;
  codeLiteral: string;
}

/** `12C §3`, light column. Warm paper — the printed study agenda. */
export const lightColors: ColorTokens = {
  bgBase: '#EDE7DA',
  bgSurface: '#F5F1E7',
  bgElevated: '#F5F1E7',
  bgInset: '#E4DCCB',
  bgSelected: '#E4E8D8',

  borderSubtle: '#DCD3C1',
  borderStrong: '#DCD3C1',
  borderControl: '#7D7364', // 3.781:1 on bgBase
  borderFocus: '#3F5B22', // accent.rest — 6.241:1 on bgBase

  textPrimary: '#23201B',
  textSecondary: '#635A4D',
  textMuted: '#635A4D',
  textInverse: '#EDE7DA', // dark theme's textPrimary
  textOnAccent: '#FFFFFF', // 7.690:1 on accent

  accent: '#3F5B22',
  accentHover: '#2E4318',
  accentPressed: '#2E4318',
  accentSubtle: '#E4E8D8',

  success: '#3F5B22', // worst surface 5.639:1 — clears 4.5 everywhere
  successText: '#3F5B22',
  warning: '#7A4F00', // worst surface 5.227:1
  warningText: '#7A4F00',
  danger: '#8E2A21', // worst surface 6.151:1
  dangerText: '#8E2A21',
  info: '#2A4E7A', // worst surface 6.236:1
  infoText: '#2A4E7A',

  tintCritical: '#F6E7E4', // holds danger at 6.978:1
  tintInfo: '#E7ECF3', // holds info at 7.164:1

  codeKeyword: '#7A2E86', // 7.266:1 on bgSurface
  codeCall: '#1F3A5C', // 10.241:1
  codeLiteral: '#8E2A21', // 7.438:1
};

/**
 * `12C §3`, dark column. A fully designed second theme, never an inversion (`BR-541`).
 *
 * `tintCritical` and `tintInfo` have NO dark value anywhere in `12C` or the reference screens —
 * the tints appear only in the foundations file's light rendering. DERIVED here (DT-1): each is
 * `bgSurface` pulled 12% toward its feedback colour, the same move the light tints make against
 * the paper, sized so the feedback colour itself still clears 4.5:1 on the wash (danger 5.279:1,
 * info 5.842:1 — pinned in `color.spec.ts`). Flagged for founder review.
 */
export const darkColors: ColorTokens = {
  bgBase: '#1D1B17',
  bgSurface: '#26231D',
  bgElevated: '#26231D',
  bgInset: '#141310',
  bgSelected: '#2A2D20',

  borderSubtle: '#35312A',
  borderStrong: '#35312A',
  borderControl: '#7C7666', // 3.461:1 on bgSurface, the worse of its two surfaces
  borderFocus: '#A9C57E', // accent.rest — 8.985:1 on bgBase

  textPrimary: '#EDE7DA',
  textSecondary: '#A79C88',
  textMuted: '#A79C88',
  textInverse: '#23201B', // light theme's textPrimary
  textOnAccent: '#1D1B17', // 8.985:1 on accent

  accent: '#A9C57E',
  accentHover: '#C2DA97',
  accentPressed: '#C2DA97',
  accentSubtle: '#2A2D20',

  success: '#A9C57E', // worst surface 7.343:1
  successText: '#A9C57E',
  warning: '#E0B060', // worst surface 7.057:1
  warningText: '#E0B060',
  danger: '#E8907F', // worst surface 5.839:1
  dangerText: '#E8907F',
  info: '#93B4DE', // worst surface 6.573:1
  infoText: '#93B4DE',

  tintCritical: '#3D3029', // DERIVED — see above
  tintInfo: '#333434', // DERIVED — see above

  codeKeyword: '#C79BE0', // 6.858:1 on bgSurface
  codeCall: '#93B4DE', // 7.328:1
  codeLiteral: '#E8907F', // 6.510:1
};

export const themes = { dark: darkColors, light: lightColors } as const;

export type ThemeName = keyof typeof themes;
export type ColorTokenName = keyof ColorTokens;
