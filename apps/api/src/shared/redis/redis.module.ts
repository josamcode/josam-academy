import { Global, Module } from '@nestjs/common';

import { RedisHealthIndicator } from './redis-health.indicator.js';
import { RedisService } from './redis.service.js';

/**
 * Global, like DatabaseModule, so the queue and rate limiter in later phases inject RedisService
 * without re-importing this.
 *
 * No import of modules/health — the indicator registers into shared/health's registry, which sits
 * beneath both. See shared/health/health-registry.ts for why that direction matters (`PH-0.16`).
 */
@Global()
@Module({
  providers: [RedisService, RedisHealthIndicator],
  exports: [RedisService],
})
export class RedisModule {}
