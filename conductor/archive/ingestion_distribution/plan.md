# Implementation Plan - Real-Time Data Ingestion & Distribution

## Phase 1: External Data Ingestion

- [x] Task: Implement Finnhub WebSocket Client
  - [x] Write failing tests for Finnhub connection service
  - [x] Implement `FinnhubService` to connect and authenticate with Finnhub
  - [x] Handle incoming price messages and parse payload
  - [x] Add retry/backoff, heartbeat detection, and reconnect telemetry
  - [x] Define a REST polling fallback when the WebSocket connection is unavailable
- [x] Task: Conductor - User Manual Verification 'External Data Ingestion' (Protocol in workflow.md)

## Phase 2: Internal Data Distribution (Redis)

- [x] Task: Integrate Redis Pub/Sub
  - [x] Write failing tests for Redis publication/subscription
  - [x] Implement `PricePublisherService` to send data to Redis
  - [x] Implement `PriceSubscriberService` to listen for updates
  - [x] Add duplicate tick suppression and channel health reporting
- [x] Task: Conductor - User Manual Verification 'Internal Data Distribution (Redis)' (Protocol in workflow.md)

## Phase 3: Client Distribution (Socket.io)

- [x] Task: Create Stock WebSocket Gateway
  - [x] Write failing tests for Socket.io connection and emission
  - [x] Implement `StockGateway` using `@nestjs/websockets`
  - [x] Connect Gateway to Redis Subscriber to broadcast live updates
  - [x] Emit connection status events so clients can show live/reconnecting states
- [x] Task: Conductor - User Manual Verification 'Client Distribution (Socket.io)' (Protocol in workflow.md)
