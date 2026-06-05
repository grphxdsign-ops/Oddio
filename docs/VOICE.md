# OddioAI Voice Coach

OddioAI voice chat uses a request-based push-to-talk loop for v1. The app records one short user question, sends it to the authenticated Supabase Edge Function, and plays back an AI-generated coach response.

## Local Mock Mode

Use mock mode when Supabase or OpenAI is not configured:

```bash
EXPO_PUBLIC_ODDIO_VOICE_MOCK=1 npm.cmd run start
```

Mock mode shows the same UI, transcript, coach answer, mute, and replay controls. It does not generate audio.

## Real Voice Mode

1. Enable anonymous sign-ins in Supabase Auth.
2. Apply `supabase/schema.sql`.
3. Deploy the `voice-turn` Edge Function.
4. Set the function secrets:

```bash
supabase secrets set OPENAI_API_KEY=sk-proj-your-key
supabase secrets set ODDIO_LLM_MODEL=gpt-4o-mini
supabase secrets set ODDIO_STT_MODEL=gpt-4o-mini-transcribe
supabase secrets set ODDIO_TTS_MODEL=gpt-4o-mini-tts
supabase secrets set ODDIO_TTS_VOICE=coral
```

Only `OPENAI_API_KEY` is required. The other values are defaults you can override.

## Privacy Boundary

- Raw voice question audio is sent to the Edge Function for transcription but is not stored by default.
- Raw practice audio stays local by default.
- Generated coach reply audio is stored temporarily in the private `voice-replies` bucket and returned through a short-lived signed URL.
