/**
 * `BR-1502` — Server and Client Components are separated deliberately. A blanket `"use client"`
 * is prohibited.
 *
 * ## Why this is a custom rule and not another `no-restricted-syntax` selector
 *
 * The selector is trivial — a string-literal expression statement at the top of a Program. The
 * problem is **scope**. The prohibition applies to the route tree (`apps/web/app/**`), where the
 * directive opts a route and everything below it out of server rendering; it does not apply to
 * `packages/ui`, where twenty components carry it correctly because they hold state and handlers.
 *
 * Adding it to the shared `no-restricted-syntax` array and switching that rule off elsewhere would
 * have disabled `BR-855`, `BR-1429` and `BR-1544` across the whole UI package at the same time,
 * because ESLint **replaces** a rule's options rather than merging them (`SB-16`, `PH-0.16`). That
 * is the exact failure that left three fitness functions silently dead. A rule with its own name
 * can be scoped without touching anything else.
 *
 * Activated at `PH-0.30`. Row 17 of `12 §19` had been waiting for a client component to exist.
 * Twenty do, and the row had no owning task.
 */

/** @type {import('eslint').Rule.RuleModule} */
export const noBlanketUseClient = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'BR-1502 — a route-tree file must not opt itself and its subtree out of server rendering.',
    },
    schema: [],
    messages: {
      blanket:
        'BR-1502: "use client" here opts this route and every component below it out of server ' +
        'rendering. Move the interactive part into its own component that declares the boundary.',
    },
  },

  create(context) {
    return {
      Program(node) {
        for (const statement of node.body) {
          // Directives are only directives while they are the leading string-literal statements;
          // anything after real code is just an expression and Next ignores it.
          if (
            statement.type !== 'ExpressionStatement' ||
            statement.expression.type !== 'Literal' ||
            typeof statement.expression.value !== 'string'
          ) {
            return;
          }
          if (statement.expression.value === 'use client') {
            context.report({ node: statement, messageId: 'blanket' });
            return;
          }
        }
      },
    };
  },
};
