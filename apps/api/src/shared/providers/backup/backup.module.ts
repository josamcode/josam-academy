import { Global, Module } from '@nestjs/common';

import { BackupHealthIndicator } from './backup-health.indicator.js';
import { BackupStorageProvider } from './backup-storage.provider.js';

/**
 * `PH-0.28`. Global so `FEAT-220`'s `StorageProvider` can share the client in Phase 1 without every
 * module re-importing this.
 *
 * No import of `modules/health` — the indicator registers into `shared/health`'s registry, which
 * sits beneath both. See `shared/health/health-registry.ts` for why that direction matters.
 */
@Global()
@Module({
  providers: [BackupStorageProvider, BackupHealthIndicator],
  exports: [BackupStorageProvider],
})
export class BackupModule {}
