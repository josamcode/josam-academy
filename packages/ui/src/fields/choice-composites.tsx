'use client';

import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown, Star, X } from 'lucide-react';
import { type KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { useFormField } from '../form/FormField.js';
import { Text } from '../primitives/Text.js';
import type { ChoiceOption } from './choice-toggles.js';

/**
 * `Select` · `Combobox` · `MultiSelect` · `TagsInput` · `RatingInput`.
 *
 * `Select` is Radix. The other four are **not**: Radix has no combobox, and building a listbox on
 * `Popover` would mean owning the keyboard contract anyway while inheriting a positioning layer
 * these controls do not need. They are built directly against the WAI-ARIA patterns, with the
 * keyboard map documented per component (`BR-1531`).
 *
 * `BR-1528` holds throughout: no Radix type appears in any prop, and nothing Radix is re-exported.
 *
 * **Each control body is a real component, never a closure inside `Controller`'s `render` prop.**
 * Hooks called in a render prop land in `Controller`'s own hook sequence — stable while the call
 * is unconditional, and one early return away from a corrupted one.
 * `react-hooks/rules-of-hooks`, activated at `PH-0.24`, found exactly that here twice.
 */

const CONTROL =
  'w-full rounded-sm bg-bg-inset text-text-primary p-3 border border-border-subtle ' +
  'outline-none focus-visible:ring-2 focus-visible:ring-border-focus ' +
  'aria-invalid:border-danger disabled:opacity-50 disabled:cursor-not-allowed';

const LISTBOX =
  'z-50 max-h-60 overflow-y-auto rounded-md border border-border-strong bg-bg-elevated p-1';

const OPTION =
  'flex cursor-pointer items-center gap-2 rounded-sm p-2 text-start text-text-primary ' +
  'data-highlighted:bg-accent-subtle aria-selected:bg-accent-subtle';

/** What `Controller` hands each control body. Deliberately not RHF's own type. */
interface FieldBinding {
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur: () => void;
}

interface Wiring {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
}

// ── Select ───────────────────────────────────────────────────────────────────────────────
export interface SelectProps {
  options: ChoiceOption[];
  /** Shown when nothing is chosen. Pre-translated, and NOT a label (`BR-1402`). */
  placeholder: string;
  disabled?: boolean;
}

/**
 * Keyboard (Radix, `BR-1531`): `Space`/`Enter`/`ArrowDown` opens · arrows move · typing jumps by
 * prefix · `Enter` selects · `Escape` closes and returns focus to the trigger.
 */
export function Select({ options, placeholder, disabled = false }: SelectProps) {
  const { id, name, describedBy, invalid } = useFormField();
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <RadixSelect.Root
          value={typeof field.value === 'string' ? field.value : undefined}
          onValueChange={field.onChange}
          disabled={disabled}
        >
          <RadixSelect.Trigger
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            onBlur={field.onBlur}
            className={`${CONTROL} flex items-center justify-between gap-2`}
          >
            <RadixSelect.Value placeholder={placeholder} />
            <RadixSelect.Icon>
              <ChevronDown width={16} height={16} aria-hidden="true" focusable="false" />
            </RadixSelect.Icon>
          </RadixSelect.Trigger>

          <RadixSelect.Portal>
            <RadixSelect.Content position="popper" sideOffset={4} className={LISTBOX}>
              <RadixSelect.Viewport>
                {options.map((option) => (
                  <RadixSelect.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled ?? false}
                    className={OPTION}
                  >
                    <RadixSelect.ItemIndicator>
                      <Check width={14} height={14} aria-hidden="true" focusable="false" />
                    </RadixSelect.ItemIndicator>
                    <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  </RadixSelect.Item>
                ))}
              </RadixSelect.Viewport>
            </RadixSelect.Content>
          </RadixSelect.Portal>
        </RadixSelect.Root>
      )}
    />
  );
}

/** Shared listbox keyboard handling for the custom composites. */
function useListboxKeys(count: number, onChoose: (index: number) => void, onClose: () => void) {
  const [active, setActive] = useState(0);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setActive((i) => (count === 0 ? 0 : (i + 1) % count));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setActive((i) => (count === 0 ? 0 : (i - 1 + count) % count));
          break;
        case 'Home':
          event.preventDefault();
          setActive(0);
          break;
        case 'End':
          event.preventDefault();
          setActive(Math.max(0, count - 1));
          break;
        case 'Enter':
          if (count > 0) {
            event.preventDefault();
            onChoose(active);
          }
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        default:
          break;
      }
    },
    [active, count, onChoose, onClose],
  );

  return { active, onKeyDown };
}

