/**
 * Prisma 7 probe — BR-1816 / SB-09.
 *
 * `13 §18.1` pins Prisma 7.9.1 *provisionally*: Prisma 7 is a rewrite, not a bump, and it must
 * be proven against three things before the pin stands, all of which this file exercises on the
 * compiled artifact rather than through a test transform:
 *
 *   (a) the NestJS **CommonJS** build — Prisma 7's `prisma-client` generator emits ESM by
 *       default, which a CJS build cannot `require()`. The schema sets `moduleFormat = "cjs"`.
 *   (b) the **generated client location** — no longer `node_modules/.prisma`; it is generated
 *       into `src/generated/prisma` and compiled with the rest of the app.
 *   (c) the **repository-only pattern of BR-1580** — that Prisma can be confined behind
 *       `shared/database` without leaking Prisma types upward.
 *
 * Run: pnpm --filter @josam/api run probe:prisma   (build first)
 */
import 'reflect-metadata';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';

async function main(): Promise<void> {
  // (b) resolved from the compiled output, and (a) loaded by a CommonJS require at runtime.
  const isCommonJs = typeof require === 'function' && typeof module === 'object';
  console.log('module system at runtime =', isCommonJs ? 'CommonJS' : 'ESM');

  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) throw new Error('DATABASE_URL is not set.');

  // Prisma 7 removed the built-in connection path — a driver adapter is now required.
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    await prisma.$connect();
    const rows = await prisma.$queryRaw<{ one: number }[]>`SELECT 1 AS one`;
    const version = await prisma.$queryRaw<{ v: string }[]>`SELECT version() AS v`;

    console.log('SELECT 1 =', rows[0]?.one);
    console.log('server   =', version[0]?.v.split(',')[0]);

    if (rows[0]?.one !== 1) {
      throw new Error('Prisma connected but did not return the expected result.');
    }
    if (!isCommonJs) {
      throw new Error(
        'The compiled probe is not running as CommonJS. NestJS 11 requires CJS for ' +
          'emitDecoratorMetadata; a Prisma client emitted as ESM cannot be required from it.',
      );
    }

    console.log('PRISMA PROBE PASSED — CJS build, generated client, live connection.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
