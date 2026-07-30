import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * `PH-1.1` — the schema is verified COLUMN BY COLUMN against `10`, not by the migration applying.
 *
 * ## Why this exists
 *
 * "Migration applied" is the task's stated output and it is a weak claim. A migration can apply
 * cleanly and still produce the wrong table: a column typed `TEXT` where `10` says `CITEXT` gives
 * case-SENSITIVE email uniqueness, which is `BR-002` inverted and behaves correctly in every test
 * that only ever uses lowercase. A `TIMESTAMP` where `10` says `TIMESTAMPTZ` silently drops the
 * offset — `BR-825`. A partial index that lost its `WHERE deleted_at IS NULL` still answers every
 * query, just over soft-deleted rows too.
 *
 * **None of those fail a migration. All of them fail the specification.**
 *
 * So this reads `10`'s own `CREATE TABLE` SQL as the expectation and the live database's
 * `information_schema` and `pg_*` catalogs as the actual. Neither side is hand-written here: a
 * hand-copied expectation is a third copy of the schema, and it drifts (`BR-1841` — assert the
 * relationship to the source, not a transcribed number).
 *
 * ## It fails rather than skips without a database
 *
 * `BR-1830`. A conformance suite that skips when `DATABASE_URL` is absent reports green on a
 * machine that verified nothing, which is worse than having no suite — it occupies the place
 * where the check should be.
 */

const TABLES = [
  'roles',
  'users',
  'user_identities',
  'refresh_tokens',
  'verification_tokens',
  'otp_codes',
  'login_activity',
  // `PH-1.7` — M02 Access. Same standard as PH-1.1: the migration applying proves nothing about
  // whether the table matches `10`.
  'permissions',
  'role_permissions',
  'user_permission_overrides',
] as const;

/** `10`'s SQL types → PostgreSQL's `udt_name`, which is the only field that distinguishes them. */
const UDT: Record<string, string> = {
  TEXT: 'text',
  CITEXT: 'citext',
  TIMESTAMPTZ: 'timestamptz',
  JSONB: 'jsonb',
  BOOLEAN: 'bool',
  INTEGER: 'int4',
  SMALLINT: 'int2',
  INET: 'inet',
  'CHAR(2)': 'bpchar',
};

interface SpecColumn {
  name: string;
  type: string;
  /**
   * The token exactly as `10` writes it. `10` distinguishes base types (UPPERCASE) from enum
   * types (lower_snake_case) by case alone, and `type` is normalised to uppercase for the `UDT`
   * lookup — which destroys that signal. Keeping the raw form is what lets an unrecognised BASE
   * type fail loudly while a legitimate enum passes.
   */
  rawType: string;
  notNull: boolean;
  hasDefault: boolean;
  references?: { table: string; onDelete: string };
}

interface SpecTable {
  columns: SpecColumn[];
  checks: string[];
  uniques: string[][];
}

