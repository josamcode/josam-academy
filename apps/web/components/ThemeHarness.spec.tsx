import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';

import { directionOf, type Locale } from '@josam/i18n';

import { ThemeHarness, type ThemeHarnessProps } from './ThemeHarness.js';

/** Mirrors the story's `args`. Copy in a spec is fixture data, not product copy (BR-523). */
const HARNESS_ARGS: ThemeHarnessProps = {
  heading: 'Josam Academy',
  body: 'A paragraph, so the direction toggle has running text to reverse.',
  actionLabel: 'Primary action',
  statusLabels: { success: 'Success', warning: 'Warning', danger: 'Danger', info: 'Info' },
};

/**
 * BR-1570 — every story renders in both themes and both directions.
 * BR-1571 — accessibility checks run on every story (axe).
 *
 * The four combinations are rendered here rather than asserted from a screenshot, so the check
 * runs in `pnpm test` on every machine and in CI without a browser. `PH-0.10` adds the
 * Storybook test-runner pass over the built static site; this is the part that can run now.
 */
const COMBINATIONS: { theme: 'dark' | 'light'; locale: Locale }[] = [
  { theme: 'dark', locale: 'ar' },
  { theme: 'dark', locale: 'en' },
  { theme: 'light', locale: 'ar' },
  { theme: 'light', locale: 'en' },
];

/** Mirrors what `.storybook/preview.ts`'s decorator does to the document root. */
function documentFor(theme: string, locale: Locale): JSDOM {
  const markup = renderToStaticMarkup(<ThemeHarness {...HARNESS_ARGS} />);
  return new JSDOM(
    `<!doctype html><html lang="${locale}" dir="${directionOf(locale)}" data-theme="${theme}"><head><title>Story</title></head><body><div id="storybook-root">${markup}</div></body></html>`,
    // Required for `window.eval` to define anything on the window, which is how axe is loaded
    // below. Without it the eval silently does nothing and `window.axe` is undefined.
    { runScripts: 'dangerously' },
  );
}

describe.each(COMBINATIONS)('BR-1570 — renders in $theme / $locale', ({ theme, locale }) => {
  it('sets the theme and the direction on the document root', () => {
    const { window } = documentFor(theme, locale);
    const root = window.document.documentElement;

    expect(root.getAttribute('data-theme')).toBe(theme);
    expect(root.getAttribute('lang')).toBe(locale);
    expect(root.getAttribute('dir')).toBe(directionOf(locale));
  });

  it('renders its content', () => {
    const { window } = documentFor(theme, locale);
    expect(window.document.querySelector('h1')?.textContent).toBe('Josam Academy');
    expect(window.document.querySelectorAll('button')).toHaveLength(1);
  });

  it('uses only token utilities — no hex, no palette class (BR-1220, BR-1342)', () => {
    const markup = renderToStaticMarkup(<ThemeHarness {...HARNESS_ARGS} />);
    expect(markup).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(markup).not.toMatch(/\b(?:text|bg|border)-(?:gray|slate|zinc|blue|red|green)-\d{2,3}\b/);
  });
});

describe('BR-1571 — axe runs against every combination', () => {
  let axeSource: string;

  beforeAll(async () => {
    const axe = await import('axe-core');
    axeSource = (axe as unknown as { source: string }).source;
  });

  it.each(COMBINATIONS)('$theme / $locale has no axe violations', async ({ theme, locale }) => {
    const dom = documentFor(theme, locale);
    const { window } = dom;

    // axe needs a live DOM, so it is injected into the jsdom window and run there. This is the
    // real engine the Storybook a11y addon uses, not an approximation of it.
    window.eval(axeSource);

    // Scoped to the story root, which is what the Storybook a11y addon checks. Running against
    // the whole document would report page-level rules (document-title, landmark structure) that
    // belong to the page a component is placed on, not to the component.
    const root = window.document.getElementById('storybook-root');
    expect(root).not.toBeNull();

    const results = await (
      window as unknown as {
        axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: unknown[] }> };
      }
    ).axe.run(root, {
      // Colour contrast cannot be judged here: jsdom does not apply the stylesheet, so every
      // element would report as black-on-transparent. Contrast is covered where it can actually
      // be measured — packages/tokens/src/color.spec.ts, against the real hex values.
      rules: { 'color-contrast': { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });

  it('is running the real axe engine, not a stub', async () => {
    const axe = await import('axe-core');
    expect((axe as unknown as { source: string }).source).toContain('axe');
    expect(typeof (axe as unknown as { version: string }).version).toBe('string');
  });
});
