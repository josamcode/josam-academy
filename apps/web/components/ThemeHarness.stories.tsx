import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ThemeHarness } from './ThemeHarness.js';

const meta = {
  component: ThemeHarness,
  args: { heading: 'Josam Academy' },
} satisfies Meta<typeof ThemeHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * BR-1570 — the toolbars drive theme and direction, so one story covers all four combinations
 * rather than four near-duplicate stories. `ThemeHarness.spec.tsx` renders it in each.
 */
export const Default: Story = {};
