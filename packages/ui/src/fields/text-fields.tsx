'use client';

import { Eye, EyeOff } from 'lucide-react';
import { type ChangeEvent, type ReactNode, useCallback, useRef, useState } from 'react';
import { toMinorUnits } from '@josam/i18n';
import { useWatch } from 'react-hook-form';

import { type Availability, availability } from '../form/availability.js';
import { useFieldControl, useFormField } from '../form/FormField.js';
import { Inline } from '../primitives/layout.js';
import { Text } from '../primitives/Text.js';

/**
 * `BR-1544` / `PH-0.29` — all six take `Availability`, so `readOnly` and `disabled` are
 * distinct states and `disabled: true` cannot be written without its reason. See
 * `form/availability.ts` for why they are not two words for the same thing.
 *
 * The six text fields (`12 §20.7`). All six go through `useFieldControl`, so the label
 * association and the `aria-describedby` / `aria-invalid` wiring are `FormField`'s, written once
 * (`BR-1402`–`BR-1406`).
 *
 * None of them takes a `placeholder` as a substitute for a label. `BR-1402` — a placeholder is
 * never the label: it disappears the moment typing starts, which is exactly when a user checking
 * what the field wanted needs it.
 */

const CONTROL =
  'w-full rounded-sm bg-bg-inset text-text-primary p-3 ' +
  'border border-border-subtle ' +
  'outline-none focus-visible:ring-2 focus-visible:ring-border-focus ' +
  'aria-invalid:border-danger ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

/** `BR-1410` — values are trimmed; empty strings normalise per the API contract. */
const TRIM = { setValueAs: (value: unknown) => (typeof value === 'string' ? value.trim() : value) };

interface CounterProps {
  name: string;
  maxLength: number;
}

/**
 * The character counter. Reads through `useWatch` so it re-renders on its own rather than
 * re-rendering the whole form on every keystroke — the uncontrolled-by-default property that
 * `13 §4` chose React Hook Form for.
 */
function Counter({ name, maxLength }: CounterProps) {
  const value = useWatch({ name }) as unknown;
  const length = typeof value === 'string' ? value.length : 0;
  const over = length > maxLength;

  return (
    <Text size="2xs" tone={over ? 'danger' : 'muted'}>
      {/* aria-live so a screen-reader user hears the count approach the limit, politely. */}
      <span aria-live="polite">{`${String(length)} / ${String(maxLength)}`}</span>
    </Text>
  );
}

export interface TextFieldProps {
  /** `BR-1409` — the input type matches the data. Never `number` for a phone number. */
  type?: 'text' | 'email' | 'url' | 'search';
  maxLength?: number;
  autoComplete?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export function TextField({
  type = 'text',
  maxLength,
  autoComplete,
  prefix,
  suffix,
  ...rest
}: TextFieldProps & Availability) {
  const { name } = useFormField();
  const control = useFieldControl(TRIM);
  const { disabled, readOnly, title } = availability(rest);

  return (
    <>
      <Inline gap="2">
        {prefix}
        <input
          type={type}
          className={CONTROL}
          autoComplete={autoComplete}
          disabled={disabled}
          readOnly={readOnly}
          title={title}
          {...control}
        />
        {suffix}
      </Inline>
      {maxLength === undefined ? null : <Counter name={name} maxLength={maxLength} />}
    </>
  );
}

export interface TextAreaProps {
  maxLength?: number;
  rows?: number;
}

export function TextArea({
  maxLength,
  rows = 4,
  ...availabilityProps
}: TextAreaProps & Availability) {
  const { name } = useFormField();
  const control = useFieldControl(TRIM);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const { ref: registerRef, onChange, ...registered } = control;
  const { disabled, readOnly, title } = availability(availabilityProps);

  /** Auto-grow. Height is reset before measuring, or the box only ever gets taller. */
  const grow = useCallback((element: HTMLTextAreaElement | null) => {
    if (element === null) return;
    element.style.height = 'auto';
    element.style.height = `${String(element.scrollHeight)}px`;
  }, []);

  return (
    <>
      <textarea
        rows={rows}
        className={`${CONTROL} resize-none`}
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        {...registered}
        ref={(element) => {
          registerRef(element);
          ref.current = element;
          grow(element);
        }}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
          void onChange(event);
          grow(event.currentTarget);
        }}
      />
      {maxLength === undefined ? null : <Counter name={name} maxLength={maxLength} />}
    </>
  );
}

export interface PasswordFieldProps {
  /**
   * `BR-1414` — `autocomplete` is correct, **never disabled**. `current-password` for sign-in,
   * `new-password` for registration and change-password; the browser's password manager depends
   * on the distinction, and getting it wrong is how a manager offers to save the wrong thing.
   */
  autoComplete: 'current-password' | 'new-password';
  /** Pre-translated: this component sits below the catalog (`BR-523`). */
  showLabel: string;
  hideLabel: string;
}

