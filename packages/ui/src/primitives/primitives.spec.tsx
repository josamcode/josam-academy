import { JSDOM } from 'jsdom';
import { ArrowRight, Check } from 'lucide-react';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';

import { Box, Grid, Inline, Stack, Surface } from './layout.js';
import { Heading } from './Heading.js';
import { Icon } from './Icon.js';
import { Text } from './Text.js';

/**
 * BR-1570 — every primitive renders in both themes and both directions.
 * BR-1571 — axe runs against every one, in every combination.
 *
 * One harness over all eight rather than eight near-identical files: the combinations are the
 * same, and duplicating them is how one of them quietly stops being checked.
 */
const COMBINATIONS = [
  { theme: 'dark', locale: 'ar', dir: 'rtl' },
  { theme: 'dark', locale: 'en', dir: 'ltr' },
  { theme: 'light', locale: 'ar', dir: 'rtl' },
  { theme: 'light', locale: 'en', dir: 'ltr' },
] as const;

/** Every primitive, exercised the way the stories exercise them. */
const SPECIMENS: [string, ReactElement][] = [
  ['Text', <Text tone="secondary">text</Text>],
  ['Heading', <Heading level={2}>heading</Heading>],
  [
    'Stack',
    <Stack gap="4">
      <Text>a</Text>
      <Text>b</Text>
    </Stack>,
  ],
  [
    'Inline',
    <Inline gap="2">
      <Text>a</Text>
      <Text>b</Text>
    </Inline>,
  ],
  [
    'Grid',
    <Grid columns={3} gap="4">
      <Text>a</Text>
    </Grid>,
  ],
  [
    'Box',
    <Box padding="4" radius="md">
      <Text>boxed</Text>
    </Box>,
  ],
  [
    'Surface',
    <Surface level="elevated" border="strong">
      <Text>surface</Text>
    </Surface>,
  ],
  ['Icon', <Icon icon={ArrowRight} flip label="Next" />],
];

function documentFor(markup: string, theme: string, locale: string, dir: string): JSDOM {
  return new JSDOM(
    `<!doctype html><html lang="${locale}" dir="${dir}" data-theme="${theme}"><head><title>Story</title></head><body><div id="storybook-root">${markup}</div></body></html>`,
    { runScripts: 'dangerously' },
  );
}

describe.each(SPECIMENS)('%s', (name, element) => {
  const markup = renderToStaticMarkup(element);

  it.each(COMBINATIONS)('renders in $theme / $locale', ({ theme, locale, dir }) => {
    const { window } = documentFor(markup, theme, locale, dir);
    const root = window.document.getElementById('storybook-root');

    expect(root?.innerHTML).not.toBe('');
    expect(window.document.documentElement.getAttribute('data-theme')).toBe(theme);
    expect(window.document.documentElement.getAttribute('dir')).toBe(dir);
  });

  it('emits no raw hex and no Tailwind palette utility (BR-1220, BR-1342)', () => {
    expect(markup, name).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(markup, name).not.toMatch(
      /\b(?:text|bg|border)-(?:gray|slate|zinc|neutral|stone|blue|red|green|yellow|amber)-\d{2,3}\b/,
    );
  });

  it('uses no physical direction utility (BR-1232)', () => {
    // ml-/mr-/pl-/pr-/left-/right- are correct in one direction and wrong in the other.
    expect(markup, name).not.toMatch(/\b(?:m|p)[lr]-\d/);
    expect(markup, name).not.toMatch(/\b(?:left|right)-\d/);
    expect(markup, name).not.toMatch(/\btext-(?:left|right)\b/);
  });
});

describe('BR-1571 — axe over every primitive in every combination', () => {
  let axeSource: string;

  beforeAll(async () => {
    const axe = await import('axe-core');
    axeSource = (axe as unknown as { source: string }).source;
  });

  it.each(
    SPECIMENS.flatMap(([name, element]) =>
      COMBINATIONS.map((combination) => ({ name, element, ...combination })),
    ),
  )('$name in $theme / $locale has no violations', async ({ element, theme, locale, dir }) => {
    const { window } = documentFor(renderToStaticMarkup(element), theme, locale, dir);
    window.eval(axeSource);

    const root = window.document.getElementById('storybook-root');
    const results = await (
      window as unknown as {
        axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: unknown[] }> };
      }
    ).axe.run(root, {
      // jsdom applies no stylesheet, so contrast would be measured against a transparent
      // background. It is checked where it can be measured — packages/tokens/src/color.spec.ts.
      rules: { 'color-contrast': { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});

describe('DEC-40 — the scale is closed', () => {
  it('exposes exactly the spacing steps in 12 §5', async () => {
    const { space } = await import('@josam/tokens');
    expect(Object.keys(space).sort()).toEqual(['1', '12', '16', '2', '24', '3', '4', '6', '8']);
    // 5 is not a step, so 20px is unreachable — by construction, not by review.
    expect(Object.keys(space)).not.toContain('5');
  });
});

describe('BR-1233 — directional icons mirror, others do not', () => {
  it('applies the RTL flip only when asked', () => {
    expect(renderToStaticMarkup(<Icon icon={ArrowRight} flip label="Next" />)).toContain(
      'rtl:-scale-x-100',
    );
    expect(renderToStaticMarkup(<Icon icon={Check} label="Done" />)).not.toContain(
      'rtl:-scale-x-100',
    );
  });

  it('hides a decorative icon from assistive technology and names a meaningful one', () => {
    expect(renderToStaticMarkup(<Icon icon={Check} />)).toContain('aria-hidden="true"');
    const named = renderToStaticMarkup(<Icon icon={Check} label="Done" />);
    expect(named).toContain('aria-label="Done"');
    expect(named).toContain('role="img"');
  });
});
