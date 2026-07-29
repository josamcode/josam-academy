import boundaries from 'eslint-plugin-boundaries';

import { noHardcodedStrings } from './rules/no-hardcoded-strings.js';
import { noPrismaOutsideRepository } from './rules/no-prisma-outside-repository.js';

/**
 * Fitness functions (PH-0.16, `12 §19`, `09 §enforcement`).
 *
 * Rules enforced by machines do not depend on discipline (`BR-900`). Every rule below was proven
 * at PH-0.16 by writing the violation, watching it fail, and removing it — `BR-1725` treats an
 * untested fitness function as no fitness function at all.
 */

export const josamPlugin = {
  rules: {
    'no-hardcoded-strings': noHardcodedStrings,
    'no-prisma-outside-repository': noPrismaOutsideRepository,
  },
};

/**
 * `BR-1580` / `BR-897` — Prisma is confined to repositories. It never appears in a service or a
 * controller.
 *
 * Enforced by path: everything under `shared/database` may import it, nothing else may. The
 * generated client is listed alongside the packages because `src/generated/prisma` is where
 * `prisma generate` puts it, and importing that directly would bypass a check on `@prisma/client`.
 */
export const prismaContainment = {
  files: ['**/*.ts'],
  plugins: { josam: josamPlugin },
  rules: {
    'josam/no-prisma-outside-repository': 'error',
  },
};

/**
 * `BR-1599` / `BR-899` — no vendor SDK is imported outside `shared/providers`.
 *
 * The list names the SDKs the project has actually adopted or committed to in `13 §8`. It is
 * extended by the task that adopts the next one, in the same commit — a containment rule that
 * lags the dependency it contains is worth nothing.
 */
export const vendorSdkContainment = {
  files: ['**/*.ts'],
  ignores: ['**/shared/providers/**'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@sentry/*', 'stripe', 'resend', '@aws-sdk/*', 'puppeteer-core', 'nodemailer'],
            message:
              'BR-1599: vendor SDKs live behind an interface in shared/providers. Import our provider, not the vendor.',
          },
        ],
      },
    ],
  },
};

/**
 * `BR-855` — tokens never go in `localStorage` or `sessionStorage`. Both are readable by any
 * script that reaches the page, which is the whole XSS impact story for a stolen session.
 */
export const restrictedSyntax = {
  files: ['**/*.ts', '**/*.tsx'],
  rules: {
    /**
     * Every `no-restricted-syntax` selector lives in this ONE block on purpose.
     *
     * ESLint merges flat configs by replacing a rule's options, not by concatenating them. Split
     * across two config objects, the later one silently wins and the earlier selectors stop
     * existing — which is exactly what happened at PH-0.16: the BR-855 selectors were overwritten
     * by the BR-1429 one for every `.tsx` file, and the deliberate-violation pass caught it by
     * reporting that a real `localStorage.setItem` violation went unflagged.
     *
     * A new selector is ADDED to this array. It never gets its own config object.
     */
    'no-restricted-syntax': [
      'error',
      {
        // BR-855 — web storage is readable by any script that reaches the page, which is the
        // entire impact story for a stolen session under XSS.
        selector:
          'MemberExpression[object.name=/^(localStorage|sessionStorage)$/][property.name=/^(setItem|getItem|removeItem)$/]',
        message:
          'BR-855: web storage is readable by any script on the page. Tokens go in httpOnly cookies.',
      },
      {
        selector:
          "MemberExpression[object.object.name='window'][object.property.name=/^(localStorage|sessionStorage)$/]",
        message:
          'BR-855: web storage is readable by any script on the page. Tokens go in httpOnly cookies.',
      },
      {
        // BR-1429 — an array index as a React key makes React reuse the wrong node on reorder.
        selector:
          "JSXAttribute[name.name='key'] JSXExpressionContainer > Identifier[name=/^(i|idx|index)$/]",
        message:
          'BR-1429: an array index as a key breaks reconciliation on reorder. Use a stable id.',
      },
    ],
  },
};

/**
 * `BR-1501` — `console.*` does not reach main. `PH-0.19` gave the API a structured logger; a
 * `console.log` bypasses the correlation ID, the redaction paths and the log level all at once.
 *
 * `warn` and `error` are permitted in the few places that genuinely predate the logger — a
 * bootstrap failure has nowhere else to go.
 */
export const noConsole = {
  files: ['**/*.ts', '**/*.tsx'],
  ignores: ['**/*.spec.ts', '**/*.spec.tsx', '**/probes/**', '**/build-css.ts', '**/main.ts'],
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }],
  },
};

