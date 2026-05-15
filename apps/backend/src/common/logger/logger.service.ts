import { Injectable, LoggerService } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class PinoLogger implements LoggerService {
  private logger: pino.Logger;

  constructor() {
    const isDev = process.env.NODE_ENV === 'development';
    this.logger = pino(
      isDev
        ? {
            level: process.env.LOG_LEVEL || 'debug',
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                singleLine: false,
              },
            },
          }
        : {
            level: process.env.LOG_LEVEL || 'info',
          },
    );
  }

  log(message: string, context?: string, meta?: Record<string, any>) {
    this.logger.info({ context, ...meta }, message);
  }

  error(message: string, trace?: string, context?: string, meta?: Record<string, any>) {
    this.logger.error({ trace, context, ...meta }, message);
  }

  warn(message: string, context?: string, meta?: Record<string, any>) {
    this.logger.warn({ context, ...meta }, message);
  }

  debug(message: string, context?: string, meta?: Record<string, any>) {
    this.logger.debug({ context, ...meta }, message);
  }

  verbose(message: string, context?: string, meta?: Record<string, any>) {
    this.logger.trace({ context, ...meta }, message);
  }
}
