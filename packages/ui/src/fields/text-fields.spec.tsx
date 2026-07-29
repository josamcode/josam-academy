// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

afterEach(cleanup);

/** Renders one field inside a real Form/FormField and reports what the form actually submits. */
function harness(field: ReactNode, opts: { label?: string; required?: boolean } = {}) {
  const submitted = vi.fn();

  function Harness() {
    const form = useForm<Record<string, unknown>>({
      ...JOSAM_FORM_OPTIONS,
      defaultValues: { value: '' },
    });
    return (
      <Form form={form} onSubmit={submitted}>
        <FormField name="value" label={opts.label ?? 'Value'} required={opts.required ?? false}>
          {field}
        </FormField>
        <button type="submit">Submit</button>
      </Form>
    );
  }

  render(<Harness />);
  return { submitted, user: userEvent.setup() };
}

describe('every field inherits FormField’s wiring (BR-1402–BR-1406)', () => {
  it.each([
    ['TextField', <TextField key="a" />],
    ['TextArea', <TextArea key="b" />],
    ['NumberField', <NumberField key="d" />],
    ['CurrencyField', <CurrencyField key="e" currency="EGP" />],
    ['CodeField', <CodeField key="f" />],
  ])('%s is reachable by its label and carries the aria wiring', (_name, field) => {
    harness(field);
    const control = screen.getByLabelText(/Value/);

    expect(control.getAttribute('aria-invalid')).toBe('false');
    expect(control.getAttribute('id')).toBeTruthy();
  });

  it('PasswordField is reachable by its label too', () => {
    harness(<PasswordField autoComplete="current-password" showLabel="Show" hideLabel="Hide" />);
    expect(screen.getByLabelText(/Value/)).toBeDefined();
  });

  it('no field offers a placeholder as a label substitute (BR-1402)', () => {
    harness(<TextField />);
    expect(screen.getByLabelText(/Value/).hasAttribute('placeholder')).toBe(false);
  });
});

describe('BR-1410 — values are trimmed', () => {
  it('trims what the form submits, not merely what is displayed', async () => {
    const { submitted, user } = harness(<TextField />);

    await user.type(screen.getByLabelText(/Value/), '   spaced   ');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(submitted).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'spaced' }),
        expect.anything(),
      );
    });
  });
});

describe('BR-826 — CurrencyField stores integer minor units', () => {
  it.each([
    ['49.90', 4990],
    ['100', 10000],
    ['0.05', 5],
    ['0.1', 10],
    // 0.29 * 100 is 28.999999999999996 — the case truncation gets wrong.
    ['0.29', 29],
    ['1.13', 113],
  ])('%s major becomes %i minor', async (typed, expected) => {
    const { submitted, user } = harness(<CurrencyField currency="EGP" />);

    await user.type(screen.getByLabelText(/Value/), typed);
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(submitted).toHaveBeenCalledWith(
        expect.objectContaining({ value: expected }),
        expect.anything(),
      );
    });
  });

  it('rounds rather than truncating, and this is not a rare edge', () => {
    // The first version of this test named 49.90 as the failing case. It is not:
    // 49.9 * 100 is 4990.000000000001, which truncates correctly. The real failures are the
    // values whose product lands just BELOW the integer.
    expect(0.29 * 100).toBeLessThan(29);
    expect(Math.trunc(0.29 * 100)).toBe(28);
    expect(Math.round(0.29 * 100)).toBe(29);

    // The scale of it, so nobody later decides truncation is close enough.
    let differing = 0;
    for (let cents = 1; cents <= 20_000; cents++) {
      if (Math.trunc((cents / 100) * 100) !== cents) differing++;
    }
    expect(differing).toBe(1145);
  });
});

describe('BR-1409 — the input type matches the data', () => {
  it('NumberField submits a number, not a numeric string', async () => {
    const { submitted, user } = harness(<NumberField />);

    await user.type(screen.getByLabelText(/Value/), '42');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      const [values] = submitted.mock.calls[0] as [Record<string, unknown>];
      expect(typeof values['value']).toBe('number');
      expect(values['value']).toBe(42);
    });
  });

  it('NumberField is type=number; CodeField is not', () => {
    harness(<NumberField />);
    expect(screen.getByLabelText(/Value/).getAttribute('type')).toBe('number');
    cleanup();

    harness(<CodeField />);
    expect(screen.getByLabelText(/Value/).getAttribute('type')).toBe('text');
  });
});

