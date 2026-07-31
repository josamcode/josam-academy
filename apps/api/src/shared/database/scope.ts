import type { Prisma } from '../../generated/prisma/client.js';

/**
 * `PH-1.10` — the scope proof. `BR-1632`, `BR-843`, `14 §4` layer 3.
 *
 * **The guarantee: a FORGOTTEN `where` cannot leak.** Not "a lint rule looks for forgotten
 * `where`s" — the ownership predicate is applied BY `applyScope`, and a query that never calls it
 * has no argument it can pass to a scoped delegate. Forgetting produces a type error, not a
 * permissive query.
 *
 * ## Why this is a branded type and not a lint rule
 *
 * Founder direction, recorded before the task started. A lint rule catches the shapes it knows and
 * misses the rest, which is `BR-1849` by construction: a permissive mechanism reporting full
 * coverage. On silent cross-tenant disclosure that is the worst available outcome, because it
 * produces confidence rather than merely absence. A forgotten scope is well-typed TypeScript —
 * nothing separates `{ where: { courseId } }` from `{ where: { courseId, ownerId } }` — so the
 * guarantee has to come from making the unscoped delegate UNREACHABLE, not from recognising bad
 * shapes.
 *
 * ## The brand carries the MODEL, and that is not decoration
 *
 * The first prototype branded the `where` with a bare `true`. It compiled, it rejected the
 * forgotten `where`, and it was **wrong**: `ScopedWhere<UserWhere>` was assignable to
 * `ScopedWhere<RefreshTokenWhereInput>`, so a `user`-scoped filter laundered into a refresh-token
 * query and applied `id = actorId` to the wrong column. Caught by a deliberate violation in a
 * ten-minute prototype rather than permanently, in the data layer.
 *
 * **A guarantee that does not carry the model is not a guarantee — it is a habit with a type
 * annotation** (founder, 2026-07-31).
 */

/* ── the model census ─────────────────────────────────────────────────────────────────────── */

/**
 * Prisma generates `ModelName` as PascalCase (`'RefreshToken'`); the delegate properties are
 * camelCase (`prisma.refreshToken`). `Uncapitalize` is the exact correspondence, so this union is
 * derived from the generated schema rather than restated beside it.
 */
export type ScopableModel = Uncapitalize<Prisma.ModelName>;

export type ScopeSpec =
  | {
      readonly kind: 'owned';
      /** The column holding the owning user's id. `TBL-*.user_id`, or `id` on `users` itself. */
      readonly ownerField: string;
    }
  | {
      readonly kind: 'global';
      /** Why this model has no ownership dimension. Forces the decision to be argued, not assumed. */
      readonly why: string;
    };

/**
 * **Deny by default.** `satisfies Record<ScopableModel, ScopeSpec>` is the half of this design
 * that matters most in the long run: add a table to `schema.prisma`, `Prisma.ModelName` gains a
 * member, this object stops satisfying the `Record`, and **the build fails until somebody
 * classifies it**. A new table cannot be queried before its scoping has been decided.
 *
 * That is what makes `PH-1.14` (`entitlements`), `PH-1.17` (`products`) and `PH-1.20` (`orders`)
 * safe to write: they cannot introduce an unclassified table, so there is no population of
 * "queries written before the guarantee existed" to re-audit. The same argument `§6` makes for
 * `PH-0.16` preceding the 69 components.
 */
