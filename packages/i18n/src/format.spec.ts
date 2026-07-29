import { describe, expect, it } from 'vitest';

import {
  currencyFractionDigits,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  fromMinorUnits,
  toMinorUnits,
} from './format.js';

/**
 * BR-526 — locale-aware formatting, never manual string building.
 * BR-1226 — Western digits are the default in BOTH languages.
 */
describe('BR-1226 — Western digits in both languages', () => {
  const arabicIndic = /[٠-٩]/;

  it('formats Arabic numbers with Western digits, not ٠-٩', () => {
    const formatted = formatNumber('ar', 1234.5);
    expect(formatted).not.toMatch(arabicIndic);
    expect(formatted).toMatch(/1/);
  });

  it('formats Arabic money with Western digits', () => {
    expect(formatMoney('ar', 12345, 'EGP')).not.toMatch(arabicIndic);
  });

  it('formats Arabic dates with Western digits', () => {
    expect(formatDate('ar', new Date(Date.UTC(2026, 6, 29)))).not.toMatch(arabicIndic);
  });

  it('formats Arabic percentages with Western digits', () => {
    expect(formatPercent('ar', 0.35)).not.toMatch(arabicIndic);
  });
});

describe('BR-826 — money is integer minor units with an explicit currency', () => {
  it('scales two-decimal currencies correctly', () => {
    // 12345 minor units of EGP is 123.45, not 12345.
    expect(formatMoney('en', 12345, 'EGP')).toContain('123.45');
  });

  it('uses the currency exponent rather than assuming 100', () => {
    // JOD has three decimal places and JPY has none. Assuming 100 breaks both, and it is the
    // kind of bug that only shows up once real money moves.
    expect(formatMoney('en', 12345, 'JOD')).toContain('12.345');
    expect(formatMoney('en', 12345, 'JPY')).toContain('12,345');
  });

  it('rejects a non-integer amount instead of silently rounding', () => {
    expect(() => formatMoney('en', 123.45, 'EGP')).toThrow(/integer minor units/);
  });

  it('formats zero without special-casing', () => {
    expect(formatMoney('en', 0, 'EGP')).toContain('0.00');
  });
});

describe('BR-526 — formatting is locale-aware', () => {
  it('produces different output per locale for the same value', () => {
    expect(formatDate('ar', new Date(Date.UTC(2026, 6, 29)))).not.toBe(
      formatDate('en', new Date(Date.UTC(2026, 6, 29))),
    );
  });

  it('formats percentages from a fraction, not a pre-multiplied number', () => {
    expect(formatPercent('en', 0.35)).toBe('35%');
  });
});

/**
 * BR-826 — one exponent-aware conversion, used everywhere money is scaled.
 *
 * These exist because two call sites disagreed: `formatMoney` divided by the currency's own
 * exponent while `CurrencyField` multiplied by a hardcoded 100. A JOD amount typed as 12.345 was
 * stored as 1235 and rendered back as 1.235 — a tenfold error that both halves agreed on, so
 * nothing looked inconsistent from either end. The round-trip assertion below is the one that
 * catches that class, because it exercises both directions together.
 */
describe('BR-826 — minor-unit conversion uses the currency exponent', () => {
  it.each([
    ['EGP', 2],
    ['USD', 2],
    ['JOD', 3],
    ['KWD', 3],
    ['BHD', 3],
    ['JPY', 0],
  ])('%s has %i fraction digits', (currency, digits) => {
    expect(currencyFractionDigits(currency)).toBe(digits);
  });

  it.each([
    ['EGP', 49.9, 4990],
    ['JOD', 12.345, 12345],
    ['KWD', 1.5, 1500],
    ['JPY', 12345, 12345],
    // The truncation cases, which must round.
    ['EGP', 0.29, 29],
    ['EGP', 1.13, 113],
  ])('%s %s major becomes %i minor', (currency, major, minor) => {
    expect(toMinorUnits(major, currency)).toBe(minor);
  });

  it.each(['EGP', 'USD', 'JOD', 'KWD', 'BHD', 'JPY'])(
    '%s survives a major -> minor -> formatted round trip',
    (currency) => {
      const digits = currencyFractionDigits(currency);
      const major = digits === 0 ? 12345 : 12.345;
      const minor = toMinorUnits(major, currency);

      expect(Number.isInteger(minor)).toBe(true);
      expect(fromMinorUnits(minor, currency)).toBeCloseTo(major, digits);
      // And the rendered string contains the value the user actually typed.
      expect(formatMoney('en', minor, currency)).toContain(
        digits === 0 ? '12,345' : major.toFixed(digits),
      );
    },
  );

  it('a hardcoded 100 would be wrong for four of these six currencies', () => {
    const wrong = ['EGP', 'USD', 'JOD', 'KWD', 'BHD', 'JPY'].filter(
      (c) => Math.round(12.345 * 100) !== toMinorUnits(12.345, c),
    );
    expect(wrong).toEqual(['JOD', 'KWD', 'BHD', 'JPY']);
  });
});
