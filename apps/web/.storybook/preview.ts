import type { Preview } from '@storybook/nextjs-vite';

const preview: Preview = {
  parameters: { a11y: { test: 'error' } },
};

export default preview;
