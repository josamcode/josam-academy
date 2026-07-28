import { describe, expect, it } from 'vitest';

import { formatDate, formatMoney, formatNumber, formatPercent } from './format.js';

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
