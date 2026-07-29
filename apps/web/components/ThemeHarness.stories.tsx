import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ThemeHarness } from './ThemeHarness.js';

/**
 * Copy lives in `args`. A story is a fixture, which is why `josam/no-hardcoded-strings` exempts
 * `*.stories.tsx` — the strings here are the test input, not product copy (BR-523).
 */
const meta = {
  component: ThemeHarness,
  args: {
    heading: 'Josam Academy',
    body: 'A paragraph, so the direction toggle has running text to reverse.',
    actionLabel: 'Primary action',
    statusLabels: { success: 'Success', warning: 'Warning', danger: 'Danger', info: 'Info' },
  },
} satisfies Meta<typeof ThemeHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * BR-1570 — the toolbars drive theme and direction, so one story covers all four combinations
 * rather than four near-duplicate stories. `ThemeHarness.spec.tsx` renders it in each.
 */
export const Default: Story = {};
