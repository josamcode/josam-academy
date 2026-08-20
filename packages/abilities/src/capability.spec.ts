import { subject } from '@casl/ability';
import { describe, expect, it } from 'vitest';

import {
  type Actor,
  capabilitiesForCollection,
  capabilitiesForRecord,
  capabilityActionsFor,
  canWithoutRecord,
  defineAbilitiesFor,
  isEmittableReasonCode,
  type Reason,
  ReasonCode,
} from './index.js';

/**
 * `PH-1.11` — the capability contract. `05 §7`, `11 §1.3`–`§1.4`, `BR-1107`–`BR-1113`.
 *
 * These specs assert the two things a consumer depends on and cannot see: that the derived action
 * list matches the permission registry's own scope taxonomy, and that the collection-level answer
 * is the CERTAIN one rather than CASL's CONCEIVABLE one.
 */

const actor = (over: Partial<Actor> = {}): Actor => ({
  id: 'usr_1',
  role: 'student',
  permissions: [],
  revokedPermissions: [],
  ...over,
});

describe('ReasonCode (05 §7.3, BR-706, BR-1110)', () => {
  it('is exactly the ten codes of 05 §7.3, in that order', () => {
    // Asserted whole. Membership checks pass while a code is missing, and the enumeration being
    // FIXED is the entire reason clients may special-case presentation on it.
    expect(Object.keys(ReasonCode)).toEqual([
      'LESSON_LOCKED',
      'NO_ENTITLEMENT',
      'ENTITLEMENT_EXPIRED',
      'QUOTA_EXHAUSTED',
      'DEVICE_MISMATCH',
      'CONCURRENT_STREAM',
      'EMAIL_UNVERIFIED',
      'AWAITING_APPROVAL',
      'INSUFFICIENT_PROGRESS',
      'PERMISSION_ABSENT',
    ]);
  });

  it('every code is its own key — the wire value is the name', () => {
    for (const [name, value] of Object.entries(ReasonCode)) {
      expect(value).toBe(name);
    }
  });
});

describe('PERMISSION_ABSENT is unserializable by construction (BR-1111, BR-707)', () => {
  it('does not type-check inside a Reason', () => {
    const forbidden: Reason = {
      // @ts-expect-error BR-1111 — PERMISSION_ABSENT is excluded from EmittableReasonCode, so a
      // _reason can never carry it. If this line ever compiles, the exclusion has been lost and
      // this spec fails loudly rather than the guarantee disappearing quietly.
      code: ReasonCode.PERMISSION_ABSENT,
      message: { ar: 'لا يوجد', en: 'nothing' },
    };

    // The runtime value is real — the type is the only thing standing in its way, which is why
    // the runtime guard below has to exist as well.
    expect(forbidden.code).toBe('PERMISSION_ABSENT');
  });

  it('is rejected by the runtime guard, for producers the type system never saw', () => {
    expect(isEmittableReasonCode(ReasonCode.PERMISSION_ABSENT)).toBe(false);
  });

  it('accepts the other nine codes and nothing else', () => {
    for (const code of Object.values(ReasonCode)) {
      expect(isEmittableReasonCode(code)).toBe(code !== ReasonCode.PERMISSION_ABSENT);
    }
    expect(isEmittableReasonCode('permission_absent')).toBe(false);
    expect(isEmittableReasonCode('SOMETHING_ELSE')).toBe(false);
    expect(isEmittableReasonCode('')).toBe(false);
  });
});

describe('capabilityActionsFor (BR-844, BR-708)', () => {
  const keys = [
    'course:read',
    'course:create',
    'course:update.own',
    'course:update.any',
    'course:publish.request',
    'course:publish.approve',
    'user:read',
    'user:read.pii',
  ];

  it('derives a model’s actions from the registry, deduplicated and sorted', () => {
    // `update.own` and `update.any` are the same capability over different record sets, so they
    // collapse to one key; `publish.request` and `publish.approve` are different capabilities and
    // must not.
    expect(capabilityActionsFor('course', keys)).toEqual([
      'create',
      'publish.approve',
      'publish.request',
      'read',
      'update',
    ]);
  });

  it('ignores every other model', () => {
    expect(capabilityActionsFor('user', keys)).toEqual(['read', 'read.pii']);
    expect(capabilityActionsFor('invoice', keys)).toEqual([]);
  });

  it('is stable across calls — a varying key order defeats caching and diffing', () => {
    expect(capabilityActionsFor('course', keys)).toEqual(capabilityActionsFor('course', keys));
    expect(capabilityActionsFor('course', [...keys].reverse())).toEqual(
      capabilityActionsFor('course', keys),
    );
  });

  it('throws on a malformed key rather than skipping it', () => {
    // A skipped key is a capability silently missing from every response for that model.
    expect(() => capabilityActionsFor('course', ['course:read', 'not a key'])).toThrow(/malformed/);
  });
});

