import { Injectable } from '@nestjs/common';

import { loadEnv } from '../../config/env.js';
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
      /**
       * `APP_VERSION`, not `npm_package_version`.
       *
       * `npm_package_version` is set only when a process is launched **by** npm or pnpm as a
       * script. The container runs `node dist/main.js` directly, so it is undefined in production
       * and this field silently reported `0.0.0` — while `APP_VERSION`, which the env schema
       * validates and `main.ts` already logs at boot, carried the deployed commit SHA the whole
       * time. Two mechanisms, one wired to the response and one not.
       *
       * Found at `PH-0.11` execution. It is not cosmetic: `version` is how a deploy is proven to
       * have replaced the container that was serving. Reporting a constant means a failed deploy
       * that silently left the old container running reads as a success, so the rollback proof had
       * to fall back to inspecting image tags — a weaker check on the one thing `BR-886` exists to
       * make verifiable.
       */
      version: loadEnv().APP_VERSION,
    };
  }
}
