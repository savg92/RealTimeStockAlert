# Android Development APK Build — Real-Time Stock Alert

This document explains how to produce a development APK for the mobile app (`apps/mobile`) and how to share it (WeTransfer or alternatives).

## Which build profile has been used so far

- Developers in this repo have been running the local Android dev workflow with `npm run android` (see `apps/mobile/package.json` -> `scripts.android`).
- The repository also contains `eas.json` with a `development` profile configured to produce an APK (see `apps/mobile/eas.json`).

## Prerequisites (local machine)

- Java JDK (11+)
- Android SDK (platforms and build-tools for target SDK)
- Android Studio or command-line tools (adb, sdkmanager)
- Node.js (matching `packageManager` in `apps/mobile/package.json`) and npm
- Yarn/Bun not required for mobile build in this repo
- Android device or emulator for testing

## Quick local (Gradle) debug APK (no signing required)

This uses the existing `android/` directory and produces an unsigned debug APK.

1. From repo root, build the debug APK:

```bash
cd apps/mobile/android
./gradlew assembleDebug
```

2. After successful build the APK will be located at:

```
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

3. Install on a device/emulator:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Notes:

- This produces a debug APK that does not require a keystore. Good for internal testing.
- If the `android` directory is not fully up-to-date (managed Expo projects), run `expo prebuild` or use `npm run android` which launches Metro and builds via Gradle.

## Using EAS (Expo Application Services) — development profile

This repo provides `eas.json` with a `development` profile configured to produce an APK. Use EAS when you want cloud builds or to let EAS manage credentials.

1. Install EAS CLI and log in to your Expo account:

```bash
npm install -g eas-cli
eas login
```

2. Trigger a development build (APK):

```bash
cd apps/mobile
eas build --platform android --profile development
```

3. After build completes EAS will provide a download URL for the APK.

Notes:

- Using EAS-managed credentials avoids manual keystore handling.
- You can also configure a `production` profile to produce an AAB for Play Store.

## Signing for production (AAB)

For production AAB you will need a keystore and the appropriate signing config. Follow React Native / Expo docs for generating or importing a keystore. For EAS builds you can choose to let EAS manage credentials.


## Troubleshooting

- If `./gradlew` fails, ensure `ANDROID_HOME`/`ANDROID_SDK_ROOT` are set and required SDK packages are installed.
- For Expo-managed workflows, run `npm run android` or `expo prebuild` first.

---
