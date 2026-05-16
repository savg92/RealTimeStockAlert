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
- [~] Task: Conductor - User Manual Verification 'FCM Integration (Mobile & Backend)' (Protocol in workflow.md)

## Phase 2: Reactive Alert Engine

- [ ] Task: Implement Alert Engine Logic
  - [ ] Write failing tests for alert threshold evaluation
  - [ ] Implement a service that listens to the Redis price stream
  - [ ] Query PostgreSQL for active alerts matching the symbol and threshold
  - [ ] Trigger the `NotificationService` upon a match
  - [ ] Make alert evaluation idempotent and transaction-safe to avoid duplicate notifications
- [ ] Task: Alert Deactivation & Cleanup
  - [ ] Write failing tests for alert status updates
  - [ ] Automatically mark alerts as `isActive: false` after triggering
  - [ ] Confirm deactivation happens atomically with notification dispatch
- [ ] Task: Conductor - User Manual Verification 'Reactive Alert Engine' (Protocol in workflow.md)

## Phase 3: UX & Visual Feedback

- [ ] Task: Handle Incoming Notifications
  - [ ] Write failing tests for notification interaction logic
  - [ ] Configure `expo-notifications` for foreground/background alerts
  - [ ] Implement navigation logic to open the relevant stock screen when a notification is tapped
  - [ ] Add deep-link-safe routing and fallback behavior when the target screen is unavailable
- [ ] Task: Conductor - User Manual Verification 'UX & Visual Feedback' (Protocol in workflow.md)

## Phase: Review Fixes

- [x] Task: Apply review suggestions 07d3248
