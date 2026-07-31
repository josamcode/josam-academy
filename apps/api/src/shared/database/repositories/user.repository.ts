import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

/**
 * `TBL-001` `users` — repository layer (`BR-1580`).
 */

export interface UserRecord {
  id: string;
  email: string | null;
  emailVerifiedAt: Date | null;
  passwordHash: string | null;
  fullName: string;
  permissionVersion: number;
  roleKey: string;
}

export interface NewUser {
  id: string;
  roleId: string;
  email: string;
  fullName: string;
  passwordHash: string;
}

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `BR-954` — `email` is CITEXT, so this is case-insensitive at the database level. Lower-casing
   * here as well would be belt and braces that hides a schema regression: if the column ever
   * reverted to TEXT, an application-side `toLowerCase()` would keep the lookups working and the
   * UNIQUE constraint would silently stop being case-insensitive.
   */
  async findByEmail(email: string): Promise<UserRecord | null> {
    // `pre-authentication` — this is the login lookup. It ESTABLISHES which actor is signing in,
    // so there is no actor to scope it by; scoping it would require the answer as the question.
    const row = await this.prisma.unscoped('pre-authentication').user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        passwordHash: true,
        fullName: true,
        permissionVersion: true,
        role: { select: { key: true } },
      },
    });
    return row === null ? null : { ...row, roleKey: row.role.key };
  }

  async create(user: NewUser): Promise<void> {
    // `pre-authentication` — registration creates the actor. There is nothing to scope against.
    await this.prisma.unscoped('pre-authentication').user.create({ data: user });
  }

  async findRoleIdByKey(key: string): Promise<string | null> {
    // `system` — `role` is classified `global` in `MODEL_SCOPES`: the catalogue is identical for
    // every actor, so there is no ownership dimension to forget. Reached during registration,
    // before an actor exists, which is why it is not on the `scoped()` path.
    const role = await this.prisma
      .unscoped('system')
      .role.findUnique({ where: { key }, select: { id: true } });
    return role?.id ?? null;
  }

  async markEmailVerified(userId: string): Promise<void> {
    // `pre-authentication` — reached from the emailed verification link. The bearer proved control
    // of the address by presenting the token; no session exists yet. `userId` comes from the
    // verified token, not from a caller, so it is not a parameter an attacker chooses.
    await this.prisma.unscoped('pre-authentication').user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  /** `BR-955` — any change affecting a user's permissions bumps the version (`BR-718`). */
  async setPassword(userId: string, passwordHash: string): Promise<void> {
    // `pre-authentication` — the password-reset flow runs for a signed-OUT user holding a reset
    // token. `userId` is taken from that verified token.
    //
    // AUDIT NOTE: when `PH-1.31` adds "change password while signed in", that path HAS an actor
    // and must go through `scoped()`. It is a second caller, not a reason to relabel this one —
    // a pre-authentication query that later becomes actor-scopable and keeps this declaration is
    // the loophole this design exists to close.
    await this.prisma.unscoped('pre-authentication').user.update({
      where: { id: userId },
      data: { passwordHash, permissionVersion: { increment: 1 } },
    });
  }
}
