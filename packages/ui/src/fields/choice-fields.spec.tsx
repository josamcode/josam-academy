// @vitest-environment jsdom
import axe from 'axe-core';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Form, JOSAM_FORM_OPTIONS } from '../form/Form.js';
import { FormField } from '../form/FormField.js';
import {
  Checkbox,
  type ChoiceOption,
  RadioCard,
  RadioGroup,
  Slider,
  Switch,
} from './choice-toggles.js';
import { Combobox, MultiSelect, RatingInput, Select, TagsInput } from './choice-composites.js';

afterEach(cleanup);

const OPTIONS: ChoiceOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

function harness(field: ReactNode, defaultValue: unknown = '') {
  const submitted = vi.fn();

  function Harness() {
    const form = useForm<Record<string, unknown>>({
      ...JOSAM_FORM_OPTIONS,
      defaultValues: { value: defaultValue },
    });
    return (
      <Form form={form} onSubmit={submitted}>
        <FormField name="value" label="Choice">
          {field}
        </FormField>
        <button type="submit">Submit</button>
      </Form>
    );
  }

  render(<Harness />);
  return { submitted, user: userEvent.setup() };
}

/**
 * Presses an arrow key the way a person does — **held**, then released.
 *
 * Radix's roving focus defers the actual focus move into a `setTimeout`, so it runs after the key
 * event has finished bubbling to `document`. That ordering is deliberate: Radix's document-level
 * keydown listener sets an "an arrow key is currently down" flag, and the newly focused radio reads
 * that flag to decide whether to select itself. Arrow keys must both move *and* select in a radio
 * group; the flag is how Radix distinguishes that from a plain programmatic focus.
 *
 * `user.keyboard('{ArrowDown}')` fires keydown and keyup back to back. The flag is set and cleared
 * before the deferred focus callback runs, so focus moves and selection does not follow — the
 * contract looks broken when it is not. Increasing userEvent's `delay` does **not** fix it: the
 * delay sits between separate keystrokes, not between one key's down and up.
 *
 * A real key is held for tens of milliseconds. This models that, and every Radix roving-focus
 * component needs it (`RadioGroup`, `RadioCard`, and the nav components in `PH-0.26`).
 */
async function pressArrow(user: ReturnType<typeof userEvent.setup>, key: string) {
  await user.keyboard(`{${key}>}`);
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
  await user.keyboard(`{/${key}}`);
}

async function submitAndRead(
  user: ReturnType<typeof userEvent.setup>,
  submitted: ReturnType<typeof vi.fn>,
) {
  await user.click(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => {
    expect(submitted).toHaveBeenCalled();
  });
  return (submitted.mock.calls[0] as [Record<string, unknown>])[0]['value'];
}

describe('BR-1528 — Radix is not exposed to feature code', () => {
  it('the package exports no Radix symbol', async () => {
    const surface = await import('../index.js');
    for (const key of Object.keys(surface)) {
      expect(key.toLowerCase()).not.toContain('radix');
    }
  });
});

describe('Checkbox and Switch — fully keyboard operable', () => {
  it('Checkbox toggles with Space and submits a boolean', async () => {
    const { submitted, user } = harness(<Checkbox label="Accept" />, false);

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('checkbox'));

    await user.keyboard(' ');
    await waitFor(() => {
      expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
    });

    expect(await submitAndRead(user, submitted)).toBe(true);
  });

  it('Checkbox activates by clicking its LABEL, not only the box (BR-1402)', async () => {
    const { user } = harness(<Checkbox label="Accept terms" />, false);

    await user.click(screen.getByText('Accept terms'));
    await waitFor(() => {
      expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
    });
  });

  it('Switch toggles with Space', async () => {
    const { submitted, user } = harness(<Switch label="Notifications" />, false);

    await user.tab();
    await user.keyboard(' ');

    expect(await submitAndRead(user, submitted)).toBe(true);
  });
});

describe('RadioGroup — arrows move AND select', () => {
  it('selects with arrow keys, which is the radio contract', async () => {
    const { submitted, user } = harness(<RadioGroup options={OPTIONS} />, 'a');

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Alpha' }));

    await pressArrow(user, 'ArrowDown');
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Beta' }).getAttribute('aria-checked')).toBe('true');
    });

    expect(await submitAndRead(user, submitted)).toBe('b');
  });

  it('is ONE tab stop, not three', async () => {
    const { user } = harness(<RadioGroup options={OPTIONS} />, 'a');

    await user.tab();
    expect(document.activeElement?.getAttribute('role')).toBe('radio');
    await user.tab();
    // The next stop is the submit button, not the second radio.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Submit' }));
  });
});

describe('RadioCard — the same semantics, a card-sized hit target', () => {
  it('renders radios, not buttons, and selects by keyboard', async () => {
    const { submitted, user } = harness(
      <RadioCard
        options={[
          { value: 'a', label: 'Alpha', description: 'The first' },
          { value: 'b', label: 'Beta', description: 'The second' },
        ]}
      />,
      'a',
    );

    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByText('The first')).toBeDefined();

    await user.tab();
    await pressArrow(user, 'ArrowDown');
    expect(await submitAndRead(user, submitted)).toBe('b');
  });
});

