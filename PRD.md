# Product Requirements Document (PRD)

**Project Name**: Real-Time Stock Alert Application  
**Target Audience**: Technical Review Team  
**Platform**: Android (React Native / Expo) & Backend API (Node.js / NestJS)  

## 1. Overview
A full-stack mobile application allowing users to track real-time stock prices, view historical and live graphs, and set custom price alerts. The app utilizes a backend-driven architecture: a NestJS server aggregates live data from the Finnhub WebSocket API and pushes it to mobile clients via WebSockets. When a stock hits a user's defined threshold, the backend triggers a Firebase Cloud Messaging (FCM) push notification.

## 2. Tech Stack
*   **Frontend (Mobile)**: 
    *   React Native (Expo for rapid Android `.apk` generation).
    *   **State Management**: React Query (server state/caching) + Zustand (local UI state).
    *   **UI/Graphs**: `react-native-gifted-charts`, React Navigation.
*   **Backend**: 
    *   Node.js with NestJS (TypeScript).
    *   **Real-time**: Socket.io (for NestJS to App communication).
    *   **ORM**: Prisma.
*   **Database & Infrastructure**: 
    *   PostgreSQL (Primary database for Users and Alerts).
    *   Redis (Pub/Sub for real-time stock price distribution across sockets).
    *   Docker & Docker Compose (Containerization).
    *   Kubernetes (K8s manifests included for enterprise-level deployment - *Extra Points*).
    *   **Package Manager**: Bun (primary), with npm/pnpm command references retained for compatibility notes.
*   **External Services**: 
    *   Firebase Authentication (Client-side login).
    *   Firebase Cloud Messaging (FCM via Firebase Admin SDK for notifications).
    *   Finnhub API (WebSocket for real-time prices).

## 3. System Architecture & Data Flow
1.  **Authentication Flow**: The Mobile app authenticates users via Firebase Auth. The app sends the Firebase ID Token to the NestJS backend, which verifies it using the Firebase Admin SDK and syncs the user/FCM device token in PostgreSQL.
2.  **Live Price Data Flow**: NestJS maintains a persistent WebSocket connection to Finnhub. It broadcasts price updates to a Redis Pub/Sub channel. A NestJS WebSocket Gateway listens to Redis and emits tailored real-time updates to connected Mobile Clients.
3.  **Alert Engine**: The backend continuously checks incoming live prices against active alerts stored in Postgres. If an alert condition is met, it triggers an FCM push notification to the specific user's device and marks the alert as inactive.

## 4. Functional Requirements

### 4.1. Authentication
*   **Requirement**: Users can log in to the app.
*   **Implementation**: Firebase Email/Password Authentication. 

### 4.2. Stock List
*   **Requirement**: View a list of stocks.
*   **Implementation**: A hardcoded watchlist of major stocks (e.g., AAPL, TSLA, MSFT, GOOGL, AMZN). The dashboard fetches initial prices via REST and updates in real-time via Socket.io.

### 4.3. Stock Graphics
*   **Requirement**: Graphic of stocks.
*   **Implementation**: Tapping a stock opens a detail screen with a line chart (`react-native-gifted-charts`) showing price movements. *(If time permits, a secondary view comparing multiple stocks will be added).*

### 4.4. Price Alerts
*   **Requirement**: Form to create a Stock Price alert.
*   **Implementation**: A UI form to select a stock, input a target price, and choose a condition (Above/Below). Saved to PostgreSQL via NestJS REST endpoint.

### 4.5. Real-Time Push Notifications (FCM)
*   **Requirement**: Notification when price hits the alert limit.
*   **Implementation**: Upon crossing the threshold, backend sends an FCM payload to the user's registered device token. Mobile app displays it using `expo-notifications`.

## 5. Non-Functional & "Senior" Requirements
*   **Testing Strategy**:
    *   *Backend*: Unit testing (Jest) for core business logic. E2E testing (Supertest) for API endpoints.
    *   *Frontend*: Unit tests (Jest + RNTL) for key components and state hooks.
*   **Clean Architecture**: Separation of concerns in NestJS (Controllers, Services, Repositories).
*   **Error Handling**: Global exception filters in NestJS; graceful UI fallbacks on mobile.
*   **Reliability**: WebSocket reconnect/backoff, REST polling fallback, offline/reconnecting UI states, and idempotent alert/notification handling.
*   **Observability**: Health/readiness endpoints, structured logging, request correlation IDs, and basic operational metrics.
*   **Shared Contracts**: A shared TypeScript package for DTOs, enums, validation schemas, and cross-app constants to prevent backend/mobile drift.
*   **Containerization**: `docker-compose.yml` to spin up Postgres, Redis, and optionally the NestJS server.
*   **Documentation**: Detailed Setup/Review instructions for the technical team.

## 6. Database Schema (Prisma)
```prisma
model User {
  id          String   @id @default(uuid())
  firebaseUid String   @unique 
  email       String   @unique
  fcmToken    String?  
  alerts      Alert[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Alert {
  id          String         @id @default(uuid())
  userId      String
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  symbol      String        
  targetPrice Float
  condition   AlertCondition 
  isActive    Boolean        @default(true) 
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@index([symbol, isActive]) 
}

enum AlertCondition { ABOVE, BELOW }
```

## 7. Project Structure (Monorepo)
```text
realtime-stock-alerts/
├── apps/
│   ├── backend/            # NestJS API, WebSockets, Prisma
│   └── mobile/             # Expo React Native App
├── packages/
│   └── shared/             # DTOs, enums, validation schemas, constants
├── k8s/                    # Kubernetes manifests
├── docker-compose.yml      # Local DB & Redis setup
├── README.md               
└── PRD.md                  
```

## 8. Deliverables & Reviewer Setup
1. **GitHub Repository**: Containing full monorepo codebase.
2. **Video Demonstration**: A max 4-minute MP4 video showing the working code, including real-time charts and the reception of an FCM push notification.
3. **Android Build**: Pre-compiled `.apk` uploaded to WeTransfer.
4. **Environment Context**: Because Firebase keys (`google-services.json` / Admin Service Accounts) cannot be committed to a public repo, a detailed `.env.example` will be provided. Reviewers will rely on the video to verify the working notifications flow, but will have the necessary instructions to plug in their own Firebase keys if they wish to run the app fully locally.