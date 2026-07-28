import { Global, Module } from '@nestjs/common';

import { loadEnv } from '../../../config/env.js';
import { ERROR_TRACKER } from './error-tracker.interface.js';
import { SentryErrorTracker } from './sentry.error-tracker.js';

@Global()
@Module({
  providers: [
    {
      provide: ERROR_TRACKER,
      useFactory: () => {
        const env = loadEnv();
        return new SentryErrorTracker(env.SENTRY_DSN, env.NODE_ENV, env.APP_VERSION);
      },
    },
  ],
  exports: [ERROR_TRACKER],
})
export class ErrorTrackerModule {}
