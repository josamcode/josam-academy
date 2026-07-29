'use client';

import { Calendar, ChevronLeft, ChevronRight, Crosshair, X } from 'lucide-react';
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { useFormField } from '../form/FormField.js';
import { Inline, Stack } from '../primitives/layout.js';
import { Text } from '../primitives/Text.js';
import {
  addDays,
  addMonths,
  type CalendarDay,
  firstDayOfWeek,
  hijriLabel,
  isDisabledDate,
  isIsoDate,
  type IsoDate,
  monthGrid,
  toDate,
  toIso,
  weekdayNames,
} from './calendar.js';

/**
 * `DatePicker` · `DurationField` · `TimestampField` (`12 §20.7`).
 *
 * None of the three is a Radix primitive — Radix has no date picker — so each owns its keyboard
 * contract outright, documented per component (`BR-1531`).
 */

const CONTROL =
  'w-full rounded-sm bg-bg-inset text-text-primary p-3 border border-border-subtle ' +
  'outline-none focus-visible:ring-2 focus-visible:ring-border-focus ' +
  'aria-invalid:border-danger data-invalid:border-danger disabled:opacity-50 disabled:cursor-not-allowed';

const ICON_BUTTON =
  'rounded-sm p-2 text-text-secondary outline-none hover:bg-bg-inset ' +
  'focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50 ' +
  'disabled:cursor-not-allowed';

/** What `Controller` hands each control body. Deliberately not RHF's own type. */
interface FieldBinding {
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur: () => void;
}

/**
 * `BR-1544` — `readOnly` and `disabled` are distinct, and `disabled` always carries a reason
 * (`BR-1347`). A read-only field still participates in the form and is still focusable, so its
 * value can be read and copied by a keyboard user; a disabled one is out of the flow entirely and
 * has to say why, because a control that refuses to work without explanation is a dead end.
 */
type Availability =
  | { disabled: true; disabledReason: string; readOnly?: never }
  | { disabled?: false; disabledReason?: never; readOnly?: boolean };

/**
 * The nearest declared direction.
 *
 * Read from the DOM rather than from a prop: direction is set once on `<html>` (and occasionally
 * overridden by `Bidi` for an isolated run), and a prop would let a caller declare one thing while
 * the document does another. `closest` picks up a nested override; `document.dir` is the fallback.
 */
function directionOf(element: Element | null): 'ltr' | 'rtl' {
  const declared = element?.closest('[dir]')?.getAttribute('dir');
  if (declared === 'rtl' || declared === 'ltr') return declared;
  return document.dir === 'rtl' ? 'rtl' : 'ltr';
}

// ── DatePicker ───────────────────────────────────────────────────────────────────────────
export interface DatePickerProps {
  /** BCP-47. Drives month names, weekday names and the first day of the week. */
  locale: string;
  /** `YYYY-MM-DD`. */
  min?: IsoDate;
  max?: IsoDate;
  /** `DEC-12` — Gregorian is the calendar; Hijri is shown alongside, and off by default. */
  showHijri?: boolean;
  /** Pre-translated. */
  labels: {
    open: string;
    previousMonth: string;
    nextMonth: string;
    /** Shown in the trigger when nothing is chosen. Never the label (`BR-1402`). */
    placeholder: string;
  };
}

/**
 * Keyboard (`BR-1531`):
 *
 * ```
 * Enter / Space / ArrowDown   open the calendar
 * Arrow inline                previous / next day — FOLLOWS DIRECTION, see below
 * ArrowUp / ArrowDown         previous / next week
 * Home / End                  first / last day of the week
 * PageUp / PageDown           previous / next month
 * Enter / Space               choose the focused day
 * Escape                      close, returning focus to the trigger
 * ```
 *
 * **The inline arrows swap in RTL.** The grid is laid out by the document direction, so in Arabic
 * the day to the visual left of today is *tomorrow*. Binding `ArrowRight` to "next day"
 * unconditionally means the highlight moves the opposite way from the key in half the product's
 * languages. This is the one behaviour in the component that cannot be got right by using logical
 * CSS properties, because it is not layout — it is intent (`BR-1232`, `BR-1529`).
 *
 * The grid is a `grid` role with `gridcell` children and roving `tabIndex`: one tab stop, not 42.
 */
