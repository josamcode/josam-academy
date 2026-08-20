import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { DatabaseModule } from '../../shared/database/database.module.js';
import { CapabilityInterceptor } from './capability.interceptor.js';
import { PermissionSyncService } from './permission-sync.service.js';

/**
 * `M02` Access. `PH-1.8` opens it with the registry and its startup sync; `PH-1.9`–`PH-1.13` add
 * abilities, the guard, the capability interceptor and the admin surface on top.
 *
 * `BR-844` — the capability interceptor runs on **every** response, so it is bound with
 * `APP_INTERCEPTOR` rather than per-controller. A per-controller binding is the same rule
 * expressed as a habit: it holds until somebody writes a controller and does not think of it, and
 * the failure is a response that silently carries no `_can` while the client renders from `_can`.
 *
 * It is registered HERE rather than in `AppModule` because `APP_INTERCEPTOR` is global wherever it
 * is declared, and declaring it beside the code it runs keeps the access concern in one directory.
 * That follows the precedent already in the tree: `ObservabilityModule` binds `APP_FILTER` the
 * same way (`shared/common/observability.module.ts:21`), which was the only global provider in the
 * API before this task.
 */
@Module({
  imports: [DatabaseModule],
  providers: [PermissionSyncService, { provide: APP_INTERCEPTOR, useClass: CapabilityInterceptor }],
  exports: [PermissionSyncService],
})
export class AccessModule {}