export function PasswordField({
  autoComplete,
  showLabel,
  hideLabel,
  ...rest
}: PasswordFieldProps & Availability) {
  const control = useFieldControl();
  const { disabled, readOnly, title } = availability(rest);
  const [visible, setVisible] = useState(false);
  const Glyph = visible ? EyeOff : Eye;

  return (
    <Inline gap="2">
      <input
        type={visible ? 'text' : 'password'}
        className={CONTROL}
        autoComplete={autoComplete}
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        {...control}
      />
      {/*
        A plain button rather than IconButton: this one lives inside the control and must not be
        a submit target or a tab stop that reads as a separate action. It is still a real
        <button> with a real accessible name (BR-1469, BR-1471).
      */}
      <button
        type="button"
        onClick={() => {
          setVisible((v) => !v);
        }}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        // The reveal toggle follows the field: there is nothing to reveal in a disabled field,
        // and a read-only one is still worth reading, so it stays available there.
        disabled={disabled}
        title={title}
        className="p-2 text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Glyph width={20} height={20} strokeWidth={2} aria-hidden="true" focusable="false" />
      </button>
    </Inline>
  );
}

export interface NumberFieldProps {
  min?: number;
  max?: number;
  step?: number;
}

/**
 * `BR-1409` — `type="number"` is used only for genuine numbers.
 *
 * `inputMode="decimal"` gives a numeric keypad on mobile without the desktop spinner artifacts,
 * and the value is registered with `valueAsNumber` so the form holds a number rather than a
 * numeric string that compares wrong the first time somebody sorts by it.
 */
export function NumberField({ min, max, step = 1, ...rest }: NumberFieldProps & Availability) {
  const control = useFieldControl({ valueAsNumber: true });
  const { disabled, readOnly, title } = availability(rest);

  return (
    <input
      type="number"
      inputMode="decimal"
      className={`${CONTROL} [appearance:textfield]`}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      readOnly={readOnly}
      title={title}
      {...control}
    />
  );
}

export interface CurrencyFieldProps {
  /** ISO 4217, shown as a suffix. `BR-826` — the code always travels with the amount. */
  currency: string;
}

/**
 * `BR-826` — money is integer **minor units**. The user types major units, the field stores minor.
 *
 * The conversion goes through `toMinorUnits` in `@josam/i18n`, which uses the **currency's own
 * exponent**. This file originally hardcoded `* 100`, which is right for EGP and wrong for every
 * three-decimal currency and for JPY: a JOD amount typed as 12.345 was stored as 1235 and rendered
 * back by `formatMoney` as 1.235 — a tenfold error that both halves of the round trip agreed on,
 * so nothing looked inconsistent. Found by auditing every money path after PH-0.22.
 */
export function CurrencyField({ currency, ...rest }: CurrencyFieldProps & Availability) {
  const { disabled, readOnly, title } = availability(rest);
  const control = useFieldControl({
    setValueAs: (value: unknown) => {
      if (typeof value !== 'string' || value.trim() === '') return undefined;
      const major = Number(value);
      return Number.isFinite(major) ? toMinorUnits(major, currency) : undefined;
    },
  });

  return (
    <Inline gap="2">
      <input
        type="text"
        inputMode="decimal"
        className={CONTROL}
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        {...control}
      />
      <Text size="sm" tone="muted">
        <span dir="ltr">{currency}</span>
      </Text>
    </Inline>
  );
}

export interface CodeFieldProps {
  /** Fixed length; the field stops accepting input beyond it. */
  length?: number;
}

/**
 * A short alphanumeric code — coupon, invite, verification reference.
 *
 * Always LTR and monospaced: a code is an identifier, and `BR-1393` requires identifiers to be
 * isolated so their characters are not reordered inside Arabic prose. `autocomplete="off"` is
 * correct here and is not the `BR-1414` prohibition, which is about passwords.
 */
export function CodeField({ length = 8, ...rest }: CodeFieldProps & Availability) {
  const { disabled, readOnly, title } = availability(rest);
  const control = useFieldControl({
    setValueAs: (value: unknown) =>
      typeof value === 'string' ? value.trim().toUpperCase() : value,
  });

  return (
    <input
      type="text"
      dir="ltr"
      inputMode="text"
      autoComplete="off"
      autoCapitalize="characters"
      spellCheck={false}
      maxLength={length}
      className={`${CONTROL} font-mono tracking-widest`}
      disabled={disabled}
      readOnly={readOnly}
      title={title}
      {...control}
    />
  );
}
