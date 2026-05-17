# Implementation Plan - Persistent Price Alerts

## Phase 1: Backend API & Database

- [x] Task: Implement Alert CRUD API
  - [x] Write failing tests for Alert creation and retrieval
  - [x] Create `AlertsController` and `AlertsService` in NestJS
  - [x] Implement Prisma logic for Alert persistence
  - [x] Add DTO validation and guard against duplicate active alerts for the same user/symbol/condition/threshold
- [x] Task: Integrate Firebase Authentication (Backend)
  - [x] Write failing tests for Firebase token verification
  - [x] Implement `AuthGuard` using Firebase Admin SDK
  - [x] Link alerts to the authenticated user's profile
  - [x] Sync shared auth/user contracts from `packages/shared`
- [x] Task: Conductor - User Manual Verification 'Backend API & Database' (Protocol in workflow.md)

## Phase 2: Mobile UI & Integration

- [x] Task: Build Alert Creation Form
  - [x] Write failing tests for Alert form submission logic
  - [x] Implement `CreateAlertForm` with symbol, price, and condition inputs
  - [x] Integrate with the backend Alert API
  - [x] Add inline validation and optimistic UI rollback on API failures
- [x] Task: Manage Active Alerts
  - [x] Write failing tests for alert list rendering
  - [x] Implement `AlertsListScreen` to view and delete active alerts
  - [x] Surface backend errors cleanly and preserve alert state across refreshes
- [x] Task: Conductor - User Manual Verification 'Mobile UI & Integration' (Protocol in workflow.md)
