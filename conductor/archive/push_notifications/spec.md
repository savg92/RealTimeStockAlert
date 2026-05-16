# Specification - Backend-Driven Push Notifications

## Overview
This track implements the reactive "Alert Engine" on the backend, which monitors real-time price changes and triggers push notifications to users via Firebase Cloud Messaging (FCM).

## Objectives
- Integrate Firebase Cloud Messaging (FCM) into the NestJS backend and Expo mobile app.
- Implement the "Alert Engine" logic to evaluate live prices against stored alerts.
- Ensure reliable delivery of push notifications when price thresholds are met.

## Key Components
- **FCM Service**: Backend integration with Firebase Admin SDK for sending notifications.
- **Alert Engine**: A reactive service listening to price updates and querying active alerts.
- **Notification Manager**: Mobile side logic for handling incoming FCM payloads.
- **FCM Token Sync**: Mechanism to keep user FCM device tokens updated in PostgreSQL.

## Success Criteria
- Backend correctly identifies when a live price crosses a user's alert threshold.
- FCM push notifications are successfully delivered to the user's mobile device.
- Triggered alerts are automatically marked as inactive in the database.
- App displays a notification banner even when running in the background.
