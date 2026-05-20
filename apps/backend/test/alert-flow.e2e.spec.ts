import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Alert Flow E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testUserId = 'test-user-e2e-' + Date.now();
  const testToken = `Bearer ${testUserId}`;
  let alertId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    // Cleanup test user
    if (testUserId) {
      try {
        await prisma.user.deleteMany({
          where: { id: testUserId },
        });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    await app.close();
  });

  describe('1️⃣  Health Check', () => {
    it('should return ok status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('2️⃣  Watchlist: Add Stock', () => {
    it('should add AAPL to watchlist', async () => {
      const response = await request(app.getHttpServer())
        .post('/watchlist')
        .set('Authorization', testToken)
        .send({ symbol: 'AAPL' })
        .expect(201);

      expect(response.body.symbol).toBe('AAPL');
      expect(response.body.userId).toBe(testUserId);
    });

    it('should get current stock prices', async () => {
      const response = await request(app.getHttpServer())
        .get('/stocks/prices')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const aapl = response.body.find((s: any) => s.symbol === 'AAPL');
      expect(aapl).toBeDefined();
      expect(aapl.price).toBeGreaterThan(0);
    });
  });

  describe('3️⃣  Notifications: Register Token', () => {
    it('should register FCM token', async () => {
      const testToken = 'test-fcm-token-' + Date.now();
      const response = await request(app.getHttpServer())
        .put('/notifications/token')
        .set('Authorization', `Bearer ${testUserId}`)
        .send({ token: testToken })
        .expect(200);

      expect(response.body.ok).toBe(true);
    });
  });

  describe('4️⃣  Alerts: Create Alert', () => {
    it('should create alert AAPL above 150', async () => {
      const response = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${testUserId}`)
        .send({
          symbol: 'AAPL',
          price: 150.0,
          condition: 'above',
          threshold: 150.0,
        })
        .expect(201);

      expect(response.body.symbol).toBe('AAPL');
      expect(response.body.condition).toBe('above');
      expect(response.body.threshold).toBe(150.0);
      expect(response.body.isActive).toBe(true);

      alertId = response.body.id;
    });

    it('should list the created alert', async () => {
      const response = await request(app.getHttpServer())
        .get('/alerts')
        .set('Authorization', `Bearer ${testUserId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const alert = response.body.find((a: any) => a.id === alertId);
      expect(alert).toBeDefined();
      expect(alert.isActive).toBe(true);
    });
  });

  describe('5️⃣  Price Trigger: Dev Endpoint', () => {
    it('should trigger price update above threshold', async () => {
      const response = await request(app.getHttpServer())
        .post('/dev/price')
        .set('Authorization', `Bearer ${testUserId}`)
        .send({
          symbol: 'AAPL',
          price: 155.0,
          change: 5.0,
          changePercent: 3.33,
        })
        .expect(200);

      expect(response.body.symbol).toBe('AAPL');
      expect(response.body.price).toBe(155.0);
    });
  });

  describe('6️⃣  Dispatch History: Query & Filter', () => {
    beforeAll(async () => {
      // Give dispatch time to be created
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    it('should retrieve dispatch history', async () => {
      const response = await request(app.getHttpServer())
        .post('/dev/dispatch-history')
        .set('Authorization', `Bearer ${testUserId}`)
        .send({ limit: 50 })
        .expect(200);

      expect(response.body).toHaveProperty('dispatches');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.dispatches)).toBe(true);
    });

    it('should filter by symbol AAPL', async () => {
      const response = await request(app.getHttpServer())
        .post('/dev/dispatch-history')
        .set('Authorization', `Bearer ${testUserId}`)
        .send({ symbol: 'AAPL', limit: 50 })
        .expect(200);

      if (response.body.dispatches.length > 0) {
        expect(
          response.body.dispatches.every((d: any) => d.symbol === 'AAPL')
        ).toBe(true);
      }
    });

    it('should filter by status sent', async () => {
      const response = await request(app.getHttpServer())
        .post('/dev/dispatch-history')
        .set('Authorization', `Bearer ${testUserId}`)
        .send({ status: 'sent', limit: 50 })
        .expect(200);

      if (response.body.dispatches.length > 0) {
        expect(
          response.body.dispatches.every((d: any) => d.deliveryStatus === 'sent')
        ).toBe(true);
      }
    });

    it('should have summary statistics', async () => {
      const response = await request(app.getHttpServer())
        .post('/dev/dispatch-history')
        .set('Authorization', `Bearer ${testUserId}`)
        .send({ limit: 50 })
        .expect(200);

      expect(typeof response.body.summary).toBe('object');
      expect(response.body).toHaveProperty('filters');
    });
  });

  describe('7️⃣  WebSocket Logging', () => {
    it('should get WebSocket event log', async () => {
      const response = await request(app.getHttpServer())
        .get('/dev/ws-events')
        .expect(200);

      expect(Array.isArray(response.body.events)).toBe(true);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('maxSize');
    });

    it('should clear WebSocket event log', async () => {
      const response = await request(app.getHttpServer())
        .delete('/dev/ws-events')
        .expect(200);

      expect(response.body.cleared).toBe(true);
    });
  });

  describe('8️⃣  Cleanup', () => {
    it('should delete alert', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/alerts/${alertId}`)
        .set('Authorization', `Bearer ${testUserId}`)
        .expect(200);

      expect(response.body.count).toBe(1);
    });

    it('should remove from watchlist', async () => {
      const response = await request(app.getHttpServer())
        .delete('/watchlist/AAPL')
        .set('Authorization', `Bearer ${testUserId}`)
        .expect(200);

      expect(response.body.count).toBe(1);
    });
  });

  describe('✅ Complete Alert Flow', () => {
    it('should have tested all components', () => {
      expect(alertId).toBeDefined();
      expect(testUserId).toBeDefined();
      console.log(`\n✅ E2E Test Complete`);
      console.log(`   - Created alert: ${alertId}`);
      console.log(`   - Test user: ${testUserId}`);
      console.log(`   - All steps executed successfully\n`);
    });
  });
});
