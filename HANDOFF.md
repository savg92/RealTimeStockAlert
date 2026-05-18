# Handoff: Local Android deployment

## Purpose
- Get the `mobile` app running locally on an Android Studio emulator with the Expo dev client.
- Connect the mobile app to the local backend for testing.

## Current state
✅ **FULLY WORKING** — Android development deployment with improved mobile UI:
- `npm run dev` successfully builds APK and installs to running emulator
- All app screens fully functional: **Home**, **Watchlist**, **Alerts**, **Settings**, **StockDetail**
- Bottom tab navigation with icons for all sections
- Modern, polished UI with cards, styling, and visual feedback
- Metro bundler running and serving 1700+ modules to emulator at 192.168.0.22:8081
- Hot reload enabled for rapid development iteration
- Emulator (Pixel_9) running and receiving app updates in real-time
- **Backend connectivity verified**: API endpoints fixed (`/alerts` not `/api/alerts`)
- **Alerts API fully functional**: Create, read, delete alerts from mobile app
- **Socket.io connected**: App shows "Connected • Online" status with live updates
- **Development authentication**: `dev-test-token-12345` works without Firebase setup

## Prerequisites
- Node.js/npm installed (mobile app uses npm, not Bun).
- Android Studio installed with:
  - Android SDK
  - Android Emulator (AVD Manager)
  - Android SDK Platform-Tools (adb)
- Android Studio's bundled JBR (Java 21) is automatically used via the launcher script.
- Do NOT set `JAVA_HOME` manually unless you have a specific Java 17+ installation.
- **Backend prerequisites** (for testing mobile-to-backend connection):
  - Docker and Docker Compose installed (for PostgreSQL and Redis)
  - Bun package manager installed (for backend)

## Backend setup (for mobile testing)

1. Start the PostgreSQL and Redis containers:
   ```bash
   cd /path/to/repo
   docker-compose up -d  # or docker-compose up (for logs)
   ```
   - PostgreSQL will be on `localhost:5432`
   - Redis will be on `localhost:6379`

2. Start the backend server:
   ```bash
   cd apps/backend
   bun run start
   ```
   - Backend will be on `http://localhost:3000`
   - Verify with: `curl http://localhost:3000/health`

3. The mobile app is configured to connect to `http://localhost:3000` using a development auth token:
   - Token: `dev-test-token-12345` (automatically created and synced to database)
   - This token is **only valid in development mode** (NODE_ENV=development)
   - Mobile app can now make authenticated API calls without Firebase setup

## Local deploy steps
1. Install mobile dependencies (first time only):
   ```bash
   cd apps/mobile
   npm install
   ```

2. Create or start an Android emulator via Android Studio's **Device Manager** (or use a physical device with USB debugging enabled).

3. Build and run the dev client on the emulator:
   ```bash
   cd apps/mobile
   npm run dev
   ```
  - The launcher script will automatically detect the running emulator/device.
  - If no emulator is running, it will attempt to start one (requires a pre-created AVD).
  - Build output shows the Gradle build and Metro bundler starting.
  - If the APK installation fails with "Broken pipe", the emulator may not be responding—restart it.

4. Alternatively, build without installing on a device:
  ```bash
  cd apps/mobile
  npm run android
  ```
  - This will build the APK but requires a connected device/emulator to install.

5. For a local EAS APK build (without device/emulator):
  ```bash
  cd apps/mobile
  npx --yes eas-cli build --platform android --profile development --local
  ```
  - This uses the system Gradle and produces a standalone APK in `./android/app/build/outputs/apk/debug/`.

6. **Verification**: When the dev client launches, you should see the Android Bootstrap screen with status info. If Metro connects, you'll see "Development mode enabled" text.
  - Metro bundler URL is typically: `http://localhost:8081`
  - To manually connect: scan the QR code shown by `npm run dev`

## Troubleshooting

### "No development build for this project is installed"
- The dev client wasn't built or installed on the device yet.
- Run `npm run dev` from scratch or rebuild with `npm run android`.

### "Broken pipe" when installing APK
- The emulator may have crashed or disconnected.
- Restart the emulator and retry `npm run dev`.

