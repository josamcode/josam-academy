import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HealthRegistry } from '../../health/health-registry.js';
import { BackupHealthIndicator } from './backup-health.indicator.js';
import type { BackupStorageProvider } from './backup-storage.provider.js';

/**
 * `PH-0.28`. Every assertion here is on the **reported outcome**, not on whether a method was
 * called (`BR-1837`).
 *
 * The latching tests are the point of the file. `PH-0.30` shipped an indicator that reported
 * `error` for the process's lifetime after one transient outage, and the note on
 * `HealthIndicator.check` now says a new indicator is not done until both transitions have been
 * observed. These observe them.
 */
function storageStub(overrides: Partial<BackupStorageProvider> = {}): BackupStorageProvider {
  return {
    configured: () => true,
    dumpPrefix: () => 'daily/',
    verifyPrefix: () => 'verify/',
    newestObjectAt: () => Promise.resolve(new Date()),
    warn: () => undefined,
    ...overrides,
  } as BackupStorageProvider;
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

describe('last_backup indicator', () => {
  let registry: HealthRegistry;

  beforeEach(() => {
    registry = new HealthRegistry();
  });

  it('registers itself, so /health grows without the health module knowing about R2', () => {
    new BackupHealthIndicator(storageStub(), registry).onModuleInit();
    expect(registry.list().map((i) => i.name)).toContain('last_backup');
  });

  it('reports ok with both ages when the dump and the verification are fresh', async () => {
    const indicator = new BackupHealthIndicator(
      storageStub({
        newestObjectAt: (prefix: string) =>
          Promise.resolve(prefix === 'daily/' ? hoursAgo(3) : hoursAgo(48)),
      }),
      registry,
    );

    expect(await indicator.check()).toEqual({
      status: 'ok',
      dump_age_hours: 3,
      verified_days_ago: 2,
    });
  });

  it('FAILS when the newest dump is older than 26 hours — nothing ran last night', async () => {
    const indicator = new BackupHealthIndicator(
      storageStub({ newestObjectAt: () => Promise.resolve(hoursAgo(30)) }),
      registry,
    );
    await expect(indicator.check()).rejects.toThrow(/30\.0h old/);
  });

  it('FAILS when the bucket is empty — an absent backup is the worst case, not the neutral one', async () => {
    const indicator = new BackupHealthIndicator(
      storageStub({ newestObjectAt: () => Promise.resolve(null) }),
      registry,
    );
    await expect(indicator.check()).rejects.toThrow(/no backup object/);
  });

  it('FAILS when the restore check has stalled — DEC-57 requires a VERIFIED restore', async () => {
    const indicator = new BackupHealthIndicator(
      storageStub({
        newestObjectAt: (prefix: string) =>
          Promise.resolve(prefix === 'daily/' ? hoursAgo(2) : hoursAgo(20 * 24)),
      }),
      registry,
    );
    // A fresh dump is not enough. A backup nobody has restored is not a backup.
    await expect(indicator.check()).rejects.toThrow(/restore verification is 20\.0 days old/);
  });

  it('FAILS when the verification has never run', async () => {
    const indicator = new BackupHealthIndicator(
      storageStub({
        newestObjectAt: (prefix: string) =>
          Promise.resolve(prefix === 'daily/' ? hoursAgo(2) : null),
      }),
      registry,
    );
    await expect(indicator.check()).rejects.toThrow(/never been recorded|has ever been recorded/);
  });

  it('FAILS when R2 is unreachable — it cannot answer, so it must not say ok', async () => {
    const indicator = new BackupHealthIndicator(
      storageStub({ newestObjectAt: () => Promise.reject(new Error('network unreachable')) }),
      registry,
    );
    await expect(indicator.check()).rejects.toThrow(/network unreachable/);
  });

  it('reports not-configured, NOT ok, when there is no bucket (BR-892)', async () => {
    const indicator = new BackupHealthIndicator(storageStub({ configured: () => false }), registry);
    const result = await indicator.check();
    expect(result).toBe('not-configured');
    // The distinction that matters: it is visibly not success.
    expect(result).not.toBe('ok');
  });

  it('CANNOT LATCH — it recovers on the very next call after a failure', async () => {
    let reachable = false;
    const indicator = new BackupHealthIndicator(
      storageStub({
        newestObjectAt: () =>
          reachable ? Promise.resolve(hoursAgo(1)) : Promise.reject(new Error('down')),
      }),
      registry,
    );

    await expect(indicator.check()).rejects.toThrow(/down/);

    reachable = true;
    // No sleep, no second attempt, no cache to expire. PH-0.30's ioredis needed a process restart
    // to get back here; this must not.
    expect(await indicator.check()).toMatchObject({ status: 'ok' });
  });

  it('does not cache a FAILURE — a failed check is retried, not remembered', async () => {
    const newestObjectAt = vi.fn(() => Promise.reject(new Error('down')));
    const indicator = new BackupHealthIndicator(storageStub({ newestObjectAt }), registry);

    await expect(indicator.check()).rejects.toThrow();
    await expect(indicator.check()).rejects.toThrow();

    // Two calls, two real attempts. If a failure were cached the second would not have asked.
    expect(newestObjectAt.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  /**
   * Every failure path, not just one.
   *
   * The first version of this file tested only the unreachable path — and when the caching
   * guarantee was deliberately broken on the *empty bucket* path, nothing failed. The test was
   * real and its coverage was not (`BR-1835`: a test that passes is evidence only about what it
   * actually exercises). Each path that can throw is now asserted to be retried.
   */
  it.each([
    ['unreachable R2', () => Promise.reject(new Error('down'))],
    ['empty bucket', () => Promise.resolve(null)],
    ['stale dump', () => Promise.resolve(hoursAgo(99))],
  ])('does not cache the failure from %s', async (_name, behaviour) => {
    const newestObjectAt = vi.fn(behaviour);
    const indicator = new BackupHealthIndicator(storageStub({ newestObjectAt }), registry);

    await expect(indicator.check()).rejects.toThrow();
    const afterFirst = newestObjectAt.mock.calls.length;
    await expect(indicator.check()).rejects.toThrow();

    // The second call must have asked again. A cached failure would not have.
    expect(newestObjectAt.mock.calls.length).toBeGreaterThan(afterFirst);
  });

  it('DOES cache a success, so /health does not hit R2 on every request', async () => {
    const newestObjectAt = vi.fn(() => Promise.resolve(hoursAgo(1)));
    const indicator = new BackupHealthIndicator(storageStub({ newestObjectAt }), registry);

    await indicator.check();
    const afterFirst = newestObjectAt.mock.calls.length;
    await indicator.check();

    expect(newestObjectAt.mock.calls.length).toBe(afterFirst);
  });
});
