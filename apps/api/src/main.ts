import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { loadEnv } from './config/env.js';
import { AppLogger } from './shared/common/logging/logger.service.js';

async function bootstrap(): Promise<void> {
  // Before the container is built: a missing or malformed variable stops the process here,
  // not at first use in production (BR-943, BR-1678).
  const env = loadEnv();

  // `bufferLogs` holds Nest's own startup output until AppLogger is resolved from the container,
  // then replays it through Pino. Without it the first few lines — the ones that say what the
  // process is doing before it can serve anything — are the only unstructured logs in the system,
  // which is exactly the set you want structured when a boot fails in production.
  const app = await NestFactory.create(AppModule, { abortOnError: false, bufferLogs: true });
  app.useLogger(app.get(AppLogger));

  app.enableShutdownHooks();
  await app.listen(env.PORT);

  const logger = app.get(AppLogger);
  logger.event('info', 'api.started', {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    logLevel: env.LOG_LEVEL,
    // Whether reports leave the machine, without ever echoing the DSN itself.
    errorTracking: env.SENTRY_DSN ? 'enabled' : 'disabled (no SENTRY_DSN)',
  });
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
