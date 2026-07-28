import { Injectable } from '@nestjs/common';

/**
 * Response shape fixed by 11 §API `GET /health` (BR-892), used by external monitoring.
 */
export interface HealthReport {
  status: 'ok' | 'degraded';
  checks: Record<string, unknown>;
  version: string;
}

/**
 * A single dependency check. Registered by the module that owns the dependency, so that
 * `checks` grows without this service ever learning what a database or a queue is.
 */
export interface HealthIndicator {
  readonly name: string;
  check(): Promise<unknown>;
}

@Injectable()
export class HealthService {
  /**
   * Empty at PH-0.3 — and honestly so. The contract in `11` lists database, redis, queue,
   * storage and last_backup, but none of those services exist yet: Postgres and Redis arrive at
   * PH-0.5, the queue in Phase 1, last_backup at PH-0.28. Reporting `"database": "ok"` before
   * there is a database would make the endpoint a liar exactly where it is trusted most —
   * it is what external monitoring pages the founder on (BR-892).
   */
  private readonly indicators: HealthIndicator[] = [];

  register(indicator: HealthIndicator): void {
    this.indicators.push(indicator);
  }

  async report(): Promise<HealthReport> {
    const checks: Record<string, unknown> = {};
    let healthy = true;

    for (const indicator of this.indicators) {
      try {
        checks[indicator.name] = await indicator.check();
      } catch {
        checks[indicator.name] = 'error';
        healthy = false;
      }
    }

    return {
      status: healthy ? 'ok' : 'degraded',
      checks,
      version: process.env['npm_package_version'] ?? '0.0.0',
    };
  }
}
