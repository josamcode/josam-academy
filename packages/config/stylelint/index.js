/**
 * Shared Stylelint configuration, and the CSS fitness functions (PH-0.16, `12 §19`).
 *
 * Every rule here was proven at PH-0.16 by writing the violation, watching it fail, and removing
 * it. `BR-1725` — untested enforcement is not enforcement.
 *
 * `packages/tokens/dist/**` is ignored: it is generated, and it is the one place raw hex values
 * are legitimate. That is the definition of the token layer.
 *
 * @type {import("stylelint").Config}
 */
export default {
  extends: ['stylelint-config-standard'],

  ignoreFiles: ['**/dist/**', '**/.next/**', '**/storybook-static/**', '**/node_modules/**'],

  rules: {
    /**
     * BR-1220 / BR-1342 / BR-545 — a raw colour in a component fails the build. Semantic tokens
     * only.
     *
     * `/^--/` allows `var(--accent)`. Named colours are caught by the second entry because
     * `color-named` does not cover every context this does.
     */
    'declaration-property-value-disallowed-list': {
      '/^(color|background|background-color|border|border-color|border-.*-color|outline|outline-color|fill|stroke|box-shadow|text-decoration-color|caret-color)$/':
        [
          '/#[0-9a-fA-F]{3,8}/',
          '/\\brgba?\\(/',
          '/\\bhsla?\\(/',
          '/\\boklch\\(/',
          '/\\bcolor-mix\\(/',
        ],

      /** BR-1493 — `transition: all` animates properties nobody chose, including layout. */
      transition: ['/\\ball\\b/'],
      'transition-property': ['all'],
    },

    /** BR-1220 — named colours are raw colours wearing a friendlier name. */
    'color-named': 'never',

    /**
     * BR-1232 / BR-1392 / BR-527 — logical properties only. A physical property is correct in one
     * direction and wrong in the other, and the wrong one is the one nobody tests.
     */
    'property-disallowed-list': [
      '/^margin-(left|right)$/',
      '/^padding-(left|right)$/',
      '/^border-(left|right)($|-)/',
      '/^(left|right)$/',
      'float',
      'clear',
      'text-align-last',
    ],

    /** BR-1353 — `!important` is a prohibited fix (`BR-1512`). It hides a specificity problem. */
    'declaration-no-important': true,

    /** BR-1329 / BR-1317 — off-scale values. Spacing and type come from the token scale. */
    'declaration-property-unit-disallowed-list': {
      '/^(margin|padding|gap|inset|font-size)/': ['px', 'pt', 'cm', 'in'],
    },

    /**
     * MUST stay 'string'. stylelint-config-standard defaults this to 'url', and `stylelint --fix`
     * then rewrites `@import 'tailwindcss'` into `@import url('tailwindcss')`.
     *
     * Tailwind's PostCSS plugin only processes the bare form. Wrapped in `url()` it becomes an
     * ordinary CSS import that Tailwind ignores, so the build emits the token custom properties
     * and **not one utility class** — a stylesheet that looks populated and styles nothing.
     *
     * Found at PH-0.17: the pre-commit hook's own autofix had silently disabled Tailwind, and the
     * page still compiled. `apps/web/app/globals.spec.ts` now asserts the emitted stylesheet
     * actually contains utilities, so this cannot recur quietly.
     */
    'import-notation': 'string',

    /**
     * MUST stay 'prefix'. The default rewrites `@media (min-width: 640px)` into
     * `@media (width >= 640px)`.
     *
     * That is valid modern CSS and unsupported on Safari below 16.4 and Chrome below 104, where
     * the query simply never matches — so the responsive layout silently collapses to its base
     * case on exactly the older devices this audience is most likely to be using. No error, no
     * warning, nothing in the build.
     *
     * Same shape as `import-notation` above, found by auditing the rest of the --fix chain after
     * that one (`BR-1834`).
     */
    'media-feature-range-notation': 'prefix',

    /**
     * Tailwind 4 is CSS-first: its configuration lives in at-rules, not in a JS config file.
     * Stylelint does not know them, and an unknown-at-rule error on `@theme` would push someone
     * toward deleting the line rather than the rule.
     */
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'theme',
          'source',
          'utility',
          'variant',
          'custom-variant',
          'apply',
          'plugin',
          'config',
          'reference',
        ],
      },
    ],

    // stylelint-config-standard defaults that fight generated files or our naming.
    'custom-property-pattern': null,
    'selector-class-pattern': null,
  },
};
