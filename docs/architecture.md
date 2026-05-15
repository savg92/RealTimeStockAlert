# Architecture Overview

## System shape

The application is a monorepo with three major layers:

- **Mobile app**: Expo React Native client for watchlists, charts, alerts, and notifications
- **Backend API**: NestJS service for auth, alerts, ingestion, and WebSocket distribution
- **Shared contracts**: Common TypeScript DTOs, enums, and validation schemas used by both apps

## Core flow

1. The backend connects to Finnhub and receives live price updates.
2. Price updates are published through Redis Pub/Sub.
3. The Socket.io gateway forwards live updates to connected mobile clients.
4. The alert engine compares live prices against persisted alerts.
5. Matching alerts are deactivated and FCM notifications are sent to the user.

## Reliability design

To keep the system resilient:

- Finnhub connections should use reconnect/backoff and heartbeat detection
- The mobile app should show online, reconnecting, and offline states
- If live streaming fails, the client should fall back to cached or polled data
- Alert evaluation should be idempotent to prevent duplicate notifications
- FCM delivery should handle invalid tokens and retryable failures safely

## Observability

The backend should expose:

- `/health`
- `/ready`

It should also emit:

- structured logs
- request correlation IDs
- basic metrics for connection and alert activity

## Monorepo layout

Expected top-level structure:

- `apps/backend`
- `apps/mobile`
- `packages/shared`
- `k8s/`
- `docker-compose.yml`

## Data ownership

- **PostgreSQL**: users, alerts, tokens, and persisted metadata
- **Redis**: transient pub/sub event distribution
- **Firebase**: identity and notification transport
- **Finnhub**: live market data source
