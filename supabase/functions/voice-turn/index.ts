import { createClient } from 'npm:@supabase/supabase-js@2';
import type { VoiceTurnContext } from '../_shared/voiceTypes.ts';

import {
  DEFAULT_LLM_MODEL,
  DEFAULT_STT_MODEL,
  DEFAULT_TTS_MODEL,
  DEFAULT_TTS_VOICE,
  buildContextSummary,
  buildVoiceSystemPrompt,
  buildVoiceUserPrompt,
  normalizeAssistantText,
  validateVoiceTurnRequest,
} from './coach.ts';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const form = await request.formData();
    const audio = form.get('audio');
    const contextRaw = form.get('context');
    const validation = validateVoiceTurnRequest({
      audioSize: audio instanceof File ? audio.size : null,
      authorization: request.headers.get('Authorization'),
      contextRaw: typeof contextRaw === 'string' ? contextRaw : null,
    });

    if (!validation.ok) {
      return jsonResponse({ error: validation.message }, validation.status);
    }

    if (!(audio instanceof File)) {
      return jsonResponse({ error: 'Voice turns require an audio file.' }, 400);
    }

    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      return jsonResponse({ error: 'OPENAI_API_KEY is not configured.' }, 500);
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const jwt = request.headers.get('Authorization')!.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Invalid Supabase session.' }, 401);
    }

    const context = validation.context;
    const transcript = await transcribeVoice(openAiKey, audio);
    const assistantText = normalizeAssistantText(
      await generateCoachText(openAiKey, context, transcript),
      context,
    );
    const speechBytes = await synthesizeVoice(openAiKey, assistantText);
    const { audioExpiresAt, audioObjectPath, audioUrl } = await storeReplyAudio({
      bytes: speechBytes,
      supabaseAdmin,
      userId: userData.user.id,
    });
    const createdAt = new Date().toISOString();
    const contextSummary = buildContextSummary(context);
    const arrangementId = isUuid(context.arrangement.id) ? context.arrangement.id : null;

    const { data: row, error: insertError } = await supabaseAdmin
      .from('voice_turns')
      .insert({
        arrangement_id: arrangementId,
        assistant_text: assistantText,
        audio_expires_at: audioExpiresAt,
        audio_object_path: audioObjectPath,
        context_summary: contextSummary,
        instrument: context.instrument,
        raw_user_audio_retained: false,
        sass_level: context.sassLevel,
        user_id: userData.user.id,
        user_transcript: transcript,
      })
      .select('id')
      .single();

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 500);
    }

    return jsonResponse({
      assistantText,
      audioExpiresAt,
      audioUrl,
      conversationId: context.conversationId,
      createdAt,
      id: row.id,
      rawUserAudioRetained: false,
      source: 'ai',
      transcript,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Voice coach could not complete this turn.',
      },
      500,
    );
  }
});

async function transcribeVoice(openAiKey: string, audio: File) {
  const body = new FormData();
  body.append('file', audio, audio.name || 'oddio-voice-turn.m4a');
  body.append('model', Deno.env.get('ODDIO_STT_MODEL') || DEFAULT_STT_MODEL);
  body.append('response_format', 'json');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    body,
    headers: {
      Authorization: `Bearer ${openAiKey}`,
    },
    method: 'POST',
  });

  if (!response.ok) {
    await throwOpenAiFailure('Voice transcription', response);
  }

  const payload = await response.json();
  return String(payload.text ?? '').trim() || 'What should I practice next?';
}

async function generateCoachText(openAiKey: string, context: VoiceTurnContext, transcript: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    body: JSON.stringify({
      max_tokens: 160,
      messages: [
        {
          content: buildVoiceSystemPrompt(context),
          role: 'system',
        },
        {
          content: buildVoiceUserPrompt(context, transcript),
          role: 'user',
        },
      ],
      model: Deno.env.get('ODDIO_LLM_MODEL') || DEFAULT_LLM_MODEL,
      temperature: 0.75,
    }),
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    await throwOpenAiFailure('Coach response generation', response);
  }

  const payload = await response.json();
  return String(payload.choices?.[0]?.message?.content ?? '');
}

async function synthesizeVoice(openAiKey: string, assistantText: string) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    body: JSON.stringify({
      input: assistantText,
      instructions: 'Speak like a witty music coach: quick, playful, clear, and corrective.',
      model: Deno.env.get('ODDIO_TTS_MODEL') || DEFAULT_TTS_MODEL,
      response_format: 'mp3',
      voice: Deno.env.get('ODDIO_TTS_VOICE') || DEFAULT_TTS_VOICE,
    }),
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    await throwOpenAiFailure('Voice synthesis', response);
  }

  return new Uint8Array(await response.arrayBuffer());
}

async function throwOpenAiFailure(stage: string, response: Response): Promise<never> {
  const providerBody = await response.text();
  console.error(`${stage} failed`, {
    body: providerBody,
    status: response.status,
  });

  throw new Error(`${stage} failed. Please try another voice turn in a moment.`);
}

async function storeReplyAudio({
  bytes,
  supabaseAdmin,
  userId,
}: {
  bytes: Uint8Array;
  supabaseAdmin: ReturnType<typeof createClient>;
  userId: string;
}) {
  const audioObjectPath = `${userId}/${crypto.randomUUID()}.mp3`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from('voice-replies')
    .upload(audioObjectPath, bytes, {
      contentType: 'audio/mpeg',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const signedSeconds = 10 * 60;
  const { data, error } = await supabaseAdmin.storage
    .from('voice-replies')
    .createSignedUrl(audioObjectPath, signedSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'Could not create voice reply URL.');
  }

  return {
    audioExpiresAt: new Date(Date.now() + signedSeconds * 1000).toISOString(),
    audioObjectPath,
    audioUrl: data.signedUrl,
  };
}

function createSupabaseAdminClient() {
  const secretKeysRaw = Deno.env.get('SUPABASE_SECRET_KEYS');
  const secretKeys = secretKeysRaw ? JSON.parse(secretKeysRaw) : {};
  const secretKey =
    secretKeys.default ??
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SECRET_KEY');

  if (!secretKey) {
    throw new Error('Supabase secret key is not available to voice-turn.');
  }

  return createClient(Deno.env.get('SUPABASE_URL')!, secretKey);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    status,
  });
}
