# OddioAI Testing

## Fast Local Checks

Run these on every branch:

```bash
npm.cmd run typecheck
npm.cmd run smoke
npx.cmd expo install --check
```

## Detox UI Testing

Detox is configured for native Expo development builds. It needs generated native projects and an app binary, so it does not run against the browser preview.

### iOS Simulator

Requires macOS, Xcode, CocoaPods, and an installed iOS Simulator:

```bash
npm run e2e:build:ios
npm run e2e:test:ios
```

The iOS build script runs Expo prebuild, installs pods, and builds `OddioAI.app` for the simulator.

### Android Emulator

Requires Android Studio, an emulator, and `ANDROID_HOME` or `ANDROID_SDK_ROOT`.

By default, Detox targets `Pixel_7_API_35`. Override it when needed:

```bash
set DETOX_ANDROID_AVD=Your_AVD_Name
npm.cmd run e2e:build:android
npm.cmd run e2e:test:android
```

## Current Detox Coverage

The first test suite verifies:

- The app launches on a reference-only guitar source.
- The UI states the source is Songsterr and `reference-only`.
- MIDI practice mode can run a simulated pass.
- Coach feedback remains visible after a practice pass.
- Piano search creates external source-search cards instead of generated notation.

## Review Gates

- Greptile should review every PR once connected.
- Impeccable/Taste review should focus on UI clarity, testability, source-reference policy, and mobile ergonomics.
