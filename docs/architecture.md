# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          REAL-TIME STOCK ALERT SYSTEM                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐                    ┌──────────────────────────────┐   │
│  │  FINNHUB (WS)    │──────────────────▶ │  BACKEND (NestJS + Socket)   │   │
│  │  Market Prices   │                    │  - Ingestion                 │   │
│  └──────────────────┘                    │  - Alert Pipeline            │   │
│         │                                │  - Notification Service      │   │
│  ┌──────▼───────────┐                    │  - Health/Readiness probes   │   │
│  │  YAHOO FINANCE   │◀────────────────── │  - Swagger/OpenAPI @ /docs   │   │
│  │  (Historical)    │                    └───────────┬──────────────────┘   │
│  └──────────────────┘                                │                      │
│                                                      │                      │
│                      ┌────▼─────┐            ┌───────▼──────┐    ┌────▼──┐  │
│                      │  Redis   │            │  PostgreSQL  │    │FCM    │  │
│                      │(Pub/Sub) │            │  (Auth,      │    │ (Push)│  │
│                      │          │            │   Alerts,    │    │       │  │
│                      └────┬─────┘            │   Dispatch,  │    └────┬──┘  │
│                           │                  │   Tokens)    │         │     │
│                           │                  └──────────────┘         │     │
│     ┌─────────────────────┘                                           │     │
│     │                                                                 │     │
│  ┌──▼──────────────────────────────────────┐          ┌───────────────▼──┐  │
│  │   MOBILE (Expo React Native)            │          │  Firebase Auth   │  │
│  │ ┌──────────────────────────────────────┐│          │  (Login/SignUp)  │  │
│  │ │ • Watchlist Screen (live prices)     ││◀─────────▶                  │  │
│  │ │ • Alerts Screen (CRUD + updates)     ││          └───────────────┬──┘  │
│  │ │ • Alert History (dispatch logs)      ││                          │     │
│  │ │ • Stock Detail + Chart               ││  ◀───────────────────────┘     │
│  │ │ • Settings (Logout, user info)       ││                                │
│  │ │ • Login/SignUp Screens               ││                                │
│  │ │ • Socket.io client (subscribe/recv)  ││                                │
│  │ └──────────────────────────────────────┘│                                │
│  └─────────────────────────────────────────┘                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Runtime Components

- **apps/backend**: NestJS API + Socket.io gateway + Finnhub/Yahoo ingestion + alert/notification pipeline
- **apps/mobile**: Expo React Native client for watchlist, alerts, and push registration
- **packages/shared**: Shared TypeScript contracts (`CreateAlertInput`, auth user types, shared validation)

## Data and Messaging Flow

1. **Authentication Flow**: Mobile app authenticates via Firebase Auth. The Firebase ID Token is sent in the `Authorization: Bearer <token>` header for all API calls. The backend verifies the token using Firebase Admin SDK and syncs the user profile in PostgreSQL.
2. **Finnhub Ingestion**: Backend connects to Finnhub WebSocket, receives real-time market ticks, and normalizes them.
3. **Dual-Source Market Data**:
    - **Real-time Quotes & Metrics**: Sourced exclusively from **Finnhub** (WebSocket for updates, REST for snapshots and financial metrics).
    - **Historical Charts**: Sourced exclusively from **Yahoo Finance** public chart API to ensure high availability and robust data for all ranges (1H, 1D, 1Y, etc.).
4. **Redis Pub/Sub**: Normalized ticks published to Redis on `price-updates` channel (configurable).
5. **Socket Broadcast**: Socket.io gateway broadcasts `price:update` events to symbol-specific rooms and global listeners.
6. **Alert Evaluation**: Alert engine evaluates all active user alerts against price ticks, records `AlertDispatch` events.
7. **Notification Dispatch**: Notification service sends FCM push notifications to registered user tokens, handles invalid tokens (cleanup).

## Historical data caching (chart history)

- Purpose: reliably serve recent historical candle data for charts.

- Flow:
  1. Historical candles are fetched from **Yahoo Finance** (mandated source for chart ranges).
  2. Successful candle responses are cached in Redis under the key:
     - `stocks:history:<SYMBOL>:<RANGE>`
  3. The cache entry TTL is 24 hours (86400 seconds).
  4. If the Yahoo Finance request fails, the service attempts to read the cached payload and return it as the "last known" history.
  5. On the Mobile client, if the requested trailing window (e.g., 1H) is silent because the market is closed, the UI automatically falls back to displaying the most recent available trading data points to ensure the chart is never empty.

## Reliability and fallback behavior

- Finnhub client uses heartbeat checks and exponential reconnect backoff.
- After 5 failed reconnect attempts, backend enables REST quote polling fallback (5 seconds).
- Mobile socket hook tracks `connected | reconnecting | offline`, keeps `lastKnownState`, and exposes REST fallback fetch.
- Notifications degrade safely:
  - no registered tokens → skipped result
  - Firebase messaging unavailable/disabled → skipped result
- Alert handling is idempotent via `Alert.isActive` transitions and persisted `AlertDispatch` records.

## API/transport boundaries

- REST endpoints are served directly at root paths (`/alerts`, `/notifications/*`, `/health`, `/ready`).
- Swagger/OpenAPI served at `/docs`.
- WebSocket transport uses Socket.io events:
  - subscribe/unsubscribe: `price:subscribe`, `price:unsubscribe`
  - updates: `price:update`

## Observability

- Health: `GET /health`
- Readiness: `GET /ready`
- Swagger UI: `GET /docs` (all endpoints, request/response examples)
- WebSocket event logs: `GET /dev/ws-events` (Finnhub connection debugging)

## Development Testing Infrastructure

Development mode includes several testing utilities to validate the alert pipeline without live market data:

### Test Scenarios
Predefined flows that execute end-to-end alert logic:

- **basic-alert-flow**: Create watchlist item → create alert → publish price → verify dispatch
- **multi-alert-cascade**: Create 3 alerts on same symbol → trigger subset → verify all affected alerts dispatch
- **price-volatility**: Trigger rapid price changes → verify alert matching and deduplication
- **watchlist-tracking**: Add/remove stocks → verify Finnhub subscription/unsubscription

### WebSocket Event Logging
Buffer of recent Finnhub price updates and heartbeats for debugging connection health and event flow.

### Dispatch History API
Query interface for alert dispatch records with optional filtering by symbol, status, and limit.

## Mobile UI Flow

1. **Stock Detail Screen** → Click "Create Alert" button (passes `symbol` to alerts screen via navigation params)
2. **Alerts Screen** → Opens with symbol pre-filled (if navigated from stock detail)
   - User sets condition (above/below) and threshold
   - Submits form → POST /alerts with symbol, condition, threshold
3. **Alert History Screen** → View all alert dispatches with:
   - Symbol filtering (dynamically populated from data)
   - Status filtering (sent, failed, pending, skipped)
   - Summary statistics (total sent/failed per symbol)
   - Pull-to-refresh integration

Navigation uses React Navigation with root stack (StockDetailScreen) + tab navigator (Alerts, Watchlist). Symbol passing navigates via: `navigate('HomeTabs', { screen: 'Alerts', params: { symbol } })`
- Structured logging via Pino logger
- Request correlation via request-id middleware

## Storage ownership

- **PostgreSQL**: `User`, `Alert`, `AlertDispatch`, `FcmToken`
- **Redis**: transient price pub/sub
- **Firebase Admin**: auth token verification + FCM send transport
- **Finnhub**: upstream market data (WebSocket + REST fallback)
