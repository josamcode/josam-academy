import { Module } from '@nestjs/common';

import { HealthModule } from './modules/health/health.module.js';
import { DatabaseModule } from './shared/database/database.module.js';

/**
 * The modular monolith root (08 §4.1). The 17 domain modules — identity, access, commerce,
 * entitlements, content, learning, motivation, assessment, certification, ai, qa, reviews,
 * protection, messaging, support, administration, analytics — are Phase 1 and later, and are
 * imported here as each is built. Phase 0 has infrastructure only; it has no domain.
 */
@Module({
  imports: [DatabaseModule, HealthModule],
})
export class AppModule {}
