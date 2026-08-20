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

/**
 * `12C §3` — radius 0 / 3 / 50% (DT-1). The printed-agenda aesthetic is square: the screens carry
 * `border-radius` on almost nothing (a 3px chip here and there) and 50% only on circles.
 * `BR-1228`'s 8px default died with the `12 §5` scale it belonged to.
 *
 * `full` stays 9999 rather than 50%: on the circles it draws (dots, thumbs, avatars) the two are
 * identical, and on anything non-square 50% renders an ellipse, which no screen shows.
 */
export const radius = {
  none: 0,
  sm: 3,
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
 * `12C §3` — the locked scale: 52 · 35 · 22 · 16 · 14 · 12.5 · 11, plus 10 for mono eyebrows only
 * (DT-1). The `12 §4.2` steps 18, 28, 36, 48 and 64 no longer exist; the closed union surfaces
 * every consumer of a dead step as a compile error, which is `DEC-40` doing its job.
 *
 * Line height stays paired with size (`BR-1224` — Arabic needs generous leading, and a
 * free-floating leading scale makes a violating combination writable). Leadings are the reference
 * screens' Arabic-primary values: 16/2.0, 14/1.9, display 52/1.34 and 35/1.5. Arabic RTL is the
 * primary design (`12C` bilingual rules); the screens' tighter Latin leading (1.6) is not
 * expressible per-language in this structure and is deliberately not attempted here.
 *
 * `eyebrow` is 10px mono ONLY — Latin caps, letter-spaced, never carrying Arabic or a readable
 * sentence (`12C §3`). `4xl` (52) and `3xl` (35) are the display tiers, the only sizes the display
 * face may render (`12C`: Amiri never under 28px).
 */
export const fontSize = {
  eyebrow: { size: 10, lineHeight: 16 },
  '2xs': { size: 11, lineHeight: 16 },
  xs: { size: 12.5, lineHeight: 22 },
  sm: { size: 14, lineHeight: 26 },
  base: { size: 16, lineHeight: 32 },
  xl: { size: 22, lineHeight: 32 },
  '3xl': { size: 35, lineHeight: 52 },
  '4xl': { size: 52, lineHeight: 70 },
} as const;

/**
 * `12C §3` type (DT-1). The Arabic face was chosen first (`DEC-33` survives in spirit):
 * Almarai draws everything that is not display or code; Amiri carries the display tier only —
 * 700 only, never under 28px, never in dense mode; Newsreader carries the display tier only when
 * the interface is English (it has no Arabic coverage at all); IBM Plex Mono draws figures, code,
 * IDs, eyebrows and inline Latin technical terms. `BR-1221` (Readex Pro) died with the old fonts.
 *
 * Every stack leads with a `var()` hook because `next/font` registers its self-hosted faces under
 * hashed family names — `apps/web/app/layout.tsx` supplies `--font-almarai` etc. on `<html>`. The
 * literal family after the hook keeps the stack meaningful wherever the loader is absent
 * (Storybook stories outside the root layout, a non-Next consumer). Every stack names an explicit
 * Arabic-capable fallback — a bare `serif` is a defect (`12C` bilingual rules); `displayLatin`'s
 * is Amiri itself, which is the locked `display EN` stack.
 */
export const fontFamily = {
  display: "var(--font-amiri, 'Amiri'), 'Noto Naskh Arabic', serif",
  displayLatin: "var(--font-newsreader, 'Newsreader'), var(--font-amiri, 'Amiri'), serif",
  body: "var(--font-almarai, 'Almarai'), 'Noto Sans Arabic', 'Segoe UI', Tahoma, sans-serif",
  mono: "var(--font-plex-mono, 'IBM Plex Mono'), 'Noto Sans Mono', 'Noto Sans Arabic', monospace",
} as const;

/**
 * `12C §3` weights (DT-1): Almarai 400 / 700 / 800, Amiri 700 only, mono 400 / 500.
 *
 * This SUPERSEDES `12A`'s `BR-1588` "no 700" — that rule governed the fonts it died with.
 * 500 exists for the mono face only; the body face has no 500 or 600, and a `font-medium` or
 * `font-semibold` on Almarai would render a synthesised fake. The Tailwind layer deletes every
 * weight utility outside this set (`css.ts`).
 */
export const fontWeight = {
  regular: 400,
  /** Mono only — IBM Plex Mono's second weight. Almarai has no 500. */
  medium: 500,
  bold: 700,
  extrabold: 800,
} as const;

export type RadiusToken = keyof typeof radius;
export type DurationToken = keyof typeof duration;
export type FontSizeToken = keyof typeof fontSize;
export type FontFamilyToken = keyof typeof fontFamily;
export type FontWeightToken = keyof typeof fontWeight;