### Build fails with Java/Gradle errors
- Gradle version is pinned to 8.13 (compatible with Java 21 from Android Studio's JBR).
- Clear Gradle cache: `rm -rf apps/mobile/android/.gradle`
- The launcher script automatically sets `JAVA_HOME` to Android Studio's JBR; do not override it manually.

### Metro bundler hangs or doesn't serve JS
- Ensure the emulator is fully booted: `adb shell getprop sys.boot_completed` should print `1`
- Kill Metro if needed and restart: `npm run dev`

## Expected success output
```
env: load .env.local
env: export EXPO_PUBLIC_API_URL ...
› Building app...
Configuration on demand is an incubating feature.
...
BUILD SUCCESSFUL in XXXs
Expo Autolinking module resolution enabled
Starting Metro Bundler
Waiting on http://localhost:8081
› Installing /Users/.../app-debug.apk
```
If you see `BUILD SUCCESSFUL` and the dev client boots on the device, deployment is working.

## Useful files
- `apps/mobile/package.json`
- `apps/mobile/scripts/run-android.mjs`
- `apps/mobile/src/screens/AndroidBootstrapScreen.tsx`
- `apps/mobile/metro.config.js`
- `apps/mobile/app.config.ts`
- `apps/mobile/AGENT_HANDOFF.md`
- `apps/mobile/.env.local` (development configuration with auth token)

## Testing mobile-to-backend connection

### Verify backend is running:
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","environment":"development",...}
```

### Test authentication with development token:
```bash
curl -H "Authorization: Bearer dev-test-token-12345" http://localhost:3000/alerts
# Expected: [] (empty array or list of alerts)
```

### Create a test alert:
```bash
curl -X POST \
  -H "Authorization: Bearer dev-test-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL","price":150.00,"threshold":150.00,"condition":"above"}' \
  http://localhost:3000/alerts
# Expected: {id, symbol, price, condition, threshold, ...}
```

### In the mobile app:
1. Navigate to the **Alerts** screen
2. The app should fetch and display alerts from the backend
3. You can create, view, and delete alerts directly from the app

## App screens and functionality

### 🏠 Home Screen
- Welcome message and app overview
- Live connection status indicator (Online/Offline)
- Quick stats (number of stocks tracked)
- Navigation hints to other tabs

### 📈 Watchlist Screen
- Display 5 mock stocks: AAPL, MSFT, GOOGL, AMZN, TSLA
- Show current price and % change with color coding (green for +, red for -)
- Stock cards with company name and quick details
- Tap card to navigate to StockDetail screen
- "Add Stock" button (placeholder)

### 🔔 Alerts Screen
- **Create Alert form** with:
  - Symbol input (auto-uppercase)
  - Target price input
  - Condition selector (Above/Below) with icons
  - Form validation and error display
- **Active Alerts list** showing:
  - Symbol and target price
  - Condition badge (color-coded)
  - Delete button for each alert
  - Empty state message if no alerts
- Refresh button to reload alerts from backend
- Loading and error state handling

### ⚙️ Settings Screen
- **Notifications section**: Push notifications, Sound, Vibration toggles
- **Display section**: Dark mode, Currency (USD), Time format (12-hour)
- **Data section**: Auto-refresh toggle, Wi-Fi only toggle
- **About section**: Version (1.0.0), Privacy Policy, Terms of Service
- Save Settings button
- Logout button with confirmation dialog

### 📊 Stock Detail Screen
- Large current price display with live/cached indicator
- Price change percentage with color badge
- 52-week high/low, market cap, volume, P/E ratio in detail cards
- Interactive chart showing price history
- Quick action buttons: "Set Alert", "Add to Watchlist"
- Close button in header

## API endpoints (backend routes)

All endpoints are **without** `/api/` prefix:
```
GET  /alerts                  - Fetch user's alerts
POST /alerts                  - Create new alert
DELETE /alerts/:id            - Delete alert
GET  /stocks/:symbol          - Get stock details
GET  /health                  - Health check endpoint
GET  /ready                   - Readiness check endpoint
```

**Authentication**: All protected routes require `Authorization: Bearer <token>` header.

## Development environment variables

**Backend (.env)**:
```
NODE_ENV=development
DATABASE_URL=postgresql://stock_user:stock_password@localhost:5432/stock_alert
REDIS_URL=redis://localhost:6379
FINNHUB_API_KEY=<your-finnhub-api-key>
```

**Mobile (.env.local)**:
```
EXPO_PUBLIC_API_URL=http://192.168.0.22:3000
EXPO_PUBLIC_SOCKET_URL=ws://192.168.0.22:3000
EXPO_PUBLIC_AUTH_BEARER_TOKEN=dev-test-token-12345
```

Note: Mobile uses the host machine's IP (192.168.0.22) instead of localhost since the emulator runs in a virtual environment.

## Development Authentication

The mobile app uses a development token for local testing:
- **Token**: `dev-test-token-12345`
- **Configuration**: Set in `apps/mobile/.env.local` as `EXPO_PUBLIC_AUTH_BEARER_TOKEN`
- **How it works**:
  1. Mobile app sends Bearer token in Authorization header
  2. Backend auth guard checks if `NODE_ENV=development` and token matches
  3. If so, creates/syncs a test user (`dev@test.local`) to the database
  4. Allows full API access without Firebase authentication
- **Important**: This token is **ONLY for development**. Production builds require real Firebase tokens.