// ── Combobox ─────────────────────────────────────────────────────────────────────────────
export interface ComboboxProps {
  options: ChoiceOption[];
  placeholder: string;
  /** Pre-translated, shown when the filter matches nothing. */
  emptyLabel: string;
  /** Async search. Omit for a local filter over `options`. */
  onSearch?: (query: string) => void;
  loading?: boolean;
  /** Pre-translated, announced while `loading`. */
  loadingLabel?: string;
  disabled?: boolean;
}

function ComboboxControl({
  field,
  id,
  describedBy,
  invalid,
  options,
  placeholder,
  emptyLabel,
  onSearch,
  loading = false,
  loadingLabel,
  disabled = false,
}: ComboboxProps & Wiring & { field: FieldBinding }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const listId = `${id}-listbox`;

  const filtered = useMemo(
    () =>
      onSearch === undefined
        ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
        : options,
    [onSearch, options, query],
  );

  const choose = useCallback(
    (index: number) => {
      const option = filtered[index];
      if (option === undefined || option.disabled === true) return;
      field.onChange(option.value);
      setQuery(option.label);
      setOpen(false);
    },
    [field, filtered],
  );

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const keys = useListboxKeys(filtered.length, choose, close);
  const selected = options.find((o) => o.value === field.value);

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && filtered.length > 0 ? `${listId}-${String(keys.active)}` : undefined
        }
        aria-describedby={describedBy}
        aria-invalid={invalid}
        autoComplete="off"
        disabled={disabled}
        className={CONTROL}
        placeholder={placeholder}
        value={open ? query : (selected?.label ?? '')}
        onChange={(event) => {
          setQuery(event.currentTarget.value);
          setOpen(true);
          onSearch?.(event.currentTarget.value);
        }}
        onFocus={() => {
          setOpen(true);
        }}
        onBlur={() => {
          // Deferred: blur fires before a click on an option would register.
          setTimeout(() => {
            setOpen(false);
            field.onBlur();
          }, 120);
        }}
        onKeyDown={keys.onKeyDown}
      />

      {open ? (
        <ul id={listId} role="listbox" className={`absolute mt-1 w-full ${LISTBOX}`}>
          {loading ? (
            <li className="p-2">
              <Text size="sm" tone="muted">
                <span aria-live="polite">{loadingLabel ?? ''}</span>
              </Text>
            </li>
          ) : filtered.length === 0 ? (
            <li className="p-2">
              <Text size="sm" tone="muted">
                {emptyLabel}
              </Text>
            </li>
          ) : (
            filtered.map((option, index) => (
              <li
                key={option.value}
                id={`${listId}-${String(index)}`}
                role="option"
                aria-selected={option.value === field.value}
                aria-disabled={option.disabled ?? false}
                data-highlighted={index === keys.active ? '' : undefined}
                className={OPTION}
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(index);
                }}
              >
                {option.label}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Keyboard (`BR-1531`): type to filter · `ArrowDown`/`ArrowUp` move · `Home`/`End` jump ·
 * `Enter` selects the active option · `Escape` closes without changing the value.
 *
 * The empty and loading states live inside the list, not beside it: a list that vanishes while a
 * request is in flight reads as breakage.
 */
export function Combobox(props: ComboboxProps) {
  const { id, name, describedBy, invalid } = useFormField();
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <ComboboxControl
          {...props}
          field={field}
          id={id}
          describedBy={describedBy}
          invalid={invalid}
        />
      )}
    />
  );
}

// ── MultiSelect ──────────────────────────────────────────────────────────────────────────
export interface MultiSelectProps {
  options: ChoiceOption[];
  placeholder: string;
  /** Beyond this many chips, the rest collapse into a counter. */
  maxVisible?: number;
  /** Pre-translated, receives the hidden count. */
  overflowLabel: (count: number) => string;
  /** Pre-translated, receives the option label. */
  removeLabel: (label: string) => string;
  disabled?: boolean;
}

function MultiSelectControl({
  field,
  id,
  describedBy,
  invalid,
  options,
  placeholder,
  maxVisible = 3,
  overflowLabel,
  removeLabel,
  disabled = false,
}: MultiSelectProps & Wiring & { field: FieldBinding }) {
  const [open, setOpen] = useState(false);
  const listId = `${id}-listbox`;

  // Memoised: derived inline, this array is a new reference every render, which makes `toggle`'s
  // dependency list change every render and defeats the useCallback entirely.
  // `react-hooks/exhaustive-deps` caught it at PH-0.24.
  const values = useMemo<string[]>(
    () => (Array.isArray(field.value) ? (field.value as string[]) : []),
    [field.value],
  );

  const toggle = useCallback(
    (index: number) => {
      const option = options[index];
      if (option === undefined || option.disabled === true) return;
      field.onChange(
        values.includes(option.value)
          ? values.filter((v) => v !== option.value)
          : [...values, option.value],
      );
    },
    [field, options, values],
  );

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const keys = useListboxKeys(options.length, toggle, close);

  const chosen = options.filter((o) => values.includes(o.value));
  const visible = chosen.slice(0, maxVisible);
  const hidden = chosen.length - visible.length;

  return (
    <div className="relative">
      {/*
        A real <button>, not a div with a role. It is focusable, activates on Enter and Space for
        free, and cannot end up pointer-only. jsx-a11y flagged the div version at PH-0.24 under
        `no-static-element-interactions`, and it was right.
      */}
      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        disabled={disabled}
        className={`${CONTROL} flex flex-wrap gap-2 text-start`}
        onClick={() => {
          setOpen((o) => !o);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Backspace' && values.length > 0) {
            field.onChange(values.slice(0, -1));
            return;
          }
          if (event.key === 'Enter' || event.key === ' ') {
            // A <button> synthesises a click from Enter and Space. Without preventDefault this
            // handler opens the listbox and the synthesised click immediately closes it again —
            // two toggles, no visible change, and the control looks inert to a keyboard user
            // while working perfectly with a mouse. Found at PH-0.24 by a keyboard-only test.
            event.preventDefault();
            if (open) {
              keys.onKeyDown(event);
            } else {
              setOpen(true);
            }
            return;
          }
          if (!open && event.key === 'ArrowDown') {
            setOpen(true);
            return;
          }
          keys.onKeyDown(event);
        }}
      >
        {chosen.length === 0 ? (
          <Text size="sm" tone="muted">
            {placeholder}
          </Text>
        ) : (
          <>
            {visible.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1 rounded-full bg-accent-subtle px-2 py-1"
              >
                <Text size="xs">{option.label}</Text>
                {/*
                  No nested button — a button inside a button is invalid HTML and the inner one is
                  unreachable. Removal is keyboard-driven: Backspace drops the last chip, and
                  reopening the list toggles any option off. The removal affordance is named for
                  assistive technology so the mechanism is discoverable.
                */}
                <span aria-hidden="true">
                  <X width={12} height={12} focusable="false" />
                </span>
                <span className="sr-only">{removeLabel(option.label)}</span>
              </span>
            ))}
            {hidden > 0 ? (
              <Text size="xs" tone="muted">
                {overflowLabel(hidden)}
              </Text>
            ) : null}
          </>
        )}
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-multiselectable
          className={`absolute mt-1 w-full ${LISTBOX}`}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={values.includes(option.value)}
              aria-disabled={option.disabled ?? false}
              data-highlighted={index === keys.active ? '' : undefined}
              className={OPTION}
              onMouseDown={(event) => {
                event.preventDefault();
                toggle(index);
              }}
            >
              {values.includes(option.value) ? (
                <Check width={14} height={14} aria-hidden="true" focusable="false" />
              ) : (
                <span className="size-3.5" aria-hidden="true" />
              )}
              {option.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Keyboard (`BR-1531`): `Enter`/`ArrowDown` opens · arrows move · `Enter` toggles the active
 * option · `Backspace` removes the last chip · `Escape` closes.
 */
export function MultiSelect(props: MultiSelectProps) {
  const { id, name, describedBy, invalid } = useFormField();
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <MultiSelectControl
          {...props}
          field={field}
          id={id}
          describedBy={describedBy}
          invalid={invalid}
        />
      )}
    />
  );
}

