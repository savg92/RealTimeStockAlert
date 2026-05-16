# Specification - Real-Time Data Ingestion & Distribution

## Overview
This track handles the "heartbeat" of the application: ingesting live stock data from external providers and distributing it efficiently to connected clients. It leverages NestJS, WebSockets (Finnhub), Redis (Pub/Sub), and Socket.io.

## Objectives
- Establish a resilient WebSocket connection to the Finnhub API.
- Implement a Redis-backed Pub/Sub mechanism to decouple data ingestion from client distribution.
- Create a NestJS WebSocket Gateway (Socket.io) to broadcast live updates to mobile clients.

## Key Components
- **Finnhub Client**: A NestJS service that maintains the connection to Finnhub.
- **Redis Publisher**: Publishes incoming price updates to specific Redis channels.
- **Redis Subscriber**: Listens for updates and triggers broadcasts.
- **Stock Gateway**: Manages client connections and emits real-time data.

## Success Criteria
- Server successfully receives live price updates from Finnhub.
- Price data is published to and received from Redis.
- Mobile clients (simulated via tools or basic scripts) receive real-time updates via Socket.io.
