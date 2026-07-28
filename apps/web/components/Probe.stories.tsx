import type { Meta, StoryObj } from '@storybook/nextjs-vite';

function Probe({ label }: { label: string }) {
  return <button type="button">{label}</button>;
}

const meta = { component: Probe } satisfies Meta<typeof Probe>;
export default meta;

export const Default: StoryObj<typeof meta> = { args: { label: 'probe' } };
