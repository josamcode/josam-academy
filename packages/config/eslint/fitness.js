import boundaries from 'eslint-plugin-boundaries';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';

import { noHardcodedStrings } from './rules/no-hardcoded-strings.js';
import { noBlanketUseClient } from './rules/no-blanket-use-client.js';
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
    'no-blanket-use-client': noBlanketUseClient,
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
      {
        /**
         * BR-1544 / BR-1347 — `disabled?: boolean` on its own.
         *
         * A bare optional boolean says a control can be disabled and says nothing about the user
         * being told why. That is not a style preference: a disabled control is removed from the
         * keyboard and from the accessibility tree, so a screen-reader user meets a value they
         * cannot reach and no explanation of what would make it reachable.
         *
         * It was the shape of nineteen of twenty-four fields for twenty-two tasks, while
         * `BR-1347` sat in the specification the whole time and `Button` had enforced it since
         * `PH-0.20`. "Always pass a reason" is a rule people follow until the afternoon they are
         * in a hurry; a type they cannot write incorrectly is not.
         *
         * The fix is `Availability` (a field) or `OptionAvailability` (one option) from
         * `@josam/ui`'s `form/availability.ts`, or `DisabledState` for a control that is not a
         * field. All three are discriminated unions, so `disabled: true` without its reason is
         * TS2322 at the call site rather than a review comment nobody makes.
         *
         * The selector matches only the BARE optional boolean. The union arms declare `disabled`
         * as the literal `true` or `false`, which are `TSLiteralType` nodes and do not match, so
         * the unions themselves are unaffected.
         */
        selector:
          "TSPropertySignature[key.name='disabled'][optional=true] > TSTypeAnnotation > TSBooleanKeyword",
        message:
          'BR-1544/BR-1347: `disabled?: boolean` alone cannot require a reason. Use Availability, ' +
          'OptionAvailability or DisabledState so `disabled: true` without `disabledReason` is a type error.',
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
 *
 * `seeds/` joins `probes/` on the ignore list at `PH-1.1`. Both are CLI entry points invoked by a
 * human or a deploy step, never by a request: there is no correlation ID to attach and no log
 * pipeline running. Their stdout IS their interface — `seed: 5 system roles present` is the
 * result, not a debug line. This is a narrow extension of an existing exemption to the same kind
 * of file, not a rule loosened to get a build green (`BR-1512`).
 */
export const noConsole = {
  files: ['**/*.ts', '**/*.tsx'],
  ignores: [
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/probes/**',
    '**/seeds/**',
    '**/build-css.ts',
    '**/main.ts',
  ],
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }],
  },
};

/**
 * `BR-1469` / `BR-1471` — accessibility rules that only mean something once JSX exists, which is
 * why they activate at `PH-0.17` with the primitives rather than at `PH-0.16` (`BR-1833`).
 *
 * `BR-1469` — a clickable non-semantic element is a button that cannot be reached by keyboard and
 * is invisible to assistive technology.
 * `BR-1471` — an icon button with no accessible name is announced as "button", which tells a
 * screen-reader user nothing at all.
 */
export const accessibility = {
  files: ['**/*.tsx'],
  ...jsxA11y.flatConfigs.recommended,
  rules: {
    ...jsxA11y.flatConfigs.recommended.rules,
    // Raised from the recommended defaults: both are the ones 12 §19 names explicitly.
    'jsx-a11y/no-static-element-interactions': 'error',
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/control-has-associated-label': 'error',
  },
};

/**
 * `control-has-associated-label` is switched off for the field **bodies** only.
 *
 * This is scoping with a reason, not silencing. In this architecture `FormField` owns the
 * `<label htmlFor>` and each field body owns the control carrying the matching `id` — so the
 * association is real at runtime and structurally invisible to a rule that reads one JSX tree at
 * a time. Left on, it fires on every field component in the library and on nothing else.
 *
 * The compensating controls are **stronger than the rule**, which is the only reason this is
 * acceptable:
 *   - `useFormField()` throws outside a `FormField`, so a control with no label wiring cannot
 *     render at all (`BR-1402`).
 *   - Every field spec locates its control with `getByLabelText`, which resolves through the
 *     accessibility tree and fails outright if `htmlFor`/`id` do not match.
 *   - axe runs over every rendered field in four theme/direction combinations.
 *
 * The rule stays ON everywhere else, including `apps/web`, where a label and its control do live
 * in the same tree.
 */
/**
 * `BR-1502`, scoped to the route tree.
 *
 * Its own rule name, so scoping it touches nothing else. Putting the selector in the shared
 * `no-restricted-syntax` array and disabling that rule outside `apps/web/app` would have switched
 * off `BR-855`, `BR-1429` and `BR-1544` across `packages/**` at the same time — ESLint replaces a
 * rule's options rather than merging them (`SB-16`).
 */
export const clientDirectiveScoping = {
  //
  // `**/app/**` rather than `apps/web/app/**`: a flat-config `files` pattern resolves against the
  // config file's own directory, and this config is loaded from BOTH the repository root
  // (`lint:hook`) and from inside `apps/web` (`turbo run lint`). The absolute-looking pattern
  // matched only the first, so the rule existed on one lint path and not the other — the SB-15
  // asymmetry again. `apps/web` is the only workspace with a Next `app/` directory.
  files: ['**/app/**/*.tsx', '**/app/**/*.ts'],
  // The plugin must be declared in a config object that MATCHES the file. `prismaContainment`
  // registers it for `**/*.ts` only, so without this line the rule silently does not exist for
  // `.tsx` — which is every file in the route tree. Caught by fitness case 39 reporting NOT
  // CAUGHT, which is the whole reason the case exists (`BR-1830`).
  plugins: { josam: josamPlugin },
  rules: {
    'josam/no-blanket-use-client': 'error',
  },
};

export const fieldLabelScoping = {
  files: ['packages/ui/src/fields/**/*.tsx', '**/src/fields/**/*.tsx'],
  rules: {
    'jsx-a11y/control-has-associated-label': 'off',
  },
};

/**
 * The Rules of Hooks.
 *
 * Activated at `PH-0.24`, the first task with enough JSX for the rule to have anything to say —
 * and it immediately found real violations: hooks called inside a React Hook Form `Controller`
 * `render` prop. That code *appears* to work, because the render prop is invoked inside
 * `Controller`'s own body and the hook order stays stable while the call is unconditional. It is
 * one early return away from a corrupted hook sequence, and nothing else in the toolchain sees it.
 *
 * `exhaustive-deps` is an error, not a warning. A stale closure over a dependency the linter can
 * see is a bug that reproduces once in twenty runs and is attributed to something else.
 */
export const reactHooksRules = {
  files: ['**/*.tsx'],
  plugins: { 'react-hooks': reactHooks },
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
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
  accessibility,
  clientDirectiveScoping,
  fieldLabelScoping,
  reactHooksRules,
  noHardcodedStringsConfig,
];
