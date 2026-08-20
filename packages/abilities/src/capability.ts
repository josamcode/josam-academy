import { subject } from '@casl/ability';

import type { AppAbility } from './define-abilities.js';
import { abilityActionFor, parsePermission } from './permission-key.js';

/**
 * `PH-1.11` — the capability contract. `05 §7`, `11 §1.3`–`§1.4`, `FEAT-017`, `BR-1107`–`BR-1113`.
 *
 * **This is the wire format of `PRIN-01`.** "The system never says *you don't have permission*"
 * is a promise about rendering, and it can only be kept if the server tells the client what is
 * available BEFORE the client draws anything. `_can` is that telling.
 *
 * ## Why the contract lives in this package and not in the API
 *
 * `BR-708` / `FEAT-018` — one definition, three consumers. The API produces `_can`; web and
 * mobile consume it and, where they need to reason ahead of a response, derive the identical
 * action list from the identical permission keys with {@link capabilityActionsFor}. Two
 * implementations of "which actions does a course have?" is two chances to disagree, and the
 * disagreement is a button that renders for someone the server will refuse.
 *
 * It is also what makes `BR-844` — "`_can` is never hand-written per endpoint" — structurally
 * true rather than a convention: the map is DERIVED from the permission registry, so adding a
 * permission extends the capability map of every endpoint returning that model, with no endpoint
 * edited.
 *
 * ## What this is not
 *
 * `BR-041` / `BR-714` — the hard `403` stays on every endpoint. `_can` is a UX layer, and nothing
 * here is ever consulted to decide whether a request proceeds.
 */

/**
 * `05 §7.3` — the fixed enumeration. `BR-706` / `BR-1110`: codes come from this list so a client
 * can special-case presentation without parsing text, in either language.
 *
 * Ten codes exactly. A new one is a change to `05 §7.3` first (`BR-1765`), never here first.
 */
export const ReasonCode = {
  /** Unlock rules unmet. UI shows the condition and a shortcut to it. */
  LESSON_LOCKED: 'LESSON_LOCKED',
  /** Content not owned. UI shows what grants access. */
  NO_ENTITLEMENT: 'NO_ENTITLEMENT',
  /** Access lapsed. UI invites reactivation. */
  ENTITLEMENT_EXPIRED: 'ENTITLEMENT_EXPIRED',
  /** AI or download limit reached. UI shows the reset date and any add-on. */
  QUOTA_EXHAUSTED: 'QUOTA_EXHAUSTED',
  /** Playing on an unbound device. UI offers a transfer request. */
  DEVICE_MISMATCH: 'DEVICE_MISMATCH',
  /** Already playing elsewhere. UI offers takeover. */
  CONCURRENT_STREAM: 'CONCURRENT_STREAM',
  /** Verification required. UI offers to resend. */
  EMAIL_UNVERIFIED: 'EMAIL_UNVERIFIED',
  /** Pending staff decision. UI shows the expected timeline — there is nothing to click. */
  AWAITING_APPROVAL: 'AWAITING_APPROVAL',
  /** Threshold not met (e.g. reviewing before enough of the course is done). */
  INSUFFICIENT_PROGRESS: 'INSUFFICIENT_PROGRESS',
  /**
   * Staff lacks the permission — **render nothing at all** (`BR-707`).
   *
   * Present because `05 §7.3` lists it, and excluded from everything serializable by
   * {@link EmittableReasonCode}. See that type for why the enum keeps a member it forbids.
   */
  PERMISSION_ABSENT: 'PERMISSION_ABSENT',
} as const;

export type ReasonCode = (typeof ReasonCode)[keyof typeof ReasonCode];

/**
 * Every reason code that may cross the wire — which is all of them except one.
 *
 * `BR-1111` / `BR-707`: `PERMISSION_ABSENT` is never returned. It is not a message with an empty
 * string for text; it is the ABSENCE of a message, because `PRIN-01` says the control is not
 * drawn and a drawn control saying "you may not" is the exact failure the principle exists to
 * prevent. A client that received it would have to decide what to render, and every choice it
 * could make is wrong.
 *
 * Modelling it as `Exclude<>` rather than by leaving it out of the enum is deliberate. Left out,
 * the codebase would silently disagree with `05 §7.3` and the next person reconciling the two
 * would "fix" it back in. Excluded here, the disagreement is stated: the code exists, and it is
 * **structurally incapable** of appearing in a {@link Reason}. `PERMISSION_ABSENT` in a `_reason`
 * is a compile error, and `CapabilityInterceptor` strips it at runtime as well, because the type
 * cannot reach a producer that builds its payload dynamically.
 */
export type EmittableReasonCode = Exclude<ReasonCode, typeof ReasonCode.PERMISSION_ABSENT>;

