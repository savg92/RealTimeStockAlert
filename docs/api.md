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

#### GET /stocks/:symbol/details

Get advanced financial metrics and live quote data for a symbol.

**Response (200 OK):**

```json
{
  "high52w": 245.89,
  "low52w": 165.23,
  "marketCap": "3.22T",
  "volume": "52.4M",
  "pe": 28.5,
  "change": 1.75,
  "changePercent": 0.92
}
```

**Fields:**

- `high52w: number` — 52-week high price
- `low52w: number` — 52-week low price
- `marketCap: string` — market capitalization (formatted as B/T)
- `volume: string` — 10-day average trading volume (formatted as K/M)
- `pe: number` — P/E ratio (Trailing Twelve Months)
- `change: number` — current day price change from previous close
- `changePercent: number` — current day price change percentage

#### GET /stocks/:symbol/history

Get historical price points (candles) for a symbol and named range. The `range` query parameter accepts the supported ranges: `1H`, `5H`, `1D`, `5D`, `1M`, `3M`, `1Y`, `5Y`, `ALL`.

Query parameters:

- `range` (string) — required; one of the supported ranges (defaults to `1D` if omitted)

Behavior:

- The endpoint uses **Yahoo Finance** as the authoritative source for historical candle data.
- Successful candle responses are cached in Redis under the key `stocks:history:<SYMBOL>:<RANGE>` and retained for 24 hours (TTL: 86400s).
- If the Yahoo Finance request fails, the backend will attempt to return the last cached history for that symbol/range.
- If neither live candles nor a cached history are available, the endpoint returns `503 Service Unavailable`.
- **Note:** The Mobile UI implements a fallback to show the most recent trading session points if the requested trailing window (like 1H) is currently silent (e.g., at night).

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

## Development & Testing Endpoints

These endpoints are only available in development mode and are useful for testing and debugging without live market data.

### Dev Testing Scenarios

#### POST /dev/scenario/:name

Execute a predefined test scenario to verify the alert pipeline end-to-end without manual action.

**Path parameters:**

- `name: string` — scenario name; one of:
  - `basic-alert-flow` — Create alert, trigger price, verify dispatch
  - `multi-alert-cascade` — Create 3 alerts, trigger subset, verify dispatch
  - `price-volatility` — Trigger rapid price changes, verify alert matching
  - `watchlist-tracking` — Add/remove stocks, verify Finnhub subscription changes

**Response (200 OK):**

```json
{
  "scenario": "basic-alert-flow",
  "steps": [
    { "step": 1, "action": "Create watchlist item", "symbol": "TEST_SYMBOL", "status": "ok" },
    { "step": 2, "action": "Create alert", "condition": "above", "threshold": 100, "status": "ok" },
    { "step": 3, "action": "Publish price", "price": 105, "status": "ok" },
    { "step": 4, "action": "Verify dispatch", "dispatchCount": 1, "status": "ok" }
  ],
  "success": true
}
```

**Use case:** Verify alert triggering logic works without needing live Finnhub data.

### WebSocket Event Logging

#### GET /dev/ws-events

Get recent WebSocket events from Finnhub connection.

**Response (200 OK):**

```json
{
  "events": [
    {
      "type": "trade",
      "symbol": "AAPL",
      "price": 150.25,
      "timestamp": "2026-05-19T23:30:00.000Z"
    },
    {
      "type": "heartbeat",
      "timestamp": "2026-05-19T23:29:55.000Z"
    }
  ],
  "count": 2,
  "maxSize": 100
}
```

**Fields:**

- `type` — `trade` (price update) or `heartbeat` (connection keepalive)
- `symbol` — stock ticker (only for trade events)
- `price` — updated price (only for trade events)
- `timestamp` — ISO 8601 timestamp

**Use case:** Debug Finnhub connection health and event flow.

#### DELETE /dev/ws-events

Clear the WebSocket event log buffer.

**Response (200 OK):**

```json
{
  "cleared": true
}
```

**Use case:** Reset event log before testing a specific scenario.

### Alert Dispatch History

#### POST /dev/dispatch-history

Query alert dispatch records with optional filtering.

**Request:**

```json
{
  "symbol": "AAPL",
  "status": "sent",
  "limit": 50
}
```

**Request fields (all optional):**

- `symbol: string` — filter by stock symbol
- `status: 'sent' | 'failed' | 'pending' | 'skipped'` — filter by delivery status
- `limit: number` — max records to return (default: 50)

**Response (200 OK):**

```json
{
  "dispatches": [
    {
      "id": "dispatch-uuid",
      "symbol": "AAPL",
      "deliveryStatus": "sent",
      "triggerPrice": 150.25,
      "triggerAt": "2026-05-19T23:30:00.000Z",
      "createdAt": "2026-05-19T23:30:01.000Z",
      "alert": {
        "id": "alert-uuid",
        "condition": "above",
        "threshold": 150.0
      }
    }
  ],
  "summary": {
    "AAPL": {
      "sent": 5,
      "failed": 0,
      "pending": 0,
      "skipped": 1
    }
  },
  "count": 1,
  "filters": {
    "symbol": "AAPL",
    "status": "sent",
    "limit": 50
  }
}
```

**Response fields:**

- `dispatches[]` — filtered alert dispatch records
- `summary` — aggregated count by symbol and status
- `count` — number of records returned
- `filters` — applied filter parameters

**Use case:** Review alert dispatch history, troubleshoot delivery issues, verify alert triggers.

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
