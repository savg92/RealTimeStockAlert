# API and Swagger/OpenAPI

Swagger/OpenAPI documentation is available at `/docs` when the backend is running (interactive explorer with "Try it out" functionality).

**Auth Model:** All routes except `/health` and `/ready` require:

```http
Authorization: Bearer <Firebase ID token>
```

The backend validates Firebase ID tokens and upserts user records automatically.

## REST Endpoints

### Health & Readiness (Public)

#### GET /health

Service health summary.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600000,
  "environment": "production"
}
```

**Status values:**

- `ok` — all systems operational
- `degraded` — partial failure (e.g., Redis unavailable but DB ok)
- `error` — critical service offline

#### GET /ready

Readiness check for container orchestration probes.

**Response:**

```json
{
  "ready": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "checks": {
    "database": true,
    "cache": true
  }
}
```

**Use case:** Kubernetes liveness/readiness probes. Returns HTTP 503 if not ready.

### Stocks

#### GET /stocks/prices

Current watchlist snapshot used by the mobile dashboard to hydrate initial rows before socket updates arrive.

**Response (200 OK):**

```json
[
  {
    "id": "AAPL",
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "price": 191.25,
    "change": 1.75,
    "changePercent": 0.92,
    "currency": "USD",
    "lastUpdated": "2026-05-18T00:00:00.000Z"
  }
]
```

#### GET /stocks/:symbol/history

Get historical price points (candles) for a symbol and named range. The `range` query parameter accepts the supported ranges: `1H`, `5H`, `1D`, `5D`, `1M`, `3M`, `1Y`, `5Y`, `ALL`.

Query parameters:

- `range` (string) — required; one of the supported ranges (defaults to `1D` if omitted)

Behavior:

- The endpoint prefers Finnhub's historical candle data for accuracy.
- Successful candle responses are cached in Redis under the key `stocks:history:<SYMBOL>:<RANGE>` and retained for 24 hours (TTL: 86400s).
- If Finnhub returns no candles for the requested range, the backend will attempt to return the last cached history for that symbol/range instead of fabricating new data.
- If neither Finnhub candles nor a cached history are available, the endpoint returns `503 Service Unavailable` with a clear message (no synthetic data is invented).

Successful response (200 OK):

```json
[
  { "timestamp": "2026-05-18T09:30:00.000Z", "price": 191.25 },
  { "timestamp": "2026-05-18T09:45:00.000Z", "price": 192.1 }
]
```

Error response when no live or cached data exists (503):

```json
{
  "message": "Live chart data is unavailable for AAPL right now.",
  "error": "Service Unavailable",
  "statusCode": 503
}
```

Notes:

- Caching requires a healthy Redis client available to the backend (configured via `REDIS_URL` in the environment). If Redis is unavailable, the endpoint will still attempt to use Finnhub but cannot store or return cached history.
- The cache is intended to provide a "last known" view for charts when external candle data is temporarily missing; it does not synthesize or interpolate values.

### Alerts (Bearer auth required)

#### POST /alerts

Create a new price alert.

**Request:**

```json
{
  "symbol": "AAPL",
  "price": 150.0,
  "condition": "above",
  "threshold": 151.0
}
```

**Request DTO fields:**

- `symbol: string` — stock ticker (validated, max 10 chars)
- `price: number` — current price (informational, for UI)
- `condition: 'above' | 'below'` — trigger condition
- `threshold: number` — price trigger point

**Response (201 Created):**

```json
{
  "id": "uuid-here",
  "userId": "firebase-uid",
  "symbol": "AAPL",
  "condition": "above",
  "threshold": 151.0,
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error responses:**

- `401 Unauthorized` — invalid/expired token
- `400 Bad Request` — missing/invalid fields
- `500 Internal Server Error` — database error

#### GET /alerts

List all alerts for authenticated user.

**Query parameters:**

- None (future: pagination, filtering by symbol/status)

**Response (200 OK):**

```json
[
  {
    "id": "uuid-1",
    "symbol": "AAPL",
    "condition": "above",
    "threshold": 151.0,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": "uuid-2",
    "symbol": "GOOGL",
    "condition": "below",
    "threshold": 140.0,
    "isActive": false,
    "createdAt": "2024-01-14T09:00:00.000Z",
    "updatedAt": "2024-01-14T14:00:00.000Z"
  }
]
```

**Notes:**

- Returns user's alerts, newest first
- `isActive: false` means alert has triggered once (idempotent, won't re-trigger)
- Mobile can show inactive alerts as "already triggered"

#### DELETE /alerts/:id

Delete (disable) an alert.

**Path parameters:**

- `id: string` — alert UUID

**Response (200 OK):**

```json
{
  "count": 1
}
```

**Error responses:**

- `401 Unauthorized` — invalid token
- `404 Not Found` — alert not found or belongs to different user
- `500 Internal Server Error` — database error

### Notifications (Bearer auth required)

#### PUT /notifications/token

Register or sync a push notification device token.

**Request:**

```json
{
  "token": "ExponentPushToken[abc123...]"
}
```

**Fields:**

- `token: string` — Firebase Cloud Messaging or Expo push token

**Response (200 OK):**

```json
{
  "ok": true
}
```

**Behavior:**

- Upserts token in `FcmToken` table if new
- Returns success even if token already registered
- Returns success even if Firebase Messaging disabled (safe no-op)

**Error responses:**

- `401 Unauthorized` — invalid token
- `400 Bad Request` — missing token field
- `500 Internal Server Error` — database error

#### DELETE /notifications/token/:token

Revoke a registered device token.

**Path parameters:**

- `token: string` — token to revoke (URL-encoded)

**Response (200 OK):**

```json
{
  "ok": true
}
```

**Behavior:**

- Removes token from `FcmToken` table
- Returns success even if token doesn't exist
- Future notifications won't send to revoked device

#### POST /notifications/test

Send a test push notification.

**Request:**

```json
{
  "title": "Test Alert",
  "body": "This is a test notification",
  "data": {
    "symbol": "AAPL",
    "price": "150.00"
  }
}
```

**Request fields:**

- `title?: string` — notification title (default: "Test Notification")
- `body?: string` — notification body (default: "This is a test from your backend")
- `data?: Record<string, string>` — custom data payload (optional)

**Response (200 OK):**

```json
{
  "attemptedCount": 2,
  "sentCount": 2,
  "skipped": false,
  "reason": null
}
```

**Response fields:**

- `attemptedCount: number` — how many registered tokens were attempted
- `sentCount: number` — how many tokens sent successfully
- `skipped: boolean` — true if Firebase disabled or no tokens registered
- `reason?: string` — skip reason (e.g., "no_tokens", "firebase_disabled")

**Error responses:**

- `401 Unauthorized` — invalid token
- `400 Bad Request` — missing/invalid request body
- `500 Internal Server Error` — Firebase error (but won't fail endpoint)

## WebSocket (Socket.io) Transport

Connected client receives real-time updates for subscribed stock symbols.

### Client → Server Events

#### price:subscribe

Subscribe to live price updates for a symbol.

**Payload:**

```json
{
  "symbol": "AAPL"
}
```

**Behavior:**

- Joins Socket.io room named `symbol:AAPL`
- Backend starts broadcasting price updates for AAPL to that room
- No authentication required on Socket.io (optional: add later if needed)

#### price:unsubscribe

Unsubscribe from a symbol.

**Payload:**

```json
{
  "symbol": "AAPL"
}
```

**Behavior:**

- Leaves Socket.io room `symbol:AAPL`
- Stops receiving price updates for that symbol

### Server → Client Events

#### price:update

Live price update broadcast to subscribed room.

**Payload:**

```json
{
  "symbol": "AAPL",
  "price": 150.25,
  "change": 1.5,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Fields:**

- `symbol: string` — stock ticker
- `price: number` — current price
- `change: number` — price delta from previous close (optional)
- `timestamp: string` — ISO 8601 timestamp of update

**Frequency:** Broadcasts whenever Finnhub sends a tick (typically 1-5 per second during market hours).

**Fallback:** If backend WebSocket to Finnhub is down, price updates pause. Mobile can call REST endpoint to fetch latest price or reconnect.

#### connection-status

Connection state notification.

**Payload:**

```json
{
  "status": "connected",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Status values:**

- `connected` — Socket.io connection established, ready for subscriptions
- `reconnecting` — attempting to reconnect
- `offline` — connection lost (client should switch to REST fallback)

**Sent:** On initial connection, when status changes, and on reconnection.

## Error Handling

### HTTP Status Codes

| Code | Scenario                                      |
| ---- | --------------------------------------------- |
| 200  | Success                                       |
| 201  | Resource created                              |
| 400  | Validation error (invalid input)              |
| 401  | Authentication failed (invalid/expired token) |
| 404  | Resource not found                            |
| 500  | Server error (database, Firebase, etc.)       |
| 503  | Service unavailable (readiness check failed)  |

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "symbol must be a non-empty string",
  "error": "Bad Request"
}
```

### Notification Failures

Push notification failures (e.g., invalid token) are **not** returned as errors. Instead:

- `skipped: true` if Firebase is unavailable or no tokens registered
- `sentCount < attemptedCount` if some tokens failed silently
- Backend logs the failure for monitoring

This graceful degradation ensures alerts still work even if notifications are temporarily unavailable.

## DTOs & Validation

All request bodies are validated using NestJS class-validator decorators (defined in `packages/shared/src/auth.ts`):

**CreateAlertInput:**

```typescript
{
  symbol: string; // Required, max 10 chars
  price: number; // Required, > 0
  condition: 'above' | 'below'; // Required enum
  threshold: number; // Required, > 0
}
```

**SyncNotificationTokenInput:**

```typescript
{
  token: string; // Required, non-empty
}
```

**SendNotificationInput:**

```typescript
{
  title?: string;
  body?: string;
  data?: Record<string, string>;
}
```

Invalid inputs return `400 Bad Request` with validation error messages.

## Swagger Integration

Backend exposes OpenAPI schema at:

- `/docs` — Interactive Swagger UI with "Try it out"
- `/docs-json` — Raw OpenAPI 3.0 JSON schema

**Swagger features:**

- Bearer token input field (set once, applies to all protected endpoints)
- Request/response body examples
- Parameter descriptions
- Error response codes

**Keeping docs in sync:**

- Controller route decorators (`@Post`, `@Get`, etc.)
- Route decorators (`@ApiTags`, `@ApiOperation`, `@ApiOkResponse`)
- Shared DTOs in `packages/shared` define request/response shapes
- Run `bun run dev:backend` to verify `/docs` output matches implementation

## Maintenance

When adding/changing endpoints:

1. Update controller route and add `@Api*` decorators
2. Update shared DTOs if request/response shape changes
3. Verify `/docs` reflects the change
4. Update this file with new endpoint docs
5. Test endpoint manually via Swagger UI or `curl`

Example:

```bash
curl -X POST http://localhost:3000/alerts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL","price":150,"condition":"above","threshold":151}'
```
