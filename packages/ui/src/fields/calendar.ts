/**
 * Calendar arithmetic for `DatePicker`, kept separate from the component and free of React.
 *
 * No date library. `Intl` supplies month and weekday names in Arabic for free, and the grid is
 * three lines of arithmetic — a dependency here would buy nothing and pin a locale database we
 * already have in the platform.
 *
 * **Everything is a calendar date, never an instant.** Dates move as `YYYY-MM-DD` strings and are
 * constructed at **UTC noon** when a `Date` object is unavoidable. `PH-0.18` already produced one
 * bug from this: an instant near midnight is a different calendar day in Cairo than in Tokyo, so a
 * date of birth or a due date stored as an instant silently shifts by a day for some users. UTC
 * noon is far enough from either edge that no real timezone offset can cross it.
 */

/** `YYYY-MM-DD`. A calendar date with no time and no zone. */
export type IsoDate = string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Round-trips deliberately. A `Number.isNaN(getTime())` check is not enough: V8 accepts
 * `2026-02-30T12:00:00Z` and silently rolls it to 2 March rather than returning `Invalid Date`, so
 * an impossible date passes a validity check and then reads back as a different, plausible one.
 * Formatting it again and comparing is the only check that catches that.
 */
export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const date = toDate(value);
  return !Number.isNaN(date.getTime()) && toIso(date) === value;
}

/** Midday UTC, deliberately — see the note above. */
export function toDate(iso: IsoDate): Date {
  return new Date(`${iso}T12:00:00.000Z`);
}

export function toIso(date: Date): IsoDate {
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

export function addMonths(iso: IsoDate, months: number): IsoDate {
  const date = toDate(iso);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  // Clamp: 31 January plus one month is 28 or 29 February, not 2 or 3 March. Setting the day
  // directly on the original date would roll over into the following month instead.
  const lastDay = daysInMonth(date.getUTCFullYear(), date.getUTCMonth());
  date.setUTCDate(Math.min(day, lastDay));
  return toIso(date);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0, 12)).getUTCDate();
}

/**
 * The locale's first day of the week, as a JS day index (0 = Sunday … 6 = Saturday).
 *
 * Arabic locales start the week on **Saturday**, English on Sunday, most of Europe on Monday. A
 * hardcoded Monday would be wrong in both of this product's languages, so it comes from the
 * locale. `getWeekInfo` returns ISO numbering (1 = Monday … 7 = Sunday), hence the `% 7`.
 *
 * The method is typed by `src/intl-week-info.d.ts` — see that file for why it lives there.
 */
export function firstDayOfWeek(locale: string): number {
  const info = new Intl.Locale(locale).getWeekInfo?.();
  return info === undefined ? 0 : info.firstDay % 7;
}

export interface CalendarDay {
  iso: IsoDate;
  dayOfMonth: number;
  /** False for the leading and trailing days borrowed from the adjacent months. */
  inMonth: boolean;
}

/**
 * Six weeks of seven days, always — a grid that changes height as the user pages through months
 * makes the surrounding layout jump and moves the buttons out from under the pointer.
 */
export function monthGrid(year: number, monthIndex: number, weekStart: number): CalendarDay[] {
  const first = new Date(Date.UTC(year, monthIndex, 1, 12));
  const offset = (first.getUTCDay() - weekStart + 7) % 7;
  const start = new Date(first);
  start.setUTCDate(start.getUTCDate() - offset);

  const days: CalendarDay[] = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    days.push({
      iso: toIso(date),
      dayOfMonth: date.getUTCDate(),
      inMonth: date.getUTCMonth() === monthIndex,
    });
  }
  return days;
}

/** Weekday names in the locale's own order, starting from that locale's first day. */
export function weekdayNames(locale: string, format: 'short' | 'narrow' = 'short'): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: format, timeZone: 'UTC' });
  const weekStart = firstDayOfWeek(locale);
  // 2024-01-07 is a Sunday, so adding the JS day index lands on that weekday.
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(2024, 0, 7 + ((weekStart + index) % 7), 12));
    return formatter.format(date);
  });
}

/**
 * `DEC-12` — Gregorian is the calendar; Hijri is an **optional display** and off by default.
 *
 * Returned as a separate string rather than replacing the Gregorian one: the decision was that
 * Hijri is shown alongside, not instead, so a user who reads one and a user who reads the other
 * are looking at the same field.
 */
export function hijriLabel(locale: string, iso: IsoDate): string {
  return new Intl.DateTimeFormat(`${locale}-u-ca-islamic`, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(toDate(iso));
}

export function isBefore(a: IsoDate, b: IsoDate): boolean {
  return a < b; // ISO dates are lexicographically ordered by design.
}

export function clampToRange(iso: IsoDate, min?: IsoDate, max?: IsoDate): IsoDate {
  if (min !== undefined && isBefore(iso, min)) return min;
  if (max !== undefined && isBefore(max, iso)) return max;
  return iso;
}

export function isDisabledDate(iso: IsoDate, min?: IsoDate, max?: IsoDate): boolean {
  if (min !== undefined && isBefore(iso, min)) return true;
  if (max !== undefined && isBefore(max, iso)) return true;
  return false;
}
