// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { availability } from '../form/availability.js';
import { Form, JOSAM_FORM_OPTIONS } from '../form/Form.js';
import { FormField } from '../form/FormField.js';
import {
  CodeField,
  CurrencyField,
  NumberField,
  PasswordField,
  TextArea,
  TextField,
} from './text-fields.js';
import { EmailField, OTPField, PhoneField } from './identity-fields.js';
import {
  Checkbox,
  type ChoiceOption,
  RadioCard,
  RadioGroup,
  Slider,
  Switch,
} from './choice-toggles.js';
import { Combobox, MultiSelect, RatingInput, Select, TagsInput } from './choice-composites.js';
import { DatePicker, DurationField, TimestampField } from './time-fields.js';
import { FileDrop, ImageDrop } from './file-fields.js';

/**
 * `PH-0.29` — `BR-1544` conformance across all 24 fields.
 *
 * Every assertion here is on the **effect**, never on the marker (`BR-1837`): whether a keyboard
 * user can reach the control, and whether the value the form submits actually changed. A test that
 * asserted `disabled={true}` was passed would agree with a component that accepted the prop and
 * ignored it — which is precisely how nineteen fields went twenty-two tasks without `readOnly`.
 */

afterEach(cleanup);

const OPTIONS: ChoiceOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
];

const DATE_LABELS = {
  open: 'Calendar',
  previousMonth: 'Previous',
  nextMonth: 'Next',
  placeholder: 'Pick a date',
};

const FILE_LABELS = {
  prompt: 'Drop a file',
  browse: 'Browse',
  remove: 'Remove',
  constraints: (types: string, maxSize: string) => `${types} · ${maxSize}`,
  rejected: { type: 'type', size: 'size', mismatch: 'mismatch', aspect: 'aspect' },
  uploading: 'Uploading',
  cancel: 'Cancel',
};

function harness(field: ReactNode, defaultValue: unknown = '') {
  const submitted = vi.fn();

  function Harness() {
    const form = useForm<Record<string, unknown>>({
      ...JOSAM_FORM_OPTIONS,
      defaultValues: { value: defaultValue },
    });
    return (
      <Form form={form} onSubmit={submitted}>
        <FormField name="value" label="Field">
          {field}
        </FormField>
        <button type="submit">Submit</button>
      </Form>
    );
  }

  render(<Harness />);
  return { submitted, user: userEvent.setup() };
}

/** Every field that takes `Availability`, in one list, so none can be quietly skipped. */
const READ_ONLY: [string, ReactNode, unknown][] = [
  ['TextField', <TextField key="1" readOnly />, 'kept'],
  ['TextArea', <TextArea key="2" readOnly />, 'kept'],
  [
    'PasswordField',
    <PasswordField key="3" autoComplete="current-password" showLabel="s" hideLabel="h" readOnly />,
    'kept',
  ],
  ['NumberField', <NumberField key="4" readOnly />, 7],
  ['CurrencyField', <CurrencyField key="5" currency="EGP" readOnly />, 100],
  ['CodeField', <CodeField key="6" readOnly />, 'ABC'],
  ['PhoneField', <PhoneField key="7" countryCode="+20" readOnly />, '+201000000000'],
  ['EmailField', <EmailField key="8" readOnly />, 'a@b.com'],
  ['Checkbox', <Checkbox key="9" label="Accept" readOnly />, true],
  ['Switch', <Switch key="10" label="Notify" readOnly />, true],
  ['RadioGroup', <RadioGroup key="11" options={OPTIONS} readOnly />, 'a'],
  ['RadioCard', <RadioCard key="12" options={OPTIONS} readOnly />, 'a'],
  ['Slider', <Slider key="13" min={1} max={5} readOnly />, 3],
  ['Select', <Select key="14" options={OPTIONS} placeholder="Pick" readOnly />, 'a'],
  [
    'Combobox',
    <Combobox key="15" options={OPTIONS} placeholder="S" emptyLabel="none" readOnly />,
    'a',
  ],
  [
    'MultiSelect',
    <MultiSelect
      key="16"
      options={OPTIONS}
      placeholder="P"
      overflowLabel={(n) => `+${String(n)}`}
      removeLabel={(l) => `Remove ${l}`}
      readOnly
    />,
    ['a'],
  ],
  [
    'TagsInput',
    <TagsInput key="17" placeholder="Add" removeLabel={(t) => `Remove ${t}`} readOnly />,
    ['x'],
  ],
  ['RatingInput', <RatingInput key="18" starLabel={(v) => `${String(v)} stars`} readOnly />, 3],
  [
    'DurationField',
    <DurationField key="19" placeholder="mm:ss" invalidMessage="bad" readOnly />,
    225,
  ],
];

