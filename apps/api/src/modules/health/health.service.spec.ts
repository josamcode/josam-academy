import { beforeEach, describe, expect, it } from 'vitest';

import { HealthRegistry } from '../../shared/health/health-registry.js';
import { HealthService } from './health.service.js';

/**
 * `PH-0.11` — the assertion that was missing.
 *
 * `version` reported the constant `0.0.0` in production for the whole of Phase 0. It read
 * `npm_package_version`, which is set only when a process is launched **by** npm or pnpm as a
 * script; the container runs `node dist/main.js` directly, so it was always undefined and always
 * fell through to the default.
 *
 * Nothing caught it because nothing asserted it. It is not a cosmetic field: `version` is how a
 * deploy is proven to have replaced the container that was serving, so a constant means a failed
 * deploy that silently left the old container running reads as a success — and it forced
 * `PH-0.11`'s rollback proof onto image-tag inspection instead, which is the weaker check on the
 * one thing `BR-886` exists to make verifiable.
 */
describe('HealthService — version (BR-886, BR-892)', () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original };
  });

  it('reports APP_VERSION, which is what the deploy sets', async () => {
    process.env['APP_VERSION'] = 'sha-0123456789abcdef';
    process.env['DATABASE_URL'] = 'postgresql://u:p@localhost:5432/db';
    process.env['REDIS_URL'] = 'redis://localhost:6379';

    const report = await new HealthService(new HealthRegistry()).report();

    expect(report.version).toBe('sha-0123456789abcdef');
  });

  it('does NOT report npm_package_version, which is absent in a container', async () => {
    process.env['APP_VERSION'] = 'sha-thedeployedone';
    process.env['DATABASE_URL'] = 'postgresql://u:p@localhost:5432/db';
    process.env['REDIS_URL'] = 'redis://localhost:6379';
    // Set to something distinguishable. If the service ever reads this again, this fails.
    process.env['npm_package_version'] = '9.9.9-from-pnpm';

    const report = await new HealthService(new HealthRegistry()).report();

    expect(report.version).toBe('sha-thedeployedone');
    expect(report.version).not.toBe('9.9.9-from-pnpm');
  });

  it('two different deploys report two different versions', async () => {
    process.env['DATABASE_URL'] = 'postgresql://u:p@localhost:5432/db';
    process.env['REDIS_URL'] = 'redis://localhost:6379';

    process.env['APP_VERSION'] = 'sha-aaaaaaa';
    const first = await new HealthService(new HealthRegistry()).report();

    process.env['APP_VERSION'] = 'sha-bbbbbbb';
    const second = await new HealthService(new HealthRegistry()).report();

    // The property the rollback proof depends on: the field distinguishes releases.
    expect(first.version).not.toBe(second.version);
  });

  it('reports ok with no indicators, and degraded when one throws', async () => {
    process.env['APP_VERSION'] = 'sha-x';
    process.env['DATABASE_URL'] = 'postgresql://u:p@localhost:5432/db';
    process.env['REDIS_URL'] = 'redis://localhost:6379';

    const registry = new HealthRegistry();
    expect((await new HealthService(registry).report()).status).toBe('ok');

    registry.register({
      name: 'broken',
      check: () => Promise.reject(new Error('down')),
    });
    const degraded = await new HealthService(registry).report();
    expect(degraded.status).toBe('degraded');
    expect(degraded.checks['broken']).toBe('error');
  });
});
