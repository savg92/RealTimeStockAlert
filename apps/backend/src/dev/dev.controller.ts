import { Body, Controller, ForbiddenException, Post, Get, Delete, Param } from '@nestjs/common';
import { AlertEngineService } from '../notifications/alert-engine.service';
import type { PriceTick } from '../redis/price-subscriber.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { WatchlistService } from '../watchlist/watchlist.service';
import { FinnhubService } from '../finnhub/finnhub.service';
import { PriceSubscriberService } from '../redis/price-subscriber.service';
import type { CreateAlertInput } from '@stock-alert/shared';

@Controller('dev')
export class DevController {
  private testUserId = 'test-user-' + Date.now();

  constructor(
    private readonly alertEngine: AlertEngineService,
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly watchlist: WatchlistService,
    private readonly finnhub: FinnhubService,
    private readonly priceSubscriber: PriceSubscriberService,
  ) {}

  private throwIfNotDev() {
    if (process.env.NODE_ENV !== 'development') {
      throw new ForbiddenException('Dev endpoints are only available in development');
    }
  }

  /** Create a test user and return token (JWT format for testing) */
  @Post('user')
  async getTestUser() {
    this.throwIfNotDev();

    // Ensure test user exists
    await this.prisma.user.upsert({
      where: { id: this.testUserId },
      create: {
        id: this.testUserId,
        email: `dev+${this.testUserId}@test.local`,
        firebaseId: `dev-firebase-id-${this.testUserId}`,
      },
      update: {},
    });

    // Return a mock JWT token (base64 encoded user ID)
    const token = Buffer.from(JSON.stringify({ sub: this.testUserId, iat: Date.now() })).toString('base64');

    return {
      userId: this.testUserId,
      token: `Bearer ${token}`,
      message: 'Use this token in Authorization header for dev endpoints',
    };
  }

  /** Create a test alert */
  @Post('alert')
  async createAlert(@Body() body: { symbol?: string; condition?: string; threshold?: number; price?: number }) {
    this.throwIfNotDev();

    const input: CreateAlertInput = {
      symbol: body.symbol || 'AAPL',
      price: body.price || 150,
      condition: (body.condition || 'above') as 'above' | 'below',
      threshold: body.threshold || 150,
    };

    const alert = await this.alerts.createAlert(this.testUserId, input);
    return { alert, message: `Created alert for ${input.symbol}` };
  }

  /** List all alerts for test user */
  @Get('alerts')
  async listAlerts() {
    this.throwIfNotDev();
    return this.alerts.findAlertsForUser(this.testUserId);
  }

  /** Add a stock to watchlist */
  @Post('watchlist')
  async addToWatchlist(@Body() body: { symbol?: string; name?: string } = {}) {
    this.throwIfNotDev();

    const symbol = (body.symbol || 'AAPL').toUpperCase();
    const item = await this.watchlist.addItem(this.testUserId, symbol, body.name);

    return {
      item,
      message: `Added ${symbol} to watchlist and subscribed in Finnhub`,
    };
  }

  /** List watchlist for test user */
  @Get('watchlist')
  async getWatchlist() {
    this.throwIfNotDev();
    return this.watchlist.listForUser(this.testUserId);
  }

  /** Remove from watchlist */
  @Delete('watchlist/:symbol')
  async removeFromWatchlist(@Param('symbol') symbol: string) {
    this.throwIfNotDev();

    const result = await this.watchlist.removeItem(this.testUserId, symbol);

    return {
      result,
      message: `Removed ${symbol} from watchlist`,
    };
  }

  /** Publish a test price tick */
  @Post('price')
  async publishPrice(@Body() body: { symbol: string; price: number; timestamp?: number; volume?: number }) {
    this.throwIfNotDev();

    const tick: PriceTick = {
      symbol: String(body.symbol).toUpperCase(),
      price: Number(body.price),
      timestamp: typeof body.timestamp === 'number' ? body.timestamp : Date.now(),
    } as PriceTick;
    if (typeof body.volume === 'number') {
      (tick as any).volume = body.volume;
    }

    await this.alertEngine.processPriceTick(tick);
    return { ok: true, message: `Processed price tick for ${tick.symbol}` };
  }

