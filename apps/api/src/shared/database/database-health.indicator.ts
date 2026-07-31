import { Injectable, type OnModuleInit } from '@nestjs/common';

import { type HealthIndicator, HealthRegistry } from '../health/health-registry.js';
import { PrismaService } from './prisma.service.js';

/**
 * Contributes the `database` entry to GET /health (11 §API, BR-892).
 *
 * It registers itself rather than being listed inside HealthService, so HealthService never
 * learns what a database is — that is what lets `checks` grow through PH-0.28 without the
 * health module accumulating a dependency on every service in the system.
 *
 * This is infrastructure, not a domain service, so holding PrismaService here is consistent
 * with BR-1580.
 */
@Injectable()
export class DatabaseHealthIndicator implements HealthIndicator, OnModuleInit {
  readonly name = 'database';

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: HealthRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async check(): Promise<string> {
    // A real round trip. `$connect()` succeeding is not evidence the server still answers.
    //
    // `system` — a liveness probe, run by the health endpoint with no request actor. It reads no
    // rows, so there is nothing for a scope to filter; `SELECT 1` is the point.
    await this.prisma.unscoped('system').$queryRaw`SELECT 1`;
    return 'ok';
  }
}
