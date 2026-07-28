import * as Sentry from '@sentry/node';

import type { ErrorContext, ErrorTracker } from './error-tracker.interface.js';

/**
 * The ONLY file in the codebase permitted to import `@sentry/node` (`BR-1599`).
 *
 * Deliberately inert without a DSN. `SENTRY_DSN` is a credential the founder holds; this task
 * wires the integration but never requests, stores or echoes the value. With no DSN the tracker
 * reports `enabled: false` and every capture is a no-op that still returns cleanly, so the
 * exception filter behaves identically in development and production — the difference is only
 * whether the report leaves the machine.
 */
export class SentryErrorTracker implements ErrorTracker {
  readonly enabled: boolean;

  constructor(dsn: string | undefined, environment: string, release: string) {
    this.enabled = Boolean(dsn);

    if (!this.enabled) return;

    Sentry.init({
      dsn,
      environment,
      release,

      // BR-628 — bounded volume. Traces are off entirely: on 2 vCPU the sampling overhead buys
      // nothing Phase 0 can read, and the free tier's 5k events (13 §8) are for errors.
      tracesSampleRate: 0,

      // BR-626 — never send PII. Sentry's default is already false; it is stated explicitly
      // because a later reader must not have to know the default to trust the claim.
      sendDefaultPii: false,
    });
  }

  capture(error: unknown, context: ErrorContext): string | null {
    if (!this.enabled) return null;

    return Sentry.withScope((scope) => {
      // BR-630 — the correlation ID travels with the report, so a log line and an alert can be
      // joined without guessing.
      scope.setTag('correlation_id', context.correlationId);
      if (context.userId) scope.setUser({ id: context.userId });
      if (context.route) scope.setTag('route', context.route);

      // BR-629 — explicit fingerprint so recurring errors group into one issue.
      if (context.fingerprint) scope.setFingerprint(context.fingerprint);

      return Sentry.captureException(error);
    });
  }
}
