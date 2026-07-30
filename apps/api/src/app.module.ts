import { Module } from '@nestjs/common';

import { AccessModule } from './modules/access/access.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { ObservabilityModule } from './shared/common/observability.module.js';
import { DatabaseModule } from './shared/database/database.module.js';
import { BackupModule } from './shared/providers/backup/backup.module.js';
import { RedisModule } from './shared/redis/redis.module.js';
import { SecurityModule } from './shared/security/security.module.js';
import { SharedHealthModule } from './shared/health/health.module.js';

/**
 * The modular monolith root (08 §4.1). The 17 domain modules — identity, access, commerce,
 * entitlements, content, learning, motivation, assessment, certification, ai, qa, reviews,
 * protection, messaging, support, administration, analytics — are Phase 1 and later, and are
 * imported here as each is built. Phase 0 has infrastructure only; it has no domain.
 */
@Module({
  imports: [
    ObservabilityModule,
    SharedHealthModule,
    DatabaseModule,
    RedisModule,
    SecurityModule,
    BackupModule,
    HealthModule,
    IdentityModule,
    AccessModule,
  ],
})
export class AppModule {}