function parseSpec(): Map<string, SpecTable> {
  const root = join(__dirname, '..', '..', '..', '..', '..', 'docs');
  const sql =
    readFileSync(join(root, '10-database-design-part-1.md'), 'utf8') +
    readFileSync(join(root, '10-database-design-part-2.md'), 'utf8');

  const out = new Map<string, SpecTable>();
  for (const m of sql.matchAll(/CREATE TABLE (\w+) \(([\s\S]*?)\n\);/g)) {
    const table = m[1];
    const body = m[2];
    if (table === undefined || body === undefined) continue;

    const parsed: SpecTable = { columns: [], checks: [], uniques: [] };

    for (const raw of body.split('\n')) {
      const line = raw.trim().replace(/,$/, '');
      if (line === '' || line.startsWith('--')) continue;

      const check = /^CONSTRAINT\s+(\w+)\s+CHECK/i.exec(line);
      if (check?.[1] !== undefined) {
        parsed.checks.push(check[1]);
        continue;
      }

      const unique = /^UNIQUE\s*\(([^)]*)\)/i.exec(line);
      if (unique?.[1] !== undefined) {
        parsed.uniques.push(unique[1].split(',').map((c) => c.trim()));
        continue;
      }

      if (/^PRIMARY KEY\s*\(/i.test(line)) continue;

      // The type token accepts a precision PAIR and an array suffix. The first version was
      // `([A-Za-z_]+(?:\(\d+\))?)`, which truncates `NUMERIC(10,4)` to `NUMERIC` and `TEXT[]` to
      // `TEXT` — the same truncation that read `SET NULL` as `SET`, found by the audit before it
      // could bite. Neither type appears in `TBL-001`–`TBL-010`, so both were LATENT: queued for
      // whichever task first creates such a column, and passing until then.
      const col = /^(\w+)\s+([A-Za-z_]+(?:\(\d+(?:,\d+)?\))?(?:\[\])?)\s*(.*)$/.exec(line);
      const name = col?.[1];
      const type = col?.[2];
      const rest = col?.[3] ?? '';
      if (name === undefined || type === undefined) continue;

      // The action is matched from a CLOSED SET, not by a lazy character class. The first
      // version was `([A-Z ]+?)(?:\s|$)`, which stops at the first space and read `SET NULL` as
      // `SET`. It went unnoticed from `PH-1.1` because every foreign key there used a
      // single-word action; `PH-1.7`'s `granted_by` is the first `SET NULL` in the schema and
      // exposed it immediately. A parser in a verification tool is subject to the same standard
      // as the thing it verifies (`BR-1844` corollary).
      const fk =
        /REFERENCES\s+(\w+)\s*\([^)]*\)\s*ON DELETE\s+(CASCADE|RESTRICT|SET NULL|SET DEFAULT|NO ACTION)/i.exec(
          rest,
        );
      const fkTable = fk?.[1];
      const fkOnDelete = fk?.[2];

      parsed.columns.push({
        name,
        type: type.toUpperCase(),
        rawType: type,
        // PRIMARY KEY implies NOT NULL without saying so.
        notNull: /NOT NULL/i.test(rest) || /PRIMARY KEY/i.test(rest),
        hasDefault: /DEFAULT/i.test(rest),
        ...(fkTable !== undefined && fkOnDelete !== undefined
          ? { references: { table: fkTable, onDelete: fkOnDelete.trim().toUpperCase() } }
          : {}),
      });
    }
    out.set(table, parsed);
  }
  return out;
}

/**
 * A missing table here means the parser silently matched nothing — which would turn every
 * assertion below into a vacuous pass. It throws rather than returning an empty shape.
 */
function specFor(table: string): SpecTable {
  const found = spec.get(table);
  if (found === undefined) {
    throw new Error(`10 has no CREATE TABLE for \`${table}\` — the parser matched nothing`);
  }
  return found;
}

const spec = parseSpec();

const url = process.env['DATABASE_URL'];
let pool: Pool;

