import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    // Guarded internally, so this is a no-op in the node-environment specs.
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.spec.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**'],
  },
});
