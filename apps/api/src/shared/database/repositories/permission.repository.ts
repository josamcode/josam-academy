import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

/**
 * `TBL-008` `permissions` — repository layer (`BR-1580`).
 */

export interface PermissionRow {
  key: string;
  isOrphaned: boolean;
}

export interface PermissionInput {
  id: string;
  key: string;
  model: string;
  action: string;
  scope: string | null;
  module: string;
}

export interface SyncCounts {
  inserted: number;
  reinstated: number;
  orphaned: number;
  total: number;
}

@Injectable()
export class PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async all(): Promise<PermissionRow[]> {
    return this.prisma.permission.findMany({ select: { key: true, isOrphaned: true } });
  }

  /**
   * `FEAT-014` — reconcile the code registry with the table, **in ONE transaction**.
   *
   * ## Why the whole thing is one transaction
   *
   * A partial sync does not degrade access, it **silently revokes** it. `PH-1.10`'s guard resolves
   * *deny* for any permission it cannot find, so a half-written table does not produce a
   * degraded-but-working system — it produces an administrator who can no longer administer, and
   * the symptom appears three layers from the cause. Either the registry matches code or the
   * process does not start.
   *
   * ## Why orphans are flagged, never deleted
   *
   * `BR-964`. `role_permissions.permission_id` is `ON DELETE CASCADE`, so deleting a permission
   * row would silently drop every grant referencing it. A permission temporarily removed from code
   * — a refactor, a bad merge, a feature flag — would therefore destroy an administrator's
   * configuration permanently, and restoring the code would NOT restore the grants. Flagging is
   * reversible; deletion is not.
   *
   * Reinstatement is the other half: a permission that returns to code has its flag cleared, so
   * the round trip is lossless.
   */
  async sync(registry: PermissionInput[]): Promise<SyncCounts> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.permission.findMany({ select: { key: true, isOrphaned: true } });
      const byKey = new Map(existing.map((p) => [p.key, p]));
      const inCode = new Set(registry.map((p) => p.key));

      const toInsert = registry.filter((p) => !byKey.has(p.key));
      if (toInsert.length > 0) {
        await tx.permission.createMany({ data: toInsert });
      }

      // A permission that came back to code is no longer orphaned.
      const toReinstate = registry
        .filter((p) => byKey.get(p.key)?.isOrphaned === true)
        .map((p) => p.key);
      if (toReinstate.length > 0) {
        await tx.permission.updateMany({
          where: { key: { in: toReinstate } },
          data: { isOrphaned: false },
        });
      }

      // Present in the database, absent from code, not already flagged.
      const toOrphan = existing
        .filter((p) => !inCode.has(p.key) && !p.isOrphaned)
        .map((p) => p.key);
      if (toOrphan.length > 0) {
        await tx.permission.updateMany({
          where: { key: { in: toOrphan } },
          data: { isOrphaned: true },
        });
      }

      const total = await tx.permission.count({ where: { isOrphaned: false } });

      return {
        inserted: toInsert.length,
        reinstated: toReinstate.length,
        orphaned: toOrphan.length,
        total,
      };
    });
  }
}