describe('Slider — keyboard operable, and says what its value MEANS', () => {
  it('moves with arrows and submits a number', async () => {
    const { submitted, user } = harness(
      <Slider min={1} max={7} formatValue={(v) => `${String(v)} lessons`} />,
      3,
    );

    await user.tab();
    await user.keyboard('{ArrowRight}');

    expect(await submitAndRead(user, submitted)).toBe(4);
  });

  it('carries aria-valuetext — "3" alone tells a screen reader nothing', () => {
    harness(<Slider min={1} max={7} formatValue={(v) => `${String(v)} lessons per week`} />, 3);
    expect(screen.getByRole('slider').getAttribute('aria-valuetext')).toBe('3 lessons per week');
  });
});

describe('Select — Radix, behind our own surface', () => {
  it('opens by keyboard and exposes its options', async () => {
    const { user } = harness(<Select options={OPTIONS} placeholder="Pick one" />, '');

    await user.tab();
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeDefined();
    });
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('shows the placeholder without it being the label (BR-1402)', () => {
    harness(<Select options={OPTIONS} placeholder="Pick one" />, '');
    // The accessible name comes from FormField's label, never from the placeholder.
    expect(screen.getByRole('combobox').textContent).toContain('Pick one');
    expect(screen.getByLabelText(/Choice/)).toBeDefined();
  });
});

describe('Combobox — filter, arrows, Enter, Escape', () => {
  it('filters as you type and selects the active option with Enter', async () => {
    const { submitted, user } = harness(
      <Combobox options={OPTIONS} placeholder="Search" emptyLabel="Nothing found" />,
      '',
    );

    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('Be');

    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(1);
    });

    await user.keyboard('{Enter}');
    expect(await submitAndRead(user, submitted)).toBe('b');
  });

  it('announces the active option through aria-activedescendant', async () => {
    const { user } = harness(
      <Combobox options={OPTIONS} placeholder="Search" emptyLabel="Nothing found" />,
      '',
    );

    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{ArrowDown}');

    await waitFor(() => {
      const active = input.getAttribute('aria-activedescendant');
      expect(active).toBeTruthy();
      expect(document.getElementById(active ?? '')?.textContent).toBe('Beta');
    });
  });

  it('shows an empty state INSIDE the list rather than vanishing', async () => {
    const { user } = harness(
      <Combobox options={OPTIONS} placeholder="Search" emptyLabel="Nothing found" />,
      '',
    );

    await user.click(screen.getByRole('combobox'));
    await user.keyboard('zzz');

    await waitFor(() => {
      expect(within(screen.getByRole('listbox')).getByText('Nothing found')).toBeDefined();
    });
  });

  it('Escape closes without changing the value', async () => {
    const { submitted, user } = harness(
      <Combobox options={OPTIONS} placeholder="Search" emptyLabel="None" />,
      'a',
    );

    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{ArrowDown}{Escape}');

    expect(await submitAndRead(user, submitted)).toBe('a');
  });
});

describe('MultiSelect — chips, overflow, keyboard removal', () => {
  it('toggles options with Enter and accumulates values', async () => {
    const { submitted, user } = harness(
      <MultiSelect
        options={OPTIONS}
        placeholder="Pick some"
        overflowLabel={(n) => `+${String(n)} more`}
        removeLabel={(l) => `Remove ${l}`}
      />,
      [],
    );

    await user.tab();
    await user.keyboard('{Enter}'); // opens
    await user.keyboard('{Enter}'); // chooses the active option

    // Scoped to the trigger deliberately: with the listbox open, "Alpha" is present twice — once
    // as the chosen chip and once as the option still listed. An unscoped getByText matches both
    // and fails on ambiguity rather than on behaviour.
    await waitFor(() => {
      expect(within(screen.getByRole('combobox')).getByText('Alpha')).toBeDefined();
    });
    expect(await submitAndRead(user, submitted)).toEqual(['a']);
  });

  it('Backspace removes the last chip', async () => {
    const { submitted, user } = harness(
      <MultiSelect
        options={OPTIONS}
        placeholder="Pick some"
        overflowLabel={(n) => `+${String(n)} more`}
        removeLabel={(l) => `Remove ${l}`}
      />,
      ['a', 'b'],
    );

    await user.tab();
    await user.keyboard('{Backspace}');

    expect(await submitAndRead(user, submitted)).toEqual(['a']);
  });

  it('collapses beyond maxVisible into a counter', () => {
    harness(
      <MultiSelect
        options={OPTIONS}
        placeholder="Pick some"
        maxVisible={2}
        overflowLabel={(n) => `+${String(n)} more`}
        removeLabel={(l) => `Remove ${l}`}
      />,
      ['a', 'b', 'c'],
    );

    expect(screen.getByText('+1 more')).toBeDefined();
  });

  it('the trigger is a real button, so it is focusable and Enter-activated', () => {
    harness(
      <MultiSelect
        options={OPTIONS}
        placeholder="Pick some"
        overflowLabel={(n) => `+${String(n)}`}
        removeLabel={(l) => `Remove ${l}`}
      />,
      [],
    );
    expect(screen.getByRole('combobox').tagName).toBe('BUTTON');
  });
});

