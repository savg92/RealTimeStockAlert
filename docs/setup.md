# Setup

## Prerequisites

- Bun >= 1.0
- Docker + Docker Compose
- Local PostgreSQL/Redis or Compose services
- Finnhub and Firebase credentials for full integration testing

## Environment variables

Use `apps/backend/.env.example` and `apps/mobile/.env.example` as templates.

### Backend (`apps/backend/.env`)

Required for normal backend behavior:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `FINNHUB_API_KEY` — Finnhub API key for live prices

Common runtime config:

- `NODE_ENV` (default: `development`)
- `PORT` (default: `3000`)
- `LOG_LEVEL` (default: `debug` in dev, `info` otherwise)
- `FINNHUB_WS_URL` (default: `wss://ws.finnhub.io`)
- `REDIS_PRICE_CHANNEL` (default: `price-updates`)
- `FIREBASE_ENABLE_MESSAGING` (`false` disables push sending)

Firebase admin credentials (choose one):

1. `FIREBASE_ADMIN_CREDENTIALS` (JSON string), or
2. `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`

### Mobile (`apps/mobile/.env.local`)

- `EXPO_PUBLIC_API_URL` (default fallback in code: `http://localhost:3000`)
- `EXPO_PUBLIC_SOCKET_URL` (default fallback in code: `ws://localhost:3000`)
- `EXPO_PUBLIC_AUTH_BEARER_TOKEN` (optional; when unset, notification token sync becomes no-op)
- `EXPO_PUBLIC_ENABLE_NOTIFICATIONS`
- `EXPO_PUBLIC_ENABLE_OFFLINE_MODE`
- `EXPO_ANDROID_GOOGLE_SERVICES_FILE` (optional path, default `./google-services.json`)

## Local development

1. Install dependencies:
   ```bash
   bun install
   ```
2. Start data services:
   ```bash
   docker compose up -d postgres redis
   ```
3. Run backend and mobile:
   ```bash
   bun run dev:backend
   bun run dev:mobile
   ```
4. Verify backend:
   - `GET http://localhost:3000/health`
   - `GET http://localhost:3000/ready`
   - `http://localhost:3000/docs`

## Production-like local run

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Then verify `/health`, `/ready`, and `/docs`.
The backend production image is Bun-based (`apps/backend/Dockerfile`, `target: prod`).

## Kubernetes (production manifest)

`k8s/production.yaml` includes namespace-scoped manifests for backend, PostgreSQL, and Redis:

- Backend `Deployment` + internal `Service` + optional `LoadBalancer` `Service`
- PostgreSQL/Redis `StatefulSet` + persistent storage + Services
- Ingress routing for `stock-alert.local`
- Health/readiness/startup probes and resource requests/limits
- Config (`ConfigMap`) and sensitive values (`Secret`) split

Before applying, replace `CHANGE_ME` secret placeholders (especially DB/Finnhub/Firebase values).

Apply and validate:

```bash
kubectl apply --dry-run=client -f k8s/production.yaml
kubectl apply -f k8s/production.yaml
```

For Bun runtime alignment, build backend image from `apps/backend/Dockerfile` using the `prod` target.

## Production handoff: demo + Android APK

This checklist completes all in-repo prep and leaves only manual release actions.

### Prerequisites

- Bun `>=1.0` (`bun --version`)
- Expo CLI via Bun (`bunx --bun expo --version`)
- EAS CLI via Bun (`bunx --bun eas-cli --version`)
- Expo account with access to the target project (`bunx --bun eas-cli login`)
- Mobile env file created (`apps/mobile/.env.local`)
- Release metadata resolved in Expo config:
  - `slug` (defaulted in `apps/mobile/app.config.ts` or override via `EXPO_SLUG`)
  - `android.package` (default `com.stockalert.mobile` or override via `EXPO_ANDROID_PACKAGE`)
- Optional for production push validation: `google-services.json` and `EXPO_ANDROID_GOOGLE_SERVICES_FILE`

### Automatable prep commands

From repository root:

```bash
bun install
bun run lint
bun run test
bun run build
```

From `apps/mobile`:

```bash
bunx --bun expo config --type public
bunx --bun eas-cli build --platform android --profile production --non-interactive
```

### Final manual steps

1. **APK retrieval (manual):**
   - Wait for EAS build completion in terminal/dashboard.
   - Download the `.apk` artifact from the build page/run output.
2. **4-minute demo recording (manual):**
   - Record on a real Android device/emulator using the release APK.
   - Suggested flow:
     1. Launch app and show live connection status.
     2. Subscribe/watch at least one symbol and show real-time updates.
     3. Create an alert (`above`/`below`) and show it in alert list.
     4. Trigger/observe notification behavior (or explain skip reason if Firebase messaging is disabled).
     5. Briefly show backend health/docs endpoints (`/health`, `/ready`, `/docs`).
   - Export/share video file as final delivery artifact.

## Operational troubleshooting

- **Backend fails with Prisma errors:** verify `DATABASE_URL` and that Postgres is reachable.
- **Redis publish/subscribe issues:** verify `REDIS_URL` and Redis container health.
- **401 on alerts/notifications routes:** include `Authorization: Bearer <Firebase ID token>`.
- **No push notifications sent:** check `FIREBASE_ENABLE_MESSAGING`, Firebase credential env vars, and token registration.
- **Finnhub data stops:** inspect backend logs for reconnect attempts; after 5 failed attempts backend switches to REST polling fallback.
- **Mobile cannot sync push token locally:** expected when `EXPO_PUBLIC_AUTH_BEARER_TOKEN` is unset (no-op client).
- **Socket disconnects on mobile:** inspect `connectionStatus` (`reconnecting`/`offline`) and validate `EXPO_PUBLIC_SOCKET_URL`.