function DatePickerControl({
  field,
  id,
  labelledBy,
  describedBy,
  invalid,
  locale,
  min,
  max,
  showHijri = false,
  labels,
  disabled = false,
  disabledReason,
  readOnly = false,
}: DatePickerProps &
  Availability & { field: FieldBinding } & {
    id: string;
    labelledBy: string;
    describedBy: string | undefined;
    invalid: boolean;
  }) {
  const selected = isIsoDate(field.value) ? field.value : undefined;
  const [open, setOpen] = useState(false);
  const [focusedDay, setFocusedDay] = useState<IsoDate>(() => selected ?? toIso(new Date()));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const weekStart = useMemo(() => firstDayOfWeek(locale), [locale]);
  const weekdays = useMemo(() => weekdayNames(locale), [locale]);
  const focusedDate = toDate(focusedDay);
  const year = focusedDate.getUTCFullYear();
  const monthIndex = focusedDate.getUTCMonth();
  const weeks = useMemo(() => {
    const flat = monthGrid(year, monthIndex, weekStart);
    return Array.from({ length: 6 }, (_, row) => flat.slice(row * 7, row * 7 + 7));
  }, [year, monthIndex, weekStart]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
        focusedDate,
      ),
    [locale, focusedDate],
  );
  const formatDay = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }),
    [locale],
  );

  // Focus follows the roving tabIndex, so the browser's own focus ring lands on the right cell.
  useEffect(() => {
    if (!open) return;
    gridRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  }, [open, focusedDay]);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const choose = useCallback(
    (iso: IsoDate) => {
      if (isDisabledDate(iso, min, max)) return;
      field.onChange(iso);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [field, min, max],
  );

  const onGridKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      // Enter and Space are preventDefault-ed below, which also suppresses the click a <button>
      // would otherwise synthesise from them — without that, choose() runs twice (PH-0.24).
      const rtl = directionOf(event.currentTarget) === 'rtl';
      // The inline axis, resolved against the document direction. See the doc comment.
      const inlineStep = rtl ? -1 : 1;

      const moves: Record<string, number | undefined> = {
        ArrowRight: inlineStep,
        ArrowLeft: -inlineStep,
        ArrowDown: 7,
        ArrowUp: -7,
      };

      const step = moves[event.key];
      if (step !== undefined) {
        event.preventDefault();
        setFocusedDay((current) => addDays(current, step));
        return;
      }

      switch (event.key) {
        case 'Home':
          event.preventDefault();
          setFocusedDay((current) => {
            const offset = (toDate(current).getUTCDay() - weekStart + 7) % 7;
            return addDays(current, -offset);
          });
          break;
        case 'End':
          event.preventDefault();
          setFocusedDay((current) => {
            const offset = (toDate(current).getUTCDay() - weekStart + 7) % 7;
            return addDays(current, 6 - offset);
          });
          break;
        case 'PageUp':
          event.preventDefault();
          setFocusedDay((current) => addMonths(current, -1));
          break;
        case 'PageDown':
          event.preventDefault();
          setFocusedDay((current) => addMonths(current, 1));
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          choose(focusedDay);
          break;
        case 'Escape':
          event.preventDefault();
          close();
          break;
        default:
          break;
      }
    },
    [choose, close, focusedDay, weekStart],
  );

  const triggerText =
    selected === undefined ? labels.placeholder : formatDay.format(toDate(selected));

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        // `aria-invalid` is not supported on role=button and is dropped by assistive technology,
        // so it would have been decoration. The error itself reaches the user through
        // `aria-describedby`, which points at FormField's message; this only drives the border.
        data-invalid={invalid ? '' : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        className={`${CONTROL} flex items-center justify-between gap-2`}
        onClick={() => {
          if (!readOnly) setOpen((previous) => !previous);
        }}
        onKeyDown={(event) => {
          // A <button> synthesises a click from Enter and Space; handling them here as well would
          // toggle twice and net to nothing. PH-0.24 shipped that bug once — see MultiSelect.
          if (event.key === 'ArrowDown' && !readOnly) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        onBlur={field.onBlur}
      >
        <Text size="sm" tone={selected === undefined ? 'muted' : 'primary'}>
          {triggerText}
        </Text>
        <Calendar width={16} height={16} aria-hidden="true" focusable="false" />
      </button>

      {selected !== undefined && showHijri ? (
        <Text size="xs" tone="secondary">
          {hijriLabel(locale, selected)}
        </Text>
      ) : null}

      {open ? (
        <div
          role="dialog"
          aria-label={labels.open}
          className="absolute z-50 mt-1 rounded-md border border-border-strong bg-bg-elevated p-3"
        >
          <Inline gap="2">
            <button
              type="button"
              aria-label={labels.previousMonth}
              className={ICON_BUTTON}
              onClick={() => {
                setFocusedDay((current) => addMonths(current, -1));
              }}
            >
              {/*
                BR-1233 — a chevron pointing at the previous month is directional, so it mirrors.
                `rtl:rotate-180` on a single glyph rather than swapping the two icons, which would
                make the DOM order depend on direction and break the tab order in one of them.
              */}
              <ChevronLeft
                width={16}
                height={16}
                aria-hidden="true"
                focusable="false"
                className="rtl:rotate-180"
              />
            </button>

            <Text size="sm" weight="medium">
              <span aria-live="polite">{monthLabel}</span>
            </Text>

            <button
              type="button"
              aria-label={labels.nextMonth}
              className={ICON_BUTTON}
              onClick={() => {
                setFocusedDay((current) => addMonths(current, 1));
              }}
            >
              <ChevronRight
                width={16}
                height={16}
                aria-hidden="true"
                focusable="false"
                className="rtl:rotate-180"
              />
            </button>
          </Inline>

          {/*
            No handler on the grid container. `jsx-a11y/interactive-supports-focus` was right to
            reject it: an element carrying an interactive role and a key handler has to be
            focusable, and this one never is — the roving `tabIndex` lives on the cells. Handling
            keys on the focused cell is also the ARIA grid pattern rather than a workaround.
          */}
          <div
            ref={gridRef}
            role="grid"
            aria-label={monthLabel}
            className="mt-2 flex flex-col gap-1"
          >
            {/*
              Real `row` elements. axe reported `aria-required-children` and `aria-required-parent`
              against the flat version: a `grid` must contain `row`s and a `gridcell` must have a
              `row` parent. The flat grid looked identical and announced itself as a table with no
              rows, which is worse than a plain list of buttons would have been.
            */}
            <div role="row" className="grid grid-cols-7 gap-1">
              {weekdays.map((name) => (
                <Text key={name} size="xs" tone="muted" align="center">
                  <span role="columnheader" aria-label={name}>
                    {name}
                  </span>
                </Text>
              ))}
            </div>

            {weeks.map((week) => (
              <div key={week[0]?.iso ?? ''} role="row" className="grid grid-cols-7 gap-1">
                {week.map((day: CalendarDay) => {
                  const isFocused = day.iso === focusedDay;
                  const isSelected = day.iso === selected;
                  const unavailable = isDisabledDate(day.iso, min, max);
                  return (
                    <button
                      key={day.iso}
                      type="button"
                      role="gridcell"
                      // Roving tabIndex: one tab stop for 42 cells. Tabbing through a month is not
                      // navigation, it is a trap.
                      tabIndex={isFocused ? 0 : -1}
                      aria-selected={isSelected}
                      aria-disabled={unavailable}
                      aria-label={formatDay.format(toDate(day.iso))}
                      disabled={unavailable}
                      onKeyDown={onGridKeyDown}
                      className={`rounded-sm p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-border-focus aria-selected:bg-accent aria-selected:text-accent-contrast ${
                        day.inMonth ? 'text-text-primary' : 'text-text-muted'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      onClick={() => {
                        choose(day.iso);
                      }}
                    >
                      {day.dayOfMonth}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DatePicker(props: DatePickerProps & Availability) {
  const { id, name, labelledBy, describedBy, invalid } = useFormField();
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <DatePickerControl
          {...props}
          field={field}
          id={id}
          labelledBy={labelledBy}
          describedBy={describedBy}
          invalid={invalid}
        />
      )}
    />
  );
}

// ── DurationField ────────────────────────────────────────────────────────────────────────
/** `mm:ss`. Minutes are not capped at 59 — a 90-minute lesson is `90:00`, not `1:30:00`. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`;
}

/**
 * `null` for anything that is not `m:ss` or `mm:ss`.
 *
 * Seconds above 59 are rejected rather than carried: `4:75` is a typo, and silently reading it as
 * 5:15 turns a mistake into data. Rejecting it lets the field say so.
 */
export function parseDuration(input: string): number | null {
  const match = /^(\d+):([0-5]\d)$/.exec(input.trim());
  if (match === null) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export interface DurationFieldProps {
  /** Pre-translated, e.g. `mm:ss`. Never the label (`BR-1402`). */
  placeholder: string;
  /** Pre-translated, announced when the entry cannot be parsed. */
  invalidMessage: string;
}

/**
 * `12 §20.7` — `mm:ss` entry, **not raw seconds**. The stored value is still seconds, because
 * every consumer does arithmetic on it; only the entry and display are `mm:ss`.
 *
 * Keyboard: ordinary text entry. Parsing happens on blur, not per keystroke — validating while
 * someone is halfway through typing `12:` means telling them they are wrong for not having
 * finished.
 */
export function DurationField({
  placeholder,
  invalidMessage,
  disabled = false,
  disabledReason,
  readOnly = false,
}: DurationFieldProps & Availability) {
  const { id, name, describedBy, invalid } = useFormField();
  const { control } = useFormContext();
  const messageId = `${id}-duration-error`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <DurationControl
          {...{ field, id, describedBy, invalid, messageId }}
          {...{ placeholder, invalidMessage, disabled, disabledReason, readOnly }}
        />
      )}
    />
  );
}

function DurationControl({
  field,
  id,
  describedBy,
  invalid,
  messageId,
  placeholder,
  invalidMessage,
  disabled,
  disabledReason,
  readOnly,
}: DurationFieldProps & {
  field: FieldBinding;
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  messageId: string;
  disabled: boolean;
  disabledReason?: string | undefined;
  readOnly: boolean;
}) {
  const stored = typeof field.value === 'number' ? field.value : null;
  const [text, setText] = useState(() => (stored === null ? '' : formatDuration(stored)));
  const [unparseable, setUnparseable] = useState(false);

  const describedByWithError = [describedBy, unparseable ? messageId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <Stack gap="1">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        // BR-1542's neighbour: a duration is a number pair, and it reads left-to-right in every
        // locale. `3:45` reversed is a different duration.
        dir="ltr"
        placeholder={placeholder}
        value={text}
        disabled={disabled}
        readOnly={readOnly}
        title={disabled ? disabledReason : undefined}
        aria-describedby={describedByWithError === '' ? undefined : describedByWithError}
        aria-invalid={invalid || unparseable}
        className={`${CONTROL} text-start tabular-nums`}
        onChange={(event) => {
          setText(event.target.value);
        }}
        onBlur={() => {
          if (text.trim() === '') {
            setUnparseable(false);
            field.onChange(null);
            field.onBlur();
            return;
          }
          const parsed = parseDuration(text);
          setUnparseable(parsed === null);
          if (parsed !== null) {
            setText(formatDuration(parsed));
            field.onChange(parsed);
          }
          field.onBlur();
        }}
      />
      {unparseable ? (
        <Text size="xs" tone="danger">
          <span id={messageId} role="alert">
            {invalidMessage}
          </span>
        </Text>
      ) : null}
    </Stack>
  );
}

// ── TimestampField ───────────────────────────────────────────────────────────────────────
export interface TimestampFieldProps {
  /**
   * The player's current position in seconds. `FEAT-054` — the Lesson Notes core is a note pinned
   * to a moment, so the field's job is to capture *where the video is now*.
   *
   * A function rather than a number: reading it at click time captures the position at the moment
   * the user acted, where a prop would capture whatever the last render happened to see.
   */
  getCurrentTime: () => number;
  /** Pre-translated. */
  labels: { capture: string; clear: string; empty: string };
}

/**
 * Keyboard: `Tab` reaches the capture button, then the clear button when a value is set.
 * `Enter`/`Space` activate them — both are real buttons, so that comes for free.
 */
export function TimestampField({
  getCurrentTime,
  labels,
  disabled = false,
  disabledReason,
  readOnly = false,
}: TimestampFieldProps & Availability) {
  const { id, name, labelledBy, describedBy, invalid } = useFormField();
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const seconds = typeof field.value === 'number' ? field.value : null;
        return (
          /*
            A `group`, not a bare row. This field is a button plus an output, and the FIELD's name
            is "Timestamp" while the BUTTON's name is "Capture" — two different things.
            `aria-labelledby` on the button itself overrode its own text, so it announced the field
            label and said nothing about what pressing it does. Naming the group instead leaves the
            button to name itself, which is also why `id` sits on the group: a `<label htmlFor>`
            pointing at a button would take over the name again.
          */
          <div
            id={id}
            role="group"
            aria-labelledby={labelledBy}
            aria-describedby={describedBy}
            data-invalid={invalid ? '' : undefined}
            className="flex flex-row items-center gap-2"
          >
            <button
              type="button"
              disabled={disabled || readOnly}
              title={disabled ? disabledReason : undefined}
              className={`${CONTROL} flex w-auto items-center gap-2`}
              onClick={() => {
                field.onChange(Math.max(0, Math.round(getCurrentTime())));
              }}
            >
              <Crosshair width={16} height={16} aria-hidden="true" focusable="false" />
              <Text size="sm">{labels.capture}</Text>
            </button>

            <Text size="sm" tone={seconds === null ? 'muted' : 'primary'}>
              {/*
                The captured position is data, not decoration: it is announced as an output so a
                screen reader reports the new value when the button is pressed, rather than the
                user having to go looking for what changed.
              */}
              <output className="tabular-nums" dir="ltr">
                {seconds === null ? labels.empty : formatDuration(seconds)}
              </output>
            </Text>

            {seconds === null || readOnly || disabled ? null : (
              <button
                type="button"
                aria-label={labels.clear}
                className={ICON_BUTTON}
                onClick={() => {
                  field.onChange(null);
                }}
              >
                <X width={14} height={14} aria-hidden="true" focusable="false" />
              </button>
            )}
          </div>
        );
      }}
    />
  );
}
