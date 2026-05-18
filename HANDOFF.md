# Handoff: Local Android deployment

## Purpose
- Get the `mobile` app running locally on an Android Studio emulator with the Expo dev client.

## Current state
✅ **FULLY WORKING** — Android development deployment is verified operational:
- `npm run dev` successfully builds APK (BUILD SUCCESSFUL in 11s) and installs to running emulator
- All app features reconnected: Home, Watchlist, Alerts, Settings, StockDetail screens
- Navigation stack fully configured with push notifications
- Metro bundler running and serving 1216 modules to emulator at 192.168.0.22:8081
- Hot reload enabled for rapid development iteration
- Emulator (Pixel_9) running and receiving app updates in real-time

## Prerequisites
- Node.js/npm installed (mobile app uses npm, not Bun).
- Android Studio installed with:
  - Android SDK
  - Android Emulator (AVD Manager)
  - Android SDK Platform-Tools (adb)
- Android Studio's bundled JBR (Java 21) is automatically used via the launcher script.
- Do NOT set `JAVA_HOME` manually unless you have a specific Java 17+ installation.

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
