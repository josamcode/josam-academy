import { JSDOM } from 'jsdom';
import { ArrowRight } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';

import { Button, type ButtonVariant, IconButton } from './Button.js';

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];
const COMBINATIONS = [
  { theme: 'dark', locale: 'ar', dir: 'rtl' },
  { theme: 'dark', locale: 'en', dir: 'ltr' },
  { theme: 'light', locale: 'ar', dir: 'rtl' },
  { theme: 'light', locale: 'en', dir: 'ltr' },
] as const;

function doc(markup: string, theme: string, locale: string, dir: string): JSDOM {
  return new JSDOM(
    `<!doctype html><html lang="${locale}" dir="${dir}" data-theme="${theme}"><head><title>S</title></head><body><div id="storybook-root">${markup}</div></body></html>`,
    { runScripts: 'dangerously' },
  );
}

describe('BR-1346 — the five interaction states are each expressed', () => {
  it('default is enabled, not busy', () => {
    const m = renderToStaticMarkup(<Button>Go</Button>);
    expect(m).toContain('aria-busy="false"');
    expect(m).not.toContain('disabled=""');
  });

  it('hover, focus-visible and active are distinct classes, not one shared style', () => {
    const m = renderToStaticMarkup(<Button variant="primary">Go</Button>);
    expect(m).toContain('hover:bg-accent-hover');
    expect(m).toContain('active:bg-accent-pressed');
    expect(m).toContain('focus-visible:ring-2');
  });

  it('uses focus-visible, never focus — a mouse user must not get a ring', () => {
    const m = renderToStaticMarkup(<Button>Go</Button>);
    expect(m).not.toMatch(/(?<!-)\bfocus:ring/);
  });

  it('disabled is genuinely disabled and looks it', () => {
    const m = renderToStaticMarkup(
      <Button disabled disabledReason="Finish the previous lesson">
        Go
      </Button>,
    );
    expect(m).toContain('disabled=""');
    expect(m).toContain('aria-disabled="true"');
    expect(m).toContain('disabled:opacity-50');
  });

  it('loading is busy AND disabled — the second click must not reach the handler', () => {
    const m = renderToStaticMarkup(<Button isLoading>Go</Button>);
    expect(m).toContain('aria-busy="true"');
    expect(m).toContain('disabled=""');
  });
});

describe('BR-1347 — a disabled control explains why', () => {
  it('surfaces the reason on the control', () => {
    const m = renderToStaticMarkup(
      <Button disabled disabledReason="Your plan does not include this course">
        Enrol
      </Button>,
    );
    expect(m).toContain('title="Your plan does not include this course"');
  });

  it('does not invent a reason when the control is enabled', () => {
    expect(renderToStaticMarkup(<Button>Enrol</Button>)).not.toContain('title=');
  });
});

describe('BR-1469 / BR-1471 — semantics and accessible names', () => {
  it('renders a real <button>, never a clickable div', () => {
    expect(renderToStaticMarkup(<Button>Go</Button>)).toMatch(/^<button/);
  });

  it('defaults to type="button" so it cannot submit a form by accident', () => {
    expect(renderToStaticMarkup(<Button>Go</Button>)).toContain('type="button"');
  });

  it('IconButton always carries an accessible name', () => {
    const m = renderToStaticMarkup(<IconButton icon={ArrowRight} label="Next lesson" />);
    expect(m).toContain('aria-label="Next lesson"');
  });

  it('IconButton hides the glyph itself from assistive technology', () => {
    // The button is named; the icon inside must not be announced a second time.
    expect(renderToStaticMarkup(<IconButton icon={ArrowRight} label="Next" />)).toContain(
      'aria-hidden="true"',
    );
  });

  it('mirrors a directional icon only when asked (BR-1233)', () => {
    expect(renderToStaticMarkup(<IconButton icon={ArrowRight} label="Next" flip />)).toContain(
      'rtl:-scale-x-100',
    );
    expect(renderToStaticMarkup(<IconButton icon={ArrowRight} label="Next" />)).not.toContain(
      'rtl:-scale-x-100',
    );
  });
});

describe('BR-1217 / BR-1344 — colour meaning is not diluted', () => {
  it('only the primary variant uses the accent', () => {
    expect(renderToStaticMarkup(<Button variant="primary">x</Button>)).toContain('bg-accent');
    for (const variant of ['secondary', 'ghost'] as const) {
      expect(renderToStaticMarkup(<Button variant={variant}>x</Button>)).not.toContain(
        'bg-accent ',
      );
    }
  });

  it('only the danger variant uses red', () => {
    expect(renderToStaticMarkup(<Button variant="danger">x</Button>)).toContain('bg-danger');
    expect(renderToStaticMarkup(<Button variant="primary">x</Button>)).not.toContain('bg-danger');
  });

  it('primary pairs the accent with accent-contrast, which clears 4.5:1 (SB-18)', () => {
    const m = renderToStaticMarkup(<Button variant="primary">x</Button>);
    expect(m).toContain('bg-accent');
    expect(m).toContain('text-accent-contrast');
  });
});

describe('token discipline', () => {
  it.each(VARIANTS)('%s emits no raw hex and no palette utility', (variant) => {
    const m = renderToStaticMarkup(<Button variant={variant}>x</Button>);
    expect(m).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(m).not.toMatch(
      /\b(?:text|bg|border)-(?:gray|slate|zinc|neutral|blue|red|green|yellow|amber)-\d{2,3}\b/,
    );
  });

  it('uses no physical direction utility (BR-1232)', () => {
    const m = renderToStaticMarkup(<Button>x</Button>);
    expect(m).not.toMatch(/\b(?:m|p)[lr]-\d/);
  });
});

describe('BR-1570 / BR-1571 — every state, both themes, both directions, axe clean', () => {
  const SPECIMENS: [string, string][] = [
    ['default', renderToStaticMarkup(<Button variant="primary">Continue</Button>)],
    ['loading', renderToStaticMarkup(<Button isLoading>Saving</Button>)],
    [
      'disabled',
      renderToStaticMarkup(
        <Button disabled disabledReason="Finish the previous lesson">
          Continue
        </Button>,
      ),
    ],
    ['icon', renderToStaticMarkup(<IconButton icon={ArrowRight} label="Next lesson" flip />)],
    [
      'icon-disabled',
      renderToStaticMarkup(
        <IconButton icon={ArrowRight} label="Next" disabled disabledReason="No next lesson" />,
      ),
    ],
  ];

  let axeSource: string;
  beforeAll(async () => {
    const axe = await import('axe-core');
    axeSource = (axe as unknown as { source: string }).source;
  });

  it.each(SPECIMENS.flatMap(([name, markup]) => COMBINATIONS.map((c) => ({ name, markup, ...c }))))(
    '$name in $theme / $locale',
    async ({ markup, theme, locale, dir }) => {
      const { window } = doc(markup, theme, locale, dir);
      window.eval(axeSource);
      const root = window.document.getElementById('storybook-root');

      const results = await (
        window as unknown as {
          axe: { run: (c: unknown, o: unknown) => Promise<{ violations: unknown[] }> };
        }
      ).axe.run(root, { rules: { 'color-contrast': { enabled: false } } });

      expect(results.violations).toEqual([]);
    },
  );
});
