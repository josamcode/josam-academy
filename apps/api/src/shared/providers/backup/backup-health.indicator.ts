import { Injectable, type OnModuleInit } from '@nestjs/common';

import { type HealthIndicator, HealthRegistry } from '../../health/health-registry.js';
import { BackupStorageProvider } from './backup-storage.provider.js';

/** A daily backup plus two hours of grace. Later than this and nothing ran last night. */
const DUMP_MAX_AGE_HOURS = 26;

/** A weekly restore check plus a day of grace. */
const VERIFY_MAX_AGE_HOURS = 8 * 24;

/** `GET /health` must not wait on R2 on every request, nor hammer it. */
const CACHE_MS = 60_000;

interface Report {
  readonly value: unknown;
  readonly at: number;
}

/**
 * Contributes `last_backup` to `GET /health` — the last of the five checks `11 §API-21` names, and
 * the one that completes exit criterion 9. `PH-0.28`.
 *
 * ## What it reports, and why the distinctions matter
 *
 * | State | Reported | Reasoning |
 * | --- | --- | --- |
 * | Fresh dump and fresh verify | `ok`, with both ages | The only healthy state. |
 * | Dump older than 26 h | **throws** → `error` | Nothing ran last night. |
 * | No dump at all | **throws** → `error` | Not "unknown". An empty bucket is the worst case, not the neutral one. |
 * | Verify older than 8 days | **throws** → `error` | `DEC-57`'s criterion is a *verified* restore. A backup nobody has restored is not a backup, so a stalled check is a failure and not a warning. |
 * | R2 unreachable | **throws** → `error` | Cannot answer, so must not say `ok`. |
 * | Not configured | `not-configured` | Honest. See below. |
 *
 * **`not-configured` is deliberately not `ok`.** Locally there is no bucket, and an API that
 * refused to boot without one would be unusable — but reporting `ok` for a backup that does not
 * exist is exactly `BR-892`'s prohibition: a health endpoint that omits a dependency the reader
 * believes is watched is worse than one that never claimed to check it. It is a third value, and it
 * is visibly not success.
 *
 * ## It cannot latch
 *
 * `PH-0.30` found `RedisService` latching into `error` for the process's lifetime because its retry
 * policy gave up permanently, and recorded on `HealthIndicator.check` that an indicator which
 * cannot recover is worse than none — it teaches whoever reads `/health` to ignore the field.
 *
 * Two things prevent that here, and neither is a promise:
 *
 * 1. **No failure state is stored.** The cache below holds *successful* reports only; a throw is
 *    never cached, so a failed check is retried on the next request rather than remembered.
 * 2. **No connection is held.** `BackupStorageProvider` issues a fresh request per call on a
 *    stateless client, so there is nothing that can stay broken.
 */
@Injectable()
export class BackupHealthIndicator implements HealthIndicator, OnModuleInit {
  readonly name = 'last_backup';

  private cached: Report | null = null;

  constructor(
    private readonly storage: BackupStorageProvider,
    private readonly registry: HealthRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async check(): Promise<unknown> {
    const now = Date.now();

    if (this.cached !== null && now - this.cached.at < CACHE_MS) {
      return this.cached.value;
    }

    if (!this.storage.configured()) {
      // Not cached: if the environment gains credentials, the next call should see them.
      return 'not-configured';
    }

    const [dumpAt, verifyAt] = await Promise.all([
      this.storage.newestObjectAt(this.storage.dumpPrefix()),
      this.storage.newestObjectAt(this.storage.verifyPrefix()),
    ]);

    if (dumpAt === null) {
      throw new Error('no backup object exists in the bucket');
    }

    const dumpAgeHours = (now - dumpAt.getTime()) / 3_600_000;
    if (dumpAgeHours > DUMP_MAX_AGE_HOURS) {
      throw new Error(
        `newest backup is ${dumpAgeHours.toFixed(1)}h old, over the ${String(DUMP_MAX_AGE_HOURS)}h limit`,
      );
    }

    if (verifyAt === null) {
      throw new Error('no restore verification has ever been recorded');
    }

    const verifyAgeHours = (now - verifyAt.getTime()) / 3_600_000;
    if (verifyAgeHours > VERIFY_MAX_AGE_HOURS) {
      throw new Error(
        `last restore verification is ${(verifyAgeHours / 24).toFixed(1)} days old, over the ` +
          `${String(VERIFY_MAX_AGE_HOURS / 24)}-day limit`,
      );
    }

    const value = {
      status: 'ok',
      dump_age_hours: Number(dumpAgeHours.toFixed(1)),
      verified_days_ago: Number((verifyAgeHours / 24).toFixed(1)),
    };

    // Only a success is cached. A failure is retried next request — see the latching note above.
    this.cached = { value, at: now };
    return value;
  }
}
