// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Form, JOSAM_FORM_OPTIONS } from './Form.js';
import { FormField, useFieldControl } from './FormField.js';

afterEach(cleanup);

/**
 * Everything below is asserted against **real DOM behaviour** — typing, blurring, submitting,
 * reading `document.activeElement` — never against props. A form component that "has" a
 * focus-first-error prop and does not move focus is exactly the class of defect this task exists
 * to prevent, and a prop assertion cannot tell the two apart.
 */

/** The minimal control a field component will be at PH-0.22. Uses the real inheritance point. */
function TestInput() {
  const control = useFieldControl({ required: 'This field is required' });
  return <input type="text" {...control} />;
}

/** Same wiring, no validation — for the optional field. */
function OptionalInput() {
  const control = useFieldControl();
  return <input type="text" {...control} />;
}

interface Values {
  first: string;
  second: string;
  third: string;
}

function Harness({
  onSubmit = () => undefined,
  warnOnLeave = true,
}: {
  onSubmit?: (values: Values) => void | Promise<void>;
  warnOnLeave?: boolean;
}) {
  const form = useForm<Values>({
    ...JOSAM_FORM_OPTIONS,
    defaultValues: { first: '', second: '', third: '' },
  });

  return (
    <Form form={form} onSubmit={onSubmit} warnOnLeave={warnOnLeave} requiredLegend="* required">
      <FormField name="first" label="First" required hint="The first field">
        <TestInput />
      </FormField>
      <FormField name="second" label="Second" required>
        <TestInput />
      </FormField>
      <FormField name="third" label="Third">
        <OptionalInput />
      </FormField>
      <button type="submit">Submit</button>
    </Form>
  );
}

describe('BR-1402 — every field has a real label associated with its input', () => {
  it('finds each control BY ITS LABEL, which only works if htmlFor/id actually match', () => {
    render(<Harness />);
    // getByLabelText resolves through the accessibility tree. A decorative <label> with no
    // association fails here, which is the whole point of asserting it this way.
    expect(screen.getByLabelText(/First/)).toBeDefined();
    expect(screen.getByLabelText(/Second/)).toBeDefined();
  });

  it('wires aria-describedby to the hint by id', () => {
    render(<Harness />);
    const input = screen.getByLabelText(/First/);
    const describedBy = input.getAttribute('aria-describedby');

    expect(describedBy).toBeTruthy();
    const hint = document.getElementById(describedBy?.split(' ')[0] ?? '');
    expect(hint?.textContent).toBe('The first field');
  });

  it('marks required on the control itself, not only visually', () => {
    render(<Harness />);
    expect(screen.getByLabelText(/First/).hasAttribute('required')).toBe(true);
    expect(screen.getByLabelText(/Third/).hasAttribute('required')).toBe(false);
  });
});

describe('BR-1406 — focus moves to the FIRST invalid field on failed submit', () => {
  it('moves focus to the first invalid control in DOCUMENT order', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText(/First/));
    });
  });

  it('moves focus to the second field when only that one is invalid', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/First/), 'filled');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText(/Second/));
    });
  });

  it('does not move focus when the form is valid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/First/), 'a');
    await user.type(screen.getByLabelText(/Second/), 'b');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Submit' }));
  });

  it('scrolls the focused field into view', async () => {
    // jsdom has no layout and therefore no scrollIntoView; it is defined here so the call can be
    // observed at all. The component guards on its presence, so its absence never breaks focus.
    const scrollIntoView = vi.fn();
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoView,
    });

    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled();
    });
  });
});

describe('BR-1405 — the error is adjacent, explains the fix, and persists until corrected', () => {
  it('announces the error and links it to the control', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    const alert = await screen.findAllByRole('alert');
    expect(alert[0]?.textContent).toBe('This field is required');

    const input = screen.getByLabelText(/First/);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    // aria-describedby must now include the error id as well as the hint id.
    expect(input.getAttribute('aria-describedby')?.split(' ')).toHaveLength(2);
  });

  it('clears the error once the field is corrected, not before', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await screen.findAllByRole('alert');

    await user.type(screen.getByLabelText(/First/), 'now filled');

    await waitFor(() => {
      expect(screen.getByLabelText(/First/).getAttribute('aria-invalid')).toBe('false');
    });
  });
});

describe('BR-1404 — validation runs on blur and submit, not on every keystroke', () => {
  it('stays silent while typing in an untouched field', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/First/), 'x');
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  it('reports on blur once the field has been touched and left empty', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText(/First/));
    await user.tab();

    await waitFor(() => {
      expect(screen.queryAllByRole('alert').length).toBeGreaterThan(0);
    });
  });
});

describe('BR-1412 — leaving a dirty form warns; a clean one does not', () => {
  /** Fires a real beforeunload and reports whether anything tried to block it. */
  function beforeUnloadWasBlocked(): boolean {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  }

  it('does not warn while the form is pristine', () => {
    render(<Harness />);
    expect(beforeUnloadWasBlocked()).toBe(false);
  });

  it('warns once the form is dirty', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/First/), 'a');

    await waitFor(() => {
      expect(beforeUnloadWasBlocked()).toBe(true);
    });
  });

  it('stops warning after a successful submit — otherwise it trains people to dismiss it', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/First/), 'a');
    await user.type(screen.getByLabelText(/Second/), 'b');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(beforeUnloadWasBlocked()).toBe(false);
    });
  });

  it('honours warnOnLeave={false}', async () => {
    const user = userEvent.setup();
    render(<Harness warnOnLeave={false} />);

    await user.type(screen.getByLabelText(/First/), 'a');
    expect(beforeUnloadWasBlocked()).toBe(false);
  });

  it('removes its listener on unmount, so a stale form cannot block navigation', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness />);

    await user.type(screen.getByLabelText(/First/), 'a');
    await waitFor(() => {
      expect(beforeUnloadWasBlocked()).toBe(true);
    });

    unmount();
    expect(beforeUnloadWasBlocked()).toBe(false);
  });
});

describe('submit lock', () => {
  it('does not run the handler twice when submit is clicked twice', async () => {
    const user = userEvent.setup();
    let resolve: (() => void) | undefined;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );

    render(<Harness onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/First/), 'a');
    await user.type(screen.getByLabelText(/Second/), 'b');

    const submit = screen.getByRole('button', { name: 'Submit' });
    await user.click(submit);
    await user.click(submit);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    resolve?.();
  });
});

describe('useFormField outside a FormField', () => {
  it('throws rather than silently rendering an unlabelled control', () => {
    const Orphan = () => {
      const control = useFieldControl();
      return <input {...control} />;
    };
    // Rendering outside both providers must fail loudly (BR-1402).
    expect(() => render(<Orphan />)).toThrow(/must be rendered inside <FormField>/);
  });
});
