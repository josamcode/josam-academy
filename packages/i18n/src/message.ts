import type { Locale } from './locale.js';

/**
 * The six CLDR plural categories. `BR-525` — Arabic implements all six; English two-form logic
 * applied to Arabic produces visibly wrong text.
 *
 * `other` is required and the rest are optional because CLDR guarantees `other` for every locale
 * and nothing else. A catalog entry that omits `other` would have no safe fallback, so the type
 * forbids it rather than leaving it to review.
 */
export interface PluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export type Message = string | PluralForms;

export type Catalog = Readonly<Record<string, Message>>;

/** `Intl.PluralRules` is cached per locale — constructing one per call is measurably wasteful. */
const pluralRules = new Map<Locale, Intl.PluralRules>();

export function pluralRulesFor(locale: Locale): Intl.PluralRules {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRules.set(locale, rules);
  }
  return rules;
}

/**
 * Selects a plural form. Falls back to `other` when the catalog does not supply the category the
 * locale selected — an English entry has no `few`, and Arabic asking for one must not blow up.
 */
export function selectPlural(locale: Locale, forms: PluralForms, count: number): string {
  const category = pluralRulesFor(locale).select(count);
  return forms[category] ?? forms.other;
}
