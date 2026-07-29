/**
 * `BR-1580` / `BR-897` — Prisma is confined to repositories. It never appears in a service or a
 * controller.
 *
 * A custom rule rather than `no-restricted-imports` for two reasons, both found the hard way at
 * PH-0.16:
 *
 *   1. The generated client is reached by relative path — `../../generated/prisma/client.js`.
 *      `no-restricted-imports` matches `group` patterns with minimatch, and `**` does not cross a
 *      leading `..`, so no glob catches it. A real violation went unflagged.
 *   2. `no-restricted-syntax` would work, but ESLint merges flat configs by REPLACING a rule's
 *      options. Adding a second `no-restricted-syntax` block silently deletes the selectors in
 *      the first — which is exactly how the BR-855 rule was lost earlier in this same task. A
 *      distinct rule name cannot collide with anything.
 *
 * Allowed only under `shared/database/` (the repository layer) and `probes/`, which exercise the
 * compiled artifact end to end and must be able to reach the real client.
 */

const PRISMA_SOURCE = /(?:^|[/\\])generated[/\\]prisma(?:[/\\]|$)|^@prisma[/\\]/;

const ALLOWED_PATH = /[/\\](?:shared[/\\]database|probes)[/\\]/;

/** @type {import('eslint').Rule.RuleModule} */
export const noPrismaOutsideRepository = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Confine Prisma and the generated client to the repository layer (BR-1580).',
    },
    schema: [],
    messages: {
      leaked:
        'BR-1580: Prisma is confined to shared/database. Importing "{{ source }}" here moves persistence into the domain — go through a repository.',
    },
  },

  create(context) {
    const filename = context.filename.replace(/\\/g, '/');
    if (ALLOWED_PATH.test(`/${filename}/`)) return {};

    /** @param {{ source: { value: unknown } }} node */
    const check = (node) => {
      const source = node.source.value;
      if (typeof source !== 'string') return;
      if (!PRISMA_SOURCE.test(source)) return;

      context.report({
        node: /** @type {never} */ (node.source),
        messageId: 'leaked',
        data: { source },
      });
    };

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: (node) => {
        if (node.source) check(/** @type {never} */ (node));
      },
      ExportAllDeclaration: check,
    };
  },
};