describe('capabilitiesForRecord (05 §7.1)', () => {
  const actions = ['delete', 'read', 'update'];

  it('answers each action against the record, honouring `.own`', () => {
    const ability = defineAbilitiesFor(
      actor({ id: 'usr_7', permissions: ['course:read', 'course:update.own'] }),
    );

    expect(
      capabilitiesForRecord(ability, 'course', actions, { id: 'c1', owner_id: 'usr_7' }),
    ).toEqual({ delete: false, read: true, update: true });
    expect(
      capabilitiesForRecord(ability, 'course', actions, { id: 'c2', owner_id: 'usr_9' }),
    ).toEqual({ delete: false, read: true, update: false });
  });

  it('does not mutate the record it was given', () => {
    // `subject()` stamps a NON-CONFIGURABLE type onto the object it receives, so stamping a
    // handler's own object would permanently type it — and a repository returning a cached or
    // shared instance would carry that type into an unrelated response.
    const ability = defineAbilitiesFor(actor({ permissions: ['course:read'] }));
    const record = { id: 'c1', owner_id: 'usr_7' };

    capabilitiesForRecord(ability, 'course', actions, record);

    expect(Object.getOwnPropertyDescriptor(record, '__caslSubjectType__')).toBeUndefined();
    expect(Object.getOwnPropertyNames(record)).toEqual(['id', 'owner_id']);
  });

  it('evaluates a record already carrying an enumerable __caslSubjectType__ (BR-041)', () => {
    // The shallow spread fails to copy only the NON-ENUMERABLE marker CASL itself sets. An
    // ENUMERABLE own `__caslSubjectType__` — stored JSON echoed into a record, a client payload
    // written through — IS copied, and `subject()` THROWS on a mismatched value rather than
    // restamps. That throw would surface as a 500 from the one layer whose contract (`BR-041`)
    // is that it never fails a request. The key must be stripped from the copy before stamping —
    // and only from the copy: the caller's record keeps its data untouched.
    const ability = defineAbilitiesFor(
      actor({ id: 'usr_7', permissions: ['course:read', 'course:update.own'] }),
    );
    const record = { id: 'c1', owner_id: 'usr_7', __caslSubjectType__: 'user' };

    // Evaluated NORMALLY — `.own` still tested against the record's fields, not merely "did not
    // throw".
    expect(capabilitiesForRecord(ability, 'course', actions, record)).toEqual({
      delete: false,
      read: true,
      update: true,
    });
    expect(record.__caslSubjectType__).toBe('user');
    expect(Object.getOwnPropertyDescriptor(record, '__caslSubjectType__')?.enumerable).toBe(true);
  });

  it('…including a non-string value, which CASL also throws on (strict inequality)', () => {
    const ability = defineAbilitiesFor(actor({ permissions: ['course:read'] }));
    const record = { id: 'c1', __caslSubjectType__: 42 };

    expect(capabilitiesForRecord(ability, 'course', actions, record)).toEqual({
      delete: false,
      read: true,
      update: false,
    });
    expect(record.__caslSubjectType__).toBe(42);
  });

  it('returns a plain map with no CASL marker on it', () => {
    const ability = defineAbilitiesFor(actor({ permissions: ['course:read'] }));
    const map = capabilitiesForRecord(ability, 'course', actions, { id: 'c1' });

    expect(JSON.stringify(map)).not.toContain('__caslSubjectType__');
    expect(Object.getOwnPropertyNames(map)).toEqual(actions);
  });

  /**
   * A library-version guarantee, pinned here rather than assumed.
   *
   * `capabilitiesForRecord` copies before stamping, so a `__caslSubjectType__` leak into a
   * response is structurally impossible regardless of what CASL does. This spec covers the OTHER
   * half — anything that stamps a subject and serializes it relies on the marker being
   * non-enumerable, and that is a property of `@casl/ability` 7.0.1, not of our code.
   */
  it('CASL 7.0.1 defines __caslSubjectType__ non-enumerably', () => {
    const stamped = subject('course', { id: 'crs_1', owner_id: 'usr_1' });

    expect(JSON.stringify(stamped)).toBe('{"id":"crs_1","owner_id":"usr_1"}');
    expect(Object.keys(stamped)).toEqual(['id', 'owner_id']);
    expect(Object.getOwnPropertyDescriptor(stamped, '__caslSubjectType__')?.enumerable).toBe(false);
  });
});

