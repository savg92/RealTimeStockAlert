import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PinoLogger } from './common/logger/logger.service';

async function bootstrap() {
  const logger = new PinoLogger();
  const app = await NestFactory.create(AppModule, {
    logger,
  });
  app.useLogger(logger);

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
