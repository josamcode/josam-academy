/**
 * Our error-tracking surface. `BR-1599` — no vendor SDK is imported outside `shared/providers`,
 * and `13 §1` filter 5 requires every external dependency to sit behind an interface.
 *
 * Only `sentry.error-tracker.ts` imports `@sentry/node`. Nothing above this directory knows
 * which tracker is in use, or whether one is configured at all.
 */
export interface ErrorContext {
  /** BR-630 — every report carries the correlation ID that matches the log entry. */
  correlationId: string;
  userId?: string;
  route?: string;
  /** BR-629 — grouping key, so one recurring error does not become hundreds of alerts. */
  fingerprint?: string[];
}

export interface ErrorTracker {
  /** Returns the tracker's own event id when it has one, otherwise null. */
  capture(error: unknown, context: ErrorContext): string | null;
  readonly enabled: boolean;
}

export const ERROR_TRACKER = Symbol('ERROR_TRACKER');
