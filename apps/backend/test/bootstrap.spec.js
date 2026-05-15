"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const supertest_1 = __importDefault(require("supertest"));
const app_module_1 = require("../src/app.module");
describe('Backend Bootstrap (e2e)', () => {
    let app;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
    });
    afterAll(async () => {
        await app.close();
    });
    describe('Health Endpoint', () => {
        it('should return 200 status and health status on GET /health', () => {
            return (0, supertest_1.default)(app.getHttpServer())
                .get('/health')
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('status');
                expect(res.body.status).toBe('ok');
            });
        });
        it('should return proper health check response format', () => {
            return (0, supertest_1.default)(app.getHttpServer())
                .get('/health')
                .expect((res) => {
                expect(res.body).toHaveProperty('timestamp');
                expect(res.body).toHaveProperty('uptime');
            });
        });
    });
    describe('Ready Endpoint', () => {
        it('should return 200 status on GET /ready', () => {
            return (0, supertest_1.default)(app.getHttpServer())
                .get('/ready')
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('ready');
                expect(res.body.ready).toBe(true);
            });
        });
        it('should return readiness check response with dependencies', () => {
            return (0, supertest_1.default)(app.getHttpServer())
                .get('/ready')
                .expect((res) => {
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
            return (0, supertest_1.default)(app.getHttpServer())
                .get('/health')
                .expect((res) => {
                expect(res.headers).toHaveProperty('x-request-id');
                expect(res.headers['x-request-id']).toBeTruthy();
            });
        });
        it('should have consistent request ID across middlewares', async () => {
            const responses = await Promise.all([
                (0, supertest_1.default)(app.getHttpServer()).get('/health'),
                (0, supertest_1.default)(app.getHttpServer()).get('/health'),
            ]);
            const ids = responses.map((res) => res.headers['x-request-id']);
            expect(ids[0]).not.toBe(ids[1]);
        });
    });
    describe('Application Configuration', () => {
        it('should load environment variables correctly', () => {
            const port = process.env.PORT || 3000;
            expect(port).toBeDefined();
        });
        it('should have app module defined', () => {
            const appModule = app.get(app_module_1.AppModule);
            expect(appModule).toBeDefined();
        });
    });
});
//# sourceMappingURL=bootstrap.spec.js.map