import { Injectable } from '@nestjs/common';

/**
 * A single dependency check, contributed by whichever piece of infrastructure owns the
 * dependency.
 */
export interface HealthIndicator {
  readonly name: string;

  /**
   * Must be able to report `ok` again after reporting a failure.
   *
   * **An indicator that latches into error for the process lifetime is worse than no indicator**,
   * because it trains whoever reads `GET /health` to ignore the field — and the field they learn
   * to ignore is the one that will matter.
   *
   * `PH-0.30` shipped exactly that and caught it only by testing the recovery: `RedisService`'s
   * `retryStrategy` returned `null` after three attempts to limit log noise, and ioredis reads
   * that as *stop reconnecting permanently*. The endpoint went `ok` -> `degraded` correctly and
   * then stayed `degraded` forever.
   *
   * Both current indicators are verified against a real container, in both directions:
   *
   * | indicator  | down       | back up | why it recovers                                   |
   * | ---------- | ---------- | ------- | ------------------------------------------------- |
   * | `database` | `degraded` | `ok`    | `pg.Pool` discards broken connections, dials anew  |
   * | `redis`    | `degraded` | `ok`    | backoff caps at 2 s and never returns `null`       |
   *
   * A new indicator is not done until the same two transitions have been observed. Stop the
   * dependency, see the failure, start it, see the recovery — the second half is the one that gets
   * skipped, and it is the one that latches.
   */
  check(): Promise<unknown>;
}

/**
 * The registry lives in `shared/` rather than in `modules/health/`, and that placement is the
 * whole point.
 *
 * Written the other way round at `PH-0.6`, `shared/database` imported `modules/health` so its
 * indicator could register itself — infrastructure reaching upward into a domain module. It
 * compiled, it worked, and it was a layer inversion: `shared/database` could no longer be
 * understood or moved without the health module, and every future indicator (Redis at `PH-0.5`,
 * the queue in Phase 1, storage, last-backup at `PH-0.28`) would have deepened it.
 *
 * Caught by the `shared-must-not-depend-on-modules` rule the moment dependency-cruiser was turned
 * on at `PH-0.16` — which is exactly what a fitness function is for, and why `09 §enforcement`
 * asks for one that holds the whole graph rather than one file at a time.
 *
 * Now the arrow points down: infrastructure registers into infrastructure, and `modules/health`
 * reads the registry to build its HTTP response.
 */
@Injectable()
export class HealthRegistry {
  private readonly indicators: HealthIndicator[] = [];

  register(indicator: HealthIndicator): void {
    this.indicators.push(indicator);
  }

  list(): readonly HealthIndicator[] {
    return this.indicators;
  }
}
