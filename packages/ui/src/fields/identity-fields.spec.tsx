// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Form, JOSAM_FORM_OPTIONS } from '../form/Form.js';
import { FormField } from '../form/FormField.js';
import { EmailField, OTPField, PhoneField } from './identity-fields.js';

afterEach(cleanup);

function harness(field: ReactNode) {
  const submitted = vi.fn();

  function Harness() {
    const form = useForm<Record<string, unknown>>({
      ...JOSAM_FORM_OPTIONS,
      defaultValues: { value: '' },
    });
    return (
      <Form form={form} onSubmit={submitted}>
        <FormField name="value" label="Value">
          {field}
        </FormField>
        <button type="submit">Submit</button>
      </Form>
    );
  }

  render(<Harness />);
  return { submitted, user: userEvent.setup() };
}

describe('BR-1396 / BR-1393 — identity fields are LTR-isolated in both directions', () => {
  it('PhoneField is dir="ltr" and type="tel", never type="number" (BR-1409)', () => {
    harness(<PhoneField countryCode="+20" />);
    const input = screen.getByLabelText(/Value/);

    expect(input.getAttribute('dir')).toBe('ltr');
    expect(input.getAttribute('type')).toBe('tel');
    expect(input.getAttribute('type')).not.toBe('number');
  });

  it('EmailField is dir="ltr" with correct autocomplete', () => {
    harness(<EmailField />);
    const input = screen.getByLabelText(/Value/);

    expect(input.getAttribute('dir')).toBe('ltr');
    expect(input.getAttribute('autocomplete')).toBe('email');
    expect(input.getAttribute('autocapitalize')).toBe('off');
  });

  it('the OTP group is dir="ltr", so digit 1 stays leftmost in Arabic', () => {
    harness(<OTPField groupLabel="Code" digitLabel={(n) => `Digit ${String(n)}`} />);
    expect(screen.getByRole('group', { name: 'Code' }).getAttribute('dir')).toBe('ltr');
  });

  it('stays LTR even when the surrounding document is RTL', () => {
    document.documentElement.setAttribute('dir', 'rtl');
    harness(<EmailField />);
    // The isolation is on the control itself, not inherited — which is the whole point.
    expect(screen.getByLabelText(/Value/).getAttribute('dir')).toBe('ltr');
    document.documentElement.removeAttribute('dir');
  });
});

describe('PhoneField — E.164 normalisation', () => {
  it.each([
    ['100 123 4567', '+201001234567'],
    ['0100-123-4567', '+201001234567'],
    ['(0100) 123 4567', '+201001234567'],
    ['01001234567', '+201001234567'],
  ])('%s is stored as %s', async (typed, expected) => {
    const { submitted, user } = harness(<PhoneField countryCode="+20" />);

    await user.type(screen.getByLabelText(/Value/), typed);
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(submitted).toHaveBeenCalledWith(
        expect.objectContaining({ value: expected }),
        expect.anything(),
      );
    });
  });

  it('four different presentations of one number normalise to the same stored value', async () => {
    // The reason normalisation matters: without it these are four distinct records of one person.
    const results: unknown[] = [];
    for (const typed of ['100 123 4567', '0100-123-4567', '(0100) 123 4567', '01001234567']) {
      const { submitted, user } = harness(<PhoneField countryCode="+20" />);
      await user.type(screen.getByLabelText(/Value/), typed);
      await user.click(screen.getByRole('button', { name: 'Submit' }));
      await waitFor(() => {
        expect(submitted).toHaveBeenCalled();
      });
      results.push((submitted.mock.calls[0] as [Record<string, unknown>])[0]['value']);
      cleanup();
    }
    expect(new Set(results).size).toBe(1);
  });
});

describe('EmailField — normalisation', () => {
  it('lower-cases and trims, so one person cannot own two accounts by capitalisation', async () => {
    const { submitted, user } = harness(<EmailField />);

    await user.type(screen.getByLabelText(/Value/), '  Sara@Example.COM  ');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(submitted).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'sara@example.com' }),
        expect.anything(),
      );
    });
  });
});

