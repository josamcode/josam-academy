import { DEFAULT_LOCALE, formatMoney, formatNumber, formatPercent, type Locale } from '@josam/i18n';

/**
 * `Money` · `Num` · `Percent` · `Duration` — every number a learner reads.
 *
 * None of them formats anything itself. All four delegate to `@josam/i18n`, which pins the
 * numbering system to `latn` (`BR-1226` — Western digits in both languages) and routes through
 * `Intl` (`BR-526` — never manual string building). A second formatting implementation here is
 * how one screen ends up showing `٣٫٥` while the next shows `3.5`.
 */

/** `BR-1341` / `BR-1428` — tabular figures wherever numbers align in columns. */
const TABULAR = 'tabular-nums';

export interface MoneyProps {
  /** `BR-826` — integer **minor units**. Floating-point money is prohibited. */
  amount: number;
  /** ISO 4217. Explicit, never assumed — `BR-826` requires the code to travel with the amount. */
  currency: string;
  locale?: Locale;
}

/**
 * `BR-826` + `BR-1428`.
 *
 * There is no default currency. A default would be silently wrong the first time the platform
 * sells in a second one, and the failure would be a number on a receipt rather than an error.
 */
export function Money({ amount, currency, locale = DEFAULT_LOCALE }: MoneyProps) {
  return (
    <span className={TABULAR} dir="ltr">
      {formatMoney(locale, amount, currency)}
    </span>
  );
}

export interface NumProps {
  value: number;
  locale?: Locale;
  /** Passed through to `Intl.NumberFormat` — grouping, fraction digits, notation. */
  options?: Intl.NumberFormatOptions;
}

export function Num({ value, locale = DEFAULT_LOCALE, options }: NumProps) {
  return (
    <span className={TABULAR} dir="ltr">
      {formatNumber(locale, value, options)}
    </span>
  );
}

export interface PercentProps {
  /** A **fraction**: `0.35`, not `35`. Passing the pre-multiplied number is the classic bug. */
  fraction: number;
  locale?: Locale;
  fractionDigits?: number;
}

export function Percent({ fraction, locale = DEFAULT_LOCALE, fractionDigits = 0 }: PercentProps) {
  return (
    <span className={TABULAR} dir="ltr">
      {formatPercent(locale, fraction, fractionDigits)}
    </span>
  );
}

export interface DurationProps {
  /** Whole seconds. `DurationField` at PH-0.25 is the input counterpart. */
  seconds: number;
}

/**
 * `mm:ss`, or `h:mm:ss` past an hour.
 *
 * Always LTR and always Western digits, in both languages: a timestamp is a media convention, and
 * `BR-1234` keeps player controls LTR for exactly this reason. Mirroring `12:05` would render it
 * as `05:12`, which is not a formatting quirk — it is a different time.
 */
export function Duration({ seconds }: DurationProps) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const text =
    hours > 0 ? `${String(hours)}:${pad(minutes)}:${pad(secs)}` : `${String(minutes)}:${pad(secs)}`;

  return (
    <span className={TABULAR} dir="ltr">
      <time dateTime={`PT${String(total)}S`}>{text}</time>
    </span>
  );
}