const DISABLED: [string, ReactNode, unknown][] = [
  ['TextField', <TextField key="1" disabled disabledReason="R1" />, ''],
  ['TextArea', <TextArea key="2" disabled disabledReason="R2" />, ''],
  [
    'PasswordField',
    <PasswordField
      key="3"
      autoComplete="current-password"
      showLabel="s"
      hideLabel="h"
      disabled
      disabledReason="R3"
    />,
    '',
  ],
  ['NumberField', <NumberField key="4" disabled disabledReason="R4" />, 0],
  ['CurrencyField', <CurrencyField key="5" currency="EGP" disabled disabledReason="R5" />, 0],
  ['CodeField', <CodeField key="6" disabled disabledReason="R6" />, ''],
  ['PhoneField', <PhoneField key="7" countryCode="+20" disabled disabledReason="R7" />, ''],
  ['EmailField', <EmailField key="8" disabled disabledReason="R8" />, ''],
  ['Checkbox', <Checkbox key="9" label="Accept" disabled disabledReason="R9" />, false],
  ['Switch', <Switch key="10" label="Notify" disabled disabledReason="R10" />, false],
  ['RadioGroup', <RadioGroup key="11" options={OPTIONS} disabled disabledReason="R11" />, 'a'],
  ['RadioCard', <RadioCard key="12" options={OPTIONS} disabled disabledReason="R12" />, 'a'],
  ['Slider', <Slider key="13" min={1} max={5} disabled disabledReason="R13" />, 3],
  [
    'Select',
    <Select key="14" options={OPTIONS} placeholder="Pick" disabled disabledReason="R14" />,
    '',
  ],
  [
    'Combobox',
    <Combobox
      key="15"
      options={OPTIONS}
      placeholder="S"
      emptyLabel="none"
      disabled
      disabledReason="R15"
    />,
    '',
  ],
  [
    'MultiSelect',
    <MultiSelect
      key="16"
      options={OPTIONS}
      placeholder="P"
      overflowLabel={(n) => `+${String(n)}`}
      removeLabel={(l) => `Remove ${l}`}
      disabled
      disabledReason="R16"
    />,
    [],
  ],
  [
    'TagsInput',
    <TagsInput
      key="17"
      placeholder="Add"
      removeLabel={(t) => `Remove ${t}`}
      disabled
      disabledReason="R17"
    />,
    [],
  ],
  [
    'RatingInput',
    <RatingInput key="18" starLabel={(v) => `${String(v)} stars`} disabled disabledReason="R18" />,
    0,
  ],
  [
    'DurationField',
    <DurationField
      key="19"
      placeholder="mm:ss"
      invalidMessage="bad"
      disabled
      disabledReason="R19"
    />,
    0,
  ],
  [
    'DatePicker',
    <DatePicker key="20" locale="en-US" labels={DATE_LABELS} disabled disabledReason="R20" />,
    '2026-07-15',
  ],
  [
    'TimestampField',
    <TimestampField
      key="21"
      getCurrentTime={() => 1}
      labels={{ capture: 'C', clear: 'X', empty: '—' }}
      disabled
      disabledReason="R21"
    />,
    0,
  ],
  [
    'FileDrop',
    <FileDrop
      key="22"
      accept={['image/png']}
      maxBytes={1024}
      locale="en"
      labels={FILE_LABELS}
      disabled
      disabledReason="R22"
    />,
    null,
  ],
  [
    'ImageDrop',
    <ImageDrop
      key="23"
      accept={['image/png']}
      maxBytes={1024}
      locale="en"
      labels={FILE_LABELS}
      imageLabels={{ preview: 'p', cropOffset: 'c' }}
      disabled
      disabledReason="R23"
    />,
    null,
  ],
];

describe('the union itself', () => {
  it('resolves the disabled arm to a title and never to readOnly', () => {
    expect(availability({ disabled: true, disabledReason: 'because' })).toEqual({
      disabled: true,
      readOnly: false,
      title: 'because',
    });
  });

  it('resolves the available arm, with readOnly defaulting off', () => {
    expect(availability({})).toEqual({ disabled: false, readOnly: false, title: undefined });
    expect(availability({ readOnly: true })).toEqual({
      disabled: false,
      readOnly: true,
      title: undefined,
    });
  });
});

