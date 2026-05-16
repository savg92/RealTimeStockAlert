import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import type { HealthCheckResponse, ReadinessResponse } from './health.dto';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('/health')
  health(): HealthCheckResponse {
    return this.healthService.getHealth();
  }

  @Get('/ready')
  ready(): ReadinessResponse {
    return this.healthService.getReadiness();
  }
}
