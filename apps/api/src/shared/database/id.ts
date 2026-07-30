import { ulid } from 'ulid';

/**
 * Prefixed ULIDs — `DEC-29`, `10 §1.1`.
 *
 * Identifiers are `TEXT`, generated here rather than by the database. Two reasons the spec gives,
 * and one it does not:
 *
 *   - ULIDs are time-sortable, so index locality is far better than random UUIDs
 *   - the prefix makes every identifier self-describing in a log line, a support conversation or
 *     an error report — `ord_01HQ…` is recognisable without a lookup
 *   - generating in application code means an entity has its identity BEFORE it is persisted,
 *     which is what lets a correlation ID reference a row that a failed transaction rolled back
 *
 * The prefix table is `10 §1.1`. It is exhaustive for the whole project, not only for `M01`, so
 * later phases add usages rather than entries.
 */
export const ID_PREFIX = {
  user: 'usr',
  role: 'rol',
  product: 'prd',
  course: 'crs',
  lesson: 'lsn',
  resource: 'res',
  question: 'qst',
  certificate: 'crt',
  ticket: 'tkt',
  order: 'ord',
  transaction: 'txn',
  entitlement: 'ent',
  section: 'sec',
  noteBlock: 'blk',
  quiz: 'qz',
  attempt: 'att',
  device: 'dev',
  conversation: 'cnv',
} as const;

export type IdKind = keyof typeof ID_PREFIX;

/**
 * `newId('user')` → `usr_01HQZX9K2M4N8P6R3T5V7W9Y1B`.
 *
 * The `IdKind` parameter is not cosmetic: it is what stops `newId()` being callable with a
 * free-form string, which is how prefix drift starts. A typo is a compile error, not a row.
 */
export function newId(kind: IdKind): string {
  return `${ID_PREFIX[kind]}_${ulid()}`;
}

/**
 * Tables whose rows are not domain entities — tokens, codes, activity — still need identifiers.
 * `10 §1.1` assigns them no prefix, so they take a bare ULID rather than an invented one: an
 * unlisted prefix would be a convention this codebase made up and the specification does not know.
 */
export function newUnprefixedId(): string {
  return ulid();
}
