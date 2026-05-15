import { Injectable } from '@nestjs/common';
import { HealthCheckResponse, ReadinessResponse } from './health.dto';

@Injectable()
export class HealthService {
  private startTime = Date.now();

  getHealth(): HealthCheckResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: (Date.now() - this.startTime) / 1000,
      environment: process.env.NODE_ENV || 'development',
    };
  }

  getReadiness(): ReadinessResponse {
    return {
      ready: true,
      timestamp: new Date().toISOString(),
      checks: {
        database: true,
        cache: true,
      },
    };
  }
}
