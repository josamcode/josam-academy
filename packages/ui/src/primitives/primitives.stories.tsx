import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ArrowRight, Check, Info } from 'lucide-react';

import { Box, Grid, Inline, Stack, Surface } from './layout.js';
import { Heading } from './Heading.js';
import { Icon } from './Icon.js';
import { Text } from './Text.js';

/**
 * `BR-1569` — a story per variant, per size, per state.
 * `BR-1570` — every story renders in both themes and both directions via the toolbars.
 * `BR-1571` — axe runs on every story.
 *
 * Copy here is fixture data. `josam/no-hardcoded-strings` exempts `*.stories.tsx` because a
 * story's args ARE the fixture — that is what a story is for (`BR-523`).
 *
 * Keyboard map (`BR-1531`): none of these eight primitives is interactive. They are containers
 * and text. `Button`, `IconButton` and the field components carry the keyboard contracts, from
 * `PH-0.20` onward.
 */
const meta = {
  title: 'Primitives/Overview',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every step of the type scale, so an off-scale size is visibly absent rather than merely illegal. */
export const TypeScale: Story = {
  render: () => (
    <Stack gap="3">
      <Text size="5xl">64 / 70 — 5xl</Text>
      <Text size="4xl">48 / 56 — 4xl</Text>
      <Text size="3xl">36 / 44 — 3xl</Text>
      <Text size="2xl">28 / 36 — 2xl</Text>
      <Text size="xl">22 / 30 — xl</Text>
      <Text size="lg">18 / 28 — lg</Text>
      <Text size="base">16 / 26 — base</Text>
      <Text size="sm">14 / 22 — sm</Text>
      <Text size="xs">12 / 18 — xs</Text>
      <Text size="2xs">11 / 16 — 2xs</Text>
    </Stack>
  ),
};

/** Every semantic tone. The status tones use the SB-18 `-text` tokens, which clear 4.5:1. */
export const Tones: Story = {
  render: () => (
    <Stack gap="2">
      <Text tone="primary">primary</Text>
      <Text tone="secondary">secondary</Text>
      <Text tone="muted">muted</Text>
      <Text tone="success">success</Text>
      <Text tone="warning">warning</Text>
      <Text tone="danger">danger</Text>
      <Text tone="info">info</Text>
    </Stack>
  ),
};

/** BR-1472 — levels 1 to 4. Level and size are separate props, so look never forces outline. */
export const Headings: Story = {
  render: () => (
    <Stack gap="3">
      <Heading level={1}>Level 1 — page title</Heading>
      <Heading level={2}>Level 2 — section</Heading>
      <Heading level={3}>Level 3 — subsection</Heading>
      <Heading level={4}>Level 4 — minor</Heading>
      <Heading level={2} size="sm">
        Level 2 rendered small — outline intact, appearance decoupled
      </Heading>
    </Stack>
  ),
};

/** The full spacing scale. 5 is absent from 12 §5, so there is no step between 4 and 6. */
export const Spacing: Story = {
  render: () => (
    <Stack gap="4">
      <Inline gap="1">
        <Surface padding="2">gap 1</Surface>
        <Surface padding="2">gap 1</Surface>
      </Inline>
      <Inline gap="4">
        <Surface padding="2">gap 4</Surface>
        <Surface padding="2">gap 4</Surface>
      </Inline>
      <Inline gap="8">
        <Surface padding="2">gap 8</Surface>
        <Surface padding="2">gap 8</Surface>
      </Inline>
    </Stack>
  ),
};

export const Surfaces: Story = {
  render: () => (
    <Stack gap="3">
      <Surface level="base">base</Surface>
      <Surface level="surface">surface</Surface>
      <Surface level="elevated">elevated</Surface>
      <Surface level="inset">inset</Surface>
      <Surface border="none">no border</Surface>
      <Surface border="strong">strong border</Surface>
    </Stack>
  ),
};

export const Grids: Story = {
  render: () => (
    <Grid columns={3} gap="4">
      <Surface>one</Surface>
      <Surface>two</Surface>
      <Surface>three</Surface>
    </Grid>
  ),
};

/**
 * BR-1233 — directional icons mirror; checkmarks and informational glyphs do not. `flip` is set
 * on the arrow and left off the others, so the difference is visible when the toolbar is switched
 * to Arabic.
 */
export const Icons: Story = {
  render: () => (
    <Inline gap="4">
      <Icon icon={ArrowRight} flip label="Next" />
      <Icon icon={Check} label="Done" />
      <Icon icon={Info} size="sm" label="Information" />
      <Icon icon={Info} size="lg" label="Information, large" />
      {/* No label: decorative, and correctly hidden from assistive technology. */}
      <Icon icon={Check} />
    </Inline>
  ),
};

/** Composition — every primitive at once, which is how they will actually be used. */
export const Composed: Story = {
  render: () => (
    <Surface level="elevated" padding="8" radius="lg">
      <Stack gap="4">
        <Heading level={2}>Composed</Heading>
        <Text tone="secondary">
          Primitives compose; feature components never write raw CSS (BR-1534).
        </Text>
        <Inline gap="2">
          <Icon icon={ArrowRight} flip label="Continue" />
          {/* PH-0.30 — `accent` is no longer a Text tone. It is a 3:1 boundary colour and
              measured 3.70:1 as light-theme body text. Emphasis here is weight, not brand colour. */}
          <Text size="sm" weight="medium">
            Continue
          </Text>
        </Inline>
        <Box padding="4" radius="sm">
          <Text size="xs" tone="muted">
            A Box carries spacing and shape, never colour.
          </Text>
        </Box>
      </Stack>
    </Surface>
  ),
};
