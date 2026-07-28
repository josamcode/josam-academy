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
 * `BR-826` — all monetary values are stored as **integer minor units** with an explicit currency
 * code; floating-point money is prohibited. So this takes minor units and the currency, and does
 * the scaling itself using the currency's own exponent rather than assuming 100.
 *
 * Assuming two decimal places is wrong for JOD and KWD (three) and for JPY (zero) — all
 * plausible for this audience, and the kind of bug that only appears once real money moves.
 */
export function formatMoney(locale: Locale, minorUnits: number, currency: string): string {
  if (!Number.isInteger(minorUnits)) {
    throw new Error(
      `i18n: formatMoney expects integer minor units (BR-826), received ${String(minorUnits)}.`,
    );
  }

  const formatter = numberFormatter(locale, { style: 'currency', currency });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;

  return formatter.format(minorUnits / 10 ** digits);
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
