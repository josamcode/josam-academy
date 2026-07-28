import { Global, type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { loadEnv } from '../../config/env.js';
import { ErrorTrackerModule } from '../providers/error-tracker/error-tracker.module.js';
import { CorrelationMiddleware } from './correlation/correlation.middleware.js';
import { AllExceptionsFilter } from './filters/all-exceptions.filter.js';
import { AppLogger } from './logging/logger.service.js';

@Global()
@Module({
  imports: [ErrorTrackerModule],
  providers: [
    {
      provide: AppLogger,
      useFactory: () => {
        const env = loadEnv();
        return new AppLogger({ level: env.LOG_LEVEL, version: env.APP_VERSION });
      },
    },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
  exports: [AppLogger],
})
export class ObservabilityModule implements NestModule {
  /**
   * Applied to every route. The correlation ID has to be established before anything else runs,
   * including the guards and the exception filter — a request that fails in a guard still needs
   * to be traceable (BR-627).
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware).forRoutes('*splat');
  }
}
