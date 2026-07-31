import { describe, expect, it } from 'vitest';

import { type Actor, defineAbilitiesFor, parsePermission } from './index.js';

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
