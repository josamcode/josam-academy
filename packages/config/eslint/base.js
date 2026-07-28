import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

/**
 * Base ESLint flat config (13 §9).
 *
 * Type-aware linting is not a preference here — it is the mechanism that enforces BR-1579
 * (`any` and `@ts-ignore` fail the build). This is also why TypeScript is held at 6.0.3
 * rather than 7.x: typescript-eslint declares `typescript: ">=4.8.4 <6.1.0"`, and on TS 7
 * the type-aware rules below would silently stop running (BR-1805).
 *
 * Boundaries, dependency-cruiser and the custom rules are PH-0.16, not here.
 *
 * @param {string} tsconfigRootDir Pass `import.meta.dirname` from the consuming workspace.
 */
export function base(tsconfigRootDir) {
  return tseslint.config(
    {
      // Build output is never linted. `.next/**` and `storybook-static/**` are here rather than
      // in apps/web because a generated artifact is not a workspace's private problem — the same
      // rule holds wherever it appears. Added at PH-0.4, when `next build` first produced output
      // and eslint dutifully reported `require()` imports inside Turbopack's own chunks.
      ignores: [
        'dist/**',
        'coverage/**',
        '.turbo/**',
        'node_modules/**',
        '.next/**',
        'storybook-static/**',
      ],
    },

    {
      // BR-1512 prohibits silencing a lint rule to get green. A disable directive that no
      // longer suppresses anything is the residue of exactly that, so it is an error.
      linterOptions: {
        reportUnusedDisableDirectives: 'error',
      },

      /**
       * tsconfigRootDir is set for EVERY file, not only the type-checked ones. The parser
       * resolves it before it looks at whether type-aware parsing is even enabled, so a plain
       * .mjs config file still fails with "multiple candidate TSConfigRootDirs are present"
       * when it cannot infer one.
       *
       * It only ever fails when eslint is invoked from a directory that is not a single
       * workspace — which `pnpm lint` never is (turbo runs `eslint .` per workspace) and
       * lint-staged always is (one root invocation, absolute paths, every workspace at once).
       * The pre-commit hook caught this at PH-0.2; `pnpm lint` could not have.
       */
      languageOptions: {
        parserOptions: { tsconfigRootDir },
      },
    },

    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,

    {
      files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      rules: {
        // BR-1579, named explicitly rather than inherited, so that a future preset change
        // cannot quietly downgrade either one.
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/ban-ts-comment': [
          'error',
          {
            'ts-ignore': true,
            'ts-nocheck': true,
            'ts-check': false,
            'ts-expect-error': 'allow-with-description',
            minimumDescriptionLength: 10,
          },
        ],
      },
    },

    {
      // Config files and scripts. They are not in any tsconfig project, so the type-aware
      // rules cannot run against them and must be switched off rather than left to error.
      files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
      extends: [tseslint.configs.disableTypeChecked],
      languageOptions: {
        /**
         * projectService must be switched off explicitly, not just left to disableTypeChecked,
         * which turns off the type-aware *rules* but leaves the parser still trying to find a
         * TSConfig for the file.
         *
         * `pnpm lint` never hits this: turbo runs `eslint .` inside each workspace, so there is
         * exactly one candidate root. lint-staged runs eslint once from the repository root with
         * absolute paths spanning every workspace, and the parser then reports
         * "multiple candidate TSConfigRootDirs are present" on files that were never meant to be
         * type-checked at all. Caught by the pre-commit hook at PH-0.2.
         */
        parserOptions: {
          projectService: false,
          project: false,
          program: null,
        },
        globals: { ...globals.node },
      },
    },

    // Must stay last: turns off every rule Prettier owns.
    prettierConfig,
  );
}
