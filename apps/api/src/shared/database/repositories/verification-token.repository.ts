import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

/**
 * `TBL-004` `verification_tokens` — repository layer (`BR-1580`).
 *
 * Purposes come from the `token_purpose` enum: `email_verify`, `password_reset`, `email_change`.
 */

export type TokenPurpose = 'email_verify' | 'password_reset' | 'email_change';

export interface StoredVerificationToken {
  id: string;
  userId: string;
  purpose: TokenPurpose;
  expiresAt: Date;
  consumedAt: Date | null;
}

@Injectable()
export class VerificationTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(token: {
    id: string;
    userId: string;
    purpose: TokenPurpose;
    tokenHash: string;
    target?: string | undefined;
    expiresAt: Date;
  }): Promise<void> {
    // `pre-authentication` — issued during registration or a reset request, both signed out.
    await this.prisma.unscoped('pre-authentication').verificationToken.create({
      data: { ...token, target: token.target ?? null },
    });
  }

  async findByHash(tokenHash: string): Promise<StoredVerificationToken | null> {
    // `pre-authentication` — the presented hash IS the credential, and this lookup determines
    // which user it belongs to. There is no actor until it returns.
    return this.prisma.unscoped('pre-authentication').verificationToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, purpose: true, expiresAt: true, consumedAt: true },
    });
  }

  /**
   * Single-use, enforced by the database rather than by a read-then-write.
   *
   * `updateMany` with `consumedAt: null` in the WHERE is atomic: two simultaneous redemptions of
   * the same link both read it as unconsumed, and only one matches a row. A `findUnique` followed
   * by an `update` would let both through, which for a password reset means two people setting a
   * password from one link.
   */
  async consume(id: string): Promise<boolean> {
    // `pre-authentication` — redeeming an emailed link. The atomic `consumedAt: null` guard above
    // is the single-use control; the scope is not what protects this row.
    const { count } = await this.prisma
      .unscoped('pre-authentication')
      .verificationToken.updateMany({
        where: { id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
    return count === 1;
  }

  /** A new reset request invalidates outstanding ones for the same purpose. */
  async consumeOutstanding(userId: string, purpose: TokenPurpose): Promise<number> {
    // `pre-authentication` — invalidating older reset tokens as a new one is issued, for a user
    // who is by definition signed out. `userId` is resolved server-side from the request address.
    const { count } = await this.prisma
      .unscoped('pre-authentication')
      .verificationToken.updateMany({
        where: { userId, purpose, consumedAt: null },
        data: { consumedAt: new Date() },
      });
    return count;
  }
}