describe('BR-1414 — PasswordField supports show/hide and password managers', () => {
  it('toggles the input type and the button’s accessible name', async () => {
    const { user } = harness(
      <PasswordField
        autoComplete="current-password"
        showLabel="Show password"
        hideLabel="Hide password"
      />,
    );

    const input = screen.getByLabelText(/Value/);
    expect(input.getAttribute('type')).toBe('password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));

    expect(input.getAttribute('type')).toBe('text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeDefined();
  });

  it('never disables autocomplete, and distinguishes current from new', () => {
    harness(<PasswordField autoComplete="new-password" showLabel="s" hideLabel="h" />);
    const autoComplete = screen.getByLabelText(/Value/).getAttribute('autocomplete');

    expect(autoComplete).toBe('new-password');
    expect(autoComplete).not.toBe('off');
  });

  it('the toggle is a real button and never submits the form', async () => {
    const { submitted, user } = harness(
      <PasswordField autoComplete="current-password" showLabel="Show" hideLabel="Hide" />,
    );

    await user.click(screen.getByRole('button', { name: 'Show' }));
    expect(submitted).not.toHaveBeenCalled();
  });
});

describe('CodeField — an identifier, isolated and normalised', () => {
  it('is LTR regardless of interface direction (BR-1393)', () => {
    harness(<CodeField />);
    expect(screen.getByLabelText(/Value/).getAttribute('dir')).toBe('ltr');
  });

  it('upper-cases what the form submits', async () => {
    const { submitted, user } = harness(<CodeField />);

    await user.type(screen.getByLabelText(/Value/), 'ab12cd');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(submitted).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'AB12CD' }),
        expect.anything(),
      );
    });
  });

  it('stops accepting input at its length', async () => {
    const { user } = harness(<CodeField length={4} />);
    const input = screen.getByLabelText(/Value/);

    await user.type(input, 'ABCDEFGH');
    expect((input as HTMLInputElement).value).toHaveLength(4);
  });
});

describe('counters', () => {
  it('counts what has been typed and announces politely', async () => {
    const { user } = harness(<TextField maxLength={10} />);

    expect(screen.getByText('0 / 10')).toBeDefined();
    await user.type(screen.getByLabelText(/Value/), 'abc');

    await waitFor(() => {
      expect(screen.getByText('3 / 10')).toBeDefined();
    });
    expect(screen.getByText('3 / 10').getAttribute('aria-live')).toBe('polite');
  });

  it('TextArea counts too', async () => {
    const { user } = harness(<TextArea maxLength={5} />);
    await user.type(screen.getByLabelText(/Value/), 'ab');

    await waitFor(() => {
      expect(screen.getByText('2 / 5')).toBeDefined();
    });
  });
});

describe('token discipline across every field', () => {
  it.each([
    ['TextField', <TextField key="a" />],
    ['TextArea', <TextArea key="b" />],
    ['NumberField', <NumberField key="c" />],
    ['CodeField', <CodeField key="d" />],
  ])('%s emits no raw hex and no palette utility', (_name, field) => {
    const { container } = render(<FormHarnessOnly>{field}</FormHarnessOnly>);
    const html = container.innerHTML;
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(html).not.toMatch(
      /\b(?:text|bg|border)-(?:gray|slate|zinc|neutral|blue|red|green|yellow|amber)-\d{2,3}\b/,
    );
  });
});

function FormHarnessOnly({ children }: { children: ReactNode }) {
  const form = useForm<Record<string, unknown>>({
    ...JOSAM_FORM_OPTIONS,
    defaultValues: { value: '' },
  });
  return (
    <Form form={form} onSubmit={() => undefined}>
      <FormField name="value" label="Value">
        {children}
      </FormField>
    </Form>
  );
}
