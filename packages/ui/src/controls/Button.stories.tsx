import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ArrowRight, Trash2 } from 'lucide-react';

import { Inline, Stack } from '../primitives/layout.js';
import { Text } from '../primitives/Text.js';
import { Button, IconButton } from './Button.js';

/**
 * `BR-1346` — the five interaction states, each visually distinct: default, hover, focus-visible,
 * active, disabled — plus loading.
 *
 * Keyboard map (`BR-1531`):
 *   Tab / Shift+Tab   move focus; the ring appears only for keyboard focus (`focus-visible`)
 *   Enter / Space     activate
 *   disabled/loading  not focusable, not activatable — the click never reaches the handler
 *
 * Hover and active cannot be screenshotted from a static story, so they are listed here and
 * exercised by pointing at the buttons below. Everything else is a rendered state.
 */
const meta = {
  component: Button,
  args: { children: 'Continue' },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <Inline gap="3" wrap>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Delete</Button>
    </Inline>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Inline gap="3" align="center">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </Inline>
  ),
};

/** The five states, side by side, so a regression in any one is visible at a glance. */
export const States: Story = {
  render: () => (
    <Stack gap="4">
      <Inline gap="3" wrap>
        <Button variant="primary">Default</Button>
        <Button variant="primary" isLoading>
          Loading
        </Button>
        <Button variant="primary" disabled disabledReason="Complete the previous lesson first">
          Disabled
        </Button>
      </Inline>
      <Text size="sm" tone="muted">
        Hover and active are pointer states; focus-visible appears on Tab, not on click.
      </Text>
    </Stack>
  ),
};

/** BR-1347 — the disabled reason is required by the type and surfaced on the control. */
export const DisabledExplains: Story = {
  render: () => (
    <Inline gap="3">
      <Button disabled disabledReason="Your plan does not include this course">
        Enrol
      </Button>
      <IconButton
        icon={Trash2}
        label="Delete lesson"
        variant="danger"
        disabled
        disabledReason="Published lessons cannot be deleted"
      />
    </Inline>
  ),
};

export const IconButtons: Story = {
  render: () => (
    <Inline gap="3">
      <IconButton icon={ArrowRight} label="Next lesson" flip />
      <IconButton icon={ArrowRight} label="Next lesson" flip variant="primary" />
      <IconButton icon={Trash2} label="Delete" variant="danger" />
      <IconButton icon={ArrowRight} label="Loading" isLoading />
    </Inline>
  ),
};
