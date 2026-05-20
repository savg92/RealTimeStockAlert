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
│         │ (REST fallback                 │  - Health/Readiness probes   │   │
│         │  after 5 failures)             │  - Swagger/OpenAPI @ /docs   │   │
│         │                                └───────────┬──────────────────┘   │
│         │                                            │                      │
│         └─────────────────┬──────────────────────────┼────────────────┐     │
│                           │                          │                │     │
│                      ┌────▼─────┐            ┌───────▼──────┐    ┌────▼──┐  │
│                      │  Redis   │            │  PostgreSQL  │    │FCM    │  │
│                      │(Pub/Sub) │            │  (Auth,      │    │ (Push)│  │
│                      │          │            │   Alerts,    │    │       │  │
│                      └────┬─────┘            │   Dispatch,  │    └────┬──┘  │
│                           │                  │   Tokens)    │         │     │
│                           │                  └──────────────┘         │     │
│     ┌─────────────────────┘                                           │     │
│     │                                                                 │     │
│  ┌──▼──────────────────────────────────────┐                          │     │
│  │   MOBILE (Expo React Native)            │                          │     │
│  │ ┌──────────────────────────────────────┐│                          │     │
│  │ │ • Watchlist Screen (live prices)     ││                          │     │
│  │ │ • Alerts Screen (CRUD + updates)     ││                          │     │
│  │ │ • Stock Detail + Chart               ││  ◀───────────────────────┘     │
│  │ │ • Settings (token sync)              ││                                │
│  │ │ • Socket.io client (subscribe/recv)  ││                                │
│  │ │ • REST fallback (no socket)          ││                                │
│  │ └──────────────────────────────────────┘│                                │
│  └─────────────────────────────────────────┘                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Runtime Components

- **apps/backend**: NestJS API + Socket.io gateway + Finnhub ingestion + alert/notification pipeline
- **apps/mobile**: Expo React Native client for watchlist, alerts, and push registration
- **packages/shared**: Shared TypeScript contracts (`CreateAlertInput`, auth user types, shared validation)

## Data and Messaging Flow

1. **Finnhub Ingestion**: Backend connects to Finnhub WebSocket, receives market ticks, and normalizes them.
2. **Redis Pub/Sub**: Normalized ticks published to Redis on `price-updates` channel (configurable).
3. **Socket Broadcast**: Socket.io gateway broadcasts `price:update` events to symbol-specific rooms and global listeners.
4. **Alert Evaluation**: Alert engine evaluates all active user alerts against price ticks, records `AlertDispatch` events.
5. **Notification Dispatch**: Notification service sends FCM push notifications to registered user tokens, handles invalid tokens (cleanup).

## Historical data caching (chart history)

- Purpose: reliably serve recent historical candle data for charts even when Finnhub's candle endpoint is temporarily unavailable, without inventing or synthesizing values.

- Flow:
  1. When the backend successfully receives historical candles from Finnhub for a symbol+range, it caches the normalized array of points in Redis under the key:
     - `stocks:history:<SYMBOL>:<RANGE>`
  2. The cache entry TTL is 24 hours (86400 seconds). The cache is updated whenever a fresh successful candle response is received.
  3. On an incoming REST request to `/stocks/:symbol/history?range=...`, the backend:
     - attempts to fetch candles from Finnhub (preferred, authoritative source),
     - on success it returns the candles and writes them to the Redis cache,
     - if Finnhub returns no candles (or an error) the service attempts to read the cached payload and return it as the "last known" history,
     - if neither live candles nor a cached payload exist, the endpoint returns `503 Service Unavailable` with a clear message — the system does not fabricate or interpolate data.

- Guarantees & notes:
  - No synthetic history: the backend will never invent candle points when both live and cached data are missing.
  - Cache semantics: cached history is a best-effort, last-known snapshot; it is suitable for displaying a chart that reflects the most recent known shape, but it is explicitly not a substitute for live market data.
  - Redis dependency: the cache requires a functioning Redis client (configured via `REDIS_URL`). If Redis is down, the backend continues to use Finnhub but cannot provide cached fallbacks.
  - Instrumentation: cache reads/writes are logged at WARN level for failures and at DEBUG/INFO for successful cache writes; these logs should be included in incident runbooks to detect when upstream candle coverage is missing.

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
- Structured logging via Pino logger
- Request correlation via request-id middleware

## Storage ownership

- **PostgreSQL**: `User`, `Alert`, `AlertDispatch`, `FcmToken`
- **Redis**: transient price pub/sub
- **Firebase Admin**: auth token verification + FCM send transport
- **Finnhub**: upstream market data (WebSocket + REST fallback)
