/**
 * `PRIN-07` — Arabic leads. `BR-524` makes that concrete: Arabic is the source of truth, English
 * falls back to it, and a missing Arabic string is a build-time failure rather than a runtime
 * gap.
 */
export const LOCALES = ['ar', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ar';

export type Direction = 'rtl' | 'ltr';

const DIRECTIONS: Record<Locale, Direction> = {
  ar: 'rtl',
  en: 'ltr',
};

export function directionOf(locale: Locale): Direction {
  return DIRECTIONS[locale];
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * `BR-1226` — Western digits (0-9) are the default in **both** languages. Technical content,
 * code, timestamps and prices are read as Western digits by this audience.
 *
 * This matters more than it looks: `Intl` defaults Arabic to Arabic-Indic digits (٠-٩), so every
 * formatter in `format.ts` has to say `latn` explicitly. Forgetting it in one place produces a
 * page where prices and timestamps disagree about which numerals they use.
 *
 * `BR-1227` — Arabic-Indic digits are a user preference that applies to prose numbers only, never
 * to code, versions or prices. That preference is Phase 1; this is the default it overrides.
 */
export const DEFAULT_NUMBERING_SYSTEM = 'latn';

/** `ar` → `ar-u-nu-latn`. Used by every formatter so the numeral system is never accidental. */
export function intlLocale(locale: Locale): string {
  return `${locale}-u-nu-${DEFAULT_NUMBERING_SYSTEM}`;
}
