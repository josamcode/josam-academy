import { Injectable, type OnModuleInit } from '@nestjs/common';

import { type HealthIndicator, HealthRegistry } from '../health/health-registry.js';
import { RedisService } from './redis.service.js';

/**
 * Contributes the `redis` entry to GET /health (`11 §API-21`, `BR-892`, `SB-16`).
 *
 * The same self-registering shape as `DatabaseHealthIndicator`, which is the point of the registry
 * living in `shared/`: adding a dependency to the health response requires no edit to
 * `modules/health` and creates no dependency from infrastructure up into a domain module.
 */
@Injectable()
export class RedisHealthIndicator implements HealthIndicator, OnModuleInit {
  readonly name = 'redis';

  constructor(
    private readonly redis: RedisService,
    private readonly registry: HealthRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async check(): Promise<string> {
    // A real round trip, matching the database indicator's reasoning: a connection that was
    // established once is not evidence the server still answers.
    // Typed as `string`, deliberately. ioredis declares `ping()` as returning the literal
    // `'PONG'`, which narrows the guard below to `never` and makes the throw dead code by the
    // type system's reckoning. That declaration is a claim about the happy path, not a guarantee
    // about what a socket returns — a proxy, a wrong port or a half-open connection can all
    // produce something else. Widening keeps the runtime check that actually matters.
    const reply: string = await this.redis.client.ping();
    if (reply !== 'PONG') {
      throw new Error(`redis replied ${reply} to PING`);
    }
    return 'ok';
  }
}