describe('OTPField — six segments, auto-advance, paste distribution', () => {
  const labels = (n: number) => `Digit ${String(n)}`;

  it('renders exactly `length` segments, each with its own accessible name', () => {
    harness(<OTPField groupLabel="Code" digitLabel={labels} />);
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
    expect(screen.getByLabelText('Digit 1')).toBeDefined();
    expect(screen.getByLabelText('Digit 6')).toBeDefined();
  });

  it('auto-advances on entry', async () => {
    const { user } = harness(<OTPField groupLabel="Code" digitLabel={labels} />);

    await user.click(screen.getByLabelText('Digit 1'));
    await user.keyboard('1');

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText('Digit 2'));
    });
  });

  it('does NOT auto-advance on delete — correcting a typo must be possible', async () => {
    const { user } = harness(<OTPField groupLabel="Code" digitLabel={labels} />);

    await user.click(screen.getByLabelText('Digit 1'));
    await user.keyboard('1');
    await user.click(screen.getByLabelText('Digit 1'));
    await user.keyboard('{Backspace}');

    expect(document.activeElement).toBe(screen.getByLabelText('Digit 1'));
  });

  it('distributes a pasted code across every segment', async () => {
    const onComplete = vi.fn();
    const { user } = harness(
      <OTPField groupLabel="Code" digitLabel={labels} onComplete={onComplete} />,
    );

    const first = screen.getByLabelText('Digit 1');
    await user.click(first);
    await user.paste('482913');

    await waitFor(() => {
      expect(screen.getByLabelText<HTMLInputElement>('Digit 1').value).toBe('4');
    });
    expect(screen.getByLabelText<HTMLInputElement>('Digit 6').value).toBe('3');
    expect(onComplete).toHaveBeenCalledWith('482913');
  });

  it('strips non-digits out of a pasted code, so "482-913" still works', async () => {
    const { user } = harness(<OTPField groupLabel="Code" digitLabel={labels} />);

    await user.click(screen.getByLabelText('Digit 1'));
    await user.paste('482-913');

    await waitFor(() => {
      expect(screen.getByLabelText<HTMLInputElement>('Digit 6').value).toBe('3');
    });
  });

  it('ignores overflow rather than wrapping', async () => {
    const { user } = harness(<OTPField groupLabel="Code" digitLabel={labels} />);

    await user.click(screen.getByLabelText('Digit 1'));
    await user.paste('4829134567');

    await waitFor(() => {
      expect(screen.getByLabelText<HTMLInputElement>('Digit 6').value).toBe('3');
    });
    expect(screen.getByLabelText<HTMLInputElement>('Digit 1').value).toBe('4');
  });

  it('submits the JOINED code as the field value, not six separate fields', async () => {
    const { submitted, user } = harness(<OTPField groupLabel="Code" digitLabel={labels} />);

    await user.click(screen.getByLabelText('Digit 1'));
    await user.paste('482913');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(submitted).toHaveBeenCalledWith(
        expect.objectContaining({ value: '482913' }),
        expect.anything(),
      );
    });
  });

  it('fires onComplete exactly once, when the last segment fills', async () => {
    const onComplete = vi.fn();
    const { user } = harness(
      <OTPField groupLabel="Code" digitLabel={labels} onComplete={onComplete} />,
    );

    await user.click(screen.getByLabelText('Digit 1'));
    await user.keyboard('48291');
    expect(onComplete).not.toHaveBeenCalled();

    await user.keyboard('3');
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('only the first segment carries autocomplete="one-time-code"', () => {
    harness(<OTPField groupLabel="Code" digitLabel={labels} />);
    expect(screen.getByLabelText('Digit 1').getAttribute('autocomplete')).toBe('one-time-code');
    expect(screen.getByLabelText('Digit 2').getAttribute('autocomplete')).toBe('off');
  });

  it('moves between segments with the arrow keys', async () => {
    const { user } = harness(<OTPField groupLabel="Code" digitLabel={labels} />);

    await user.click(screen.getByLabelText('Digit 3'));
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(screen.getByLabelText('Digit 2'));

    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByLabelText('Digit 3'));
  });
});
