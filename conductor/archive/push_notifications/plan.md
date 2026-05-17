# Implementation Plan - Backend-Driven Push Notifications

## Phase 1: FCM Integration (Mobile & Backend)

- [x] Task: Configure FCM for Mobile
  - [x] Setup `expo-notifications` and obtain FCM token
  - [x] Implement token synchronization with the NestJS backend
  - [x] Handle token refresh, permission prompts, and token revocation cleanup
- [x] Task: Setup Firebase Admin SDK (Backend)
  - [x] Write failing tests for FCM notification delivery
  - [x] Initialize Firebase Admin SDK in NestJS
  - [x] Implement `NotificationService` to send FCM payloads
  - [x] Add retry/dedup logic for notification delivery and invalid-token handling
- [x] Task: Conductor - User Manual Verification 'FCM Integration (Mobile & Backend)' (Protocol in workflow.md)

## Phase 2: Reactive Alert Engine

- [x] Task: Implement Alert Engine Logic
  - [x] Write failing tests for alert threshold evaluation
  - [x] Implement a service that listens to the Redis price stream
  - [x] Query PostgreSQL for active alerts matching the symbol and threshold
  - [x] Trigger the `NotificationService` upon a match
  - [x] Make alert evaluation idempotent and transaction-safe to avoid duplicate notifications
- [x] Task: Alert Deactivation & Cleanup
  - [x] Write failing tests for alert status updates
  - [x] Automatically mark alerts as `isActive: false` after triggering
  - [x] Confirm deactivation happens atomically with notification dispatch
- [x] Task: Conductor - User Manual Verification 'Reactive Alert Engine' (Protocol in workflow.md)

## Phase 3: UX & Visual Feedback

- [x] Task: Handle Incoming Notifications
  - [x] Write failing tests for notification interaction logic
  - [x] Configure `expo-notifications` for foreground/background alerts
  - [x] Implement navigation logic to open the relevant stock screen when a notification is tapped
  - [x] Add deep-link-safe routing and fallback behavior when the target screen is unavailable
- [x] Task: Conductor - User Manual Verification 'UX & Visual Feedback' (Protocol in workflow.md)

## Phase: Review Fixes

- [x] Task: Apply review suggestions 07d3248
