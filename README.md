# Real-Time Stock Alert

A full-stack mobile app for real-time stock tracking, live charts, custom price alerts, and push notifications.

This repository currently contains the product and conductor planning docs. Implementation is intended to follow the track order in `plan.md` and the detailed track plans under `conductor/tracks/`.

## What this project is

- **Mobile**: Expo React Native app for Android
- **Backend**: NestJS API with WebSockets
- **Data**: PostgreSQL + Redis
- **Alerts**: Firebase Auth + FCM notifications
- **Streaming**: Finnhub WebSocket ingestion
- **Monorepo**: Bun workspaces with a shared TypeScript contracts package

## Documentation

- `PRD.md` — product requirements and scope
- `plan.md` — top-level delivery roadmap
- `docs/index.md` — documentation hub
- `conductor/product.md` — conductor product summary
- `conductor/tech-stack.md` — approved stack and constraints
- `docs/architecture.md` — system architecture overview
- `docs/setup.md` — expected setup, environment variables, and development notes
- `docs/api.md` — Swagger/OpenAPI expectations for backend routes

## Current status

The repository is still in the planning/scaffolding stage. The implementation will be built track-by-track:

1. Foundation & monorepo setup
2. Real-time data ingestion & distribution
3. Mobile core & dashboard
4. Visualization
5. Price alerts
6. Push notifications
7. Production readiness

## Reliability goals

The project is designed to be resilient from the start:

- WebSocket reconnect/backoff and graceful fallback states
- Shared contracts to reduce backend/mobile drift
- Health and readiness endpoints
- Structured logging and basic observability
- Idempotent alert handling and notification retry/deduplication

## Environment variables

Expected secrets and runtime configuration will be documented in `docs/setup.md`. Typical values include:

- `FINNHUB_API_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_ADMIN_CREDENTIALS`
- `DATABASE_URL`
- `REDIS_URL`
- `PORT`

## Package management

Bun is the primary package manager and workspace tool for this project.

## Quickstart (local development)

Prerequisites

- Bun (https://bun.sh) installed and on PATH
- PostgreSQL and Redis running locally or via containers
- Firebase credentials for push notifications if testing alerts

Quickstart (development)

1. Install dependencies at the repo root:
```
   bun install
```

2. Set up environment variables (see docs/setup.md). Create a local .env with the required values, for example:

   FINNHUB_API_KEY=your_key
   DATABASE_URL=postgres://user:pass@localhost:5432/db
   REDIS_URL=redis://localhost:6379

3. Start backend (example - adjust path if packages are different):

   # from repo root (adjust to actual backend package path)
   ```
   cd packages/backend || cd backend
   bun run dev
   ```

4. Start mobile app (Expo):
```
   cd ../packages/mobile || cd mobile
   expo start
```


Notes

- See docs/setup.md for full environment and run commands (migrations, seeding, firebase setup).
- Conductor tracks and plan outline the intended work order: see conductor/tracks/ and plan.md

## Contributing workflow

Follow the conductor docs when implementing work:

- Update the relevant track plan first
- Write tests before implementation
- Keep changes small and verifiable
- Update docs whenever behavior, setup, or API contracts change
- Keep Swagger/OpenAPI docs in sync with backend DTOs and routes
