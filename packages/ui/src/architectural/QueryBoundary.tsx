'use client';

import type { ReactNode } from 'react';

/**
 * `QueryBoundary` — `DEC-41`, `BR-1535`–`BR-1538`.
 *
 * `BR-1416`, the state matrix, is the rule most likely to be forgotten under deadline, so it is
 * made **structurally impossible to skip**: `loading`, `empty` and `error` are required props and
 * omitting one is `TS2741`, proven by compiling the violation in `verify-fitness.sh`.
 *
 * `BR-1818` — TanStack Query is used **directly**, with no wrapper over it. This component is not
 * an abstraction over the library; it is the state matrix the library leaves to the caller.
 */

/**
 * The slice of TanStack Query's `UseQueryResult` this component reads.
 *
 * Structural, so a `useQuery` result satisfies it without a cast and a test can construct one
 * without a `QueryClient` — but the specs use the real library anyway, because the point is to
 * assert this against TanStack Query's actual refetch and error behaviour rather than against my
 * reading of it.
 */
export interface QueryLike<Data> {
  data: Data | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  /**
   * `BR-1537` — re-runs the failed request only. Never a page reload: a reload discards every
   * other query on the screen, the scroll position, and any half-filled form, to retry one call.
   */
  refetch: () => void;
}

export interface QueryBoundaryProps<Data> {
  query: QueryLike<Data>;
  /** `BR-1536` — required. */
  loading: ReactNode;
  /** `BR-1536` — required. Rendered when the request succeeded and returned nothing. */
  empty: ReactNode;
  /** `BR-1536` — required. Receives the error and a retry that re-runs this request only. */
  error: (error: unknown, retry: () => void) => ReactNode;
  /**
   * Decides emptiness. Defaults to "an array with no items".
   *
   * A default rather than a required prop because the overwhelming majority of queries return a
   * list, and a required predicate on every call site is the kind of ceremony people route around.
   */
  isEmpty?: (data: Data) => boolean;
  children: (data: Data) => ReactNode;
}

function defaultIsEmpty(data: unknown): boolean {
  return Array.isArray(data) && data.length === 0;
}

/**
 * State order is the whole design, and it is not the obvious one.
 *
 * The obvious order is loading → error → empty → data, which is what `isPending`/`isError`/`data`
 * suggest reading in. It is wrong in two places, and both come from `BR-1538` — previously loaded
 * data survives a background refresh **and** an error:
 *
 *  1. **Data before error.** A list that loaded fine and then failed to refresh must keep showing
 *     the list. Replacing a working table with a full-page error because a background poll timed
 *     out is a worse outcome than the stale row count, and it discards the user's scroll position
 *     and selection along with it. So the error state renders only when there is nothing to show.
 *  2. **Data before loading.** `isPending` is false during a background refetch precisely so this
 *     works, but `isFetching` is true, and reaching for that instead swaps the table for a skeleton
 *     on every poll. Reading `isPending` is deliberate.
 */
export function QueryBoundary<Data>({
  query,
  loading,
  empty,
  error,
  isEmpty,
  children,
}: QueryBoundaryProps<Data>) {
  const { data } = query;

  if (data !== undefined) {
    const check = isEmpty ?? defaultIsEmpty;
    if (check(data)) return <>{empty}</>;
    return <>{children(data)}</>;
  }

  if (query.isError) {
    return <>{error(query.error, query.refetch)}</>;
  }

  if (query.isPending) {
    return <>{loading}</>;
  }

  // Not pending, not errored, and no data. Reachable when a query is disabled, and rendering the
  // loading state is the honest answer: nothing has been asked for yet.
  return <>{loading}</>;
}
