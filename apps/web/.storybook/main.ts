import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  stories: [
    '../components/**/*.stories.@(ts|tsx)',
    // packages/ui is where the design system lives (BR-1524). Storybook is its contract surface
    // (DEC-42), so the stories are read from the package rather than mirrored into the app.
    '../../../packages/ui/src/**/*.stories.@(ts|tsx)',
  ],
  addons: ['@storybook/addon-a11y'],
  framework: { name: '@storybook/nextjs-vite', options: {} },
};

export default config;
