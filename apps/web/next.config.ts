import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // BR-923 — route groups are code-split so a learner bundle never contains admin code.
  // The enforcing check is a PH-0.16 fitness function; this only keeps the default intact.
  typedRoutes: true,

  /**
   * `BR-885` — no build step runs on the production server, so the image has to contain a
   * runnable application rather than a repository to build.
   *
   * `standalone` emits a self-contained server with only the modules actually reached, traced from
   * the entry point. The alternative is shipping the whole workspace `node_modules`, which in a
   * pnpm monorepo is a tree of symlinks into paths that do not exist inside the container — an
   * image that builds and then fails to start.
   *
   * **Opt-in rather than always on.** Tracing writes symlinks, and Windows refuses to create them
   * without Developer Mode or an elevated shell: turning this on unconditionally broke
   * `pnpm build` on the founder's own machine with `EPERM: operation not permitted, symlink`.
   * A local build that only works for some of the people who need to run it is worse than the
   * inconvenience of one environment variable.
   *
   * `apps/web/Dockerfile` sets it. If it is ever dropped there, the failure is loud rather than
   * subtle — the image `COPY` finds no `.next/standalone` and the build stops.
   */
  output: process.env['NEXT_OUTPUT_STANDALONE'] === '1' ? 'standalone' : undefined,
};

export default nextConfig;
