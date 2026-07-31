import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';

/**
 * `PH-1.9` — shared ability definitions. `05 §8`, `BR-708`, `FEAT-018`.
 *
 * **One definition consumed by the API, web and mobile.** `BR-708`: this package has no runtime
 * dependency on the backend, so a client imports it directly. That is the whole point — three
 * implementations of the same rules is three chances to disagree, and the disagreement shows up
 * as a button that renders for someone the server will refuse.
 *
 * ## What this is NOT
 *
 * `BR-710` — **client-side ability checks are a rendering optimisation only.** Every mutation is
 * re-checked server-side (`BR-043`), and `BR-714` requires each endpoint to enforce its own
 * permission independently of `_can`. A client that fabricates capabilities gains nothing.
 *
 * That is why this package is safe to ship to a browser: it decides what to *draw*, never what to
 * *allow*.
 */

/** `05 §5` keys are `model:action` or `model:action.scope`. */
export interface ParsedPermission {
  model: string;
  action: string;
  scope: string | null;
}

export interface Actor {
  id: string;
  /** `TBL-007.key` — `super_admin` short-circuits (`BR-963`, `BR-639`). */
  role: string;
  /** Effective grants: role permissions plus `grant` overrides. */
  permissions: readonly string[];
  /** `revoke` overrides. Applied AFTER grants — see the note in `defineAbilitiesFor`. */
  revokedPermissions: readonly string[];
}

/**
 * Subjects are either a bare model name (`'course'`) or a record carrying the fields a scoped
 * rule matches on (`{ __caslSubjectType__: 'course', owner_id: 'usr_7' }`).
 *
 * `MongoAbility<[string, string]>` types conditions as `MongoQuery<never>` — a string subject has
 * no fields to match — so `can('update', 'course', { owner_id })` will not compile. Naming the
 * record shape is what makes `.own` scoping expressible at all.
 */
export type AppSubject = string | Record<string, unknown>;
export type AppAbility = MongoAbility<[string, AppSubject]>;

/**
 * Throws on a malformed key rather than returning a partial parse.
 *
 * A key that silently parses to `{model: 'course', action: ''}` produces a rule matching nothing,
 * which reads as "this actor lacks the permission" — a *denial* nobody can trace back to a typo.
 * Failing here means a bad registry entry is caught at the point of definition (`BR-1849` — fail
 * in the direction that alarms).
 */
export function parsePermission(key: string): ParsedPermission {
  const match = /^([a-z_]+):([a-z_]+)(?:\.([a-z_]+))?$/.exec(key);
  if (match === null) {
    throw new Error(
      `malformed permission key "${key}" — expected model:action or model:action.scope (05 §5)`,
    );
  }
  return { model: match[1] ?? '', action: match[2] ?? '', scope: match[3] ?? null };
}

/**
 * `05 §8`. Resolution order is **revoke → grant → role → deny** (`BR-038`).
 *
 * CASL's last matching rule wins, so `cannot` rules are added AFTER every `can`. That ordering is
 * the implementation of `BR-038`'s precedence, not an incidental detail: reverse the two loops and
 * a revoke becomes a no-op whenever a grant for the same model follows it.
 *
 * The default is deny — CASL's `build()` permits only what was granted — which is the last step of
 * the same rule and needs no code.
 */
export function defineAbilitiesFor(actor: Actor): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // `BR-963` / `BR-639` — super_admin's permissions are implicit and never stored as rows, so
  // there is nothing to iterate. Returning early is also what makes an empty `permissions` array
  // safe for this role rather than a total lockout.
  if (actor.role === 'super_admin') {
    can('manage', 'all');
    return build();
  }

  for (const permission of actor.permissions) {
    const { model, action, scope } = parsePermission(permission);

    if (scope === 'own') {
      // The subject must carry `owner_id` for this to match. A scoped rule against a subject
      // without that field matches nothing, which is the safe direction.
      can(action, model, { owner_id: actor.id });
    } else {
      can(action, model);
    }
  }

  // Revokes are unscoped on purpose: `05 §5`'s override table revokes a capability outright, not
  // "for records you do not own". A scoped revoke would leave the actor able to act on everyone
  // else's records, which inverts the intent of a revocation.
  for (const revoked of actor.revokedPermissions) {
    const { model, action } = parsePermission(revoked);
    cannot(action, model);
  }

  return build();
}
