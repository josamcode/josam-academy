import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../generated/prisma/client.js';

/**
 * The single place in the application that holds a PrismaClient.
 *
 * BR-1580 — Prisma is confined to repositories; it never appears in a service or a controller.
 * This class is not a domain service, it is the connection itself: repositories (Phase 1) inject
 * it, and nothing above them ever imports `PrismaClient` or a Prisma type. The fitness function
 * that enforces that boundary mechanically is PH-0.16. There are no repositories yet because
 * there is no domain yet — Phase 0 has no entities.
 *
 * The driver adapter is a Prisma 7 requirement, not a choice: Prisma 7 removed the built-in
 * connection path, so a client must be handed a driver (PH-0.6 probe, BR-1816). Keeping the
 * adapter here means that change is invisible above this directory — which is the whole point
 * of the boundary.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env['DATABASE_URL'];
    if (!connectionString) {
      // BR-943 — fail fast and say which variable, never the value.
      throw new Error('DATABASE_URL is not set. The API cannot start without a database.');
    }

    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('database connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
