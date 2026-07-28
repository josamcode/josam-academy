/**
 * Shared Prettier configuration (13 §9).
 *
 * Tailwind class sorting (prettier-plugin-tailwindcss) is deliberately NOT here: the plugin
 * resolves `tailwindcss` at load time and Tailwind is not installed until PH-0.14. It is
 * added there, with the Tailwind pin.
 *
 * @type {import("prettier").Config}
 */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  arrowParens: 'always',
  bracketSpacing: true,

  // Pairs with .gitattributes, which forces LF in the repository and the working tree.
  endOfLine: 'lf',
};
