import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { loadEnv } from './config/env.js';

async function bootstrap(): Promise<void> {
  // Before the container is built: a missing or malformed variable stops the process here,
  // not at first use in production (BR-943, BR-1678).
  const env = loadEnv();

  const app = await NestFactory.create(AppModule, { abortOnError: false });
  await app.listen(env.PORT);

  // Structured logging with correlation IDs replaces this at PH-0.19 (Pino).
  console.log(`api listening on ${String(env.PORT)} [${env.NODE_ENV}]`);
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
