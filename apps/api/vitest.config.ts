import { defineConfig } from 'vitest/config';

/**
 * `PH-1.1` introduced the first specs that talk to a real database — schema conformance is
 * verified against the LIVE catalogs, not against the Prisma schema file, because a migration can
 * apply cleanly and still produce the wrong table.
 *
 * `setupFiles` loads `.env` so `DATABASE_URL` reaches those specs. It deliberately does NOT
 * default the value: a suite that invents a connection string points at some other database and
 * reports on it confidently.
 */
export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
  },
});
