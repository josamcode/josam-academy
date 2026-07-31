import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

/**
 * `TBL-003` `refresh_tokens` — the repository layer. `BR-1580`: Prisma lives here and nowhere else.
 *
 * The service above this holds the rotation POLICY (`BR-1623`); this holds the storage. The split
 * matters because the reuse-detection step is a transaction whose guarantees now run through
 * Prisma 7's driver adapter — item 3 of `BR-1819`'s re-verification list, and this is the task
 * that verifies it.
 */

export interface StoredRefreshToken {
  id: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  rotatedAt: Date | null;
  revokedAt: Date | null;
}

export interface NewRefreshToken {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  platform: 'web' | 'ios' | 'android';
  expiresAt: Date;
  deviceLabel?: string | undefined;
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(token: NewRefreshToken): Promise<void> {
    // `pre-authentication` — a token is minted at the END of sign-in, as the session comes into
    // existence. A create has no `where`, so there is nothing for a scope to filter.
    await this.prisma.unscoped('pre-authentication').refreshToken.create({
      data: {
        id: token.id,
        userId: token.userId,
        familyId: token.familyId,
        tokenHash: token.tokenHash,
        platform: token.platform,
        expiresAt: token.expiresAt,
        deviceLabel: token.deviceLabel ?? null,
        userAgent: token.userAgent ?? null,
        ipAddress: token.ipAddress ?? null,
      },
    });
  }

  /** Looked up by HASH — `BR-1622`, a database read never yields a usable token. */
  async findByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    // `pre-authentication` — the refresh path. The presented hash IS the credential and this
    // lookup is what establishes whose session it is. Scoping by actor would presuppose the
    // identity this query exists to determine.
    return this.prisma.unscoped('pre-authentication').refreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        familyId: true,
        expiresAt: true,
        rotatedAt: true,
        revokedAt: true,
      },
    });
  }

  /**
   * Rotate: mark the presented token rotated and store its successor, **in one transaction**.
   *
   * `BR-1819` item 3 names this exact operation: rotating and invalidating must remain atomic
   * under concurrent refreshes, and that guarantee now depends on the driver adapter rather than
   * on Prisma's own connection handling. A partial commit here either issues a token whose
   * predecessor still looks live (two valid tokens) or retires a token without a successor
   * (silent logout).
   *
   * The `rotatedAt: null` guard in the `updateMany` is the concurrency control. Two simultaneous
   * refreshes with the same token both read it as live; only one `updateMany` matches a row, and
   * the loser sees `count === 0` and throws — which surfaces as reuse, which is exactly right.
   */
  async rotate(presentedId: string, successor: NewRefreshToken): Promise<void> {
    // `pre-authentication` — rotation happens during refresh, before the new session exists.
    // The presented token id is the credential; `BR-1819` item 3 requires the two writes to stay
    // atomic, which is why the transaction rather than the scope is what carries the guarantee.
    await this.prisma.unscoped('pre-authentication').$transaction(async (tx) => {
      const marked = await tx.refreshToken.updateMany({
        where: { id: presentedId, rotatedAt: null, revokedAt: null },
        data: { rotatedAt: new Date(), lastUsedAt: new Date() },
      });

      if (marked.count === 0) {
        throw new Error(`refresh token ${presentedId} was already rotated or revoked`);
      }

      await tx.refreshToken.create({
        data: {
          id: successor.id,
          userId: successor.userId,
          familyId: successor.familyId,
          tokenHash: successor.tokenHash,
          platform: successor.platform,
          expiresAt: successor.expiresAt,
          deviceLabel: successor.deviceLabel ?? null,
          userAgent: successor.userAgent ?? null,
          ipAddress: successor.ipAddress ?? null,
        },
      });
    });
  }

  /**
   * `BR-1623` / `BR-016` — revoke every token in a family.
   *
   * Deliberately revokes ALREADY-ROTATED tokens too, not just live ones. The family is the unit
   * of compromise: if a rotated token was replayed, every token derived from that chain is
   * suspect, including ones that look spent.
   */
  async revokeFamily(familyId: string, reason: string): Promise<number> {
    // `system` — reuse detection. Revoking a compromised family is a security response that must
    // succeed regardless of who triggered it, and the family, not the actor, is the unit.
    const { count } = await this.prisma.unscoped('system').refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
    return count;
  }

  /** `BR-1610` — a password change revokes every session across every device. */
  async revokeAllForUser(userId: string, reason: string): Promise<number> {
    // `pre-authentication` — called by the password-reset flow (`BR-1610`), where the user is
    // signed out by definition. `userId` arrives from a verified reset token.
    //
    // AUDIT NOTE: `PH-1.31`'s "sign out my other devices" is the SAME operation with an actor
    // present. That caller must use `scoped()`; this declaration does not stretch to cover it.
    const { count } = await this.prisma.unscoped('pre-authentication').refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
    return count;
  }

  async countLiveInFamily(familyId: string): Promise<number> {
    // `system` — reuse-detection bookkeeping over a token family, not a user-facing read.
    return this.prisma
      .unscoped('system')
      .refreshToken.count({ where: { familyId, revokedAt: null } });
  }
}