describe('BR-1544 — readOnly keeps the control REACHABLE', () => {
  it.each(READ_ONLY)('%s stays in the tab order when readOnly', async (name, field, value) => {
    const { user } = harness(field, value);

    await user.tab();
    // The effect, not the marker: a disabled control is skipped by Tab entirely, so landing
    // anywhere other than the submit button is what proves readOnly is not disabled.
    expect(document.activeElement?.textContent, name).not.toBe('Submit');
    expect(document.activeElement?.tagName, name).not.toBe('BODY');
  });
});

describe('BR-1544 — readOnly refuses the EDIT, not the reading', () => {
  it('TextField keeps its value when typed into', async () => {
    const { submitted, user } = harness(<TextField readOnly />, 'kept');
    await user.tab();
    await user.keyboard('nope');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => {
      expect(submitted).toHaveBeenCalled();
    });
    expect((submitted.mock.calls[0] as [Record<string, unknown>])[0]['value']).toBe('kept');
  });

  it('Checkbox does not toggle on Space', async () => {
    const { user } = harness(<Checkbox label="Accept" readOnly />, true);
    await user.tab();
    await user.keyboard(' ');
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
  });

  it('Switch does not toggle on Space', async () => {
    const { user } = harness(<Switch label="Notify" readOnly />, true);
    await user.tab();
    await user.keyboard(' ');
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });

  it('RatingInput does not change on arrow keys', async () => {
    const { user } = harness(<RatingInput starLabel={(v) => `${String(v)} stars`} readOnly />, 3);
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '3 stars' }).getAttribute('aria-checked')).toBe(
      'true',
    );
  });

  it('TagsInput does not commit a new tag on Enter', async () => {
    const { submitted, user } = harness(
      <TagsInput placeholder="Add" removeLabel={(t) => `Remove ${t}`} readOnly />,
      ['x'],
    );
    await user.click(screen.getByRole('textbox'));
    await user.keyboard('new{Enter}');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => {
      expect(submitted).toHaveBeenCalled();
    });
    expect((submitted.mock.calls[0] as [Record<string, unknown>])[0]['value']).toEqual(['x']);
  });

  /**
   * The one a native `readOnly` attribute does NOT cover. `readOnly` on an `<input>` blocks typing,
   * but `OTPField` writes to form state from its own paste and keydown handlers — which the browser
   * never routes through the attribute. Without an explicit guard, a read-only code could be
   * pasted over and cleared with Backspace while looking read-only.
   */
  it('OTPField refuses a paste and a Backspace', async () => {
    const { submitted, user } = harness(
      <OTPField groupLabel="Code" digitLabel={(n) => `Digit ${String(n)}`} readOnly />,
      '',
    );
    const first = screen.getAllByRole('textbox')[0];
    if (first === undefined) throw new Error('no segments');

    await user.click(first);
    await user.paste('123456');
    await user.keyboard('{Backspace}');

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => {
      expect(submitted).toHaveBeenCalled();
    });
    expect((submitted.mock.calls[0] as [Record<string, unknown>])[0]['value']).toBe('');
  });
});

describe('BR-1347 — a disabled field is unreachable AND states its reason', () => {
  it.each(DISABLED)('%s is skipped by Tab when disabled', async (name, field, value) => {
    const { user } = harness(field, value);

    await user.tab();
    // A disabled control is out of the keyboard flow entirely, so the first stop is the submit
    // button. That is the behavioural difference from readOnly, and the reason a value the user
    // is meant to READ must never be rendered disabled.
    expect(document.activeElement?.textContent, name).toBe('Submit');
  });

  it.each(DISABLED)('%s carries its reason where a user can find it', (name, field, value) => {
    harness(field, value);
    const reason = /^R\d+$/;
    const titled = Array.from(document.querySelectorAll('[title]')).map(
      (element) => element.getAttribute('title') ?? '',
    );
    expect(titled.filter((title) => reason.test(title)).length, name).toBeGreaterThan(0);
  });
});

describe('BR-1347 — a disabled OPTION states its reason too', () => {
  it('carries the reason onto the option element', async () => {
    const { user } = harness(
      <Select
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta', disabled: true, disabledReason: 'Not on this course' },
        ]}
        placeholder="Pick"
      />,
      '',
    );

    await user.tab();
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeDefined();
    });

    const beta = screen.getByRole('option', { name: /Beta/ });
    expect(beta.getAttribute('title')).toBe('Not on this course');
  });
});
