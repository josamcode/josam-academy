import { Injectable } from '@nestjs/common';

import { HealthRegistry } from '../../shared/health/health-registry.js';

/**
 * Response shape fixed by 11 §API `GET /health` (BR-892), used by external monitoring.
 */
export interface HealthReport {
  status: 'ok' | 'degraded';
  checks: Record<string, unknown>;
  version: string;
}

@Injectable()
export class HealthService {
  /**
   * Indicators are contributed by the infrastructure that owns each dependency and collected in
   * shared/health's registry, so this service never learns what a database or a queue is.
   *
   * `checks` was empty at PH-0.3 — honestly so, since nothing existed to check. It grows as each
   * dependency lands: database at PH-0.6, Redis at PH-0.5's indicator, queue in Phase 1,
   * last_backup at PH-0.28. Reporting a check for a service that does not exist would make the
   * endpoint lie exactly where monitoring trusts it (BR-892).
   */
  constructor(private readonly registry: HealthRegistry) {}

  async report(): Promise<HealthReport> {
    const checks: Record<string, unknown> = {};
    let healthy = true;

    for (const indicator of this.registry.list()) {
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