  /** List recent alert dispatches (notifications sent) */
  @Get('dispatches')
  async listDispatches() {
    this.throwIfNotDev();
    return this.prisma.alertDispatch.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  }

  /** Manually trigger an alert by ID */
  @Post('trigger/:alertId')
  async triggerAlert(@Param('alertId') alertId: string, @Body() body: { price?: number } = {}) {
    this.throwIfNotDev();

    const alert = await this.prisma.alert.findUnique({ where: { id: alertId } });
    if (!alert) {
      throw new ForbiddenException(`Alert ${alertId} not found`);
    }

    const price = body.price || alert.threshold;
    const tick: PriceTick = {
      symbol: alert.symbol,
      price,
      timestamp: Date.now(),
    } as PriceTick;

    await this.alertEngine.processPriceTick(tick);
    return { ok: true, message: `Triggered alert ${alertId}` };
  }

  /** Check Finnhub connection and subscribed symbols */
  @Get('finnhub-status')
  async getFinnhubStatus() {
    this.throwIfNotDev();

    return {
      connected: this.finnhub.isConnected(),
      usingRestFallback: this.finnhub.isUsingRestFallback(),
      telemetry: this.finnhub.getReconnectTelemetry(),
    };
  }

  /** Check Redis subscription health */
  @Get('redis-health')
  async getRedisHealth() {
    this.throwIfNotDev();

    return this.priceSubscriber.getChannelHealth();
  }

