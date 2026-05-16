# FinnhubService

A robust NestJS service for connecting to the Finnhub WebSocket API and receiving real-time stock price updates.

## Features

- **WebSocket Connection**: Maintains a persistent connection to Finnhub with automatic reconnection
- **Exponential Backoff Retry**: Implements exponential backoff with jitter for failed connection attempts
- **Heartbeat Detection**: Monitors connection health with periodic heartbeat checks
- **Price Message Parsing**: Handles incoming trade messages and emits structured price updates
- **REST Fallback**: Falls back to REST API polling if WebSocket is unavailable
- **Subscription Management**: Track and manage symbol subscriptions
- **Reconnect Telemetry**: Provides detailed metrics on reconnection attempts and failures

## Configuration

Configure via environment variables:

```env
FINNHUB_API_KEY=your_api_key
FINNHUB_WS_URL=wss://ws.finnhub.io
```

## Usage

```typescript
import { FinnhubService } from './finnhub/finnhub.service';

// In your component or service
constructor(private finnhub: FinnhubService) {}

async setupPricing() {
  // Connect to Finnhub
  await this.finnhub.connect();

  // Subscribe to price updates
  this.finnhub.subscribe('AAPL');
  this.finnhub.subscribe('GOOGL');

  // Listen for price updates
  this.finnhub.onPrice((update) => {
    console.log(`${update.symbol}: $${update.price}`);
  });

  // Get reconnection stats
  const telemetry = this.finnhub.getReconnectTelemetry();
  console.log(`Reconnect attempts: ${telemetry.reconnectAttempts}`);
}

// Clean up on shutdown
async teardown() {
  await this.finnhub.disconnect();
}
```

## Connection States

### WebSocket
- Automatically reconnects with exponential backoff on disconnection
- Max 5 retry attempts before falling back to REST
- Heartbeat timeout: 60 seconds

### REST Fallback
- Activated after WebSocket max retries
- Polls every 5 seconds
- Used when WebSocket is unavailable or fails

## API

### `connect(): Promise<void>`
Establish connection to Finnhub. Implements retry logic with exponential backoff.

### `subscribe(symbol: string): void`
Subscribe to price updates for a stock symbol.

### `unsubscribe(symbol: string): void`
Unsubscribe from price updates for a symbol.

### `onPrice(callback: (update: PriceUpdate) => void): void`
Register a callback to receive price updates.

### `disconnect(): Promise<void>`
Close connection and clean up resources.

### `isConnected(): boolean`
Check if currently connected to Finnhub.

### `isUsingRestFallback(): boolean`
Check if using REST polling fallback.

### `enableRestFallback(): Promise<void>`
Manually switch to REST polling mode.

### `fetchPriceViaRest(symbol: string): Promise<PriceUpdate | null>`
Fetch a single price via REST API.

### `getReconnectTelemetry(): ReconnectTelemetry`
Get reconnection statistics and metrics.

## Testing

Run tests with:

```bash
npm test -- finnhub.service.spec.ts
```

Tests include coverage for:
- WebSocket connection and authentication
- Symbol subscription and unsubscription
- Price message parsing and emission
- Heartbeat detection and timeout
- Reconnect telemetry tracking
- REST API fallback
- Resource cleanup on disconnect
