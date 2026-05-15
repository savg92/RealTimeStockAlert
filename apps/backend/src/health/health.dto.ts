export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  environment?: string;
}

export interface ReadinessResponse {
  ready: boolean;
  timestamp: string;
  checks: {
    database?: boolean;
    cache?: boolean;
  };
}