  /** Check notification tokens registered */
  @Get('notifications-health')
  async getNotificationsHealth() {
    this.throwIfNotDev();

    const tokens = await this.prisma.fcmToken.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalTokens: await this.prisma.fcmToken.count(),
      recentTokens: tokens,
    };
  }

  /** Execute a predefined test scenario */
  @Post('scenario/:name')
  async runTestScenario(
    @Param('name') name: string,
    @Body() body: { symbol?: string; prices?: number[] } = {},
  ) {
    this.throwIfNotDev();

    const results: any[] = [];
    const symbol = (body.symbol || 'AAPL').toUpperCase();
    const basePrice = 150;

    switch (name) {
      case 'basic-alert-flow': {
        // 1. Add stock to watchlist
        await this.watchlist.addItem(this.testUserId, symbol, symbol);
        results.push({ step: 'add-watchlist', symbol, success: true });

        // 2. Create alert above price
        const alert = await this.alerts.createAlert(this.testUserId, {
          symbol,
          price: basePrice,
          condition: 'above',
          threshold: basePrice,
        });
        results.push({ step: 'create-alert', alertId: alert.id, condition: 'above', threshold: basePrice });

        // 3. Trigger price update
        await this.alertEngine.processPriceTick({
          symbol,
          price: basePrice + 5,
          timestamp: Date.now(),
        } as any);
        results.push({ step: 'trigger-price', symbol, price: basePrice + 5, triggered: true });

        // 4. List dispatches
        const dispatches = await this.prisma.alertDispatch.findMany({
          where: { userId: this.testUserId, symbol },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });
        results.push({ step: 'check-dispatches', count: dispatches.length, dispatches });

        return { scenario: name, results };
      }

      case 'multi-alert-cascade': {
        // Create multiple alerts with different thresholds and trigger them all
        const thresholds = [145, 150, 155];
        const alerts = [];

        for (const threshold of thresholds) {
          const alert = await this.alerts.createAlert(this.testUserId, {
            symbol,
            price: threshold,
            condition: 'above',
            threshold,
          });
          alerts.push({ alertId: alert.id, threshold });
        }
        results.push({ step: 'create-alerts', count: alerts.length, alerts });

        // Trigger prices that match different alerts
        const testPrices = body.prices || [148, 152, 157];
        for (const price of testPrices) {
          await this.alertEngine.processPriceTick({
            symbol,
            price,
            timestamp: Date.now(),
          } as any);
          results.push({ step: 'trigger-price', price, triggered: true });
        }

        // Get all dispatches
        const dispatches = await this.prisma.alertDispatch.findMany({
          where: { userId: this.testUserId, symbol },
          orderBy: { createdAt: 'desc' },
        });
        results.push({ step: 'final-dispatches', count: dispatches.length });

        return { scenario: name, results };
      }

      case 'price-volatility': {
        // Create both above and below alerts, then oscillate prices
        const aboveAlert = await this.alerts.createAlert(this.testUserId, {
          symbol,
          price: 152,
          condition: 'above',
          threshold: 152,
        });
        const belowAlert = await this.alerts.createAlert(this.testUserId, {
          symbol,
          price: 148,
          condition: 'below',
          threshold: 148,
        });
        results.push({
          step: 'create-alerts',
          above: { alertId: aboveAlert.id, threshold: 152 },
          below: { alertId: belowAlert.id, threshold: 148 },
        });

        // Oscillate prices
        const prices = [155, 145, 158, 142, 160];
        for (const price of prices) {
          await this.alertEngine.processPriceTick({
            symbol,
            price,
            timestamp: Date.now(),
          } as any);
        }
        results.push({ step: 'trigger-prices', prices, count: prices.length });

        // Get final dispatch summary
        const dispatches = await this.prisma.alertDispatch.findMany({
          where: { userId: this.testUserId, symbol },
          orderBy: { createdAt: 'desc' },
        });
        results.push({ step: 'final-dispatches', count: dispatches.length });

        return { scenario: name, results };
      }

      case 'watchlist-tracking': {
        // Add multiple stocks and create alerts for each
        const stocks = [symbol, 'GOOGL', 'MSFT', 'TSLA'];
        const createdAlerts = [];

        for (const stock of stocks) {
          await this.watchlist.addItem(this.testUserId, stock, stock);
          const alert = await this.alerts.createAlert(this.testUserId, {
            symbol: stock,
            price: basePrice,
            condition: 'above',
            threshold: basePrice,
          });
          createdAlerts.push({ symbol: stock, alertId: alert.id });
        }
        results.push({ step: 'create-multi-watchlist', stocks: createdAlerts.length, items: createdAlerts });

        // Trigger some prices
        for (const stock of stocks.slice(0, 3)) {
          await this.alertEngine.processPriceTick({
            symbol: stock,
            price: basePrice + 10,
            timestamp: Date.now(),
          } as any);
        }
        results.push({ step: 'trigger-prices', count: 3 });

        // Get watchlist and dispatches
        const watchlist = await this.watchlist.listForUser(this.testUserId);
        const dispatches = await this.prisma.alertDispatch.findMany({
          where: { userId: this.testUserId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });
        results.push({
          step: 'final-status',
          watchlistItems: watchlist.length,
          dispatches: dispatches.length,
        });

        return { scenario: name, results };
      }

      default:
        throw new ForbiddenException(
          `Unknown scenario: ${name}. Available: basic-alert-flow, multi-alert-cascade, price-volatility, watchlist-tracking`,
        );
    }
  }

  /** Clear all test data */
  @Delete('reset')
  async resetTestData() {
    this.throwIfNotDev();

    const deleted = {
      alerts: await this.prisma.alert.deleteMany({ where: { userId: this.testUserId } }),
      watchlist: await this.prisma.watchlistItem.deleteMany({ where: { userId: this.testUserId } }),
      dispatches: await this.prisma.alertDispatch.deleteMany({ where: { userId: this.testUserId } }),
      user: await this.prisma.user.delete({ where: { id: this.testUserId } }).catch(() => ({ count: 0 })),
    };

    return {
      message: 'Test data cleared',
      deleted,
    };
  }

  /** Get WebSocket event log from Finnhub service */
  @Get('ws-events')
  async getWebSocketEvents() {
    this.throwIfNotDev();
    return {
      events: this.finnhub.getWebSocketEventLog(),
      count: this.finnhub.getWebSocketEventLog().length,
    };
  }

  /** Clear WebSocket event log */
  @Delete('ws-events')
  async clearWebSocketEvents() {
    this.throwIfNotDev();
    this.finnhub.clearWebSocketEventLog();
    return { message: 'WebSocket event log cleared' };
  }
}
