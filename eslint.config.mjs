import { base } from '@josam/config/eslint/base';

/**
 * Root config — covers the repository-level config files only. Each workspace has its own
 * eslint.config.mjs and `pnpm lint` runs them through turbo, per workspace.
 */
export default base(import.meta.dirname);
