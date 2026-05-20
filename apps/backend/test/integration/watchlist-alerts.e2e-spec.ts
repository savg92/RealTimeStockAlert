import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

// Run these tests in development mode so the dev-test-token shortcut is accepted
process.env.NODE_ENV = 'development';

// Allow longer async hooks (app init/close) in integration tests
jest.setTimeout(20000);

describe('Watchlist & Alerts Integration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    // Attempt graceful shutdown but avoid long hangs in CI/local runs
    try {
      await Promise.race([app.close(), new Promise((r) => setTimeout(r, 1000))]);
    } catch (e) {
      // ignore close errors in tests
    }
  });

  it('adds a watchlist item (dev) and creates/lists/deletes an alert (dev auth)', async () => {
    const server = app.getHttpServer();

    // Add a watchlist item (ungarded in dev)
    const wRes = await request(server)
      .post('/watchlist')
      .send({ symbol: 'AAPL', name: 'Apple Inc.' })
      .expect(201);

    expect(wRes.body).toHaveProperty('id');
    expect(wRes.body.symbol).toBe('AAPL');

    // Create an alert using the dev bearer token accepted by AuthGuard
    const alertPayload = { symbol: 'AAPL', price: 150, condition: 'above', threshold: 150 };
    const aRes = await request(server)
      .post('/alerts')
      .set('Authorization', 'Bearer dev-test-token-12345')
      .send(alertPayload)
      .expect(201);

    expect(aRes.body).toHaveProperty('id');
    expect(aRes.body.symbol).toBe('AAPL');

    const alertId = aRes.body.id;

    // List alerts for the dev user
    const listRes = await request(server)
      .get('/alerts')
      .set('Authorization', 'Bearer dev-test-token-12345')
      .expect(200);

    expect(Array.isArray(listRes.body)).toBeTruthy();
    expect(listRes.body.find((a: any) => a.id === alertId)).toBeDefined();

    // Clean up: delete alert and watchlist item
    await request(server)
      .delete(`/alerts/${alertId}`)
      .set('Authorization', 'Bearer dev-test-token-12345')
      .expect(200);

    await request(server).delete('/watchlist/AAPL').expect(200);
  }, 20000);
});