export const MODEL_SCOPES = {
  // `profile:read.own`, `profile:update.own` — a user's own row, keyed on the row's own id.
  user: { kind: 'owned', ownerField: 'id' },
  // `session:read.own`, `session:delete.own` — a refresh token IS a session (`TBL-003`).
  refreshToken: { kind: 'owned', ownerField: 'userId' },
  // Read back to the account area as sign-in history (`PH-1.31`); `user_id` is nullable for
  // failed attempts against an unknown address, which a scoped read correctly cannot see.
  loginActivity: { kind: 'owned', ownerField: 'userId' },
  userIdentity: { kind: 'owned', ownerField: 'userId' },
  verificationToken: { kind: 'owned', ownerField: 'userId' },
  otpCode: { kind: 'owned', ownerField: 'userId' },
  userPermissionOverride: { kind: 'owned', ownerField: 'userId' },

  role: { kind: 'global', why: 'the role catalogue is the same for every actor (TBL-007)' },
  permission: {
    kind: 'global',
    why: 'the permission registry is a projection of code, identical for every actor (PH-1.8)',
  },
  rolePermission: {
    kind: 'global',
    why: 'role→permission edges belong to the role, not to any user (TBL-009)',
  },
} as const satisfies Record<ScopableModel, ScopeSpec>;

/** The models carrying an ownership column — derived, never hand-listed. */
export type OwnedModel = {
  [K in ScopableModel]: (typeof MODEL_SCOPES)[K]['kind'] extends 'owned' ? K : never;
}[ScopableModel];

/* ── the brand ────────────────────────────────────────────────────────────────────────────── */

declare const SCOPE_PROOF: unique symbol;

/**
 * A `where` that has passed through {@link applyScope}.
 *
 * The symbol is `declare`d and never exported, so no code outside this module can produce a value
 * of this type by any means other than calling `applyScope` — which is what makes the brand
 * NOMINAL rather than structural. The type parameter `M` pins which model was scoped.
 */
export type ScopedWhere<W, M extends OwnedModel> = W & { readonly [SCOPE_PROOF]: M };

/** Who the query runs as. Built by the permission guard from the authenticated actor. */
export interface ActorScope {
  readonly actorId: string;
  /**
   * `BR-963` / `BR-639` — `super_admin` is unrestricted. The filter is empty, but the query still
   * travels through `applyScope`, so the code shape is identical for every role and there is no
   * "admin path" that bypasses the mechanism.
   */
  readonly unrestricted: boolean;
}

/**
 * The **only** producer of {@link ScopedWhere}, and it applies the predicate itself.
 *
 * The caller supplies the business filter; ownership is added here. That is the entire difference
 * from a lint rule, which can only observe whether a caller remembered.
 *
 * Two ordering properties, both deliberate:
 *
 *  - the ownership field is spread **last**, so a caller-supplied `userId` cannot override it;
 *  - Prisma ANDs top-level `where` keys, so a caller's `OR: [...]` is NARROWED by the predicate
 *    rather than escaping alongside it.
 */
export function applyScope<M extends OwnedModel, W extends object>(
  scope: ActorScope,
  model: M,
  where: W,
): ScopedWhere<W, M> {
  if (scope.unrestricted) return where as ScopedWhere<W, M>;
  const spec = MODEL_SCOPES[model] as { kind: 'owned'; ownerField: string };
  return { ...where, [spec.ownerField]: scope.actorId } as ScopedWhere<W, M>;
}

/* ── the enumerated escape hatch ──────────────────────────────────────────────────────────── */

/**
 * Why a query legitimately runs without an actor scope. A closed set, because "unscoped" with a
 * free-text justification is a habit waiting to form.
 *
 * `pinned-unscoped-calls` in the fitness suite counts the call sites, so adding one is a
 * deliberate diff a reviewer sees rather than a line that blends in.
 */
export type UnscopedReason =
  /**
   * The query ESTABLISHES the actor and therefore cannot be scoped by it: login by email, refresh
   * by token hash, verification by token hash. There is no actor yet.
   *
   * The audit question for this reason is not "was it true when written" but "is it still true":
   * a pre-authentication query that later becomes actor-scopable and keeps this declaration is
   * exactly the loophole this design exists to close (founder, 2026-07-31).
   */
  | 'pre-authentication'
  /** Startup sync, background reconciliation, health probes — no request, no actor. */
  | 'system'
  /** Deliberately cross-actor and permission-gated at the guard: admin catalogues, registries. */
  | 'admin-global';
