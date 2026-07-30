import { createHash, randomBytes } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

import { newUnprefixedId } from '../../../shared/database/id.js';
import {
  type NewRefreshToken,
  RefreshTokenRepository,
} from '../../../shared/database/repositories/refresh-token.repository.js';

/**
 * `PH-1.3` — refresh rotation with family tracking. `BR-1623` / `BR-016` / `14 §3.1`.
 *
 * ## The mechanism, and what it is actually defending against
 *
 * Every refresh issues a NEW token and retires the one presented. A token is therefore usable
 * exactly once. If a token is presented twice, one of two things is true:
 *
 *   - the legitimate client refreshed and its successor was stolen, or
 *   - the token was stolen and the thief refreshed first
 *
 * **Neither case can be distinguished from the other, and that is why the whole family dies.**
 * Revoking only the replayed token would leave the thief holding a live successor in the second
 * case. Revoking the family forces both parties back to a password, which the thief does not
 * have. The cost is that a genuine user with a flaky network occasionally re-logs in; the
 * alternative is a silent, permanent session handover.
 *
 * ## Why the family survives rotation
 *
 * `family_id` is copied to the successor, never regenerated. A 30-day session is one family with
 * many links, and the family is the unit of compromise — see `revokeFamily`, which deliberately
 * revokes already-rotated links too.
 */

export const REFRESH_TOKEN_TTL_DAYS = 30;
const TOKEN_BYTES = 32;

export type RefreshOutcome =
  | { status: 'rotated'; token: string; userId: string; familyId: string }
  | { status: 'reuse_detected'; userId: string; familyId: string; revoked: number }
  | { status: 'unknown' }
  | { status: 'expired' }
  | { status: 'revoked' };

export interface IssueContext {
  userId: string;
  platform: 'web' | 'ios' | 'android';
  deviceLabel?: string | undefined;
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

/**
 * `BR-1622` / `BR-959` — stored hashed, so a database read never yields a usable token.
 *
 * SHA-256, not Argon2id, and the difference from `PH-1.2` is deliberate: a refresh token is 32
 * bytes of CSPRNG output, not a human-chosen secret. There is no dictionary to attack and no
 * offline guessing advantage to remove, so a slow KDF would buy nothing and would put ~160 ms in
 * front of every token refresh. Password hashing is slow because passwords are weak.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(private readonly repository: RefreshTokenRepository) {}

  private expiry(): Date {
    return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  }

  /** Starts a NEW family — a fresh login, not a refresh. */
  async issue(context: IssueContext): Promise<{ token: string; familyId: string }> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const familyId = newUnprefixedId();
    await this.repository.create(this.record(token, familyId, context));
    return { token, familyId };
  }

  /**
   * Present a token; get its successor, or a reason.
   *
   * Order matters here. `rotatedAt` is checked BEFORE `revokedAt` and before expiry, because a
   * replayed token that has also expired is still a replay — reporting `expired` would hide an
   * attack behind a routine-looking outcome.
   */
  async rotate(presented: string, context: IssueContext): Promise<RefreshOutcome> {
    const stored = await this.repository.findByHash(hashToken(presented));
    if (stored === null) return { status: 'unknown' };

    if (stored.rotatedAt !== null) {
      // `BR-1623` — reuse of a rotated token revokes the entire family.
      const revoked = await this.repository.revokeFamily(stored.familyId, 'reuse_detected');
      this.logger.warn(
        `refresh token reuse detected for user ${stored.userId} — revoked ${String(revoked)} ` +
          `token(s) in family ${stored.familyId}. Every session in this family must re-login.`,
      );
      return {
        status: 'reuse_detected',
        userId: stored.userId,
        familyId: stored.familyId,
        revoked,
      };
    }

    if (stored.revokedAt !== null) return { status: 'revoked' };
    if (stored.expiresAt.getTime() <= Date.now()) return { status: 'expired' };

    const successorToken = randomBytes(TOKEN_BYTES).toString('base64url');
    await this.repository.rotate(
      stored.id,
      this.record(successorToken, stored.familyId, { ...context, userId: stored.userId }),
    );

    return {
      status: 'rotated',
      token: successorToken,
      userId: stored.userId,
      familyId: stored.familyId,
    };
  }

  /** `BR-1627` — logout revokes server-side. */
  async revoke(presented: string, reason: string): Promise<boolean> {
    const stored = await this.repository.findByHash(hashToken(presented));
    if (stored === null) return false;
    await this.repository.revokeFamily(stored.familyId, reason);
    return true;
  }

  /** `BR-1610` / `BR-1628` — a password change or deactivation ends every session. */
  async revokeAllForUser(userId: string, reason: string): Promise<number> {
    return this.repository.revokeAllForUser(userId, reason);
  }

  private record(token: string, familyId: string, context: IssueContext): NewRefreshToken {
    return {
      id: newUnprefixedId(),
      userId: context.userId,
      familyId,
      tokenHash: hashToken(token),
      platform: context.platform,
      expiresAt: this.expiry(),
      deviceLabel: context.deviceLabel,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    };
  }
}
