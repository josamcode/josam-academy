import 'dotenv/config';

import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 configuration (BR-1816 probe, PH-0.6).
 *
 * DATABASE_URL is read from the environment and never written here. `.env` is gitignored;
 * `.env.example` documents the shape.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // PH-1.1 — the five system roles (10 §TBL-007). Idempotent by `key`, not by `id`.
    seed: 'node -r dotenv/config dist/shared/database/seeds/system-roles.seed.js',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
