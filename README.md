# Real-Time Stock Alert

A production-ready, full-stack mobile application for real-time stock price tracking, custom price alerts, and push notifications. Built with **Bun**, **NestJS**, **Expo**, **Socket.io**, **PostgreSQL**, and **Firebase Cloud Messaging**.

## What This Project Is

**Core Features:**
- **Live Price Dashboard** — real-time price updates via WebSocket with automatic fallback to REST polling
- **Custom Price Alerts** — set threshold-based alerts (`above`/`below`) for any stock symbol
- **Push Notifications** — Firebase Cloud Messaging integration for alert delivery to mobile devices
- **Interactive Charts** — real-time price visualization with calculated deltas
- **User Accounts** — Firebase Authentication with device token management
- **Fallback Resilience** — graceful degradation when services unavailable (socket outages, Firebase disabled, etc.)

**Architecture:**
- **Backend:** NestJS + Socket.io, Finnhub WebSocket ingestion, alert engine, notification service
- **Mobile:** Expo React Native, Zustand state management, real-time socket client
- **Database:** PostgreSQL (alerts, users, dispatch logs) + Redis (transient price pub/sub)
- **Monorepo:** Bun workspaces with shared TypeScript contracts (`packages/shared`)
- **Infrastructure:** Docker Compose (dev), production Dockerfile, Kubernetes manifests

## Quick Start

### Prerequisites

