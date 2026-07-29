import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

import { loadEnv } from '../../config/env.js';

/**
 * The Redis connection.
 *
 * `PH-0.30`, and it should have been `PH-0.5`. `SB-16` said the Redis health indicator ships in
 * the same task that installs `ioredis` — never "later" — and then neither happened. `GET /health`
 * reported `status: ok` while checking one dependency of the two the compose stack runs, which is
 * `BR-892`'s exact prohibition: a health endpoint that omits a dependency the reader believes is
 * being watched is worse than one that never claimed to check it.
 *
 * `lazyConnect` so constructing the service does not open a socket. The connection opens on first
 * use — which, for now, is the health check itself.
 *
 * `maxRetriesPerRequest: 1` because this connection exists to answer "is Redis reachable". A
 * client that retries for thirty seconds turns a health check into a timeout, and a health check
 * that hangs is indistinguishable from an application that has.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor() {
    // `loadEnv()` rather than an injected config service, matching observability.module.ts. The
    // schema has already validated at boot; this re-reads the validated shape, it does not parse
    // process.env a second time in an unchecked way.
    const env = loadEnv();
    this.client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      /**
       * Backs off, but NEVER gives up.
       *
       * The first version returned `null` after three attempts to stop development log spam.
       * ioredis treats `null` as "stop reconnecting" permanently, so `GET /health` reported
       * `redis: error` for the rest of the process's life after any transient outage — proven by
       * stopping the container, seeing `degraded`, restarting it, and watching it stay `degraded`.
       *
       * A health check that cannot recover is worse than no health check: it trains whoever reads
       * it to ignore the field. Spam is bounded by the 2 s ceiling instead.
       */
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });

    this.client.on('error', (error: Error) => {
      // Logged, not thrown. A Redis that is down must show up in `GET /health`, not take the
      // process with it — the health endpoint is the mechanism for reporting this.
      this.logger.warn(`redis: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    // `quit` rather than `disconnect`: it drains in-flight commands instead of severing them.
    await this.client.quit().catch(() => this.client.disconnect());
  }
}
