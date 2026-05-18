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
│         │                                └────────────┬─────────────────┘   │
│         │                                             │                     │
│         └─────────────────┬──────────────────────────┼─────────────────┐    │
│                           │                          │                 │    │
│                      ┌────▼─────┐            ┌───────▼──────┐    ┌────▼──┐  │
│                      │  Redis   │            │  PostgreSQL  │    │FCM    │  │
│                      │(Pub/Sub) │            │  (Auth,      │    │ (Push)│  │
│                      │          │            │   Alerts,    │    │       │  │
│                      └────┬─────┘            │   Dispatch,  │    └───────┘  │
│                           │                  │   Tokens)    │          │   │
│                           │                  └──────────────┘          │   │
│     ┌─────────────────────┘                                            │   │
│     │                                                                  │   │
│  ┌──▼──────────────────────────────────────┐                           │   │
│  │   MOBILE (Expo React Native)            │                           │   │
│  │ ┌──────────────────────────────────────┐│                           │   │
│  │ │ • Watchlist Screen (live prices)     ││                           │   │
│  │ │ • Alerts Screen (CRUD + updates)     ││                           │   │
│  │ │ • Stock Detail + Chart               ││  ◀────────────────────────┘   │
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
