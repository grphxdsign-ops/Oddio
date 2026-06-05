# OddioAI

OddioAI is an Expo React Native prototype for a guitar and piano tutor with legal-first song references, local practice analysis summaries, and a witty coach voice.

## Run

```bash
npm.cmd install
npm.cmd run start
```

Useful checks:

```bash
npm.cmd run typecheck
npm.cmd run smoke
npx.cmd expo install --check
```

## Prototype Boundaries

- The app links to source references such as Songsterr, Musicnotes, and IMSLP. It does not copy, re-host, or generate sheet music or tablature.
- Microphone recording uses Expo Audio and keeps raw audio local. The current scoring engine is deterministic simulation so the UI and data contracts are testable before native DSP is added.
- Push-to-talk voice coaching uses mock mode locally unless Supabase and OpenAI voice secrets are configured. Raw voice questions are not stored by default.
- MIDI mode is adapter-ready and simulated in this prototype. A dev-build native MIDI bridge should replace it for hardware keyboards.
- If an in-app catalog match is missing, OddioAI creates source-search cards instead of composing its own notation.

## See The Prototype Run

1. Open a terminal in the cloned `OddioAI` project directory.
2. Run `npm.cmd install` if dependencies are not already installed.
3. Run `npm.cmd run start`.
4. Open `http://localhost:8081` in a browser for the web preview, or scan the Expo QR code with Expo Go on a phone.
5. Pick Guitar or Piano, search for a song, open the source reference, switch to MIDI for the simulated practice lane, and press Run pass.

## Supabase

1. Create a Supabase project.
2. Apply `supabase/schema.sql`.
3. Add the values from `.env.example`.
4. Keep service-role keys out of the app. Only use publishable or anon keys in Expo.
5. See `docs/VOICE.md` for voice coach secrets, Edge Function deployment, and mock mode.

## Native Testing And Swift

- Detox UI testing is configured in `.detoxrc.js` and `e2e/`.
- iOS Detox requires macOS and Xcode. Android Detox requires an emulator.
- The local Swift Expo Module lives in `modules/oddio-audio-session`.
- See `docs/TESTING.md` and `docs/IOS_SWIFT.md`.
