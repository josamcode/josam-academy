/**
 * Architectural fitness functions that ESLint cannot express (PH-0.16, `09 §enforcement`).
 *
 * ESLint sees one file at a time. A cycle and a layer inversion are properties of the graph, so
 * they need a tool that holds the whole graph.
 *
 * Every rule was proven at PH-0.16 by writing the violation, watching it fail, and removing it
 * (`BR-1725`).
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
export default {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'A cycle means neither module can be understood, tested or replaced without the other. ' +
        '09 §tier model.',
      from: {},
      to: { circular: true },
    },

    {
      name: 'no-orphans',
      severity: 'warn',
      comment:
        'A module nothing imports is either dead or a missing wire-up. Both want looking at.',
      from: {
        orphan: true,
        pathNot: [
          '\\.d\\.ts$',
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$',
          '\\.spec\\.tsx?$',
          // Tool entry points. Nothing imports a config file; a runner loads it.
          '(^|/)(eslint|prettier|stylelint|vitest|next|commitlint|lint-staged|postcss|prisma)\\.config\\.[cm]?[jt]s$',
          'apps/web/\\.storybook/',
          // Next.js routes are entry points the framework discovers, not modules anything imports.
          'apps/web/app/',
          'apps/web/components/.*\\.stories\\.tsx$',
          // Probes are executed by their own scripts. Being unimported is the point — they
          // exercise the compiled artifact rather than being pulled into a test bundle.
          'apps/api/src/probes/',
          'packages/config/',
          // packages/ui has no consumer until PH-0.17 builds the primitives. Naming it here keeps
          // the warning meaningful in the meantime, rather than training the reader to skip it.
          'packages/ui/src/index\\.ts$',
        ],
      },
      to: {},
    },

    {
      /**
       * BR-895–BR-898 as described in `09 §enforcement` ("Layer direction"). The rule text itself
       * was never authored — see SB-11 — so this encodes the description, not a quotation.
       *
       * shared/ is infrastructure. It sits beneath the modules and must not know they exist:
       * the moment shared/database imports a module, the module can no longer be removed.
       */
      name: 'shared-must-not-depend-on-modules',
      severity: 'error',
      comment: 'Layer inversion: shared infrastructure reaching upward into a domain module.',
      from: { path: '^apps/api/src/shared/' },
      to: { path: '^apps/api/src/modules/' },
    },

    {
      /** BR-1575 — packages/ui depends on no app. It is consumed by web, admin and mobile alike. */
      name: 'ui-must-not-depend-on-apps',
      severity: 'error',
      comment: 'BR-1575: packages/ui is consumed by every app and may depend on none of them.',
      from: { path: '^packages/ui/src/' },
      to: { path: '^apps/' },
    },

    {
      /** The same principle for every shared package: they are beneath the apps, not beside them. */
      name: 'packages-must-not-depend-on-apps',
      severity: 'error',
      comment: 'A shared package that imports an app cannot be shared with the other apps.',
      from: { path: '^packages/[^/]+/src/' },
      to: { path: '^apps/' },
    },

    {
      /** BR-1583 — tokens is the root of the design system and depends on nothing of ours. */
      name: 'tokens-must-not-depend-on-workspace',
      severity: 'error',
      comment:
        'BR-1583: packages/tokens is the single source for the design system. A dependency on ' +
        'another workspace package would make something else the source.',
      from: { path: '^packages/tokens/src/' },
      to: { path: '^(packages/(?!tokens)|apps/)' },
    },

    {
      name: 'no-dev-dep-in-src',
      severity: 'error',
      comment:
        'A devDependency reached at runtime is a production crash that passes every local test.',
      from: { path: '^(apps|packages)/[^/]+/src/', pathNot: '\\.spec\\.tsx?$' },
      to: { dependencyTypes: ['npm-dev'], pathNot: '^node_modules/(@types|typescript)/' },
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      path: [
        'node_modules',
        '\\.next/',
        'dist/',
        'storybook-static/',
        'src/generated/',
        '\\.spec\\.tsx?$',
      ],
    },
    // No `tsConfig` entry: this monorepo has no root tsconfig and no path aliases. Workspace
    // packages resolve through pnpm's node_modules symlinks and each package's `exports` map,
    // which enhancedResolveOptions below handles directly.
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
    },
  },
};
