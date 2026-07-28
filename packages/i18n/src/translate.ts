import { ar, type MessageKey } from './catalogs/ar.js';
import { en } from './catalogs/en.js';
import type { Locale } from './locale.js';
import { type Message, selectPlural } from './message.js';

export type TranslateParams = Readonly<Record<string, string | number>>;

const CATALOGS = { ar, en } as const;

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * `BR-1399` — interpolation with named variables only, never concatenation. Concatenating
 * fragments assumes a word order; Arabic and English do not share one, and the result is text
 * that is grammatical in neither.
 *
 * A missing variable **throws** rather than rendering `{name}` to a learner. A visible `{name}`
 * in an Arabic-first product is the kind of defect that reads as amateur (`GOAL-07`) and can
 * survive review for weeks because nothing reports it. A thrown error surfaces in the first test
 * or the first dev render, and in production the error boundary (`PH-0.27`) contains it to one
 * component rather than letting it reach the page as broken copy.
 */
export function interpolate(template: string, params?: TranslateParams): string {
  return template.replace(PLACEHOLDER, (_match, name: string) => {
    const value = params?.[name];
    if (value === undefined) {
      throw new Error(
        `i18n: missing interpolation variable "${name}". ` +
          `Template: ${JSON.stringify(template)}`,
      );
    }
    return String(value);
  });
}

function resolve(locale: Locale, key: MessageKey): Message {
  // BR-524 — a missing English string falls back to Arabic. The reverse cannot happen: a key
  // absent from Arabic is not a MessageKey and does not compile.
  return CATALOGS[locale][key] ?? ar[key];
}

/**
 * Translate a key.
 *
 * `params.count` drives plural selection when the entry has forms, and is also available for
 * interpolation, so `{count}` inside a plural form works without being passed twice.
 */
export function translate(
  locale: Locale,
  key: MessageKey,
  params?: TranslateParams & { count?: number },
): string {
  const message = resolve(locale, key);

  if (typeof message === 'string') return interpolate(message, params);

  const count = params?.count;
  if (typeof count !== 'number') {
    throw new Error(
      `i18n: "${key}" has plural forms and requires a numeric "count" parameter (BR-525).`,
    );
  }

  return interpolate(selectPlural(locale, message, count), params);
}

/** Bound to a locale once, so call sites do not thread it through every call. */
export function translator(locale: Locale) {
  return (key: MessageKey, params?: TranslateParams & { count?: number }): string =>
    translate(locale, key, params);
}

export type { MessageKey };
