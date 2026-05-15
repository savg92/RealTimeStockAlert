# Specification - Mobile Core & Real-Time Dashboard

## Overview
This track builds the core mobile application using Expo (React Native). It focuses on the user interface for the stock dashboard and the real-time synchronization with the backend.

## Objectives
- Initialize the Expo project with TypeScript and styling foundations.
- Implement the Socket.io client for real-time communication.
- Create a responsive Stock Watchlist Dashboard.

## Key Components
- **Expo App**: Core React Native structure.
- **Socket Client**: Integration with the backend WebSocket Gateway.
- **Watchlist UI**: Dashboard displaying symbols and live prices.
- **State Management**: Zustand for UI state and React Query for server state.

## Success Criteria
- Mobile app connects to the NestJS Socket.io server.
- Dashboard displays live price updates for the hardcoded watchlist.
- App handles background/foreground transitions for socket connections.
