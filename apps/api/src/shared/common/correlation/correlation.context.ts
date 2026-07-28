import { AsyncLocalStorage } from 'node:async_hooks';

import { ulid } from 'ulid';

export interface CorrelationStore {
  readonly correlationId: string;
  userId?: string;
}

/**
 * BR-627 — every request and job carries a correlation ID, so one learner's issue is traceable
 * end to end.
 *
 * AsyncLocalStorage rather than a request-scoped Nest provider: request scope forces Nest to
 * instantiate the whole dependency subtree per request, and it does not reach code that is not
 * part of the injector at all — a queue worker, a domain event handler, a `setTimeout`. The
 * correlation ID has to survive all of those, because "end to end" includes the job that the
 * request enqueued (`BR-627` names jobs explicitly).
 */
const storage = new AsyncLocalStorage<CorrelationStore>();

/** Prefixed ULID, matching the `req_01HQZX...` form in `11 §1.5`. */
export function newCorrelationId(): string {
  return `req_${ulid()}`;
}

export function runWithCorrelation<T>(store: CorrelationStore, fn: () => T): T {
  return storage.run(store, fn);
}

export function getCorrelationStore(): CorrelationStore | undefined {
  return storage.getStore();
}

/**
 * Never throws and never returns empty. A log line without a correlation ID is worse than one
 * with a synthetic marker, because it looks like it was simply not traced.
 */
export function getCorrelationId(): string {
  return storage.getStore()?.correlationId ?? 'req_out-of-band';
}

/**
 * Set once the request is authenticated. `FEAT-217` requires user ID among the log fields; the
 * guard that populates it is Phase 1, so today this is only ever called by tests.
 */
export function setCorrelationUser(userId: string): void {
  const store = storage.getStore();
  if (store) store.userId = userId;
}
