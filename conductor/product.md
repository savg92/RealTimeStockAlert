# Initial Concept

A full-stack mobile application allowing users to track real-time stock prices, view historical and live graphs, and set custom price alerts. The app utilizes a backend-driven architecture: a NestJS server aggregates live data from the Finnhub WebSocket API and pushes it to mobile clients via WebSockets. When a stock hits a user's defined threshold, the backend triggers a Firebase Cloud Messaging (FCM) push notification.

# Product Guide

## Overview
The Real-Time Stock Alert Application as a demonstration of a full-stack, real-time reactive system. It targets users who need up-to-the-minute stock price updates and automated alerts for price movements.

## Target Audience
- Stock Traders/Enthusiasts (Simulated)

## Key Features
- **Authentication**: Firebase-based Email/Password login.
- **Real-Time Stock Watchlist**: A curated list of major stocks (AAPL, TSLA, MSFT, GOOGL, AMZN) with live price updates.
- **Stock Graphics**: Interactive line charts (`react-native-gifted-charts`) showing price movements.
- **Custom Price Alerts**: Users can set target prices (Above/Below) for specific stocks.
- **Push Notifications**: Instant FCM-based notifications when a price threshold is met.

## Core Goals
- Demonstrate proficiency in backend-driven real-time architectures using NestJS and WebSockets.
- Showcase clean, scalable codebase using a monorepo structure.
- Provide a seamless, responsive user experience on Android via React Native (Expo).

## Success Metrics
- Accurate real-time price synchronization across server and clients via Redis Pub/Sub.
- Successful delivery of push notifications triggered by the backend alert engine.
- Adherence to Clean Architecture (Controllers, Services, Repositories).
