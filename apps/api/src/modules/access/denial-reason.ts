/**
 * `PH-1.10` — why authorization said no. `BR-1633`, `BR-1634`, `14 §4`.
 *
 * ## These codes never reach the client
 *
 * `BR-1633` — a `403` carries a generic body and never discloses which permission was missing,
 * because that turns the authorization layer into an oracle enumerating the permission model.
 * These codes go to the LOG, where the administrator debugging a denial can read them and the
 * actor being denied cannot.
 *
 * ## The two SILENT denials, which are the reason this enum exists
 *
 * Founder requirement, designed in at the start rather than bolted on once the ambiguity had
 * shipped. `PH-1.8`'s registry already resolves **deny** for a permission it cannot find, and a
 * route missing its annotation would produce **the same denial from an entirely different cause**.
 * An administrator debugging one while looking at the other is searching the wrong system:
 *
 *  - {@link PERMISSION_UNKNOWN} — the endpoint asked for a key the registry does not contain. The
 *    endpoint is wrong, or the registry lost an entry. **Nobody can be granted this permission**,
 *    so every actor is denied, including `super_admin` — which is the signature that tells the two
 *    apart at a glance.
 *  - {@link ANNOTATION_MISSING} — the endpoint declared nothing at all. `BR-1631` makes this a
 *    startup failure, so it should be unreachable at runtime; it exists because "unreachable"
 *    and "unreached" differ, and a deny-closed default is the only safe way to be wrong here.
 *
 * Distinguishing them is not cosmetic. `PERMISSION_UNKNOWN` is a code defect fixed by correcting a
 * key; `ANNOTATION_MISSING` is a security hole fixed by deciding what the endpoint requires. The
 * remedies share nothing.
 */
export const DenialReason = {
  /** The ordinary case: the actor simply lacks the permission. Not an error. */
  PERMISSION_NOT_GRANTED: 'permission_not_granted',

  /** Silent denial 1 — the required key is absent from `PH-1.8`'s registry. */
  PERMISSION_UNKNOWN: 'permission_unknown',

  /** Silent denial 2 — the route carries no `@RequirePermission`. `BR-1631`. */
  ANNOTATION_MISSING: 'annotation_missing',

  /** The route requires an authenticated actor and there is none. */
  NOT_AUTHENTICATED: 'not_authenticated',

  /** An explicit `revoke` override beat a grant — `BR-038`'s precedence, not an absence. */
  PERMISSION_REVOKED: 'permission_revoked',
} as const;

export type DenialReason = (typeof DenialReason)[keyof typeof DenialReason];
