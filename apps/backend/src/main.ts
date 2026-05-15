import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PinoLogger } from './common/logger/logger.service';

async function bootstrap() {
  const logger = new PinoLogger();
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  const port = process.env.PORT || 3000;
  const nodeEnv = process.env.NODE_ENV || 'development';

  await app.listen(port);

  logger.log(`🚀 Application is running on http://localhost:${port}`, 'NestApplication', {
    environment: nodeEnv,
    pid: process.pid,
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
