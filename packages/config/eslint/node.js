import globals from 'globals';
import { base } from './base.js';

/**
 * ESLint config for Node runtime workspaces — apps/api (NestJS).
 *
 * @param {string} tsconfigRootDir Pass `import.meta.dirname` from the consuming workspace.
 * @param {{allowDefaultProject?: string[]}} [options] Forwarded to base().
 */
export function node(tsconfigRootDir, options = {}) {
  return [
    ...base(tsconfigRootDir, options),
    {
      files: ['**/*.ts'],
      languageOptions: {
        globals: { ...globals.node },
      },
      rules: {
        /**
         * GUARD — do not remove. Companion to packages/config/tsconfig/node.json.
         *
         * consistent-type-imports rewrites `import { SomeService }` to
         * `import type { SomeService }` whenever the binding is only referenced in a type
         * position — which is exactly what a NestJS constructor parameter looks like:
         *
         *     constructor(private readonly svc: SomeService) {}
         *
         * A `import type` specifier is erased unconditionally, so emitDecoratorMetadata
         * writes `Object` into design:paramtypes instead of the class. Nest then has no DI
         * token: lint passes, typecheck passes, and the API dies on boot with
         * "Nest can't resolve dependencies of ...".
         *
         * It is `off` here rather than merely absent so that switching it on in base.js
         * cannot reach apps/api by accident. If this ever needs to be enabled, it must be
         * scoped to workspaces with no decorator metadata.
         */
        '@typescript-eslint/consistent-type-imports': 'off',
      },
    },
  ];
}
