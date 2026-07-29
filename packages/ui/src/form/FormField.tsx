'use client';

import { createContext, type ReactNode, useContext, useId } from 'react';
import { type FieldValues, useFormContext, type UseFormRegister } from 'react-hook-form';

import { Stack } from '../primitives/layout.js';
import { Text } from '../primitives/Text.js';

/**
 * `FormField` owns the label, hint, required marker, error and the ARIA wiring
 * (`BR-1402`–`BR-1406`). Every field component from `PH-0.22` through `PH-0.25` sits inside one
 * and reads its ids from this context.
 *
 * The wiring is context rather than props for a specific reason: `aria-describedby` has to
 * reference the hint and the error *by id*, and those ids have to be unique per instance. Passing
 * them down by hand means every one of the ~20 field components re-derives the same wiring, and
 * the first one to get it slightly wrong is invisible — a broken `aria-describedby` produces no
 * error, no warning, and a field that simply says nothing to a screen reader.
 */
export interface FormFieldContextValue {
  /** For the control's `id` and the label's `htmlFor`. */
  id: string;
  /** The RHF field name. The control registers itself with this. */
  name: string;
  /**
   * The `<label>`'s own id, for `aria-labelledby`.
   *
   * `<label for>` names only **labelable** elements — `input`, `select`, `textarea`, `button`,
   * `meter`, `output`, `progress`. It does nothing for a custom widget built on a `div` or `span`
   * carrying a `role`, which is what most Radix controls render. Wiring `htmlFor`/`id` on one of
   * those looks correct in the markup, passes review, and leaves the control with **no accessible
   * name at all**.
   *
   * Radix's `Slider` is exactly that case: `role="slider"` sits on a `span`. axe caught it as
   * `aria-input-field-name` at `PH-0.24`. Any control whose focusable element is not labelable
   * must use this instead of relying on `id`.
   */
  labelledBy: string;
  /** For the control's `aria-describedby` — hint and/or error, whichever exist. */
  describedBy: string | undefined;
  /** For the control's `aria-invalid`. */
  invalid: boolean;
  required: boolean;
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

/**
 * Throws rather than returning null when used outside a `FormField`. A field rendered without its
 * label wiring is exactly the defect `BR-1402` exists to prevent, and silently degrading would
 * ship it.
 */
export function useFormField(): FormFieldContextValue {
  const context = useContext(FormFieldContext);
  if (context === null) {
    throw new Error(
      'A field component must be rendered inside <FormField>. Without it there is no label ' +
        'association and no aria wiring (BR-1402).',
    );
  }
  return context;
}

export interface FormFieldProps {
  name: string;
  /** A real `<label>`, always. `BR-1402` — a placeholder is never the label. Pre-translated. */
  label: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}

export function FormField({ name, label, children, hint, required = false }: FormFieldProps) {
  const generated = useId();
  const id = `${generated}-${name}`;
  const labelId = `${id}-label`;
  const hintId = hint === undefined ? undefined : `${id}-hint`;
  const errorId = `${id}-error`;

  const { formState } = useFormContext();
  const error = formState.errors[name];
  const message = typeof error?.message === 'string' ? error.message : undefined;

  // Order matters to a screen reader: the hint is context for what to enter, the error is what
  // went wrong. Announcing the error first and the hint after inverts cause and effect.
  const describedBy =
    [hint === undefined ? null : hintId, message === undefined ? null : errorId]
      .filter(Boolean)
      .join(' ') || undefined;

  const value: FormFieldContextValue = {
    id,
    name,
    labelledBy: labelId,
    describedBy,
    invalid: message !== undefined,
    required,
  };

  return (
    <FormFieldContext.Provider value={value}>
      <Stack gap="1">
        <label id={labelId} htmlFor={id}>
          <Text size="sm" weight="medium">
            {label}
          </Text>
          {/*
            BR-1403 — required fields are marked, and the marking is explained once per form (see
            Form's requiredLegend). The asterisk is aria-hidden because the control already
            carries `required`, and announcing "star" adds noise rather than information.
          */}
          {required ? (
            <span aria-hidden="true">
              <Text size="sm" tone="danger">
                {' *'}
              </Text>
            </span>
          ) : null}
        </label>

        {hint === undefined ? null : (
          <Text size="xs" tone="muted" id={hintId}>
            {hint}
          </Text>
        )}

        {children}

        {/*
          BR-1405 — the error sits adjacent to its field and persists until corrected. `role=alert`
          announces it when it appears without moving focus, which would fight BR-1406's
          focus-first-error.
        */}
        {message === undefined ? null : (
          <Text size="xs" tone="danger" id={errorId}>
            <span role="alert">{message}</span>
          </Text>
        )}
      </Stack>
    </FormFieldContext.Provider>
  );
}

/**
 * The props a field control spreads onto its input. Every field component from `PH-0.22` through
 * `PH-0.25` uses this, which is what makes the `BR-1402`–`BR-1406` wiring identical across all of
 * them instead of re-derived ~20 times.
 */
export function useFieldControl(options?: Parameters<UseFormRegister<FieldValues>>[1]) {
  const { id, name, describedBy, invalid, required } = useFormField();
  const { register } = useFormContext();

  return {
    id,
    ...register(name, options),
    'aria-describedby': describedBy,
    'aria-invalid': invalid,
    required,
  };
}