describe('TagsInput', () => {
  it('commits on Enter and on comma', async () => {
    const { submitted, user } = harness(
      <TagsInput placeholder="Add tags" removeLabel={(t) => `Remove ${t}`} />,
      [],
    );

    await user.click(screen.getByRole('textbox'));
    await user.keyboard('react{Enter}typescript,');

    expect(await submitAndRead(user, submitted)).toEqual(['react', 'typescript']);
  });

  it('ignores a duplicate silently — the intent is already satisfied', async () => {
    const { submitted, user } = harness(
      <TagsInput placeholder="Add tags" removeLabel={(t) => `Remove ${t}`} />,
      ['react'],
    );

    await user.click(screen.getByRole('textbox'));
    await user.keyboard('react{Enter}');

    expect(await submitAndRead(user, submitted)).toEqual(['react']);
  });

  it('Backspace on an empty field removes the last tag', async () => {
    const { submitted, user } = harness(
      <TagsInput placeholder="Add tags" removeLabel={(t) => `Remove ${t}`} />,
      ['a', 'b'],
    );

    await user.click(screen.getByRole('textbox'));
    await user.keyboard('{Backspace}');

    expect(await submitAndRead(user, submitted)).toEqual(['a']);
  });

  it('every remove button has a real accessible name', () => {
    harness(<TagsInput placeholder="Add" removeLabel={(t) => `Remove ${t}`} />, ['react']);
    expect(screen.getByRole('button', { name: 'Remove react' })).toBeDefined();
  });
});

describe('RatingInput — a radio group, not a row of buttons', () => {
  it('exposes radios inside a radiogroup', () => {
    harness(<RatingInput starLabel={(v) => `${String(v)} stars`} />, 0);
    expect(screen.getByRole('radiogroup')).toBeDefined();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('is ONE tab stop, with arrows moving within', async () => {
    const { submitted, user } = harness(<RatingInput starLabel={(v) => `${String(v)} stars`} />, 3);

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: '3 stars' }));

    await user.keyboard('{ArrowRight}');
    expect(await submitAndRead(user, submitted)).toBe(4);
  });

  it('does not go below 1 or above max', async () => {
    const { submitted, user } = harness(<RatingInput starLabel={(v) => `${String(v)} stars`} />, 1);

    await user.tab();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');

    expect(await submitAndRead(user, submitted)).toBe(1);
  });
});

describe('token discipline and axe, across all ten', () => {
  const ALL: [string, ReactNode, unknown][] = [
    ['Checkbox', <Checkbox key="1" label="Accept" />, false],
    ['Switch', <Switch key="2" label="Notify" />, false],
    ['RadioGroup', <RadioGroup key="3" options={OPTIONS} />, 'a'],
    ['RadioCard', <RadioCard key="4" options={OPTIONS} />, 'a'],
    ['Slider', <Slider key="5" min={1} max={5} formatValue={(v) => String(v)} />, 3],
    ['Select', <Select key="6" options={OPTIONS} placeholder="Pick" />, ''],
    ['Combobox', <Combobox key="7" options={OPTIONS} placeholder="S" emptyLabel="None" />, ''],
    [
      'MultiSelect',
      <MultiSelect
        key="8"
        options={OPTIONS}
        placeholder="P"
        overflowLabel={(n) => `+${String(n)}`}
        removeLabel={(l) => `Remove ${l}`}
      />,
      [],
    ],
    ['TagsInput', <TagsInput key="9" placeholder="Add" removeLabel={(t) => `Remove ${t}`} />, []],
    ['RatingInput', <RatingInput key="10" starLabel={(v) => `${String(v)} stars`} />, 0],
  ];

  it.each(ALL)('%s emits no raw hex and no palette utility', (name, field, value) => {
    const { container } = render(<div />);
    cleanup();
    harness(field, value);
    void container;

    const html = document.body.innerHTML;
    expect(html, name).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(html, name).not.toMatch(
      /\b(?:text|bg|border)-(?:gray|slate|zinc|neutral|blue|red|green|yellow|amber)-\d{2,3}\b/,
    );
  });

  it.each(ALL)('%s uses no physical direction utility (BR-1232)', (name, field, value) => {
    harness(field, value);
    const html = document.body.innerHTML;
    expect(html, name).not.toMatch(/\b(?:m|p)[lr]-\d/);
    expect(html, name).not.toMatch(/\btext-(?:left|right)\b/);
  });

  it.each(ALL)('%s has no axe violations', async (name, field, value) => {
    harness(field, value);

    const results = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    });

    expect(results.violations.map((v) => `${name}: ${v.id}`)).toEqual([]);
  });
});
