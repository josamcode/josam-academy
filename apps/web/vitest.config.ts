import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Component tests need a JSX transform; the default pipeline has none, so importing any .tsx
 * fails to parse. Added at PH-0.15 for the Storybook harness spec, and required by every
 * component task from PH-0.17 onward.
 *
 * `environment` stays `node`: the specs construct their own JSDOM per combination, because each
 * one needs a *separate* document with its own `data-theme` and `dir` on the root. A single
 * shared global document would let one combination's attributes leak into the next.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['**/*.spec.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', 'storybook-static/**'],
  },
});
