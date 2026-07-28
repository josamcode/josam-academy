import { node } from '@josam/config/eslint/node';

export default node(import.meta.dirname, {
  // prisma.config.ts sits at the package root and cannot join tsconfig's `include` without
  // breaking `rootDir: src`. It is still linted — just against the default project.
  allowDefaultProject: ['prisma.config.ts'],
});
