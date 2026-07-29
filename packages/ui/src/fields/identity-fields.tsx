'use client';

import { type ClipboardEvent, type KeyboardEvent, useCallback, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { useFieldControl, useFormField } from '../form/FormField.js';
import { Inline } from '../primitives/layout.js';

/**
 * `PhoneField` · `EmailField` · `OTPField` (`12 §20.7`).
 *
 * All three are **always LTR**, whatever the interface direction (`BR-1396`, `BR-1393`). A phone
 * number, an email address and a one-time code are identifiers: their characters have a fixed
 * order that has nothing to do with the reading direction of the surrounding page. Rendered RTL,
 * `+20 100 123 4567` reorders into something that looks almost right and is wrong when read back
 * to a support agent — and `user@example.com` puts the domain first.
 */

const CONTROL =
  'w-full rounded-sm bg-bg-inset text-text-primary p-3 ' +
  'border border-border-subtle ' +
  'outline-none focus-visible:ring-2 focus-visible:ring-border-focus ' +
  'aria-invalid:border-danger ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

export interface PhoneFieldProps {
  /**
   * E.164 country calling code, e.g. `+20`. Rendered as a fixed prefix rather than left for the
   * user to type, so the stored value is unambiguous.
   */
  countryCode: string;
  disabled?: boolean;
}

/**
 * `BR-1409` — **never** `type="number"` for a phone number. A number input strips the leading
 * zero, refuses `+`, and offers a spinner for a value that has no arithmetic meaning.
 *
 * `type="tel"` gives the phone keypad on mobile and leaves the string intact.
 */
export function PhoneField({ countryCode, disabled = false }: PhoneFieldProps) {
  const control = useFieldControl({
    /**
     * `BR-1410` + E.164 normalisation: strip everything that is not a digit, drop a national
     * trunk zero, and store `+<country><subscriber>`. What a learner types — spaces, dashes,
     * brackets, a leading 0 — is presentation, and storing it would make two records of the same
     * person fail to match.
     */
    setValueAs: (value: unknown) => {
      if (typeof value !== 'string') return value;
      const digits = value.replace(/\D/g, '');
      if (digits === '') return '';
      const national = digits.replace(/^0+/, '');
      return `${countryCode}${national}`;
    },
  });

  return (
    <Inline gap="2">
      {/* aria-hidden: the code is part of the value the control already announces via its label. */}
      <span dir="ltr" aria-hidden="true" className="text-text-secondary">
        {countryCode}
      </span>
      <input
        type="tel"
        dir="ltr"
        inputMode="tel"
        autoComplete="tel-national"
        disabled={disabled}
        className={CONTROL}
        {...control}
      />
    </Inline>
  );
}

export interface EmailFieldProps {
  disabled?: boolean;
}

export function EmailField({ disabled = false }: EmailFieldProps) {
  const control = useFieldControl({
    // Addresses are case-insensitive in the domain and conventionally in the local part too;
    // lower-casing on submit stops one person owning two accounts by capitalisation.
    setValueAs: (value: unknown) =>
      typeof value === 'string' ? value.trim().toLowerCase() : value,
  });

  return (
    <input
      type="email"
      dir="ltr"
      inputMode="email"
      autoComplete="email"
      autoCapitalize="off"
      spellCheck={false}
      disabled={disabled}
      className={CONTROL}
      {...control}
    />
  );
}

export interface OTPFieldProps {
  /** `12 §20.7` — six segments. */
  length?: number;
  /** Pre-translated group label, e.g. "Verification code" (`BR-523`). */
  groupLabel: string;
  /** Pre-translated, receives the 1-based position — e.g. `(n) => \`Digit ${n}\``. */
  digitLabel: (position: number) => string;
  /** Fires once every segment is filled. `12 §20.7` — auto-submit. */
  onComplete?: (code: string) => void;
  disabled?: boolean;
}

/**
 * Six segments, auto-advance, paste distribution, auto-submit.
 *
 * The segments are presentation; the **field value is the joined string**. Registering six
 * separate form fields would push the reassembly into every caller and make validation report on
 * a digit rather than on the code.
 */
export function OTPField({
  length = 6,
  groupLabel,
  digitLabel,
  onComplete,
  disabled = false,
}: OTPFieldProps) {
  const { name, id, describedBy, invalid } = useFormField();
  const { setValue } = useFormContext();
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length }, () => ''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const publish = useCallback(
    (next: string[]) => {
      setDigits(next);
      const code = next.join('');
      setValue(name, code, { shouldDirty: true, shouldValidate: code.length === length });
      if (code.length === length) onComplete?.(code);
    },
    [length, name, onComplete, setValue],
  );

  const setAt = useCallback(
    (index: number, digit: string) => {
      const next = [...digits];
      next[index] = digit;
      publish(next);
      // Auto-advance only on entry, never on delete — moving forward as someone clears a digit
      // makes correcting a typo impossible.
      if (digit !== '' && index < length - 1) refs.current[index + 1]?.focus();
    },
    [digits, length, publish],
  );

  /**
   * Paste distribution. A one-time code arrives from SMS as one string, and the browser delivers
   * the whole thing to whichever segment happens to be focused. Without this it lands in a single
   * box, truncated to one character, and the user has to retype it from a notification they have
   * already dismissed.
   */
  const onPaste = useCallback(
    (event: ClipboardEvent<HTMLInputElement>, index: number) => {
      const pasted = event.clipboardData.getData('text').replace(/\D/g, '');
      if (pasted === '') return;
      event.preventDefault();

      const next = [...digits];
      for (let offset = 0; offset < pasted.length && index + offset < length; offset++) {
        next[index + offset] = pasted[offset] ?? '';
      }
      publish(next);

      const landing = Math.min(index + pasted.length, length - 1);
      refs.current[landing]?.focus();
    },
    [digits, length, publish],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>, index: number) => {
      if (event.key === 'Backspace' && digits[index] === '' && index > 0) {
        // Backspace in an empty box steps back and clears, which is what every OTP field does and
        // what a user expects; without it the caret sits in an empty box doing nothing.
        event.preventDefault();
        const next = [...digits];
        next[index - 1] = '';
        publish(next);
        refs.current[index - 1]?.focus();
      }
      if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
      if (event.key === 'ArrowRight' && index < length - 1) refs.current[index + 1]?.focus();
    },
    [digits, length, publish],
  );

  return (
    // `dir="ltr"` on the group: a code reads left to right in both languages, and mirroring the
    // segments would put digit 1 on the right while the value still starts with it (BR-1234's
    // reasoning, applied to codes).
    <div
      role="group"
      aria-label={groupLabel}
      aria-describedby={describedBy}
      dir="ltr"
      id={id}
      className="flex gap-2"
    >
      {digits.map((digit, index) => (
        <input
          key={`otp-${String(index)}`}
          ref={(element) => {
            refs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={digitLabel(index + 1)}
          aria-invalid={invalid}
          className={`${CONTROL} w-12 text-center font-mono`}
          onChange={(event) => {
            setAt(index, event.currentTarget.value.replace(/\D/g, '').slice(-1));
          }}
          onPaste={(event) => {
            onPaste(event, index);
          }}
          onKeyDown={(event) => {
            onKeyDown(event, index);
          }}
        />
      ))}
    </div>
  );
}
