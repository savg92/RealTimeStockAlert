# Implementation Plan - Backend-Driven Push Notifications

## Phase 1: FCM Integration (Mobile & Backend)
- [ ] Task: Configure FCM for Mobile
    - [ ] Setup `expo-notifications` and obtain FCM token
    - [ ] Implement token synchronization with the NestJS backend
- [ ] Task: Setup Firebase Admin SDK (Backend)
    - [ ] Write failing tests for FCM notification delivery
    - [ ] Initialize Firebase Admin SDK in NestJS
    - [ ] Implement `NotificationService` to send FCM payloads
- [ ] Task: Conductor - User Manual Verification 'FCM Integration (Mobile & Backend)' (Protocol in workflow.md)

## Phase 2: Reactive Alert Engine
- [ ] Task: Implement Alert Engine Logic
    - [ ] Write failing tests for alert threshold evaluation
    - [ ] Implement a service that listens to the Redis price stream
    - [ ] Query PostgreSQL for active alerts matching the symbol and threshold
    - [ ] Trigger the `NotificationService` upon a match
- [ ] Task: Alert Deactivation & Cleanup
    - [ ] Write failing tests for alert status updates
    - [ ] Automatically mark alerts as `isActive: false` after triggering
- [ ] Task: Conductor - User Manual Verification 'Reactive Alert Engine' (Protocol in workflow.md)

## Phase 3: UX & Visual Feedback
- [ ] Task: Handle Incoming Notifications
    - [ ] Write failing tests for notification interaction logic
    - [ ] Configure `expo-notifications` for foreground/background alerts
    - [ ] Implement navigation logic to open the relevant stock screen when a notification is tapped
- [ ] Task: Conductor - User Manual Verification 'UX & Visual Feedback' (Protocol in workflow.md)
