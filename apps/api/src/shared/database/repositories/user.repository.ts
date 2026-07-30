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
    const row = await this.prisma.user.findUnique({
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
    await this.prisma.user.create({ data: user });
  }

  async findRoleIdByKey(key: string): Promise<string | null> {
    const role = await this.prisma.role.findUnique({ where: { key }, select: { id: true } });
    return role?.id ?? null;
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  /** `BR-955` — any change affecting a user's permissions bumps the version (`BR-718`). */
  async setPassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, permissionVersion: { increment: 1 } },
    });
  }
}
