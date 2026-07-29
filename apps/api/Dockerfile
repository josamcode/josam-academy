# syntax=docker/dockerfile:1
#
# `apps/api` — NestJS, built once in CI and never on the server (`BR-885`, `BR-608`).
#
# Three stages, and the reason for three rather than two is the pnpm store: `deps` installs with
# every workspace's manifest present but no source, so a source-only change reuses the whole
# install layer. Collapsing it into `build` reinstalls the dependency tree on every commit.

# `BR-1810` — this tag is identical to `engines.node`, `.nvmrc`, `packageManager` and the CI
# matrix. Renovate may not bump it alone (`BR-1828`); only a person can change all five coherently.
ARG NODE_IMAGE=node:24.18-bookworm-slim

# ─────────────────────────────────────────────────────────────────── deps
FROM ${NODE_IMAGE} AS deps
WORKDIR /repo

RUN corepack enable

# Manifests only. Docker invalidates a layer when any COPYed file changes, so copying source here
# would defeat the cache this stage exists to create.
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

# `--frozen-lockfile` is the point of committing a lockfile: a resolution that drifts between CI
# and the image is a difference nobody can see in a diff.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

# ─────────────────────────────────────────────────────────────────── build
FROM deps AS build
WORKDIR /repo

COPY . .

# `@josam/api`'s build script already runs `prisma generate` before `tsc` — the client is
# generated, not published, and the compile imports what it emits.
RUN pnpm --filter @josam/api run build

# Reduce to production dependencies for the runtime stage. `deploy` resolves the workspace graph
# and writes a self-contained tree, so the image carries no symlinks into a repo that will not
# exist inside it.
#
# `--legacy` because pnpm 10 changed the default: `deploy` now expects `inject-workspace-packages`
# and errors with ERR_PNPM_DEPLOY_NONINJECTED_WORKSPACE without it. Injecting would copy each
# workspace package into every consumer, which is the right trade for a published library and the
# wrong one here — `@josam/api` consumes `@josam/i18n` once, and the legacy resolution produces
# the smaller, flatter tree. Revisit if the API ever depends on two workspace packages that pin
# different versions of a shared dependency.
RUN pnpm --filter @josam/api --prod deploy --legacy /out

# ─────────────────────────────────────────────────────────────────── runtime
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app

ENV NODE_ENV=production

# `BR-1703` — a container escape from root is a host compromise. The `node` user ships with the
# image; creating another would only add a uid nobody recognises in `docker top`.
USER node

COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /repo/apps/api/dist ./dist
COPY --from=build --chown=node:node /repo/apps/api/prisma ./prisma

# `prisma.config.ts` too, not just the schema. Prisma 7 reads `datasource.url` from the config
# when running `prisma migrate deploy`, and without the file it fails with
# "The datasource.url property is required in your Prisma config file" — so `BR-887` (migrations
# run before the new image goes live) would be unexecutable from this image. Found at PH-0.11 by
# running the migration inside the built image rather than assuming it would work.
COPY --from=build --chown=node:node /repo/apps/api/prisma.config.ts ./prisma.config.ts

# 4000, not 3000: `apps/web` owns 3000 and both run on the same host. Verified by running the
# image — it logs `"port":4000` on start.
EXPOSE 4000

# `BR-879` — the heap ceiling sits BELOW the container memory limit so Node fails predictably with
# a heap error instead of being OOM-killed by the kernel, which leaves no diagnostic at all.
# `PH-0.9` sizes the container limit; this tracks it and is deliberately conservative because the
# box is shared (`SB-23`).
ENV NODE_OPTIONS=--max-old-space-size=640

# No HEALTHCHECK here on purpose: Coolify performs the check, and two independent checkers with
# different timeouts produce restarts nobody can attribute. `GET /health` is the endpoint
# (`11 §API-21`).

# ── Migrations run HERE, in this image, before the server listens ───────────────────────────
#
# `BR-887` — migrations run before the new image goes live. `PH-0.11` execution proved the obvious
# mechanism does not do that. Coolify's **pre-deployment command** runs via `docker exec` inside
# the **old, currently-running container**, not the new image:
#
#     docker exec <old-container> sh -c 'node_modules/.bin/prisma migrate deploy'
#     Error: node_modules/.bin/prisma: not found
#
# Two failures follow from that, and the second is worse:
#
#   1. On the FIRST deploy of an application there is no old container, so Coolify logs
#      "No running containers found. Skipping." and no migration runs — at exactly the moment a
#      schema first needs creating.
#   2. Migration capability depends on the version being REPLACED rather than the one arriving. A
#      rollback to a release older than a migration-tooling change cannot roll forward again. That
#      happened: rolling forward from a SHA predating the `prisma` CLI move failed, because the old
#      container had no CLI to run.
#
# Putting it in the start command fixes both by construction. It runs in the new image, with the
# new image's tooling, on every deploy including the first, and always before `listen()`.
#
# The safety property is unchanged and better: if the migration fails, this process exits non-zero,
# the container never becomes healthy, and Coolify keeps the old container serving. Verified by
# pointing it at an unreachable database — see the runbook.
#
# `DEC-20` still binds. Between the migration completing and traffic switching, the OLD code runs
# against the NEW schema, so every migration must remain backward compatible with the previous
# release. That is expand-then-contract's whole purpose and is not weakened by this placement — it
# is the same requirement any zero-downtime deploy carries.
#
# `exec` on the last command, deliberately: without it PID 1 stays `sh`, which does not forward
# SIGTERM, and the container takes the full grace period to stop on every deploy. `prisma migrate
# deploy` takes a Postgres advisory lock, so concurrent deploys serialise rather than race.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && exec node dist/main.js"]