/** `BR-523` / `BR-1357` — no hardcoded user-facing strings. */
export const noHardcodedStringsConfig = {
  files: ['**/*.tsx'],
  plugins: { josam: josamPlugin },
  rules: {
    'josam/no-hardcoded-strings': 'error',
  },
};

/**
 * `BR-901` — module import boundaries. A module never reaches into another module's internals;
 * cross-module traffic goes through the owning module's public surface (`08 §4.2`).
 *
 * Phase 0 has one module, so this configuration exists to be in place *before* the 17 modules of
 * `08 §4.1` arrive. Adding boundaries after the fact means auditing every import already written.
 */
export const moduleBoundaries = {
  files: ['**/*.ts'],
  plugins: { boundaries },
  settings: {
    /**
     * Without a resolver, boundaries cannot map our nodenext `.js` import specifiers onto the
     * `.ts` files they actually refer to. Every cross-element dependency then resolves to
     * `isUnknown: true` and the rule matches nothing — silently, with no configuration error.
     * Found at PH-0.16 by turning on `boundaries/debug` after a known violation went unflagged.
     */
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: ['apps/*/tsconfig.json', 'packages/*/tsconfig.json'],
      },
    },
    // Folder-based element types. `08 §4.1`'s tree is the source: modules/ are the domain,
    // shared/ is the infrastructure beneath them, config/ is beneath both.
    'boundaries/elements': [
      { type: 'module', pattern: 'src/modules/*', capture: ['moduleName'] },
      { type: 'shared', pattern: 'src/shared/*', capture: ['sharedName'] },
      { type: 'config', pattern: 'src/config' },
      { type: 'probe', pattern: 'src/probes' },
    ],
  },
  rules: {
    /**
     * `boundaries/dependencies` with `policies`, object selectors and `{{ }}` templates — the
     * v7 API.
     *
     * Written in the v5 form (`boundaries/element-types`, `rules`, array selectors, `${ }`) the
     * config still LOADS. ESLint reports no configuration error and the rule matches nothing.
     * Only the deliberate-violation pass at PH-0.16 revealed it: a real `shared/ -> modules/`
     * import went unflagged while the configuration looked entirely correct.
     *
     * That is the whole argument for BR-1725 in one example. A fitness function nobody has
     * watched fail is indistinguishable from one that does not work.
     */
    'boundaries/dependencies': [
      'error',
      {
        default: 'disallow',
        message:
          'BR-901: this import crosses an element boundary that is not allowed. A module reaches ' +
          'another module only through its public interface, and shared/ never reaches up into a ' +
          'module at all (08 §4.2).',
        policies: [
          // A module may use shared infrastructure and config.
          {
            from: [{ element: { type: 'module' } }],
            allow: [{ element: { type: 'shared' } }, { element: { type: 'config' } }],
          },
          // ...and its own internals, but never another module's.
          {
            from: [{ element: { type: 'module', moduleName: '{{from.moduleName}}' } }],
            allow: [{ element: { type: 'module', moduleName: '{{from.moduleName}}' } }],
          },
          // Shared infrastructure is the layer BENEATH the modules and never reaches up.
          {
            from: [{ element: { type: 'shared' } }],
            allow: [{ element: { type: 'shared' } }, { element: { type: 'config' } }],
          },
          { from: [{ element: { type: 'config' } }], allow: [{ element: { type: 'config' } }] },
          // Probes exercise the compiled artifact end to end, so they may reach anywhere.
          {
            from: [{ element: { type: 'probe' } }],
            allow: [
              { element: { type: 'module' } },
              { element: { type: 'shared' } },
              { element: { type: 'config' } },
              { element: { type: 'probe' } },
            ],
          },
        ],
      },
    ],
  },
};

/** Every fitness function, in the order a reader should meet them. */
export const fitness = [
  prismaContainment,
  vendorSdkContainment,
  restrictedSyntax,
  noConsole,
  noHardcodedStringsConfig,
];
