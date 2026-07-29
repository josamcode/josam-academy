import { DEFAULT_LOCALE, intlLocale, type Locale } from '@josam/i18n';

/**
 * `BR-825` — time is rendered in the **learner's** timezone, not the server's and not the
 * browser's default.
 *
 * `timeZone` is a required prop, deliberately. Omitting it makes `Intl` fall back to the runtime's
 * zone, which on the server is UTC and in the browser is wherever the device happens to be — so a
 * lesson deadline would read differently in SSR output and after hydration, and the mismatch is
 * invisible in review because both look like plausible times.
 */
export type WhenFormat = 'date' | 'time' | 'datetime' | 'relative';

export interface WhenProps {
  /** An absolute instant. `10 §` stores `TIMESTAMPTZ` in UTC; this is that value. */
  at: Date;
  timeZone: string;
  locale?: Locale;
  format?: WhenFormat;
  /** Anchor for `relative`. Injected so the output is deterministic and testable. */
  now?: Date;
}

const ABSOLUTE: Record<Exclude<WhenFormat, 'relative'>, Intl.DateTimeFormatOptions> = {
  date: { dateStyle: 'medium' },
  time: { timeStyle: 'short' },
  datetime: { dateStyle: 'medium', timeStyle: 'short' },
};

const DIVISIONS: [amount: number, unit: Intl.RelativeTimeFormatUnit][] = [
  [60, 'second'],
  [60, 'minute'],
  [24, 'hour'],
  [7, 'day'],
  [4.34524, 'week'],
  [12, 'month'],
  [Number.POSITIVE_INFINITY, 'year'],
];

function relative(at: Date, now: Date, locale: Locale): string {
  const formatter = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: 'auto' });
  let delta = (at.getTime() - now.getTime()) / 1000;

  for (const [amount, unit] of DIVISIONS) {
    if (Math.abs(delta) < amount) return formatter.format(Math.round(delta), unit);
    delta /= amount;
  }

  return formatter.format(Math.round(delta), 'year');
}

export function When({ at, timeZone, locale = DEFAULT_LOCALE, format = 'date', now }: WhenProps) {
  const text =
    format === 'relative'
      ? relative(at, now ?? new Date(), locale)
      : new Intl.DateTimeFormat(intlLocale(locale), { ...ABSOLUTE[format], timeZone }).format(at);

  // The machine-readable value is always the UTC instant, whatever the display format. A crawler,
  // a test, or a copy-paste gets the unambiguous value rather than a localised rendering.
  return <time dateTime={at.toISOString()}>{text}</time>;
}