const EMITTABLE_REASON_CODES: ReadonlySet<string> = new Set(
  Object.values(ReasonCode).filter((code) => code !== ReasonCode.PERMISSION_ABSENT),
);

/**
 * The runtime half of {@link EmittableReasonCode}, for payloads the type system never saw.
 *
 * A producer assembling `_reason` from a database column, a queue message, or anything else typed
 * `string` gets no help from `Exclude<>`. This is the check that runs anyway. It is deliberately
 * derived from `ReasonCode` rather than written as a second list — two lists is how the enum and
 * its guard drift apart.
 */
export function isEmittableReasonCode(code: string): code is EmittableReasonCode {
  return EMITTABLE_REASON_CODES.has(code);
}

/**
 * `BR-1109` / `BR-1113` — bilingual fields are returned as objects, never pre-resolved to one
 * language. The client renders per its own locale, so switching language needs no refetch.
 */
export interface Bilingual {
  readonly ar: string;
  readonly en: string;
}

/**
 * The action offered alongside a denial. One variant per "Typical UI" column in `05 §7.3`; there
 * is no variant that does not answer a row of that table.
 *
 * | Variant     | Serves                                          | `05 §7.3` "Typical UI"      |
 * |-------------|-------------------------------------------------|-----------------------------|
 * | `navigate`  | `LESSON_LOCKED`, `INSUFFICIENT_PROGRESS`        | show condition + shortcut   |
 * | `purchase`  | `NO_ENTITLEMENT`, `QUOTA_EXHAUSTED`             | what grants access / add-on |
 * | `renew`     | `ENTITLEMENT_EXPIRED`                           | reactivation invitation     |
 * | `transfer`  | `DEVICE_MISMATCH`                               | offer transfer request      |
 * | `takeover`  | `CONCURRENT_STREAM`                             | offer takeover              |
 * | `resend`    | `EMAIL_UNVERIFIED`                              | resend action               |
 *
 * `AWAITING_APPROVAL` appears in no row: its UI is an expected timeline, and there is nothing for
 * the learner to press. That is the case {@link Reason.action}'s optionality exists for, and the
 * only one so far — `BR-1112` says the action is optional but strongly preferred, which is a
 * statement about how rarely this should be omitted.
 */
export type ReasonActionType =
  'navigate' | 'purchase' | 'renew' | 'transfer' | 'takeover' | 'resend';

export interface ReasonAction {
  readonly type: ReasonActionType;
  /** `BR-1109` — the button's own label, bilingual like everything else. */
  readonly label: Bilingual;
  /** Where the action goes: a route, a resource id, a product id. Interpreted per `type`. */
  readonly target: string;
}

/**
 * `BR-704` / `BR-1112` — why a capability is `false`, and what to do about it.
 *
 * Produced by the handler that knows the answer (entitlements, unlock rules, device state), never
 * by the interceptor: `CapabilityInterceptor` can see that a permission is absent and nothing
 * else, and a permission absence is the one cause that must NOT carry a reason (`BR-1111`).
 */
export interface Reason {
  readonly code: EmittableReasonCode;
  readonly message: Bilingual;
  readonly action?: ReasonAction;
}

/**
 * `11 §1.3` — the `_can` object. Keys are capability actions, values are plain booleans.
 *
 * `Record<string, boolean>` rather than a union of known actions on purpose: the key set is
 * derived from the permission registry at runtime (`BR-844`), and it also carries producer-supplied
 * capabilities that no permission key describes — `05 §7.2`'s locked lesson answers `play`,
 * `read_notes`, `download_resources` and `ask_question`, of which only `play` has a registry key.
 */
export type CapabilityMap = Readonly<Record<string, boolean>>;

/** A resource as it appears on the wire once the capability layer has run. `11 §1.3`–`§1.4`. */
export interface Capable {
  readonly _can: CapabilityMap;
  readonly _reason?: Reason;
}

/**
 * The capability actions a model has, derived from permission keys. `BR-844`, `BR-708`.
 *
 * Pure, and the reason `_can` is never hand-written per endpoint: give it the registry and a
 * model name and it yields exactly the questions worth asking about that model. Adding
 * `course:export` to the registry adds `export` to every course response with no endpoint touched
 * — and, just as importantly, REMOVING a permission removes the key, so a client cannot keep
 * rendering a control whose permission no longer exists.
 *
 * The scope mapping is {@link abilityActionFor}'s, which is what keeps this list and the ability
 * rules in step. `course:update.own` and `course:update.any` both produce `update` and deduplicate
 * to one entry — the record set is the ability's business, not the map's. `course:publish.request`
 * produces `publish.request`, which is a genuinely different question from `publish.approve`.
 *
 * Sorted so the output is stable: a `_can` whose key order varies between requests defeats HTTP
 * caching, response diffing, and every snapshot test written against it.
 */
