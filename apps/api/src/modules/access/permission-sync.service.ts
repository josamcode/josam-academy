import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { newUnprefixedId } from '../../shared/database/id.js';
import { PermissionRepository } from '../../shared/database/repositories/permission.repository.js';
import {
  PERMISSION_COUNT,
  PERMISSION_REGISTRY,
  type PermissionDefinition,
} from './permission-registry.js';

/**
 * `PH-1.8` — startup sync. `FEAT-014`, `BR-709`, `BR-964`.
 *
 * ## The API REFUSES TO START if this fails. That is deliberate.
 *
 * The alternative — log the error and carry on with whatever is in the table — is worse in a
 * specific and non-obvious way. **A partial registry does not degrade access; it silently
 * REVOKES it.** `PH-1.10`'s guard resolves *deny* for any permission it cannot find, so a
 * half-written table produces an administrator who can no longer administer, with a symptom
 * three layers from the cause and no error anywhere pointing at the sync.
 *
 * Refusing to boot converts that into a **deploy failure that names itself** — the same trade as
 * `JWT_SECRET` at `PH-1.3`, and the same reason: a queued, silent failure costs incomparably more
 * than a loud one at the moment of change.
 *
 * `BR-1846` applies: this changes application composition, so the deploy is part of the task.
 */
@Injectable()
export class PermissionSyncService implements OnModuleInit {
  private readonly logger = new Logger(PermissionSyncService.name);

  constructor(private readonly permissions: PermissionRepository) {}

  async onModuleInit(): Promise<void> {
    await this.sync();
  }

  /**
   * The registry is a PARAMETER so the guards below can actually be exercised. The first version
   * of the spec could not reach them and asserted an inline copy of the check instead — a test
   * that passes whatever the service does, which is the defect this session kept finding.
   */
  async sync(registry: readonly PermissionDefinition[] = PERMISSION_REGISTRY): Promise<void> {
    // The registry's own integrity, checked before it is written anywhere. A generated file that
    // silently lost rows would otherwise orphan every permission it dropped — the destructive
    // direction, and the one that looks like a successful sync.
    if (registry.length !== PERMISSION_COUNT) {
      throw new Error(
        `permission registry holds ${String(registry.length)} entries, but 05 §5 ` +
          `states ${String(PERMISSION_COUNT)}. Refusing to sync a registry that does not match ` +
          'its specification — the difference would be written to the database as orphans.',
      );
    }

    const keys = new Set(registry.map((p) => p.key));
    if (keys.size !== registry.length) {
      throw new Error(
        'permission registry contains duplicate keys — `permissions.key` is UNIQUE, so the ' +
          'insert would fail partway through and leave the table in an undefined state.',
      );
    }

    try {
      const counts = await this.permissions.sync(
        registry.map((p) => ({ id: newUnprefixedId(), ...p })),
      );

      this.logger.log(
        `permission sync: ${String(counts.total)} active ` +
          `(+${String(counts.inserted)} new, ` +
          `${String(counts.reinstated)} reinstated, ` +
          `${String(counts.orphaned)} newly orphaned)`,
      );

      if (counts.orphaned > 0) {
        // Loud, because it means the database knows about permissions this build does not.
        // Usually a legitimate removal; occasionally a bad merge that just revoked capability.
        this.logger.warn(
          `${String(counts.orphaned)} permission(s) are in the database but absent from code — ` +
            'flagged orphaned, NOT deleted (BR-964). Grants referencing them are preserved. ' +
            'If this was not intentional, restoring the code reinstates them losslessly.',
        );
      }
    } catch (error: unknown) {
      // Rethrown, so `onModuleInit` aborts the bootstrap. See the class note for why a partial
      // registry is worse than no application.
      this.logger.error(
        'permission sync FAILED — refusing to start. A partial registry silently revokes access ' +
          'rather than degrading it, and the symptom would appear three layers from this cause.',
      );
      throw error;
    }
  }
}