// ── TagsInput ────────────────────────────────────────────────────────────────────────────
export interface TagsInputProps {
  placeholder: string;
  /** Pre-translated, receives the tag. */
  removeLabel: (tag: string) => string;
  maxTags?: number;
  disabled?: boolean;
}

function TagsInputControl({
  field,
  id,
  describedBy,
  invalid,
  placeholder,
  removeLabel,
  maxTags,
  disabled = false,
}: TagsInputProps & Wiring & { field: FieldBinding }) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const tags: string[] = Array.isArray(field.value) ? (field.value as string[]) : [];

  const commit = () => {
    const value = draft.trim();
    // Silently ignoring a duplicate is right: the user's intent is already satisfied, and an
    // error saying "this is already here" is noise.
    if (value === '' || tags.includes(value)) {
      setDraft('');
      return;
    }
    if (maxTags !== undefined && tags.length >= maxTags) return;
    field.onChange([...tags, value]);
    setDraft('');
  };

  return (
    // No click-to-focus on the container: it would need a keyboard equivalent to be legitimate
    // (jsx-a11y flagged it at PH-0.24), and the input already fills the remaining width — so the
    // handler bought a sliver of padding at the price of a real accessibility defect.
    <div className={`${CONTROL} flex flex-wrap gap-2`}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-accent-subtle px-2 py-1"
        >
          <Text size="xs">{tag}</Text>
          <button
            type="button"
            aria-label={removeLabel(tag)}
            className="text-text-secondary"
            onClick={() => {
              field.onChange(tags.filter((t) => t !== tag));
            }}
          >
            <X width={12} height={12} aria-hidden="true" focusable="false" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        type="text"
        className="min-w-24 flex-1 bg-transparent outline-none"
        placeholder={tags.length === 0 ? placeholder : ''}
        value={draft}
        disabled={disabled}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        onChange={(event) => {
          setDraft(event.currentTarget.value);
        }}
        onBlur={() => {
          commit();
          field.onBlur();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            commit();
          }
          if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
            field.onChange(tags.slice(0, -1));
          }
        }}
      />
    </div>
  );
}

