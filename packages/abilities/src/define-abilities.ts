import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';

import { abilityActionFor, parsePermission } from './permission-key.js';

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
 *
 * Moved out of `index.ts` at `PH-1.11` — `05 §8` names this file (`defineAbilities.ts`; kebab-case
 * here to match every other file in the repository) and the split is what lets `capability.ts`
 * share the key vocabulary without a cycle.
 */

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
    const parsed = parsePermission(permission);

    // `abilityActionFor` has already folded a QUALIFIER into the action (`read.pii`,
    // `publish.request`), so what is left to decide here is only the record set. Rewriting this
    // branch as `if (scope === 'own') … else …` over the RAW action is the defect `PH-1.11`
    // removed; the taxonomy lives in `permission-key.ts` and this loop must not re-derive it.
    const action = abilityActionFor(parsed);

    if (parsed.scope === 'own') {
      // The subject must carry `owner_id` for this to match. A scoped rule against a subject
      // without that field matches nothing, which is the safe direction.
      can(action, parsed.model, { owner_id: actor.id });
    } else {
      // `null` (global) and `any` land here together, which is `BR-033`: an unconditioned rule
      // already covers the actor's own records, so `.any` needs no second rule to imply `.own`.
      can(action, parsed.model);
    }
  }

  // Revokes are unscoped on purpose: `05 §5`'s override table revokes a capability outright, not
  // "for records you do not own". A scoped revoke would leave the actor able to act on everyone
  // else's records, which inverts the intent of a revocation.
  //
  // The qualifier mapping applies here too, and it is what keeps a revoke honest in the other
  // direction: revoking `user:read.pii` must remove the PII read and LEAVE `user:read` standing.
  // Revoking a capability nobody asked to revoke is the same class of defect as granting one.
  for (const revoked of actor.revokedPermissions) {
    const parsed = parsePermission(revoked);
    cannot(abilityActionFor(parsed), parsed.model);
  }

  return build();
}
