import { describe, expect, it } from 'vitest';

import { ar } from './catalogs/ar.js';
import { en } from './catalogs/en.js';
import { type Locale, LOCALES } from './locale.js';
import { type Message, pluralRulesFor } from './message.js';

const CATALOGS: Record<Locale, Readonly<Record<string, Message>>> = { ar, en };

const ALL_FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'] as const;

/**
 * Catalog integrity. These are the checks that stop a translator's reasonable-looking edit from
 * being silently dead.
 */
describe.each(LOCALES)('%s catalog integrity', (locale) => {
  const catalog = CATALOGS[locale];
  const categories = new Set<string>(pluralRulesFor(locale).resolvedOptions().pluralCategories);

  it('declares no plural form the locale can never select', () => {
    // The trap this exists for: CLDR English has no `zero`, so an English `zero` entry looks
    // correct in the catalog and never renders. Found the hard way at PH-0.13.
    for (const [key, message] of Object.entries(catalog)) {
      if (typeof message === 'string') continue;
      for (const form of ALL_FORMS) {
        if (message[form] === undefined) continue;
        expect(
          categories.has(form),
          `${locale}["${key}"] declares "${form}", which ${locale} never selects`,
        ).toBe(true);
      }
    }
  });

  it('supplies every category the locale CAN select', () => {
    for (const [key, message] of Object.entries(catalog)) {
      if (typeof message === 'string') continue;
      for (const category of categories) {
        expect(
          message[category as keyof typeof message],
          `${locale}["${key}"].${category}`,
        ).toBeDefined();
      }
    }
  });

  it('always supplies `other`, the only category CLDR guarantees', () => {
    for (const [key, message] of Object.entries(catalog)) {
      if (typeof message === 'string') continue;
      expect(message.other, `${locale}["${key}"].other`).toBeTruthy();
    }
  });

  it('uses no empty strings — a blank entry is an untranslated entry wearing a disguise', () => {
    for (const [key, message] of Object.entries(catalog)) {
      if (typeof message === 'string') {
        expect(message.trim(), key).not.toBe('');
        continue;
      }
      for (const form of ALL_FORMS) {
        const value = message[form];
        if (value !== undefined) expect(value.trim(), `${key}.${form}`).not.toBe('');
      }
    }
  });

  it('never concatenates — a plural form referencing {count} keeps it inside the string (BR-1399)', () => {
    for (const [key, message] of Object.entries(catalog)) {
      if (typeof message === 'string') continue;
      // `other` is the general case and must be able to state the number.
      if (/\d/.test(message.other)) {
        expect.fail(`${locale}["${key}"].other hardcodes a digit; use {count}`);
      }
    }
  });
});

describe('BR-524 — the Arabic catalog defines the key space', () => {
  it('English introduces no key Arabic lacks', () => {
    const arabicKeys = new Set(Object.keys(ar));
    for (const key of Object.keys(en)) {
      expect(arabicKeys.has(key), `en["${key}"] has no Arabic source`).toBe(true);
    }
  });

  it('keys are namespaced by domain (FEAT-184)', () => {
    for (const key of Object.keys(ar)) {
      expect(key, `"${key}" is not namespaced`).toMatch(/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/);
    }
  });
});
