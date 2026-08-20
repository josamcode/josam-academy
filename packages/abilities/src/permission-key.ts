/**
 * `05 §2` — the shape of a permission key, and the scope taxonomy that decides what a key means.
 *
 * Split out of `index.ts` at `PH-1.11` so `capability.ts` can derive the same actions without
 * importing the ability builder. `no-circular` is an error-severity rule in
 * `.dependency-cruiser.mjs`, and a barrel importing a module that imports the barrel is exactly
 * that — so the shared vocabulary sits underneath both and depends on nothing.
 */

/** `05 §5` keys are `model:action` or `model:action.scope`. */
export interface ParsedPermission {
  model: string;
  action: string;
  scope: string | null;
}

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
 * The scopes that bound a capability to a SET OF RECORDS. Everything else is a qualifier.
 *
 * Named rather than written as `scope === 'own' || scope === 'any'` inside a branch, because the
 * distinction is a taxonomy the whole permission model rests on and it needs somewhere to be
 * looked up, argued with, and extended. See {@link abilityActionFor} for what breaks without it.
 *
 * The registry (`apps/api/src/modules/access/permission-registry.ts`, 174 keys) currently holds
 * 18 `own`, 10 `any`, and 7 qualifiers — `pii`, `amounts`, `audit`, `request`, `approve`,
 * `restore`, `override`. A new scope added to `05 §5`'s vocabulary belongs in this set ONLY if it
 * answers "which records?"; if it answers "which capability?" it must stay out, and the default
 * — qualifier — is the safe direction, because a qualifier wrongly treated as a data scope grants
 * a capability nobody was given.
 */
export const DATA_SCOPES: ReadonlySet<string> = new Set(['own', 'any']);

/**
 * The CASL action a permission key maps to.
 *
 * **A scope is one of two entirely different things, and collapsing them is a security defect.**
 *
 * `05 §5`'s Scope Vocabulary (`docs/05-roles-and-permissions.md:65-77`) lists `own`, `any` and
 * `pii` in a single table, which reads as one concept. It is not one concept:
 *
 *  - `own` and `any` are DATA scopes. They answer *which records?* for a capability that already
 *    exists. `BR-033` — "`.any` implies `.own`" (`docs/05-roles-and-permissions.md:75`) — is a
 *    statement about record sets, and it is only coherent because both name the same capability.
 *  - every other scope is a QUALIFIER, and it names a DIFFERENT capability over the same records.
 *    `user:read.pii` is not `user:read` across more rows; it is more COLUMNS, and the most
 *    sensitive ones in the system (`BR-644`). `course:publish.request` is not `course:publish`
 *    over fewer courses; it is asking somebody else to decide. `BR-035` —
 *    "PII always requires its own explicit permission" (`docs/05-roles-and-permissions.md:77`) —
 *    cannot be honoured at all if `.pii` folds into its base action.
 *
 * Until `PH-1.11` this function did not exist: `defineAbilitiesFor` special-cased `own` and
 * registered every other scope under the BARE action. Measured against the old implementation,
 * with the named key as the actor's only permission:
 *
 *     ONLY user:read                        -> can('read.pii', 'user')            = false  ✔
 *     ONLY user:read.pii                    -> can('read',     'user')            = TRUE   ✘ BR-035
 *     ONLY course:publish.request           -> can('publish',  'course')          = TRUE   ✘ BR-657
 *     ONLY order:read.amounts               -> can('read',     'order')           = TRUE   ✘ BR-647
 *     ONLY device_transfer:approve.override -> can('approve', 'device_transfer')  = TRUE   ✘ BR-680
 *
 * Row 3 is the one to hold on to: `course:publish.request` is the permission an instructor holds
 * to ASK for publication, and `course:publish.approve` is the founder's alone (`BR-657`). The old
 * mapping let the asker read as the approver.
 *
 * The second consequence is quieter and worse. Nothing ever registered a rule under `read.pii`,
 * so the qualified capability was **unaskable**: no guard, no `_can`, no client could put the
 * question "may this actor see PII", and every asker received `false` for a permission the actor
 * does hold. A capability map is built entirely out of that question, which is why `PH-1.11`
 * cannot be written on top of the old mapping.
 *
 * `own` returns the bare action deliberately — the record set is expressed as a CASL *condition*
 * by the caller, not as part of the action name. `any` returns the bare action too, which is what
 * makes `BR-033` true without a second rule: an unconditioned rule matches the actor's own
 * records as well as everyone else's.
 */
export function abilityActionFor({ action, scope }: ParsedPermission): string {
  return scope === null || DATA_SCOPES.has(scope) ? action : `${action}.${scope}`;
}
