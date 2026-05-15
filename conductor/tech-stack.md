# Technology Stack

## Frontend (Mobile)
- **Framework**: React Native with Expo (for rapid Android development).
- **State Management**: 
  - **React Query**: For managing server state, caching, and synchronization.
  - **Zustand**: For lightweight local UI state management.
- **UI & Visualization**:
  - **react-native-gifted-charts**: For interactive line charts and stock graphs.
  - **React Navigation**: For app-wide navigation.
  - **expo-notifications**: For handling push notification displays.

## Backend
- **Framework**: Node.js with NestJS (TypeScript).
- **Real-Time Communication**: Socket.io (for real-time price distribution to mobile clients).
- **Database Access (ORM)**: Prisma.
- **Background Tasks & Alert Engine**: Integrated within NestJS services.

## Database & Infrastructure
- **Primary Database**: PostgreSQL (for storing User data and Alert configurations).
- **In-Memory Store (Pub/Sub)**: Redis (used to distribute real-time stock price data across socket instances).
- **Containerization**: Docker & Docker Compose (for consistent local development environments).
- **Orchestration**: Kubernetes (K8s manifests included for deployment scaling).

## External Services
- **Authentication**: Firebase Authentication (Email/Password login).
- **Push Notifications**: Firebase Cloud Messaging (FCM) via Firebase Admin SDK.
- **Data Source**: Finnhub API (WebSocket connection for live stock prices).

## Development Tools
- **Language**: TypeScript (End-to-end type safety).
- **Testing**:
  - **Jest**: For unit and integration tests.
  - **Supertest**: For E2E API testing.
  - **RNTL (React Native Testing Library)**: For frontend component testing.
