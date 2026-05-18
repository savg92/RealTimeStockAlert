# Mobile app agent handoff

This file contains targeted operational steps, commands, and pointers for an AI coding agent to continue the mobile dev-client work.

Quick checks
- Confirm `expo-linear-gradient` is in `apps/mobile/package.json` and `node_modules`:
  cd apps/mobile
  cat package.json | grep expo-linear-gradient || true
  ls -la node_modules/expo-linear-gradient || true

- Confirm Metro config exists:
  ls -la metro.config.js || true

Essential commands (run from `apps/mobile`)
- Install deps locally:
  npm install

- Start Metro (dev client):
  npm run dev

- Build dev-client (local EAS):
  ANDROID_HOME=/Users/savg/Library/Android/sdk ANDROID_SDK_ROOT=/Users/savg/Library/Android/sdk \
    JAVA_HOME=/Users/savg/.jdk/jdk-17.0.16/... \
    npx --yes eas-cli build --platform android --profile development --local

- Install APK & open deep-link (example):
  adb -s emulator-5554 install -r /path/to/artifact.apk
  adb -s emulator-5554 shell am start -a android.intent.action.VIEW -d "<exp-dev-client-url>" com.stockalert.mobile

Where to inspect logs
- Device logs (filter for gradient and dev-client info):
  adb -s emulator-5554 logcat -d | grep -i "Gradient package was not found\|expo-linear-gradient\|Connected to|DevTools" || true

Where to look in source
- Search for LinearGradient usage:
  grep -R "LinearGradient" -n . || true
- Likely locations: `apps/mobile/src/components`, `apps/mobile/src/screens`, `packages/shared` if UI components are shared.

Debugging strategies
1. Ensure Metro resolves the package
   - Metro must be able to resolve `expo-linear-gradient` from `apps/mobile/node_modules` (or the monorepo root if metro.config has a resolver for the workspace root). If hoisted, confirm metro.config.js includes the root.

2. Rebuild dev-client
   - Native modules must be present at build-time. Re-run the EAS local build after confirming local node_modules.

3. Quick code fallback (no native rebuild)
   - Replace native gradient usage with a JS fallback (example: use `react-native-svg` <LinearGradient> or a simple view background color) to unblock development and verify the rest of the app.

Example JS fallback snippet (replace imports where LinearGradient used):
```js
// import { LinearGradient } from 'expo-linear-gradient'
// fallback -> use a simple View with background or react-native-svg implementation
import { View } from 'react-native'

function GradientFallback({ children, style }) {
  return <View style={style}>{children}</View>
}

export default GradientFallback
```

Notes about options
- Installing `react-native-linear-gradient` is an option because the bundle tries it first, but it is a native module and requires rebuild.
- The most robust fix: ensure `expo-linear-gradient` is installed locally and rebuild the dev-client with npm/Expo (preferred for Expo workflow).

Commit / artifact references
- Last successful EAS local APK (example): `/Users/savg/Desktop/RealTimeStockAlert/build-1779082713786.apk`

When done
- After a successful rebuild and verification, update the top-level `HANDOFF.md` and the repo `plan.md` indicating the dev-client is working and the SDK mismatch is resolved.
