# Real-Time Stock Alert - Mobile App

A React Native mobile application for tracking real-time stock alerts using Expo.

## Features

- **Real-Time Price Updates**: WebSocket-based stock price updates
- **Watchlist Management**: Create and manage custom stock watchlists
- **Price Alerts**: Set up alerts for specific price thresholds
- **Responsive UI**: Built with NativeWind/Tailwind CSS for consistent styling
- **State Management**: Zustand for efficient app state management
- **Type-Safe**: Full TypeScript support

## Tech Stack

- **Framework**: Expo (React Native)
- **Navigation**: React Navigation
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: Zustand
- **Data Fetching**: React Query
- **Real-Time**: Socket.io Client
- **Type Safety**: TypeScript

## Prerequisites

- Node.js >= 18.x
- Bun >= 1.0.0 (or npm/yarn)
- Expo CLI (optional, auto-installed via Expo package)

## Setup

### 1. Install Dependencies

From the repository root:

```bash
bun install
```

Or install mobile-specific dependencies:

```bash
cd apps/mobile
bun install
```

### 2. Configure Environment

Copy the example environment file and update it:

```bash
cp .env.example .env.local
```

Update the API endpoints in `.env.local` if necessary:

```
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SOCKET_URL=ws://localhost:3000
EXPO_PUBLIC_AUTH_BEARER_TOKEN=<firebase-id-token>
```

`EXPO_PUBLIC_AUTH_BEARER_TOKEN` is optional but required to sync FCM device tokens with authenticated backend routes.

If testing Android push notifications with Firebase, also provide `google-services.json`:

```bash
# Optional override (defaults to ./google-services.json)
EXPO_ANDROID_GOOGLE_SERVICES_FILE=./google-services.json
```

`apps/mobile/app.config.ts` will only set `android.googleServicesFile` when the file exists, so local/test runs without Firebase credentials remain runnable.

### 3. Run Development Server

```bash
# From repository root
bun run dev:mobile

# Or from apps/mobile directory
bun run dev
# or
npm run dev
```

This will start the Expo development server on http://localhost:19000 (or a similar port).

## Running on Devices

### iOS Simulator

```bash
bun run ios
# or
npm run ios
```

### Android Emulator

```bash
bun run android
# or
npm run android
```

### Web (Experimental)

```bash
bun run web
# or
npm run web
```

## Building

### Export for App Store/Play Store

```bash
bun run build
# or
npm run build
```

## Project Structure

```
apps/mobile/
├── src/
│   ├── screens/           # Screen components (Home, Watchlist, Settings)
│   ├── components/        # Reusable components
│   ├── hooks/            # Custom React hooks (useSocket, etc.)
│   ├── store/            # Zustand stores
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions (API config, helpers)
│   └── navigation/       # Navigation setup
├── App.tsx               # Root app component with navigation
├── global.css            # Global Tailwind styles
├── tailwind.config.js    # Tailwind CSS configuration
├── babel.config.js       # Babel configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

## Key Components

### Screens

- **HomeScreen**: Market overview and portfolio dashboard
- **WatchlistScreen**: Manage watched stocks with real-time prices
- **SettingsScreen**: App configuration and preferences

### Hooks

- **useSocket**: Custom hook for WebSocket connections and event handling

### Store

- **appStore**: Zustand store for app state (stocks, alerts, settings, connection status)

### Types

Type definitions for:
- `Stock`: Stock data
- `AlertConfig`: Price alert configuration
- `RealTimeUpdate`: Real-time price updates
- `AppSettings`: User preferences

## Testing

```bash
# Run tests
bun run test
# or
npm run test

# Watch mode
bun run test:watch
# or
npm run test:watch
```

## Linting

```bash
# Lint code
bun run lint
# or
npm run lint

# Format code
bun run format
# or
npm run format
```

## Shared Contracts

This app imports shared types and contracts from `@stock-alert/shared`:

```typescript
import { version } from '@stock-alert/shared';
```

See `packages/shared/src/index.ts` for available exports.

## Development Workflow

1. Update shared contracts in `packages/shared/src/`
2. Build shared package: `bun run build:shared`
3. Import in mobile app with `@stock-alert/shared` alias
4. Run mobile app: `bun run dev:mobile`

## Debugging

- Use Expo DevTools from the terminal: press `d` in the Expo CLI
- React Native Debugger: https://github.com/jhen0409/react-native-debugger
- Console logs appear in the Expo terminal

## Contributing

- Follow TypeScript conventions
- Use the provided path aliases (`@/*`, `@shared/*`)
- Keep components focused and reusable
- Add types for new features
- Test before committing

## Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Navigation](https://reactnavigation.org)
- [NativeWind Documentation](https://www.nativewind.dev)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Socket.io Client](https://socket.io/docs/v4/client-api/)

## License

See repository LICENSE file.
