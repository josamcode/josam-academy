import { describe, expect, it } from 'vitest';

import {
  abilityActionFor,
  type Actor,
  DATA_SCOPES,
  defineAbilitiesFor,
  parsePermission,
} from './index.js';

/**
 * `PH-1.9` — the shared ability definition. The task's output is **"same rules on both sides"**,
 * so these specs assert the RULES, and `BR-708` (no backend dependency) is asserted structurally
 * by fitness case 46 rather than here.
 */

const actor = (over: Partial<Actor> = {}): Actor => ({
  id: 'usr_1',
  role: 'student',
  permissions: [],
  revokedPermissions: [],
  ...over,
});

describe('PH-1.9 — parsePermission (05 §5)', () => {
  it('parses both key shapes', () => {
    expect(parsePermission('role:read')).toEqual({ model: 'role', action: 'read', scope: null });
    expect(parsePermission('course:update.own')).toEqual({
      model: 'course',
      action: 'update',
      scope: 'own',
    });
  });

  it('THROWS on a malformed key rather than parsing it partially', () => {
    // A partial parse produces a rule matching nothing, which reads as "this actor lacks the
    // permission" — a denial nobody can trace back to a typo.
    expect(() => parsePermission('nonsense')).toThrow(/malformed permission key/);
    expect(() => parsePermission('Course:Read')).toThrow(/malformed/);
    expect(() => parsePermission('')).toThrow(/malformed/);
    expect(() => parsePermission('a:b.c.d')).toThrow(/malformed/);
  });
});

describe('PH-1.9 — defineAbilitiesFor (05 §8)', () => {
  it('denies by default — an actor with no permissions can do nothing', () => {
    const ability = defineAbilitiesFor(actor());
    expect(ability.can('read', 'course')).toBe(false);
    expect(ability.can('update', 'course')).toBe(false);
  });

  it('grants an unscoped permission', () => {
    const ability = defineAbilitiesFor(actor({ permissions: ['course:read'] }));
    expect(ability.can('read', 'course')).toBe(true);
    // …and nothing adjacent.
    expect(ability.can('update', 'course')).toBe(false);
    expect(ability.can('read', 'order')).toBe(false);
  });

  describe('super_admin (BR-963, BR-639)', () => {
    it('can do everything without a single stored permission', () => {
      // Its permissions are implicit and never stored as rows, so an empty array must NOT mean
      // a total lockout for this role.
      const ability = defineAbilitiesFor(actor({ role: 'super_admin' }));
      expect(ability.can('read', 'course')).toBe(true);
      expect(ability.can('delete', 'user')).toBe(true);
      expect(ability.can('anything', 'at_all')).toBe(true);
    });

    it('is not affected by revokes — implicit authority is not row-derived', () => {
      const ability = defineAbilitiesFor(
        actor({ role: 'super_admin', revokedPermissions: ['course:delete'] }),
      );
      expect(ability.can('delete', 'course')).toBe(true);
    });
  });

  describe('scope (05 §5)', () => {
    it('`.own` grants only where owner_id matches the actor', () => {
      const ability = defineAbilitiesFor(actor({ permissions: ['course:update.own'] }));
      expect(ability.can('update', { __caslSubjectType__: 'course' })).toBe(false);
    });

    it('`.own` matches a subject carrying the actor id', () => {
      const ability = defineAbilitiesFor(
        actor({ id: 'usr_7', permissions: ['course:update.own'] }),
      );
      const mine = { __caslSubjectType__: 'course', owner_id: 'usr_7' };
      const theirs = { __caslSubjectType__: 'course', owner_id: 'usr_9' };
      expect(ability.can('update', mine)).toBe(true);
      expect(ability.can('update', theirs)).toBe(false);
    });

    it('`.any` is unscoped', () => {
      const ability = defineAbilitiesFor(actor({ permissions: ['session:delete.any'] }));
      expect(ability.can('delete', 'session')).toBe(true);
    });
  });

  describe('resolution order — revoke beats grant (BR-038)', () => {
    it('a revoke overrides a grant for the same model and action', () => {
      const ability = defineAbilitiesFor(
        actor({ permissions: ['course:delete'], revokedPermissions: ['course:delete'] }),
      );
      expect(ability.can('delete', 'course')).toBe(false);
    });

    /**
     * The ordering is the implementation of `BR-038`, not an incidental detail. CASL's last
     * matching rule wins, so every `cannot` must be added after every `can` — reverse the loops
     * and a revoke becomes a no-op whenever a later grant touches the same model.
     */
    it('the revoke wins REGARDLESS of the order the permissions appear in', () => {
      const ability = defineAbilitiesFor(
        actor({
          permissions: ['course:read', 'course:delete', 'course:update'],
          revokedPermissions: ['course:delete'],
        }),
      );
      expect(ability.can('delete', 'course')).toBe(false);
      // …and leaves the neighbours alone.
      expect(ability.can('read', 'course')).toBe(true);
      expect(ability.can('update', 'course')).toBe(true);
    });

    it('a revoke removes a SCOPED grant entirely, not just the unowned part', () => {
      // 05 §5's override table revokes a capability outright. A scoped revoke would leave the
      // actor able to act on everyone else's records, inverting the intent.
      const ability = defineAbilitiesFor(
        actor({
          id: 'usr_7',
          permissions: ['course:update.own'],
          revokedPermissions: ['course:update'],
        }),
      );
      expect(ability.can('update', { __caslSubjectType__: 'course', owner_id: 'usr_7' })).toBe(
        false,
      );
    });

    it('a revoke for a permission never granted is harmless', () => {
      const ability = defineAbilitiesFor(
        actor({ permissions: ['course:read'], revokedPermissions: ['order:refund'] }),
      );
      expect(ability.can('read', 'course')).toBe(true);
      expect(ability.can('refund', 'order')).toBe(false);
    });
  });

  it('propagates a malformed key rather than silently dropping the rule', () => {
    // Dropping it would produce an actor missing one capability with no error anywhere.
    expect(() => defineAbilitiesFor(actor({ permissions: ['not a key'] }))).toThrow(/malformed/);
  });
});

