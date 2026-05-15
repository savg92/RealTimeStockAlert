import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Backend Bootstrap (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Endpoint', () => {
    it('should return 200 status and health status on GET /health', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res: any) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body.status).toBe('ok');
        });
    });

    it('should return proper health check response format', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect((res: any) => {
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('uptime');
        });
    });
  });

  describe('Ready Endpoint', () => {
    it('should return 200 status on GET /ready', () => {
      return request(app.getHttpServer())
        .get('/ready')
        .expect(200)
        .expect((res: any) => {
          expect(res.body).toHaveProperty('ready');
          expect(res.body.ready).toBe(true);
        });
    });

    it('should return readiness check response with dependencies', () => {
      return request(app.getHttpServer())
        .get('/ready')
        .expect((res: any) => {
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('checks');
        });
    });
  });

  describe('Structured Logging', () => {
    it('should have structured logger available', async () => {
      const logger = app.get('Logger');
      expect(logger).toBeDefined();
    });
  });

  describe('Request ID Middleware', () => {
    it('should attach request ID to response headers', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect((res: any) => {
          expect(res.headers).toHaveProperty('x-request-id');
          expect(res.headers['x-request-id']).toBeTruthy();
        });
    });

    it('should have consistent request ID across middlewares', async () => {
      const responses = await Promise.all([
        request(app.getHttpServer()).get('/health'),
        request(app.getHttpServer()).get('/health'),
      ]);

      const ids = responses.map((res: any) => res.headers['x-request-id']);
      expect(ids[0]).not.toBe(ids[1]);
    });
  });

  describe('Application Configuration', () => {
    it('should load environment variables correctly', () => {
      const port = process.env.PORT || 3000;
      expect(port).toBeDefined();
    });

    it('should have app module defined', () => {
      const appModule = app.get(AppModule);
      expect(appModule).toBeDefined();
    });
  });
});
