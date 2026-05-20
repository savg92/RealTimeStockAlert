import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { PinoLogger } from './common/logger/logger.service';

async function bootstrap() {
  const logger = new PinoLogger();
  const app = await NestFactory.create(AppModule, {
    logger,
  });
  app.useLogger(logger);
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logger.log(
        `${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs.toFixed(1)}ms)`,
        'HTTP',
        {
          requestId: req.id,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: Number(durationMs.toFixed(1)),
        },
      );
    });

    next();
  });

  const port = process.env.PORT || 3000;
  const nodeEnv = process.env.NODE_ENV || 'development';

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Real-Time Stock Alert API')
    .setDescription('Backend API for health checks, alerts, and notifications.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'bearer',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Allow requests from the mobile dev client / device
  app.enableCors();

  // Bind to 0.0.0.0 so the server is reachable from other devices on the LAN
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application is running on http://localhost:${port}`, 'NestApplication', {
    environment: nodeEnv,
    pid: process.pid,
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
