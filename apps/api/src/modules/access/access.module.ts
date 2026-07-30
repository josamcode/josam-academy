import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../shared/database/database.module.js';
import { PermissionSyncService } from './permission-sync.service.js';

/**
 * `M02` Access. `PH-1.8` opens it with the registry and its startup sync; `PH-1.9`–`PH-1.13` add
 * abilities, the guard, the capability interceptor and the admin surface on top.
 */
@Module({
  imports: [DatabaseModule],
  providers: [PermissionSyncService],
  exports: [PermissionSyncService],
})
export class AccessModule {}
