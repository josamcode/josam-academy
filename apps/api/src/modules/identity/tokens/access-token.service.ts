import { Injectable } from '@nestjs/common';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

import { loadEnv } from '../../../config/env.js';

/**
 * `PH-1.3` — access tokens. `14 §3.1`.
 *
 * ```
 * Access   15 min   memory only   NOT revocable (short-lived)
 * ```
 *
 * ## Not revocable is a design choice, not a gap
 *
 * `14 §3.1` marks access tokens irrevocable and gives the reason in the same row: they are short.
 * The alternative — checking a revocation list on every request — puts a datastore read in front
 * of every authenticated call to save at most 15 minutes of exposure. `BR-1626` is what makes
 * that acceptable: the token carries `permission_version`, and a stale version triggers a
 * **refresh**, not a rejection (`BR-857`). So a permission change propagates within one refresh
 * cycle without a per-request lookup, and without logging anybody out.
 *
 * That is why `permissionVersion` is in the payload and not merely in the database.
 */

export interface AccessTokenClaims {
  /** The user's prefixed ULID — `usr_…`. */
  sub: string;
  /** `BR-955` / `BR-1626` — a stale value triggers refresh rather than rejection. */
  permissionVersion: number;
  /** `TBL-007.key`, e.g. `student`. Present so a guard can act without a database read. */
  role: string;
}

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

const ALGORITHM = 'HS256';
const ISSUER = 'josamacademy.com';
const AUDIENCE = 'josamacademy.com/api';

@Injectable()
export class AccessTokenService {
  private readonly secret: Uint8Array;

  constructor() {
    const { JWT_SECRET } = loadEnv();
    // `loadEnv` already enforces the length. Encoding here rather than per-call because
    // `TextEncoder` allocation in a hot path is pure waste.
    this.secret = new TextEncoder().encode(JWT_SECRET);
  }

  async sign(claims: AccessTokenClaims): Promise<string> {
    return new SignJWT({
      permissionVersion: claims.permissionVersion,
      role: claims.role,
    })
      .setProtectedHeader({ alg: ALGORITHM })
      .setSubject(claims.sub)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${String(ACCESS_TOKEN_TTL_SECONDS)}s`)
      .sign(this.secret);
  }

  /**
   * Returns `null` on any failure — expired, wrong signature, wrong issuer, malformed, or the
   * `alg: none` attack.
   *
   * `jose` refuses `none` and refuses an algorithm other than the one named in `algorithms`,
   * which is the whole reason it is pinned here rather than read from the header. A verifier that
   * trusts the header's `alg` lets an attacker choose it.
   */
  async verify(token: string): Promise<AccessTokenClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        algorithms: [ALGORITHM],
        issuer: ISSUER,
        audience: AUDIENCE,
      });
      return toClaims(payload);
    } catch {
      return null;
    }
  }
}

/**
 * A verified signature proves the payload was not tampered with. It does **not** prove the payload
 * has the shape this application expects — a token signed by an earlier version of this service,
 * before a claim existed, verifies perfectly and is missing the field.
 */
function toClaims(payload: JWTPayload): AccessTokenClaims | null {
  const { sub, permissionVersion, role } = payload;
  if (typeof sub !== 'string' || sub === '') return null;
  if (typeof permissionVersion !== 'number' || !Number.isInteger(permissionVersion)) return null;
  if (typeof role !== 'string' || role === '') return null;
  return { sub, permissionVersion, role };
}
