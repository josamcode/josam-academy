import { Injectable } from '@nestjs/common';

/**
 * A single dependency check, contributed by whichever piece of infrastructure owns the
 * dependency.
 */
export interface HealthIndicator {
  readonly name: string;
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