/**
 * Keyboard (`BR-1531`): `Enter` or `,` commits the typed tag · `Backspace` on an empty field
 * removes the last · each tag's remove button is its own tab stop with a real name.
 */
export function TagsInput(props: TagsInputProps) {
  const { id, name, describedBy, invalid } = useFormField();
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TagsInputControl
          {...props}
          field={field}
          id={id}
          describedBy={describedBy}
          invalid={invalid}
        />
      )}
    />
  );
}

// ── RatingInput ──────────────────────────────────────────────────────────────────────────
export interface RatingInputProps {
  max?: number;
  /** Pre-translated, receives the value. Becomes each star's accessible name. */
  starLabel: (value: number) => string;
  disabled?: boolean;
}

/**
 * A radio group in behaviour, stars in appearance — so it is built as one: `role="radiogroup"`
 * with `role="radio"` children, arrow keys moving and selecting, and **one** tab stop for the
 * whole control via a roving `tabIndex`.
 *
 * A row of plain buttons would be five tab stops announcing nothing about being a choice between
 * them — the commoner and worse implementation.
 *
 * The keydown handler sits on each **radio**, not on the group. A `radiogroup` is not itself
 * focusable, so a handler there never fires from the keyboard; `jsx-a11y`'s
 * `interactive-supports-focus` caught that at `PH-0.24`.
 */
export function RatingInput({ max = 5, starLabel, disabled = false }: RatingInputProps) {
  const { id, name, describedBy, invalid } = useFormField();
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const current = typeof field.value === 'number' ? field.value : 0;

        return (
          <div
            id={id}
            role="radiogroup"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            // BR-1234's reasoning: a rating reads low-to-high left-to-right in both languages.
            dir="ltr"
            className="flex gap-1"
          >
            {Array.from({ length: max }, (_, index) => index + 1).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={value === current}
                aria-label={starLabel(value)}
                disabled={disabled}
                tabIndex={value === current || (current === 0 && value === 1) ? 0 : -1}
                className="text-text-muted data-checked:text-accent"
                data-checked={value <= current ? '' : undefined}
                onClick={() => {
                  field.onChange(value);
                }}
                onBlur={field.onBlur}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    field.onChange(Math.min(max, current + 1));
                  }
                  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    field.onChange(Math.max(1, current - 1));
                  }
                }}
              >
                <Star
                  width={24}
                  height={24}
                  fill={value <= current ? 'currentColor' : 'none'}
                  aria-hidden="true"
                  focusable="false"
                />
              </button>
            ))}
          </div>
        );
      }}
    />
  );
}
