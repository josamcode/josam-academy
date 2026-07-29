'use client';

import * as RadixCheckbox from '@radix-ui/react-checkbox';
import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import * as RadixSlider from '@radix-ui/react-slider';
import * as RadixSwitch from '@radix-ui/react-switch';
import { Check } from 'lucide-react';
import { Controller, useFormContext } from 'react-hook-form';

import { useFormField } from '../form/FormField.js';
import { Inline, Stack } from '../primitives/layout.js';
import { Text } from '../primitives/Text.js';

/**
 * `Checkbox` · `Switch` · `RadioGroup` · `RadioCard` · `Slider` — the Radix-backed controls.
 *
 * `BR-1527` — Radix ships zero styles; every visual decision here is ours, from tokens.
 * `BR-1528` — **Radix is never exposed to feature code.** No prop below is a Radix type, nothing
 * Radix is re-exported from `@josam/ui`, and `asChild` is not offered. A screen can be written
 * against these components with no knowledge that Radix exists, which is the only way the library
 * can be replaced without touching a screen.
 * `BR-1529` — a component built on Radix still owns its RTL behaviour explicitly. Headless
 * libraries handle direction inconsistently, so `dir` is passed where Radix accepts it and the
 * layout uses logical utilities everywhere else.
 *
 * All five use RHF's `Controller` rather than `register`. Radix controls are **controlled** — they
 * emit a value, not a DOM change event — so `register`'s uncontrolled `ref`/`onChange` contract
 * does not apply and silently binds nothing.
 */

const FOCUS =
  'outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-bg-base';

const DISABLED = 'disabled:opacity-50 disabled:cursor-not-allowed';

// ── Checkbox ─────────────────────────────────────────────────────────────────────────────
export interface CheckboxProps {
  /** `BR-1402` — clicking the label activates the control. Pre-translated. */
  label: string;
  disabled?: boolean;
}

export function Checkbox({ label, disabled = false }: CheckboxProps) {
  const { id, name, describedBy, invalid } = useFormField();
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Inline gap="2">
          <RadixCheckbox.Root
            id={id}
            checked={field.value === true}
            onCheckedChange={(checked) => {
              field.onChange(checked === true);
            }}
            onBlur={field.onBlur}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            className={`size-5 shrink-0 rounded-sm border border-border-strong bg-bg-inset data-[state=checked]:bg-accent data-[state=checked]:border-accent ${FOCUS} ${DISABLED}`}
          >
            <RadixCheckbox.Indicator className="flex items-center justify-center text-accent-contrast">
              <Check width={14} height={14} strokeWidth={3} aria-hidden="true" focusable="false" />
            </RadixCheckbox.Indicator>
          </RadixCheckbox.Root>
          {/* A real <label>, so the hit target includes the text (BR-1402). */}
          <label htmlFor={id}>
            <Text size="sm">{label}</Text>
          </label>
        </Inline>
      )}
    />
  );
}

// ── Switch ───────────────────────────────────────────────────────────────────────────────
export interface SwitchProps {
  label: string;
  disabled?: boolean;
}

/**
 * A `Switch` is for a setting that takes effect immediately; a `Checkbox` is for a value that is
 * submitted with a form. They are not interchangeable, which is why both exist rather than one
 * with a `variant`.
 */
export function Switch({ label, disabled = false }: SwitchProps) {
  const { id, name, describedBy, invalid } = useFormField();
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Inline gap="2">
          <RadixSwitch.Root
            id={id}
            checked={field.value === true}
            onCheckedChange={(checked) => {
              field.onChange(checked);
            }}
            onBlur={field.onBlur}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            className={`h-6 w-11 shrink-0 rounded-full border border-border-strong bg-bg-inset data-[state=checked]:bg-accent ${FOCUS} ${DISABLED}`}
          >
            {/*
              BR-1529 — the thumb travels on the INLINE axis, so it must move towards the end in
              LTR and towards the start in RTL. `translate-x` is physical and would slide the wrong
              way in Arabic; the rtl: variant mirrors it explicitly rather than trusting Radix.
            */}
            <RadixSwitch.Thumb className="block size-5 rounded-full bg-bg-base transition-transform duration-fast ease-standard data-[state=checked]:translate-x-5 rtl:data-[state=checked]:-translate-x-5" />
          </RadixSwitch.Root>
          <label htmlFor={id}>
            <Text size="sm">{label}</Text>
          </label>
        </Inline>
      )}
    />
  );
}

// ── RadioGroup and RadioCard ─────────────────────────────────────────────────────────────
export interface ChoiceOption {
  value: string;
  /** Pre-translated. */
  label: string;
  /** Pre-translated. `RadioCard` renders it; `RadioGroup` ignores it. */
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  options: ChoiceOption[];
  disabled?: boolean;
}

/**
 * Keyboard contract, which Radix provides and we must not break (`BR-1531`):
 *   Tab          enters the group at the selected option, or the first if none
 *   Arrow keys   move **and select** — a radio group has no unselected navigation state
 *   Space        selects the focused option
 *
 * Arrow keys follow the document direction in RTL because `dir` is passed through.
 */
