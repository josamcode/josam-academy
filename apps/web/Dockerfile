# syntax=docker/dockerfile:1
#
# `apps/web` — Next.js 16, built once in CI and never on the server (`BR-885`, `BR-608`).
#
# The runtime stage copies Next's **standalone** output rather than the workspace `node_modules`.
# In a pnpm monorepo the latter is a tree of symlinks into `/repo/node_modules/.pnpm`, a path that
# does not exist inside the container — an image that builds cleanly and then fails to start.

ARG NODE_IMAGE=node:24.18.1-bookworm-slim

# ─────────────────────────────────────────────────────────────────── deps
FROM ${NODE_IMAGE} AS deps
WORKDIR /repo

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY patches ./patches
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# The Prisma schema is an INPUT TO THE INSTALL, not to the build. `apps/api`'s `postinstall` runs
# `prisma generate`, so `pnpm install` fails here without it — which is the point: the generated
# client is now a property of having installed, in this image exactly as on a laptop and in CI
# (`BR-1838`). It changes rarely, so it costs the cache almost nothing.
COPY apps/api/prisma.config.ts ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
COPY packages/config/package.json ./packages/config/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/tokens/package.json ./packages/tokens/
COPY packages/ui/package.json ./packages/ui/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

# ─────────────────────────────────────────────────────────────────── build
FROM deps AS build
WORKDIR /repo

COPY . .

# Telemetry off at build time as well as at run time: the build is the half that phones home.
ENV NEXT_TELEMETRY_DISABLED=1

# Turns on `output: 'standalone'` — see the comment in `next.config.ts`. It is opt-in because
# tracing writes symlinks, which Windows refuses without Developer Mode, and a local `pnpm build`
# has to work for everyone who runs it.
ENV NEXT_OUTPUT_STANDALONE=1

# Through turbo, so `@josam/tokens` and `@josam/ui` are built first. `next build` alone would
# compile against whatever `dist/` happened to be lying around, or nothing.
RUN pnpm turbo run build --filter=@josam/web

# ─────────────────────────────────────────────────────────────────── runtime
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# `BR-1703` — containers run as non-root.
USER node

# `.next/standalone` carries its own minimal `node_modules` and a `server.js`. `static` and
# `public` are NOT included in it — Next expects them beside the server, and omitting either
# produces a site that renders with no CSS and no images while reporting itself healthy.
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public

EXPOSE 3000

# `BR-879` — below the container limit, so the process fails with a heap error rather than being
# OOM-killed by the kernel with no diagnostic. `PH-0.9` sizes the limit against real headroom on a
# shared box (`SB-23`).
ENV NODE_OPTIONS=--max-old-space-size=896

# The standalone entry point sits at the workspace path it was traced from.
CMD ["node", "apps/web/server.js"]
