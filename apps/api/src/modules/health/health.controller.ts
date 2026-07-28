import { Controller, Get } from '@nestjs/common';

import { HealthService, type HealthReport } from './health.service.js';

@Controller('health')
export class HealthController {
  // Injected by class token — the constructor parameter is the DI token, which is exactly what
  // src/probes/di.probe.ts guards. Note `HealthService` is a VALUE import above, not a type-only
  // one; only `HealthReport` is imported as a type.
  constructor(private readonly health: HealthService) {}

  @Get()
  async get(): Promise<HealthReport> {
    return this.health.report();
  }
}
