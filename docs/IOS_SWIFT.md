# OddioAI iOS Swift Bridge

OddioAI includes a local Expo Module at `modules/oddio-audio-session`.

## Purpose

The Swift module is the native boundary for future low-latency practice features:

- Prepare an `AVAudioSession` for mic-based practice.
- Report whether the Swift bridge is available.
- Prove the app can host iOS-native MIDI/audio work without changing the JS app contract.

## Current API

The JS wrapper is `src/native/OddioAudioSession.ts`.

- `getNativeAudioSessionStatus()`
- `prepareNativePracticeSession(mode)`

When the app runs in Expo Go or web, the wrapper returns a safe JS fallback. In a custom Expo dev build with the local module linked, iOS returns Swift-backed status.

## Development Notes

- Run `npx expo prebuild --platform ios` before native testing.
- On macOS, run `npx pod-install` if pods need refreshing.
- Detox iOS builds call `scripts/detox-build.js ios`, which handles prebuild, pods, and `xcodebuild`.
- Windows cannot build or run the iOS simulator. Use macOS or EAS for that lane.

## Next Native Work

- Replace capability probing with real CoreMIDI source enumeration.
- Add calibrated mic onset/pitch summaries without exporting raw audio.
- Add native timing measurements that the JS practice analyzer can consume.
