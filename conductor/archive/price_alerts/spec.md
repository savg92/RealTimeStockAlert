# Specification - Persistent Price Alerts

## Overview
This track introduces user-defined alerts, allowing users to specify price thresholds (above/below) for specific stocks. This requires full-stack coordination between the mobile UI, backend API, and PostgreSQL database.

## Objectives
- Implement the "Create Alert" UI on the mobile client.
- Create the backend REST API for alert persistence.
- Design and implement the PostgreSQL schema and Prisma models for Alerts and Users.

## Key Components
- **Alert Form**: Mobile UI component for target price and condition selection.
- **Alert API**: NestJS Controller/Service for CRUD operations on alerts.
- **Database Schema**: Prisma models for `User` and `Alert`.
- **Firebase Auth Integration**: Linking alerts to authenticated users.

## Success Criteria
- User can create, view, and delete alerts from the mobile app.
- Alerts are correctly saved to the PostgreSQL database via the NestJS API.
- Alerts are securely associated with the authenticated user's Firebase UID.
