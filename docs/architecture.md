# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          REAL-TIME STOCK ALERT SYSTEM                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐                    ┌──────────────────────────────┐      │
│  │  FINNHUB (WS)    │──────────────────▶ │  BACKEND (NestJS + Socket)      │  │
│  │  Market Prices   │                    │  - Ingestion                 │  │
│  └──────────────────┘                    │  - Alert Pipeline            │  │
│         │                                │  - Notification Service      │  │
│         │ (REST fallback                 │  - Health/Readiness probes   │  │
│         │  after 5 failures)             │  - Swagger/OpenAPI @ /docs   │  │
│         │                                └────────────┬──────────────────┘  │
│         │                                             │                     │
│         └─────────────────┬──────────────────────────┼──────────────────┐   │
│                           │                          │                  │   │
│                      ┌────▼─────┐            ┌──────▼────────┐    ┌────▼──┐
│                      │  Redis   │            │  PostgreSQL  │    │FCM    │
│                      │(Pub/Sub) │            │  (Auth,      │    │ (Push)│
│                      │          │            │   Alerts,    │    │       │
│                      └────┬─────┘            │   Dispatch,  │    └───────┘
│                           │                 │   Tokens)    │              │
│                           │                 └──────────────┘              │
│     ┌─────────────────────┘                                               │
│     │                                                                     │
│  ┌──▼──────────────────────────────────────┐                            │
│  │   MOBILE (Expo React Native)            │                            │
│  │ ┌──────────────────────────────────────┐│                            │
│  │ │ • Watchlist Screen (live prices)     ││                            │
│  │ │ • Alerts Screen (CRUD + updates)     ││                            │
│  │ │ • Stock Detail + Chart               ││  ◀─────────────────────────┘
│  │ │ • Settings (token sync)              ││                              
│  │ │ • Socket.io client (subscribe/recv) ││                              
│  │ │ • REST fallback (no socket)          ││                              
│  │ └──────────────────────────────────────┘│                              
│  └─────────────────────────────────────────┘                              
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

## Reliability and Fallback Behavior

**Finnhub Ingestion Resilience:**
- WebSocket connection includes heartbeat detection (ping/pong).
- Exponential backoff reconnect strategy (1s → 2s → 4s → 8s → 16s, up to 5 attempts).
- After 5 consecutive failures, backend automatically switches to REST fallback (5-second polling).
- REST fallback covers subscribed symbols only (efficient).
- Both modes (WS and REST) publish normalized ticks to Redis.

**Mobile Socket Resilience:**
- Socket.io client auto-reconnects with same exponential backoff strategy.
- Mobile tracks connection state: `connected | reconnecting | offline`.
- Preserves last known price state (`lastKnownState`) for UI stability during network loss.
- Can invoke REST fallback fetch explicitly when socket is unavailable.

**Notification Degradation:**
- No registered tokens for user → returns skipped result (no error).
- Firebase Messaging unavailable/disabled → returns skipped result, no exceptions.
- Invalid tokens (detected after send failure) are automatically cleaned from database.

**Alert Idempotency & Deduplication:**
- Alerts use `isActive` flag transitions (prevents re-dispatch).
- Every dispatch creates a persisted `AlertDispatch` record (audit trail).
- No duplicate notifications sent even if price crosses threshold multiple times.

## API and Transport Boundaries

**REST Endpoints (Bearer token required for `/alerts` and `/notifications`):**
- `GET /health` — service health summary (no auth required)
- `GET /ready` — service readiness (DB/cache/auth status, no auth required)
- `POST /alerts` — create price alert
- `GET /alerts` — list user's alerts
- `DELETE /alerts/:id` — delete alert
- `PUT /notifications/token` — sync/register push token
- `DELETE /notifications/token/:token` — revoke push token
- `POST /notifications/test` — send test notification

**Swagger/OpenAPI:**
- Live documentation at `/docs` (interactive, includes auth bearer input).

**WebSocket (Socket.io) Transport:**
- `price:subscribe {symbol}` — client subscribes to symbol updates.
- `price:unsubscribe {symbol}` — client unsubscribes.
- `price:update {symbol, price, change}` — server broadcasts live price.
- `connection-status {status: connected|reconnecting|offline}` — server notifies client of connection state.

## Observability and Monitoring

**Health and Readiness:**
- `GET /health`: returns `status: ok|degraded|error`, timestamp, uptime, environment.
- `GET /ready`: returns `ready: true|false`, individual component checks (database, cache).

**Structured Logging:**
- Pino logger with JSON output (production-ready).
- Context information: request ID, service name, correlation across logs.
- Log levels: debug (dev), info (normal), warn (recoverable), error (critical).

**Request Correlation:**
- Request ID middleware assigns unique ID to every request.
- Propagated through logs for traceability.

## Storage and Data Ownership

| Storage | Purpose | Notes |
|---------|---------|-------|
| **PostgreSQL** | Persistent state | Users (via Firebase Auth), Alerts (schema + isActive), AlertDispatch (audit trail), FcmTokens (device registration) |
| **Redis** | Transient messaging | Price updates pub/sub channel; ephemeral, no persistence required |
| **Firebase Admin** | Auth + Push | ID token verification (Bearer token validation), FCM device messaging |
| **Finnhub** | Market data upstream | WebSocket for real-time prices (primary), REST fallback for reliability |

## Security Considerations

- **Authentication**: Firebase ID token validation on protected endpoints (via `AuthGuard`).
- **Input Validation**: DTOs with type checking; Prisma ORM prevents SQL injection.
- **CORS**: Socket.io configured for development; production should restrict origins.
- **Secrets Management**: Environment variables (not hardcoded); Kubernetes `Secret` objects for production.
- **Rate Limiting**: Not currently implemented; consider for production load.

## Performance Tuning Notes

- **Price Updates**: Redis pub/sub ensures loose coupling; Socket.io broadcasts are per-room (symbol-specific) for efficiency.
- **Alert Evaluation**: Alert engine processes one tick at a time; linear scan of active alerts (optimize if > 10k alerts).
- **Database Queries**: Indexed on user_id and symbol; `AlertDispatch` uses batch inserts for throughput.
- **Mobile Re-renders**: React memo and selector hooks prevent unnecessary renders; Zustand store for state centralization.