- **Bun** >= 1.0 ([install](https://bun.sh))
- **Docker** + **Docker Compose** (for PostgreSQL and Redis)
- **Finnhub API key** (free tier at [finnhub.io](https://finnhub.io))
- **Firebase credentials** (optional for local dev, required for production notifications)

### 5-Minute Setup

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Configure environment:**
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   cp apps/mobile/.env.example apps/mobile/.env.local
   # Edit files with your Finnhub API key and Firebase credentials
   ```

3. **Start data services:**
   ```bash
   docker compose up -d postgres redis
   ```

4. **Run backend and mobile:**
   ```bash
   bun run dev
   ```
   Or separately:
   ```bash
   bun run dev:backend    # NestJS on http://localhost:3000
   bun run dev:mobile     # Expo on http://localhost:19000
   ```

5. **Verify:**
   ```bash
   curl http://localhost:3000/health
   open http://localhost:3000/docs  # Swagger UI
   ```

## Project Structure

```
.
├── apps/
│   ├── backend/                    # NestJS API + Socket.io + Alert engine
│   │   ├── src/
│   │   │   ├── alerts/             # Alert CRUD + evaluation
│   │   │   ├── notifications/      # Firebase Cloud Messaging integration
│   │   │   ├── finnhub/            # Finnhub WebSocket + REST fallback
│   │   │   ├── socket/             # Socket.io gateway
│   │   │   ├── redis/              # Pub/sub messaging
│   │   │   ├── health/             # Health + readiness endpoints
│   │   │   ├── common/             # Auth guard, Prisma, Firebase, logging
│   │   │   └── main.ts
│   │   ├── prisma/                 # Database schema + migrations
│   │   ├── Dockerfile              # Multi-stage Bun production build
│   │   └── package.json
│   └── mobile/                     # Expo React Native app
│       ├── src/
│       │   ├── screens/            # Watchlist, Alerts, Stock Detail, Settings
│       │   ├── components/         # Charts, forms, navigation
│       │   ├── services/           # API client, push notifications, routing
│       │   ├── hooks/              # Custom hooks (useSocket, useAuth)
│       │   ├── store/              # Zustand state management
│       │   └── App.tsx
│       ├── app.config.ts           # Expo configuration
│       ├── jest.config.js          # Test configuration
│       └── package.json
├── packages/
│   └── shared/                     # Shared TypeScript contracts
│       ├── src/
│       │   ├── auth.ts             # Auth + API DTOs
│       │   └── index.ts
│       └── package.json
├── k8s/
│   └── production.yaml             # Kubernetes manifests (backend, databases, ingress)
├── docs/
│   ├── index.md                    # Documentation hub
│   ├── architecture.md             # System design + reliability + performance
│   ├── api.md                      # REST API reference + Swagger details
│   └── setup.md                    # Setup, environment, Docker, Kubernetes, troubleshooting
├── docker-compose.yml              # Development (postgres, redis)
├── docker-compose.prod.yml         # Production (optimized build, secrets/config)
├── bun.lock                        # Bun dependency lock
├── tsconfig.base.json              # Shared TypeScript config
├── package.json                    # Root workspace
├── AGENTS.md                       # Conductor workflow + conventions
├── PRD.md                          # Product requirements + scope
├── plan.md                         # Implementation roadmap
└── README.md                       # This file
```

## Bun Commands

From repository root:

| Command | Purpose |
|---------|---------|
| `bun run dev` | Start backend + mobile in parallel (watch mode) |
| `bun run dev:backend` | Start NestJS dev server only |
| `bun run dev:mobile` | Start Expo dev server only |
| `bun run build` | Build all workspaces |
| `bun run build:backend` | Build backend for production |
| `bun run build:mobile` | Build mobile app |
| `bun run test` | Run all test suites (backend, mobile, shared) |
| `bun run test:backend` | Backend tests only |
| `bun run test:mobile` | Mobile tests only |
| `bun run lint` | Run ESLint on all packages |
| `bun run format:check` | Check code formatting (Prettier) |

## API Overview

### REST Endpoints

**Public (no auth required):**
- `GET /health` — service health summary
- `GET /ready` — readiness check (DB, cache, auth status)

**Authenticated (Bearer token required):**
- `POST /alerts` — create price alert
- `GET /alerts` — list user's alerts
- `DELETE /alerts/:id` — delete alert
- `PUT /notifications/token` — register/sync push token
- `DELETE /notifications/token/:token` — revoke push token
- `POST /notifications/test` — send test notification

**Documentation:**
- `GET /docs` — Swagger UI (interactive API explorer)
- `GET /docs-json` — OpenAPI JSON schema

### WebSocket (Socket.io) Events

**Client → Server:**
- `price:subscribe {symbol}` — subscribe to symbol updates
- `price:unsubscribe {symbol}` — unsubscribe from symbol

**Server → Client:**
- `price:update {symbol, price, change}` — live price broadcast
- `connection-status {status: "connected"|"reconnecting"|"offline"}` — connection state notification

## Deployment

### Local Production Testing

Run production-optimized stack locally:

```bash
docker compose -f docker-compose.prod.yml up --build
# Backend at http://localhost:3000
curl http://localhost:3000/health
```

### Kubernetes

Deploy to Kubernetes cluster:

```bash
kubectl apply -f k8s/production.yaml
# Or with dry-run validation:
kubectl apply -f k8s/production.yaml --dry-run=client
```

See [docs/setup.md](./docs/setup.md) for secret configuration and detailed deployment steps.

### Mobile Handoff (Demo + APK)

Prepare release artifacts for handoff:

```bash
# Verify tools
bun --version
bunx --bun expo --version
bunx --bun eas-cli --version

# Confirm mobile config
bunx --bun expo config --type public

# Build release APK
bunx --bun eas-cli login
bunx --bun eas-cli build --platform android --profile production --non-interactive

# Download from build dashboard once finished
```

See [docs/setup.md > Production handoff](./docs/setup.md#production-handoff) for complete checklist.

## Key Design Decisions

### Resilience & Fallback

- **Multi-level ingestion:** WebSocket (primary) → REST polling (fallback after 5 failures)
- **Connection tracking:** Mobile reports `connected|reconnecting|offline` state
- **Graceful degradation:** Notifications skip (not error) when Firebase/tokens unavailable
- **Idempotent alerts:** Uses `Alert.isActive` transitions + `AlertDispatch` audit trail to prevent duplicate notifications

### Type Safety

- **Shared contracts:** Backend and mobile share DTOs via `packages/shared`
- **Prisma ORM:** Type-safe database access, SQL injection prevention
- **NestJS validation:** All endpoint inputs validated with DTOs

### Performance & Efficiency

- **Socket.io rooms:** Broadcasts to symbol-specific rooms (not all clients)
- **Redis pub/sub:** Loose coupling between price ingestion and client broadcast
- **Mobile optimizations:** React memo, selector hooks, Zustand centralized store
- **Batch alert evaluation:** One price update triggers all alert checks

### Observability

- **Health/readiness endpoints:** Integration with container orchestration
- **Structured logging:** Pino logger with JSON output and request correlation
- **Production image:** Multi-stage Bun-based Docker build, minimal surface

## Documentation

- **[docs/index.md](./docs/index.md)** — full documentation hub
- **[docs/architecture.md](./docs/architecture.md)** — system design, reliability patterns, performance tuning
- **[docs/setup.md](./docs/setup.md)** — environment setup, Docker, Kubernetes, troubleshooting
- **[docs/api.md](./docs/api.md)** — REST API reference + Swagger integration
- **[PRD.md](./PRD.md)** — product requirements and scope
- **[plan.md](./plan.md)** — implementation roadmap and progress
- **[AGENTS.md](./AGENTS.md)** — conductor workflow conventions

## Testing

- **Backend:** Jest unit tests, >85% coverage (services, controllers, auth, utilities)
- **Mobile:** Jest + React Testing Library, >93% coverage (screens, hooks, services)
- **Shared:** TypeScript type validation

Run `bun run test` to verify all suites pass.

## Troubleshooting

| Issue | Quick Check |
|-------|------------|
| Backend won't start | Verify `DATABASE_URL` and Postgres reachable; check logs for migration errors |
| No real-time prices | Verify Finnhub API key is valid; check backend logs for WebSocket errors |
| Mobile cannot connect | Verify `EXPO_PUBLIC_SOCKET_URL` matches backend; check firewall |
| No push notifications | Ensure Firebase credentials set and `FIREBASE_ENABLE_MESSAGING=true`; verify token registration |
| Socket disconnects frequently | Backend logs show connection attempts; after 5 failures, switches to REST polling |

See [docs/setup.md#operational-troubleshooting](./docs/setup.md#operational-troubleshooting) for detailed diagnostic steps.

## Contributing

Follow the [conductor workflow](./AGENTS.md) for implementation:

1. Update track plan in `conductor/tracks/` first
2. Write tests before implementation (TDD)
3. Keep changes small and verifiable
4. Update docs whenever behavior/API changes
5. Maintain Swagger/OpenAPI sync with backend DTOs

## License

Provided as-is for demonstration and educational purposes.
