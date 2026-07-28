import type { Message } from '../message.js';
import type { MessageKey } from './ar.js';

/**
 * English — translated from Arabic, never authored first (`FEAT-184`).
 *
 * Typed as `Partial`, which is `BR-524` expressed in the type system: a missing English string is
 * legal and falls back to Arabic at runtime, while a key that does not exist in Arabic is not a
 * valid `MessageKey` and fails to compile. The asymmetry is the rule.
 *
 * English needs only `one` and `other` — `Intl.PluralRules('en')` reports exactly those two
 * categories, and `selectPlural` falls back to `other` for anything else Arabic might select.
 */
export const en: Partial<Record<MessageKey, Message>> = {
  'common.retry': 'Try again',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.close': 'Close',
  'common.loading': 'Loading…',

  'error.internal': 'Something went wrong on our side. Please try again shortly.',
  'error.notFound': "We couldn't find what you're looking for.",
  'error.unauthenticated': 'Your session has ended. Please sign in again.',
  'error.forbidden': "You don't have access to this.",
  'error.validation': 'Please check the information you entered.',
  'error.rateLimited': 'Too many attempts. Please wait a moment and try again.',
  'error.offline': "You're offline.",

  'greeting.welcome': 'Welcome {name}',

  'validation.minLength': {
    one: 'Enter at least 1 character',
    other: 'Enter at least {count} characters',
  },

  /**
   * No `zero` form. CLDR English has only `one` and `other`, so `Intl.PluralRules('en').select(0)`
   * returns `other` and a `zero` entry here would never render — it would look correct in the
   * catalog and be dead in the product.
   *
   * Caught at PH-0.13 by a test that expected "Nothing selected" and got "0 items selected".
   * `catalog.spec.ts` now asserts that no catalog declares a form its own locale cannot select,
   * so this cannot be reintroduced quietly. A friendlier empty-state string is a UI concern and
   * belongs to the component that renders it, not to the plural machinery.
   */
  'selection.count': {
    one: '1 item selected',
    other: '{count} items selected',
  },

  // 'common.close' etc. are all present; a key deliberately left out here would simply render in
  // Arabic. That is the designed behaviour, not a gap.
};
