import { DEFAULT_LOCALE, type Locale } from '@josam/i18n';
import type { ReactNode } from 'react';

/**
 * `T` and `Bidi` — the two components that keep bilingual text correct.
 *
 * Both take `locale` explicitly rather than reading a context. `PH-0.13` deferred per-request
 * locale resolution to Phase 1 (there is no locale segment in the router yet), and an explicit
 * prop keeps every one of these server-renderable: a client context provider would turn every
 * formatter in this file into client JavaScript for text that never changes after render. When
 * Phase 1 adds locale routing it can add a provider whose default feeds this prop; nothing here
 * has to change.
 */

/** A bilingual `jsonb` field as stored by `10 §` — Arabic required, English optional. */
export interface BilingualValue {
  ar: string;
  en?: string;
}

export interface TProps {
  value: BilingualValue;
  locale?: Locale;
}

/**
 * `BR-1109` / `BR-524` — renders a bilingual field in the active locale, falling back to Arabic.
 *
 * The fallback is one-directional by design. Arabic is the source of truth, so a missing English
 * string degrades to Arabic; there is no reverse path, because a missing Arabic string is a
 * build-time failure rather than something to paper over at render time.
 */
export function T({ value, locale = DEFAULT_LOCALE }: TProps) {
  const text = locale === 'en' ? (value.en ?? value.ar) : value.ar;

  // `lang` is set when the fallback fires, so a screen reader announcing English content does not
  // read Arabic with an English voice — the commonest and least noticed bilingual defect.
  const rendered = locale === 'en' && value.en === undefined ? 'ar' : locale;

  return <span lang={rendered}>{text}</span>;
}

export interface BidiProps {
  children: ReactNode;
  /** `ltr` for Latin runs, identifiers, URLs and code inside Arabic prose. */
  dir?: 'ltr' | 'rtl' | 'auto';
}

/**
 * `BR-1393` / `BR-1236` — Latin runs inside Arabic text are wrapped in a `dir` with **Unicode
 * isolation**, not embedding.
 *
 * `<bdi>` is isolation in one element. Without it, trailing punctuation jumps to the wrong side:
 * "افتح example.com." renders the full stop before the domain, which reads as a typo rather than
 * as a bidi bug and therefore never gets reported — it just makes the product look careless.
 */
export function Bidi({ children, dir = 'ltr' }: BidiProps) {
  return <bdi dir={dir}>{children}</bdi>;
}