export function capabilityActionsFor(model: string, keys: readonly string[]): readonly string[] {
  const actions = new Set<string>();

  for (const key of keys) {
    const parsed = parsePermission(key);
    if (parsed.model !== model) continue;
    actions.add(abilityActionFor(parsed));
  }

  return [...actions].sort();
}

/**
 * The per-record `_can`: may this actor do each action **to this record**?
 *
 * The record is copied before it is stamped as a CASL subject, and the copy is stripped of any
 * own `__caslSubjectType__` it arrived with. `subject()` returns the object it was given, with
 * the marker defined on it — verified on `@casl/ability` 7.0.1:
 *
 *     subject('course', input) === input                                    // true
 *     Object.getOwnPropertyDescriptor(o, '__caslSubjectType__')
 *       // { value: 'course', writable: false, enumerable: false, configurable: false }
 *
 * Two protections, one in each direction:
 *
 * **The copy protects the caller's object from the stamp.** The marker is non-configurable, so
 * stamping a handler's own object would permanently type it, and a repository returning a cached
 * or shared instance would carry that type into unrelated responses.
 *
 * **The strip protects the stamp from the caller's data.** The spread fails to copy only the
 * NON-ENUMERABLE marker CASL itself sets; an ENUMERABLE own `__caslSubjectType__` — stored JSON
 * echoed into a record, a client payload written through — IS copied, and `subject()` THROWS on
 * any mismatched value (strict inequality, so non-strings too) rather than restamps. `BR-041`
 * makes this the one layer that never fails a request, so the key is deleted from the copy
 * before stamping; the caller's record keeps its data untouched either way.
 */
export function capabilitiesForRecord(
  ability: AppAbility,
  model: string,
  actions: readonly string[],
  record: Readonly<Record<string, unknown>>,
): CapabilityMap {
  const copy: Record<string, unknown> = { ...record };
  delete copy['__caslSubjectType__'];

  const evaluated = subject(model, copy);
  const map: Record<string, boolean> = {};

  for (const action of actions) {
    map[action] = ability.can(action, evaluated);
  }

  return map;
}

/**
 * The collection-level `_can` (`BR-1108`): may this actor do each action **without reference to a
 * particular record**? `create` and `export` are the motivating cases.
 *
 * ## Why `ability.can(action, model)` is the wrong question
 *
 * Measured on `@casl/ability` 7.0.1, with `can('update', 'course', { owner_id: 'usr_7' })` as the
 * only rule:
 *
 *     ability.can('update', 'course')  === true
 *
 * CASL reads a bare string subject as "some record of this type", and a conditioned rule matches
 * it because there are no fields to test the condition against. That is the correct answer to
 * CASL's question — *is this conceivable?* — and the wrong answer to ours — *is this certain?*
 * An instructor holding only `course:update.own` would get `update: true` at the envelope root,
 * and under `PRIN-01` the client DRAWS THE BUTTON from that. The first record they press it on is
 * somebody else's course and the answer is a `403` the UI promised could not happen.
 *
 * ## So ask the rules instead
 *
 * `possibleRulesFor` returns the rules in CASL's own priority order — last defined first, verified
 * on 7.0.1. A rule carrying conditions cannot decide a record-free question in either direction,
 * so it is skipped rather than counted; the first UNCONDITIONED rule decides, and `inverted` marks
 * a revoke. No unconditioned rule means the question has no answer, which is deny (`BR-034`).
 *
 * This is CASL's own algorithm restricted to the rules that can speak, which is why it stays
 * correct when both a scoped and an unscoped grant exist for the same action, in either order:
 *
 *     own then any    -> true    (the unconditioned grant is reached)
 *     any then own    -> true    (the conditioned rule is skipped, not treated as an answer)
 *     any then revoke -> false   (the revoke is unconditioned and has priority)
 *     own then revoke -> false
 *     own only        -> false   (the case `ability.can` gets wrong)
 */
export function canWithoutRecord(ability: AppAbility, action: string, model: string): boolean {
  for (const rule of ability.possibleRulesFor(action, model)) {
    if (rule.conditions !== undefined) continue;
    return !rule.inverted;
  }

  return false;
}

/** {@link canWithoutRecord} across a derived action list — the collection-level `_can`. */
export function capabilitiesForCollection(
  ability: AppAbility,
  model: string,
  actions: readonly string[],
): CapabilityMap {
  const map: Record<string, boolean> = {};

  for (const action of actions) {
    map[action] = canWithoutRecord(ability, action, model);
  }

  return map;
}
