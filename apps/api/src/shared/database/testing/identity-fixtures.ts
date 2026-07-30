import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../../generated/prisma/client.js';
import { newId } from '../id.js';

/**
 * Test fixtures for `M01`. **Test-only, and it lives here for a reason.**
 *
 * `BR-1580` confines Prisma to `shared/database/`, and the fitness rule caught `PH-1.3`'s spec
 * importing the client directly to build a user and inspect rows. The tempting fix was to exempt
 * `*.spec.ts` from the rule. That would have been wrong: a spec is exactly where persistence
 * logic drifts out of the repository layer unnoticed, because nobody reviews a test's data access
 * as carefully as a service's.
 *
 * So the raw access lives in the allowed layer and the specs import this. The rule stays intact
 * and the specs still reach real rows — which is what `PH-1.3`'s output ("reuse revokes the
 * family, tested") requires.
 *
 * Row inspection is deliberately exposed. Asserting through the repository would test the
 * repository against itself; `BR-1837` wants the effect, and the effect is the row.
 */
export class IdentityFixtures {
  private readonly prisma: PrismaClient;

  constructor(connectionString: string) {
    this.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }

  get client(): PrismaClient {
    return this.prisma;
  }

  /** Creates a learner against the seeded `student` role. Returns the new user's id. */
  async createUser(label: string): Promise<string> {
    const role = await this.prisma.role.findUniqueOrThrow({ where: { key: 'student' } });
    const id = newId('user');
    await this.prisma.user.create({
      data: {
        id,
        roleId: role.id,
        email: `${label}-${id}@example.test`.toLowerCase(),
        fullName: `${label} fixture`,
      },
    });
    return id;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    await this.prisma.user.delete({ where: { id: userId } });
  }

  async clearTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async tokenRows(where: { userId?: string; familyId?: string }): Promise<
    {
      id: string;
      familyId: string;
      tokenHash: string;
      rotatedAt: Date | null;
      revokedAt: Date | null;
      revokedReason: string | null;
    }[]
  > {
    return this.prisma.refreshToken.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        familyId: true,
        tokenHash: true,
        rotatedAt: true,
        revokedAt: true,
        revokedReason: true,
      },
    });
  }

  async countLive(userId: string): Promise<number> {
    return this.prisma.refreshToken.count({ where: { userId, revokedAt: null } });
  }

  async expireAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
