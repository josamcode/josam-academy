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

    // stylelint-config-standard defaults that fight generated files or our naming.
    'custom-property-pattern': null,
    'selector-class-pattern': null,
  },
};
