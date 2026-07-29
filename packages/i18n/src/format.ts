import { intlLocale, type Locale } from './locale.js';

/**
 * `BR-526` — dates, numbers and currency use locale-aware formatting, never manual string
 * building. Manual formatting is how a product ends up with `3.5` in one place and `٣٫٥` in
 * another on the same screen.
 *
 * Every formatter routes through `intlLocale`, which pins the numbering system to `latn`
 * (`BR-1226` — Western digits are the default in both languages). `Intl` would otherwise give
 * Arabic-Indic digits for `ar`.
 */

const numberFormatters = new Map<string, Intl.NumberFormat>();

function numberFormatter(locale: Locale, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const cacheKey = `${locale}:${JSON.stringify(options)}`;
  let formatter = numberFormatters.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(intlLocale(locale), options);
    numberFormatters.set(cacheKey, formatter);
  }
  return formatter;
}

export function formatNumber(
  locale: Locale,
  value: number,
  options: Intl.NumberFormatOptions = {},
): string {
  return numberFormatter(locale, options).format(value);
}

export function formatPercent(locale: Locale, fraction: number, fractionDigits = 0): string {
  return numberFormatter(locale, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(fraction);
}

/**
 * How many minor units make one major unit of `currency` — 100 for EGP and USD, 1000 for JOD,
 * KWD and BHD, 1 for JPY.
 *
 * Every conversion in the codebase goes through here. It exists because it did not: `PH-0.13`
 * got the exponent right in `formatMoney` and `PH-0.22` then hardcoded `* 100` in
 * `CurrencyField`, so a JOD amount typed as 12.345 was stored as 1235 and rendered back as
 * 1.235 — a tenfold error, on money, that both sides of the round trip agreed on.
 *
 * `BR-1355` — abstraction on the third use. This is the third (`formatMoney`, `toMinorUnits`,
 * `fromMinorUnits`), and the alternative is the same constant written in three places, which is
 * how the first two disagreed.
 */
export function currencyFractionDigits(currency: string): number {
  return (
    new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

/**
 * Major units in, integer minor units out (`BR-826`).
 *
 * **Rounds, never truncates.** `0.29 * 100` is `28.999999999999996` in IEEE 754, so truncation
 * yields 28 — a one-piastre undercharge on a value the user typed exactly. 1,145 of the 20,000
 * amounts under 200.00 truncate to the wrong integer, so this is not an edge case.
 */
export function toMinorUnits(major: number, currency: string): number {
  return Math.round(major * 10 ** currencyFractionDigits(currency));
}

/** Integer minor units in, major units out. The inverse of `toMinorUnits`. */
export function fromMinorUnits(minorUnits: number, currency: string): number {
  return minorUnits / 10 ** currencyFractionDigits(currency);
}

/**
 * `BR-826` — monetary values are integer minor units with an explicit currency code;
 * floating-point money is prohibited.
 */
export function formatMoney(locale: Locale, minorUnits: number, currency: string): string {
  if (!Number.isInteger(minorUnits)) {
    throw new Error(
      `i18n: formatMoney expects integer minor units (BR-826), received ${String(minorUnits)}.`,
    );
  }

  return numberFormatter(locale, { style: 'currency', currency }).format(
    fromMinorUnits(minorUnits, currency),
  );
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

export function formatDate(
  locale: Locale,
  value: Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  const cacheKey = `${locale}:${JSON.stringify(options)}`;
  let formatter = dateFormatters.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(intlLocale(locale), options);
    dateFormatters.set(cacheKey, formatter);
  }
  return formatter.format(value);
}
