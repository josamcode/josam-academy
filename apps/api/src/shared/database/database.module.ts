import { Global, Module } from '@nestjs/common';

import { HealthModule } from '../../modules/health/health.module.js';
import { DatabaseHealthIndicator } from './database-health.indicator.js';
import { PrismaService } from './prisma.service.js';

/**
 * Global so repositories can inject PrismaService without every module re-importing this one.
 * Only PrismaService is exported — the PrismaClient class itself never leaves this directory
 * (BR-1580).
 */
@Global()
@Module({
  imports: [HealthModule],
  providers: [PrismaService, DatabaseHealthIndicator],
  exports: [PrismaService],
})
export class DatabaseModule {}
