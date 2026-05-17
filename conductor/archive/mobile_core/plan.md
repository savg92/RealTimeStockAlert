# Implementation Plan - Mobile Core & Real-Time Dashboard

## Phase 1: Mobile Project Setup

- [x] Task: Initialize Expo Application
  - [x] Setup Expo project in `apps/mobile` with TypeScript
  - [x] Configure basic theme and styling (Tailwind/NativeWind or similar)
  - [x] Setup root navigation (React Navigation)
  - [x] Wire shared contracts from `packages/shared` into the app bootstrap
- [x] Task: Conductor - User Manual Verification 'Mobile Project Setup' (Protocol in workflow.md)

## Phase 2: Real-Time Integration

- [x] Task: Implement Socket.io Client
  - [x] Write failing tests for socket connection hook
  - [x] Integrate `socket.io-client`
  - [x] Create a custom hook/provider for real-time stock price updates
  - [x] Add reconnect/backoff handling, offline detection, and live connection badges
  - [x] Fallback to cached/REST data when sockets are unavailable
- [x] Task: Conductor - User Manual Verification 'Real-Time Integration' (Protocol in workflow.md)

## Phase 3: Dashboard UI

- [x] Task: Build Stock Watchlist Dashboard
  - [x] Write failing tests for Watchlist component rendering
  - [x] Implement Dashboard screen with live price rows
  - [x] Integrate initial price fetch (REST) and real-time updates (Socket)
  - [x] Preserve last-known prices and loading/error states for graceful degradation
- [x] Task: Conductor - User Manual Verification 'Dashboard UI' (Protocol in workflow.md)
