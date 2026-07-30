import { Global, Module } from '@nestjs/common';

import { DatabaseHealthIndicator } from './database-health.indicator.js';
import { PrismaService } from './prisma.service.js';
import { RefreshTokenRepository } from './repositories/refresh-token.repository.js';
import { UserRepository } from './repositories/user.repository.js';
import { VerificationTokenRepository } from './repositories/verification-token.repository.js';

/**
 * Global so repositories can inject PrismaService without every module re-importing this one.
 * Only PrismaService is exported — the PrismaClient class itself never leaves this directory
 * (BR-1580).
 *
 * No import of modules/health: the indicator registers into shared/health's registry, which is
 * beneath both. See shared/health/health-registry.ts for why that direction matters.
 */
@Global()
@Module({
  providers: [
    PrismaService,
    DatabaseHealthIndicator,
    RefreshTokenRepository,
    UserRepository,
    VerificationTokenRepository,
  ],
  exports: [PrismaService, RefreshTokenRepository, UserRepository, VerificationTokenRepository],
})
export class DatabaseModule {}
