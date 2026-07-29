/**
 * `BR-523` / `BR-1357` — no user-facing string is hardcoded. Every string lives in the catalog,
 * including error messages and email subjects.
 *
 * Flags two things:
 *   1. JSX text nodes containing letters — `<p>Welcome back</p>`
 *   2. string literals passed to user-facing JSX attributes — `placeholder="Email"`
 *
 * Deliberately NOT flagged, because each would be noise rather than signal:
 *   - text with no letters (`—`, `·`, `{' '}`), which is punctuation, not copy
 *   - `className`, `id`, `data-*`, `href`, `src`, `type`, `role` and other machine-facing
 *     attributes
 *   - anything inside a `.stories.tsx` or `.spec.tsx` file. A story's `args` ARE the fixture —
 *     that is what a story is for — and a spec asserting on rendered copy has to name it.
 *
 * The rule is intentionally narrow. A rule that fires on machine strings gets disabled within a
 * week, and `BR-1512` forbids the disable, so the only stable outcome is a rule that is right.
 */

/** Attributes whose string value reaches a human. */
const USER_FACING_ATTRIBUTES = new Set([
  'alt',
  'aria-description',
  'aria-label',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'caption',
  'description',
  'heading',
  'hint',
  'label',
  'placeholder',
  'summary',
  'title',
]);

const HAS_LETTER = /\p{L}/u;

/** @type {import('eslint').Rule.RuleModule} */
export const noHardcodedStrings = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow user-facing string literals outside the i18n catalog (BR-523).',
    },
    schema: [],
    messages: {
      jsxText:
        'Hardcoded user-facing string "{{ text }}" (BR-523). Move it to packages/i18n and render it through the catalog.',
      jsxAttribute:
        'Hardcoded user-facing string in `{{ name }}` (BR-523). Move it to packages/i18n and pass the translated value.',
    },
  },

  create(context) {
    const filename = context.filename;
    if (/\.(?:stories|spec|test)\.[jt]sx?$/.test(filename)) return {};
    if (filename.includes('.storybook')) return {};

    return {
      JSXText(node) {
        const text = node.value.trim();
        if (text === '' || !HAS_LETTER.test(text)) return;

        context.report({
          node,
          messageId: 'jsxText',
          data: { text: text.length > 40 ? `${text.slice(0, 40)}…` : text },
        });
      },

      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return;

        const name = node.name.name;
        if (!USER_FACING_ATTRIBUTES.has(name)) return;

        const value = node.value;
        if (!value) return;

        // `label={t('key')}` is the correct form and must pass.
        if (value.type !== 'Literal' || typeof value.value !== 'string') return;
        if (!HAS_LETTER.test(value.value)) return;

        context.report({ node: value, messageId: 'jsxAttribute', data: { name } });
      },
    };
  },
};
