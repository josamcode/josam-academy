/**
 * Space, shape, motion and type, from `12 §4.2` and `12 §5`.
 *
 * Values are stored as **numbers**, not CSS strings, because `BR-1583` requires one source to
 * serve two consumers: web takes CSS custom properties, mobile takes generated constants
 * (`BR-190`). React Native has no `px` unit — a value stored as `'8px'` would need parsing back
 * out, and a parser is a place for the two platforms to disagree.
 */

/**
 * `12 §5`. The scale is deliberately gappy — 5 is not a step, so 20px cannot be reached.
 *
 * The keys are **strings**, and that is deliberate rather than incidental. `DEC-40` writes the
 * valid form as `<Stack gap="4" />`: a token *name*, not a number. Typed numerically, `gap={4}`
 * invites `gap={4 * 2}` and `gap={someCount}` — arithmetic on a scale position, which produces
 * 32px by accident and looks reasonable in review. A string cannot be multiplied.
 */
export type SpaceToken = '1' | '2' | '3' | '4' | '6' | '8' | '12' | '16' | '24';

export const space: Record<SpaceToken, number> = {
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '6': 24,
  '8': 32,
  '12': 48,
  '16': 64,
  '24': 96,
};

/** `12 §5`. `BR-1228` — 8px is the default: not fully rounded, not square. */
export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

/** `12 §5`. `BR-1230` — no transition exceeds 320ms. */
export const duration = {
  fast: 150,
  base: 200,
  slow: 320,
} as const;

export const easing = 'cubic-bezier(0.2, 0, 0, 1)' as const;

/**
 * `12 §4.2`. Line height is paired with size rather than kept as a separate scale, because
 * `BR-1224` ties them: Arabic body text needs 1.6–1.65 minimum, and a free-floating leading
 * scale makes it possible to combine a size and a leading that violate that.
 *
 * `--text-base` is 16/26 = 1.625. `BR-1225` — 16px base in both languages.
 */
export const fontSize = {
  '2xs': { size: 11, lineHeight: 16 },
  xs: { size: 12, lineHeight: 18 },
  sm: { size: 14, lineHeight: 22 },
  base: { size: 16, lineHeight: 26 },
  lg: { size: 18, lineHeight: 28 },
  xl: { size: 22, lineHeight: 30 },
  '2xl': { size: 28, lineHeight: 36 },
  '3xl': { size: 36, lineHeight: 44 },
  '4xl': { size: 48, lineHeight: 56 },
  '5xl': { size: 64, lineHeight: 70 },
} as const;

/**
 * `12 §4.1`, `DEC-33` — the Arabic face is chosen first and the Latin face selected to sit beside
 * it. `BR-1221` — Readex Pro is for headings, the goal statement and celebration moments only.
 *
 * The actual `@font-face` loading is `PH-0.14`/`PH-0.17` work; these are the stacks.
 */
export const fontFamily = {
  display: "'Readex Pro', system-ui, sans-serif",
  body: "'IBM Plex Sans Arabic', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
} as const;

export type RadiusToken = keyof typeof radius;
export type DurationToken = keyof typeof duration;
export type FontSizeToken = keyof typeof fontSize;
export type FontFamilyToken = keyof typeof fontFamily;
