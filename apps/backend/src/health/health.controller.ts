import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import type { HealthCheckResponse, ReadinessResponse } from './health.dto';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('/health')
  @ApiOperation({ summary: 'Get the application health status' })
  @ApiOkResponse({
    description: 'Current health status.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2026-05-16T00:00:00.000Z' },
        uptime: { type: 'number', example: 123.45 },
        environment: { type: 'string', example: 'production', nullable: true },
      },
    },
  })
  health(): HealthCheckResponse {
    return this.healthService.getHealth();
  }

  @Get('/ready')
  @ApiOperation({ summary: 'Get the application readiness status' })
  @ApiOkResponse({
    description: 'Current readiness status.',
    schema: {
      type: 'object',
      properties: {
        ready: { type: 'boolean', example: true },
        timestamp: { type: 'string', example: '2026-05-16T00:00:00.000Z' },
        checks: {
          type: 'object',
          properties: {
            database: { type: 'boolean', example: true, nullable: true },
            cache: { type: 'boolean', example: true, nullable: true },
          },
        },
      },
    },
  })
  ready(): ReadinessResponse {
    return this.healthService.getReadiness();
  }
}
