import { Global, Module } from '@nestjs/common';

import { HealthRegistry } from './health-registry.js';

/**
 * Global so any piece of infrastructure can register an indicator without the health module
 * importing it — which is the dependency direction `shared-must-not-depend-on-modules` enforces.
 */
@Global()
@Module({
  providers: [HealthRegistry],
  exports: [HealthRegistry],
})
export class SharedHealthModule {}
