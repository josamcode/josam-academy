import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../../generated/prisma/client';
import { newId } from '../id';

/**
 * `PH-1.1` seeds — the five system roles (`10 §TBL-007`).
 *
 * Lives in `src/` and runs from `dist/`, matching how the `PH-0.6` probes already work. The
 * alternative was a TypeScript runner as a new dependency; this needs none, and it means the
 * seed is typechecked and linted by the same passes as the rest of the API rather than sitting
 * outside them in `prisma/`.
 *
 * It lives under `shared/database/` because `BR-1580` confines Prisma to the repository layer,
 * and the fitness rule caught the first draft sitting in `src/seeds/`. That is the rule working:
 * a seed is persistence, and the place for persistence is here.
 *
 * `BR-963` — system roles cannot be deleted. `super_admin`'s permissions are implicit and are
 * never stored as rows (`BR-639`), which is why this file grants nothing: `PH-1.7` builds the
 * permission registry, and seeding permissions here would create rows that `PH-1.8`'s startup
 * sync would then have to reconcile against a code registry that does not exist yet.
 *
 * `BR-951` / `BR-953` — every bilingual value carries `ar`. The database `CHECK` constraints
 * enforce it, so an English-only name here fails at insert rather than being quietly accepted.
 *
 * IDEMPOTENT BY `key`, NOT BY `id`. The identifier is a fresh ULID on every call, so `upsert` on
 * `id` would insert a duplicate role on the second run. `key` is the natural key — it is what
 * `UNIQUE (key)` exists for, and it is what application code will look roles up by.
 */
const SYSTEM_ROLES = [
  {
    key: 'super_admin',
    name: { ar: 'مدير عام', en: 'Super Admin' },
    description: {
      ar: 'صلاحيات كاملة على المنصة. لا تُخزَّن صلاحياته كصفوف.',
      en: 'Full platform authority. Permissions are implicit and never stored as rows.',
    },
  },
  {
    key: 'instructor',
    name: { ar: 'مدرّس', en: 'Instructor' },
    description: {
      ar: 'ينشئ الدورات والدروس ويتابع تقدّم الطلاب.',
      en: 'Authors courses and lessons, and follows learner progress.',
    },
  },
  {
    key: 'content_assistant',
    name: { ar: 'مساعد محتوى', en: 'Content Assistant' },
    description: {
      ar: 'يحرّر المحتوى دون صلاحية النشر.',
      en: 'Edits content without permission to publish.',
    },
  },
  {
    key: 'support_agent',
    name: { ar: 'موظف دعم', en: 'Support Agent' },
    description: {
      ar: 'يتعامل مع تذاكر الدعم وطلبات الاسترداد.',
      en: 'Handles support tickets and refund requests.',
    },
  },
  {
    key: 'student',
    name: { ar: 'طالب', en: 'Student' },
    description: {
      ar: 'الدور الافتراضي لكل حساب جديد.',
      en: 'The default role for every new account.',
    },
  },
] as const;

async function main(): Promise<void> {
  const url = process.env['DATABASE_URL'];
  if (url === undefined || url === '') {
    throw new Error('DATABASE_URL is not set — refusing to seed against an unknown database.');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  try {
    for (const role of SYSTEM_ROLES) {
      await prisma.role.upsert({
        where: { key: role.key },
        // A re-run refreshes the human-facing text but never the identifier, and never
        // `isSystem` back to false.
        update: { name: role.name, description: role.description, isSystem: true },
        create: {
          id: newId('role'),
          key: role.key,
          name: role.name,
          description: role.description,
          isSystem: true,
        },
      });
    }

    const seeded = await prisma.role.findMany({
      where: { isSystem: true },
      select: { key: true },
      orderBy: { key: 'asc' },
    });

    // Assert the OUTCOME, not that the loop ran (`BR-1837`). A seed that silently inserted four
    // of five roles leaves `PH-1.7` assigning users to a role that does not exist.
    const expected = [...SYSTEM_ROLES].map((r) => r.key).sort();
    const actual = seeded.map((r) => r.key);
    if (actual.length !== expected.length || actual.some((k, i) => k !== expected[i])) {
      throw new Error(
        `seed verification failed — expected [${expected.join(', ')}], found [${actual.join(', ')}]`,
      );
    }

    console.log(`seed: ${actual.length} system roles present — ${actual.join(', ')}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
