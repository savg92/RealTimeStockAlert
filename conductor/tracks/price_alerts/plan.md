# Implementation Plan - Persistent Price Alerts

## Phase 1: Backend API & Database
- [ ] Task: Implement Alert CRUD API
    - [ ] Write failing tests for Alert creation and retrieval
    - [ ] Create `AlertsController` and `AlertsService` in NestJS
    - [ ] Implement Prisma logic for Alert persistence
- [ ] Task: Integrate Firebase Authentication (Backend)
    - [ ] Write failing tests for Firebase token verification
    - [ ] Implement `AuthGuard` using Firebase Admin SDK
    - [ ] Link alerts to the authenticated user's profile
- [ ] Task: Conductor - User Manual Verification 'Backend API & Database' (Protocol in workflow.md)

## Phase 2: Mobile UI & Integration
- [ ] Task: Build Alert Creation Form
    - [ ] Write failing tests for Alert form submission logic
    - [ ] Implement `CreateAlertForm` with symbol, price, and condition inputs
    - [ ] Integrate with the backend Alert API
- [ ] Task: Manage Active Alerts
    - [ ] Write failing tests for alert list rendering
    - [ ] Implement `AlertsListScreen` to view and delete active alerts
- [ ] Task: Conductor - User Manual Verification 'Mobile UI & Integration' (Protocol in workflow.md)
