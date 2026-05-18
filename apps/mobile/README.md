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
- npm >= 10
- Android Studio with its bundled JBR/JDK 17, or an explicit `JAVA_HOME`
- Expo CLI (optional, auto-installed via Expo package)

## Setup

### 1. Install Dependencies

From `apps/mobile`:

```bash
npm install
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
If it is unset, the mobile app uses a local no-op sync client so Expo/dev builds still run without committed secrets.

Set `EXPO_PUBLIC_ENABLE_NOTIFICATIONS=false` to fully disable notification sync during local development.

If testing Android push notifications with Firebase, also provide `google-services.json`:

```bash
# Optional override (defaults to ./google-services.json)
EXPO_ANDROID_GOOGLE_SERVICES_FILE=./google-services.json
```

`apps/mobile/app.config.ts` will only set `android.googleServicesFile` when the file exists, so local/test runs without Firebase credentials remain runnable.

### 3. Run Development Server

```bash
npm run dev
```

This starts the Expo dev client flow, boots an emulator if needed, builds the dev client, and opens Android.

If you want to use Expo Go instead, run `npm run dev:go` from `apps/mobile`.

To create the matching native client for iOS or Android, use the development EAS profile:

```bash
npx eas-cli build --platform android --profile development
npx eas-cli build --platform ios --profile development
```

## Running on Devices

### iOS Simulator

```bash
npm run ios
```

### Android Emulator

```bash
npm run android
```

### Web (Experimental)

```bash
npm run web
```

## Building

### Local export (bundle/static assets)

```bash
npm run build
```

### Final Android APK (EAS Build)

From `apps/mobile`:

```bash
npx expo config --type public
npx eas-cli --version
npx eas-cli login
npx eas-cli build --platform android --profile production --non-interactive
```

Notes:

- `apps/mobile/eas.json` defines a `production` profile that outputs an APK.
- Ensure Expo config resolves `slug` and `android.package` before running build.
- Download the APK from the EAS build page once status is `finished`.

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

# Watch mode
bun run test:watch
```

## Linting

```bash
# Lint code
bun run lint

# Format code
bun run format
```

## Shared Contracts

This app imports shared types and contracts from `@stock-alert/shared`:

```typescript
import { version } from '@stock-alert/shared';
```

See `packages/shared/src/index.ts` for available exports.

## Development Workflow

1. Update shared contracts in `packages/shared/src/`
2. Build shared package from the shared workspace: `npm run --prefix ../../packages/shared build`
3. Import in mobile app with `@stock-alert/shared` alias
4. Run mobile app: `npm run dev`

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