describe('PH-1.11 — a qualifier scope is a DIFFERENT capability (05 §5, BR-035)', () => {
  /**
   * Until `PH-1.11`, `defineAbilitiesFor` special-cased `own` and registered every other scope
   * under the BARE action, so `model:action.qualifier` collapsed onto `model:action`. Each pair
   * below fails against that implementation — the second expectation of each was `true` — and the
   * failure was not a lint-visible one: the code read as correct and the rules were wrong.
   *
   * Both directions matter and only one of them is obvious. The loud half is over-granting: the
   * holder of a request permission read as the approver. The quiet half is that the qualified
   * capability was never registered under any action at all, so nothing could ASK for it and
   * every asker got `false` for a permission the actor holds. `_can` is built out of that
   * question, which is why this had to be fixed before the interceptor could exist.
   */

  it('COLLISION 1 — `user:read` does not confer `read.pii` (BR-035, BR-644)', () => {
    const ability = defineAbilitiesFor(actor({ permissions: ['user:read'] }));
    expect(ability.can('read', 'user')).toBe(true);
    expect(ability.can('read.pii', 'user')).toBe(false);
  });

  it('COLLISION 2 — `user:read.pii` does not confer `user:read` (BR-035)', () => {
    // "PII always requires its own explicit permission" (05 §5) is a statement in both
    // directions: the qualified key is its own permission, so it grants its own capability and
    // nothing else. Every role in `05 §4` that holds `.pii` holds the base key too, so no role
    // loses anything by the two being independent.
    const ability = defineAbilitiesFor(actor({ permissions: ['user:read.pii'] }));
    expect(ability.can('read.pii', 'user')).toBe(true);
    expect(ability.can('read', 'user')).toBe(false);
  });

  it('COLLISION 3 — `course:publish.request` is not `course:publish` (BR-657)', () => {
    // The worst of the five. `05 §4.5` gives `course:publish.request` to instructors and content
    // assistants; `course:publish.approve` is ROLE-01's alone. Collapsed, the asker read as the
    // approver — and there is no bare `course:publish` in the registry for it to have meant.
    const ability = defineAbilitiesFor(actor({ permissions: ['course:publish.request'] }));
    expect(ability.can('publish.request', 'course')).toBe(true);
    expect(ability.can('publish', 'course')).toBe(false);
    expect(ability.can('publish.approve', 'course')).toBe(false);
  });

  it('COLLISION 4 — `order:read.amounts` is not `order:read` (BR-647)', () => {
    // BR-647: support sees that an order exists and what it granted, but not the amount. The
    // learner holds `.amounts` scoped to their own orders; support holds the base key and not
    // the qualifier. Collapsed, the two were the same permission.
    const ability = defineAbilitiesFor(actor({ permissions: ['order:read.amounts'] }));
    expect(ability.can('read.amounts', 'order')).toBe(true);
    expect(ability.can('read', 'order')).toBe(false);
  });

  it('COLLISION 5 — `device_transfer:approve.override` is not `approve` (BR-680)', () => {
    // The override is "approve BEYOND policy limits", held by nobody but ROLE-01. Collapsed, it
    // read as the ordinary in-policy approval that support does hold — and vice versa.
    const ability = defineAbilitiesFor(
      actor({ permissions: ['device_transfer:approve.override'] }),
    );
    expect(ability.can('approve.override', 'device_transfer')).toBe(true);
    expect(ability.can('approve', 'device_transfer')).toBe(false);
  });

  it('the remaining registry qualifiers are askable and distinct', () => {
    // `05 §4.4` and `§4.5`: the audit log and the version history are separate grants from the
    // reads they qualify.
    const ability = defineAbilitiesFor(
      actor({ permissions: ['entitlement:read.audit', 'content:version.restore'] }),
    );
    expect(ability.can('read.audit', 'entitlement')).toBe(true);
    expect(ability.can('read', 'entitlement')).toBe(false);
    expect(ability.can('version.restore', 'content')).toBe(true);
    expect(ability.can('version', 'content')).toBe(false);
  });

  it('a revoked qualifier leaves its base capability standing (BR-038)', () => {
    // Revoking the wrong capability is the same class of defect as granting one. Under the
    // collapse this revoke removed `user:read` as well, silently.
    const ability = defineAbilitiesFor(
      actor({ permissions: ['user:read', 'user:read.pii'], revokedPermissions: ['user:read.pii'] }),
    );
    expect(ability.can('read.pii', 'user')).toBe(false);
    expect(ability.can('read', 'user')).toBe(true);
  });

  it('super_admin still covers a qualified action (BR-639)', () => {
    const ability = defineAbilitiesFor(actor({ role: 'super_admin' }));
    expect(ability.can('read.pii', 'user')).toBe(true);
    expect(ability.can('publish.approve', 'course')).toBe(true);
  });

  it('`own` and `any` remain DATA scopes and never enter the action', () => {
    // The regression this pair guards: treating every scope as a qualifier would produce
    // `update.own`, which nothing asks for, and the instructor could edit nothing at all.
    const own = defineAbilitiesFor(actor({ id: 'usr_7', permissions: ['course:update.own'] }));
    expect(own.can('update', { __caslSubjectType__: 'course', owner_id: 'usr_7' })).toBe(true);
    expect(own.can('update.own', { __caslSubjectType__: 'course', owner_id: 'usr_7' })).toBe(false);

    const any = defineAbilitiesFor(actor({ id: 'usr_7', permissions: ['course:update.any'] }));
    // BR-033 — `.any` implies `.own`, which an unconditioned rule gives for free.
    expect(any.can('update', { __caslSubjectType__: 'course', owner_id: 'usr_9' })).toBe(true);
    expect(any.can('update', { __caslSubjectType__: 'course', owner_id: 'usr_7' })).toBe(true);
  });
});

describe('PH-1.11 — abilityActionFor / DATA_SCOPES (05 §5)', () => {
  it('holds exactly the two scopes that answer "which records?"', () => {
    // A third member here would silently re-collapse a qualifier onto its base action. The set is
    // asserted whole rather than by membership so that an ADDITION fails, not just a removal.
    expect([...DATA_SCOPES].sort()).toEqual(['any', 'own']);
  });

  it('maps a data scope to the bare action and a qualifier into the action', () => {
    expect(abilityActionFor(parsePermission('course:read'))).toBe('read');
    expect(abilityActionFor(parsePermission('course:update.own'))).toBe('update');
    expect(abilityActionFor(parsePermission('course:update.any'))).toBe('update');
    expect(abilityActionFor(parsePermission('user:read.pii'))).toBe('read.pii');
    expect(abilityActionFor(parsePermission('course:publish.approve'))).toBe('publish.approve');
  });
});
