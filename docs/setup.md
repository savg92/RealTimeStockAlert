# Setup Notes

## Prerequisites

- Bun
- Docker and Docker Compose
- Node.js-compatible tooling for editor support
- Firebase and Finnhub credentials for live integrations

## Expected environment variables

### Backend

- `DATABASE_URL`
- `REDIS_URL`
- `PORT`
- `FINNHUB_API_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_ADMIN_CREDENTIALS`

### Mobile

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_SOCKET_URL`
- Firebase/Expo notification configuration values

## Development expectations

Once implementation is in place, the normal workflow should be:

1. Install dependencies with Bun workspaces.
2. Start PostgreSQL and Redis locally.
3. Run the backend and mobile apps separately.
4. Verify health endpoints, WebSocket connectivity, and alert flows.
5. Review Swagger/OpenAPI docs for backend route changes and examples.

## Documentation rules

- Keep Bun as the primary package-manager reference
- Document any new env vars when integrations are added
- Update this file whenever the app gains a new required service or secret
- Keep `docs/api.md` and the generated Swagger/OpenAPI output aligned with backend changes

## Notes

This repository is still being scaffolded, so the exact commands will be finalized as the implementation lands.