describe('PH-1.1 — schema conformance against 10, column by column', () => {
  beforeAll(() => {
    // Loud, not skipped (BR-1830).
    if (url === undefined || url === '') {
      throw new Error(
        'DATABASE_URL is not set. This suite verifies the LIVE schema against 10 and cannot ' +
          'be satisfied without one. It fails rather than skipping: a conformance suite that ' +
          'reports green having checked nothing is worse than no suite.',
      );
    }
    pool = new Pool({ connectionString: url });
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('parsed every table out of 10 — the parser is not silently empty', () => {
    for (const t of TABLES) {
      expect(spec.has(t), `10 has no CREATE TABLE for \`${t}\``).toBe(true);
      expect(specFor(t).columns.length, `\`${t}\` parsed with no columns`).toBeGreaterThan(3);
    }
  });

  describe.each(TABLES)('%s', (table) => {
    it('exists', async () => {
      const { rows } = await pool.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
        [table],
      );
      expect(rows).toHaveLength(1);
    });

    it('matches 10 column for column — name, type, nullability, default', async () => {
      const { rows } = await pool.query<{
        column_name: string;
        udt_name: string;
        is_nullable: string;
        column_default: string | null;
        character_maximum_length: number | null;
      }>(
        `SELECT column_name, udt_name, is_nullable, column_default, character_maximum_length
           FROM information_schema.columns
          WHERE table_schema='public' AND table_name=$1`,
        [table],
      );
      const actual = new Map(rows.map((r) => [r.column_name, r]));
      const expected = specFor(table).columns;

      for (const col of expected) {
        const got = actual.get(col.name);
        if (got === undefined) {
          throw new Error(`${table}.${col.name} is in 10 but missing from the database`);
        }

        // An unknown base type is a PARSE failure, not a comparison to attempt. Falling through
        // to `toLowerCase()` silently compares a guess, which is how a truncated type would have
        // slipped past: `NUMERIC` lowercased happens to equal the real `udt_name` for
        // `NUMERIC(10,4)`, so the truncation would have PASSED (`BR-1848`).
        const isEnum = /^[a-z][a-z0-9_]*$/.test(col.rawType);
        if (UDT[col.type] === undefined && !isEnum) {
          throw new Error(
            `${table}.${col.name}: 10 declares type \`${col.type}\`, which this parser does not ` +
              'recognise. Add it to UDT rather than letting the comparison guess.',
          );
        }
        const wantUdt = UDT[col.type] ?? col.type.toLowerCase();
        expect(got.udt_name, `${table}.${col.name} type (10 says ${col.type})`).toBe(wantUdt);

        if (col.type === 'CHAR(2)') {
          expect(got.character_maximum_length, `${table}.${col.name} length`).toBe(2);
        }

        expect(
          got.is_nullable === 'NO',
          `${table}.${col.name} nullability (10 says ${col.notNull ? 'NOT NULL' : 'nullable'})`,
        ).toBe(col.notNull);

        expect(
          got.column_default !== null,
          `${table}.${col.name} default presence (10 says ${col.hasDefault ? 'has' : 'none'})`,
        ).toBe(col.hasDefault);
      }

      // No EXTRA columns. A column the specification does not know about is undesigned state,
      // and it is how a schema drifts away from the document that is supposed to describe it.
      const extra = [...actual.keys()].filter((c) => !expected.some((e) => e.name === c));
      expect(extra, `${table} has columns absent from 10`).toEqual([]);
    });

    it('declares every foreign key with the ON DELETE 10 specifies (BR-949)', async () => {
      const fks = specFor(table).columns.filter((c) => c.references !== undefined);
      if (fks.length === 0) return;

      const { rows } = await pool.query<{ column_name: string; delete_rule: string }>(
        `SELECT kcu.column_name, rc.delete_rule
           FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
           JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
          WHERE tc.table_schema='public' AND tc.table_name=$1 AND tc.constraint_type='FOREIGN KEY'`,
        [table],
      );
      const byColumn = new Map(rows.map((r) => [r.column_name, r.delete_rule.toUpperCase()]));

      for (const col of fks) {
        const ref = col.references;
        if (ref === undefined) continue;
        expect(
          byColumn.get(col.name),
          `${table}.${col.name} ON DELETE (10 says ${ref.onDelete})`,
        ).toBe(ref.onDelete);
      }
    });
  });

  it('users carries the has_identity CHECK, and it refuses a row with neither identifier', async () => {
    const { rows } = await pool.query(
      `SELECT conname FROM pg_constraint
        WHERE conrelid='users'::regclass AND contype='c' AND conname='has_identity'`,
    );
    expect(rows, 'the has_identity CHECK is missing from users').toHaveLength(1);

    // Assert the EFFECT, not the catalog row (`BR-1837`). A constraint that exists and does not
    // bite is the failure this project has met eleven times.
    await expect(
      pool.query(
        `INSERT INTO users (id, role_id, full_name) VALUES ('usr_conformance_probe',
           (SELECT id FROM roles WHERE key='student'), 'no identity')`,
      ),
    ).rejects.toThrow(/has_identity/);
  });

  it('rejects a permission description without Arabic (BR-953, PH-1.7)', async () => {
    await expect(
      pool.query(
        `INSERT INTO permissions (id, key, model, action, module, description)
         VALUES ('conformance_probe', 'probe:conformance', 'X', 'x', 'M01', '{"en":"English only"}'::jsonb)`,
      ),
    ).rejects.toThrow(/has_arabic/);
  });

  it('rejects a bilingual name without Arabic (BR-953)', async () => {
    await expect(
      pool.query(
        `INSERT INTO roles (id, key, name) VALUES ('rol_conformance_probe', 'probe', '{"en":"English only"}'::jsonb)`,
      ),
    ).rejects.toThrow(/has_arabic/);
  });

  it('carries all six PARTIAL indexes with their predicates intact', async () => {
    const { rows } = await pool.query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public'`,
    );
    const defs = new Map(rows.map((r) => [r.indexname, r.indexdef]));

    // The predicate IS the index. Without it these still answer queries — over rows the
    // application treats as deleted, revoked or consumed.
    const partial: Record<string, RegExp> = {
      idx_users_email: /WHERE \(deleted_at IS NULL\)/,
      idx_users_phone: /WHERE \(deleted_at IS NULL\)/,
      idx_users_last_active: /WHERE \(deleted_at IS NULL\)/,
      idx_refresh_user: /WHERE \(revoked_at IS NULL\)/,
      idx_refresh_expiry: /WHERE \(revoked_at IS NULL\)/,
      idx_verification_user: /WHERE \(consumed_at IS NULL\)/,
    };

    for (const [name, predicate] of Object.entries(partial)) {
      expect(defs.has(name), `index ${name} is missing`).toBe(true);
      expect(defs.get(name), `${name} lost its WHERE predicate`).toMatch(predicate);
    }
  });

  it('carries the six plain indexes 10 names', async () => {
    const { rows } = await pool.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE schemaname='public'`,
    );
    const names = new Set(rows.map((r) => r.indexname));
    for (const idx of [
      'idx_users_role',
      'idx_users_created',
      'idx_identities_user',
      'idx_refresh_family',
      'idx_otp_phone',
      'idx_login_user',
    ]) {
      expect(names.has(idx), `index ${idx} is missing`).toBe(true);
    }
  });

  it('defines all six enums with exactly the values 10 lists', async () => {
    const expected: Record<string, string[]> = {
      user_status: ['active', 'suspended', 'pending_deletion', 'deleted'],
      theme_mode: ['light', 'dark', 'system'],
      persona_type: ['career_switcher', 'freelancer', 'professional', 'builder', 'casual'],
      auth_provider: ['password', 'google', 'phone'],
      client_platform: ['web', 'ios', 'android'],
      token_purpose: ['email_verify', 'password_reset', 'email_change'],
    };
    const { rows } = await pool.query<{ typname: string; labels: string[] }>(
      `SELECT t.typname, array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS labels
         FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
        GROUP BY t.typname`,
    );
    const actual = new Map(rows.map((r) => [r.typname, r.labels]));
    for (const [name, labels] of Object.entries(expected)) {
      expect(actual.get(name), `enum ${name}`).toEqual(labels);
    }
  });

  it('has the five system roles seeded, with Arabic on every one', async () => {
    const { rows } = await pool.query<{ key: string; ar: string }>(
      `SELECT key, name->>'ar' AS ar FROM roles WHERE is_system = true ORDER BY key`,
    );
    expect(rows.map((r) => r.key)).toEqual([
      'content_assistant',
      'instructor',
      'student',
      'super_admin',
      'support_agent',
    ]);
    for (const r of rows) expect(r.ar, `role ${r.key} has no Arabic name`).toBeTruthy();
  });
});