describe('canWithoutRecord — the collection-level question (BR-1108)', () => {
  /**
   * The measurement this function exists for, on `@casl/ability` 7.0.1: with an `own`-scoped rule
   * as the only rule, `ability.can('update', 'course')` returns **true**. CASL reads a bare string
   * subject as "some record of this type" and a conditioned rule matches it, because there are no
   * fields to test the condition against. Under `PRIN-01` the client draws the button from that.
   */
  it('an `own`-scoped grant alone answers NO — and CASL’s own check answers yes', () => {
    const ability = defineAbilitiesFor(actor({ id: 'usr_7', permissions: ['course:update.own'] }));

    expect(ability.can('update', 'course')).toBe(true); // CASL: conceivable
    expect(canWithoutRecord(ability, 'update', 'course')).toBe(false); // ours: not certain
  });

  it('an unscoped grant answers YES', () => {
    const ability = defineAbilitiesFor(actor({ permissions: ['course:create'] }));
    expect(canWithoutRecord(ability, 'create', 'course')).toBe(true);
  });

  it('a `.any` grant answers YES — it is unconditioned (BR-033)', () => {
    const ability = defineAbilitiesFor(actor({ permissions: ['course:update.any'] }));
    expect(canWithoutRecord(ability, 'update', 'course')).toBe(true);
  });

  it('a scoped and an unscoped grant answer YES in EITHER definition order', () => {
    // The reason conditioned rules are skipped rather than treated as an answer: `possibleRulesFor`
    // returns them in definition-priority order, and whichever the actor's permission array
    // happens to list first must not decide the record-free question.
    const ownFirst = defineAbilitiesFor(
      actor({ permissions: ['course:update.own', 'course:update.any'] }),
    );
    const anyFirst = defineAbilitiesFor(
      actor({ permissions: ['course:update.any', 'course:update.own'] }),
    );

    expect(canWithoutRecord(ownFirst, 'update', 'course')).toBe(true);
    expect(canWithoutRecord(anyFirst, 'update', 'course')).toBe(true);
  });

  it('a revoke answers NO, whatever it revoked (BR-038)', () => {
    const overAny = defineAbilitiesFor(
      actor({ permissions: ['course:update.any'], revokedPermissions: ['course:update'] }),
    );
    const overOwn = defineAbilitiesFor(
      actor({ permissions: ['course:update.own'], revokedPermissions: ['course:update'] }),
    );

    expect(canWithoutRecord(overAny, 'update', 'course')).toBe(false);
    expect(canWithoutRecord(overOwn, 'update', 'course')).toBe(false);
  });

  it('no rule at all answers NO (BR-034)', () => {
    const ability = defineAbilitiesFor(actor({ permissions: ['order:read'] }));
    expect(canWithoutRecord(ability, 'create', 'course')).toBe(false);
  });

  it('super_admin answers YES to everything (BR-639)', () => {
    const ability = defineAbilitiesFor(actor({ role: 'super_admin' }));
    expect(canWithoutRecord(ability, 'create', 'course')).toBe(true);
    expect(canWithoutRecord(ability, 'publish.approve', 'course')).toBe(true);
  });
});

describe('capabilitiesForCollection (BR-1108)', () => {
  it('reports create but not an `own`-scoped update', () => {
    // The whole point of a collection-level map: `create` needs no record, `update.own` needs one.
    const ability = defineAbilitiesFor(
      actor({ id: 'usr_7', permissions: ['course:create', 'course:read', 'course:update.own'] }),
    );

    expect(capabilitiesForCollection(ability, 'course', ['create', 'read', 'update'])).toEqual({
      create: true,
      read: true,
      update: false,
    });
  });
});
