import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { newUnprefixedId } from '../../shared/database/id.js';
import { PermissionRepository } from '../../shared/database/repositories/permission.repository.js';
import { IdentityFixtures } from '../../shared/database/testing/identity-fixtures.js';
import { PERMISSION_COUNT, PERMISSION_REGISTRY } from './permission-registry.js';
import { PermissionSyncService } from './permission-sync.service.js';

/**
 * `PH-1.8` — the registry, the startup sync, and orphan flagging.
 *
 * The orphan path is ALSO a fitness case (case 45), because it is an enforcement mechanism and
 * `BR-1725` wants those proven by deliberate violation rather than by a passing spec. These specs
 * cover the behaviour; the fitness case proves the behaviour cannot be removed unnoticed.
 */

const url = process.env['DATABASE_URL'];
if (url === undefined || url === '') {
  throw new Error('DATABASE_URL is not set — this suite asserts against real rows.');
}

const fixtures = new IdentityFixtures(url);
const repository = new PermissionRepository(fixtures.client as never);
const service = new PermissionSyncService(repository);

const asInput = (defs: readonly (typeof PERMISSION_REGISTRY)[number][]) =>
  defs.map((p) => ({ id: newUnprefixedId(), ...p }));

beforeEach(async () => {
  await fixtures.client.permission.deleteMany({});
});

afterAll(async () => {
  await fixtures.client.permission.deleteMany({});
  await service.sync(); // leave the database in the state the application expects
  await fixtures.disconnect();
});

describe('PH-1.8 — the registry matches 05 (BR-709)', () => {
  it('holds exactly 174, which is what 05 §5 states', () => {
    expect(PERMISSION_REGISTRY).toHaveLength(PERMISSION_COUNT);
    expect(PERMISSION_COUNT).toBe(174);
  });

  it('has no duplicate keys — `permissions.key` is UNIQUE', () => {
    const keys = PERMISSION_REGISTRY.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  /**
   * Drift in EITHER direction fails. A permission added to code but not to `05` is undocumented;
   * one added to `05` but not to code is unimplementable. Nothing else catches either.
   */
  it('matches the permission table in 05, key for key', () => {
    const doc = readFileSync(
      join(__dirname, '..', '..', '..', '..', '..', 'docs', '05-roles-and-permissions.md'),
      'utf8',
    );
    const inDoc = new Set(
      [...doc.matchAll(/^\|\s*`([a-z_]+:[a-z_]+(?:\.[a-z_]+)?)`\s*\|/gm)].map((m) => m[1] ?? ''),
    );
    const inCode = new Set(PERMISSION_REGISTRY.map((p) => p.key));

    expect(
      [...inDoc].filter((k) => !inCode.has(k)),
      'in 05 but not in code',
    ).toEqual([]);
    expect(
      [...inCode].filter((k) => !inDoc.has(k)),
      'in code but not in 05',
    ).toEqual([]);
  });

  it('decomposes every key into model, action and scope', () => {
    for (const p of PERMISSION_REGISTRY) {
      const expected =
        p.scope === null ? `${p.model}:${p.action}` : `${p.model}:${p.action}.${p.scope}`;
      expect(p.key).toBe(expected);
    }
  });
});

describe('PH-1.8 — startup sync (FEAT-014)', () => {
  it('inserts the whole registry into an empty table', async () => {
    const counts = await repository.sync(asInput(PERMISSION_REGISTRY));
    expect(counts.inserted).toBe(174);
    expect(counts.total).toBe(174);
    expect(counts.orphaned).toBe(0);
  });

  it('is idempotent — a second run inserts nothing', async () => {
    await repository.sync(asInput(PERMISSION_REGISTRY));
    const second = await repository.sync(asInput(PERMISSION_REGISTRY));
    expect(second.inserted).toBe(0);
    expect(second.orphaned).toBe(0);
    expect(second.total).toBe(174);
  });

  it('FLAGS a permission absent from code — never deletes it (BR-964)', async () => {
    await repository.sync(asInput(PERMISSION_REGISTRY));

    // Next boot, one permission has been removed from the code registry.
    const shrunk = PERMISSION_REGISTRY.filter((p) => p.key !== 'role:delete');
    const counts = await repository.sync(asInput(shrunk));

    expect(counts.orphaned).toBe(1);
    expect(counts.total).toBe(173);

    // The row SURVIVES. Deleting it would cascade away every grant referencing it.
    const rows = await repository.all();
    const orphan = rows.find((r) => r.key === 'role:delete');
    expect(orphan, 'the row must still exist').toBeDefined();
    expect(orphan?.isOrphaned).toBe(true);
    expect(rows).toHaveLength(174);
  });

  it('REINSTATES a permission that returns to code — the round trip is lossless', async () => {
    await repository.sync(asInput(PERMISSION_REGISTRY));
    await repository.sync(asInput(PERMISSION_REGISTRY.filter((p) => p.key !== 'role:delete')));

    const back = await repository.sync(asInput(PERMISSION_REGISTRY));
    expect(back.reinstated).toBe(1);
    expect(back.inserted).toBe(0);
    expect(back.total).toBe(174);

    const rows = await repository.all();
    expect(rows.find((r) => r.key === 'role:delete')?.isOrphaned).toBe(false);
  });

  it('does not re-flag an already-orphaned permission', async () => {
    await repository.sync(asInput(PERMISSION_REGISTRY));
    const shrunk = PERMISSION_REGISTRY.filter((p) => p.key !== 'role:delete');
    await repository.sync(asInput(shrunk));

    const again = await repository.sync(asInput(shrunk));
    expect(again.orphaned, 'already flagged — nothing new to orphan').toBe(0);
  });
});

describe('PH-1.8 — the API refuses to start on a bad registry', () => {
  it('throws when the registry count disagrees with 05 — the REAL guard', async () => {
    // A generated file that silently lost rows. Writing it would orphan 74 permissions: the
    // destructive direction, and the one that looks like a successful sync.
    const shortened = PERMISSION_REGISTRY.slice(0, 100);
    await expect(new PermissionSyncService(repository).sync(shortened)).rejects.toThrow(
      /holds 100 entries, but 05 §5 states 174/,
    );

    // And nothing was written — the guard runs before the transaction.
    expect(await repository.all()).toEqual([]);
  });

  it('throws on a duplicate key rather than failing partway through the insert', async () => {
    const first = PERMISSION_REGISTRY[0];
    if (first === undefined) throw new Error('registry is empty');
    const dupes = [...PERMISSION_REGISTRY.slice(0, 173), first];
    await expect(new PermissionSyncService(repository).sync(dupes)).rejects.toThrow(
      /duplicate keys/,
    );
    expect(await repository.all()).toEqual([]);
  });

  it('rethrows from onModuleInit so bootstrap aborts', async () => {
    const failing = {
      sync: () => Promise.reject(new Error('database unreachable')),
      all: () => Promise.resolve([]),
    } as unknown as PermissionRepository;

    // The whole point: a partial registry silently REVOKES access rather than degrading it, so
    // the process must not come up.
    await expect(new PermissionSyncService(failing).onModuleInit()).rejects.toThrow(
      /database unreachable/,
    );
  });
});