export function RadioGroup({ options, disabled = false }: RadioGroupProps) {
  const { id, name, describedBy, invalid } = useFormField();
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <RadixRadioGroup.Root
          id={id}
          value={typeof field.value === 'string' ? field.value : ''}
          onValueChange={field.onChange}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className="flex flex-col gap-2"
        >
          {options.map((option) => (
            <Inline key={option.value} gap="2">
              <RadixRadioGroup.Item
                id={`${id}-${option.value}`}
                value={option.value}
                disabled={option.disabled ?? false}
                className={`size-5 shrink-0 rounded-full border border-border-strong bg-bg-inset data-[state=checked]:border-accent ${FOCUS} ${DISABLED}`}
              >
                <RadixRadioGroup.Indicator className="flex size-full items-center justify-center after:block after:size-2.5 after:rounded-full after:bg-accent" />
              </RadixRadioGroup.Item>
              <label htmlFor={`${id}-${option.value}`}>
                <Text size="sm">{option.label}</Text>
              </label>
            </Inline>
          ))}
        </RadixRadioGroup.Root>
      )}
    />
  );
}

export interface RadioCardProps extends RadioGroupProps {
  columns?: 1 | 2 | 3;
}

/**
 * The onboarding pattern (`SCR-12`). Visually a card, semantically the same radio group — the
 * whole card is the label, so the entire surface is the hit target rather than a 20px circle.
 */
export function RadioCard({ options, columns = 1, disabled = false }: RadioCardProps) {
  const { id, name, describedBy, invalid } = useFormField();
  const { control } = useFormContext();

  const grid = columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <RadixRadioGroup.Root
          id={id}
          value={typeof field.value === 'string' ? field.value : ''}
          onValueChange={field.onChange}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={`grid gap-3 ${grid}`}
        >
          {options.map((option) => (
            <RadixRadioGroup.Item
              key={option.value}
              value={option.value}
              disabled={option.disabled ?? false}
              className={`rounded-lg border border-border-subtle bg-bg-surface p-4 text-start data-[state=checked]:border-accent data-[state=checked]:bg-accent-subtle ${FOCUS} ${DISABLED}`}
            >
              <Stack gap="1">
                <Text size="sm" weight="medium" align="start">
                  {option.label}
                </Text>
                {option.description === undefined ? null : (
                  <Text size="xs" tone="secondary" align="start">
                    {option.description}
                  </Text>
                )}
              </Stack>
            </RadixRadioGroup.Item>
          ))}
        </RadixRadioGroup.Root>
      )}
    />
  );
}

// ── Slider ───────────────────────────────────────────────────────────────────────────────
export interface SliderProps {
  min: number;
  max: number;
  step?: number;
  /** Renders the current value beside the track. Pre-translated formatter. */
  formatValue?: (value: number) => string;
  disabled?: boolean;
}

/**
 * `12 §20.7` — the weekly commitment input.
 *
 * A slider is unusable without a visible value, so `formatValue` renders one and the thumb also
 * carries `aria-valuetext`: "3" alone tells a screen-reader user nothing about what three means.
 */
export function Slider({ min, max, step = 1, formatValue, disabled = false }: SliderProps) {
  const { id, name, labelledBy, describedBy, invalid } = useFormField();
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const current = typeof field.value === 'number' ? field.value : min;
        const text = formatValue?.(current);

        return (
          <Inline gap="4">
            <RadixSlider.Root
              value={[current]}
              onValueChange={(next) => {
                field.onChange(next[0]);
              }}
              onValueCommit={field.onBlur}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
              // BR-1529 — Radix reads `dir` for arrow-key direction. Without it, ArrowRight
              // increases in Arabic while the track runs the other way.
              dir="ltr"
              className={`relative flex h-5 w-full touch-none items-center ${DISABLED}`}
            >
              <RadixSlider.Track className="relative h-1 w-full grow rounded-full bg-bg-inset">
                <RadixSlider.Range className="absolute h-full rounded-full bg-accent" />
              </RadixSlider.Track>
              {/*
                Two separate defects lived here, and both looked correct in the markup.

                First, `id` was on the Root. Radix puts `role="slider"` on the THUMB, so anything
                naming or describing the control has to reach the thumb, not its container.

                Second — and this is the one that survived moving the id — `<label htmlFor>` names
                only LABELABLE elements, and a `span` with a role is not one. The thumb therefore
                needs `aria-labelledby` pointing at the label. axe reported `aria-input-field-name`
                through both versions (`PH-0.24`).
              */}
              <RadixSlider.Thumb
                id={id}
                aria-labelledby={labelledBy}
                aria-valuetext={text}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                className={`block size-5 rounded-full border-2 border-accent bg-bg-base ${FOCUS}`}
              />
            </RadixSlider.Root>
            {text === undefined ? null : (
              <Text size="sm" tone="secondary">
                <span className="tabular-nums">{text}</span>
              </Text>
            )}
          </Inline>
        );
      }}
    />
  );
}
