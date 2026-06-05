export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
export const DEFAULT_STT_MODEL = 'gpt-4o-mini-transcribe';
export const DEFAULT_LLM_MODEL = 'gpt-4o-mini';
export const DEFAULT_TTS_MODEL = 'gpt-4o-mini-tts';
export const DEFAULT_TTS_VOICE = 'coral';

export type VoiceTurnFunctionContext = {
  activeMeasure: number;
  arrangement: {
    artist: string;
    bpm: number;
    id: string;
    instrument: 'guitar' | 'piano';
    key: string;
    licenseStatus: string;
    referenceOnly: boolean;
    sourceName: string;
    title: string;
  };
  conversationId: string;
  currentAttempt: {
    affectedMeasures: number[];
    confidence: number;
    inputType: 'mic' | 'midi';
    missedNotes: string[];
    pitchScore: number;
    rawAudioRetainedLocally: boolean;
    recommendedDrills: string[];
    rhythmScore: number;
    timingOffsets: number[];
    wrongNotes: string[];
  } | null;
  instrument: 'guitar' | 'piano';
  learner: {
    displayName: string;
    id: string;
    practiceStreak: number;
    targetLevel: string;
  };
  recentProgress: Array<{
    affectedMeasures: number[];
    confidence: number;
    createdAt: string;
    inputType: 'mic' | 'midi';
    pitchScore: number;
    recommendedDrills: string[];
    rhythmScore: number;
  }>;
  sassLevel: 'light' | 'balanced' | 'savage';
};

export type VoiceTurnFunctionResponse = {
  id: string;
  conversationId: string;
  transcript: string;
  assistantText: string;
  audioUrl: string | null;
  audioExpiresAt: string | null;
  rawUserAudioRetained: false;
  source: 'mock' | 'ai';
  createdAt: string;
};

type ValidationResult =
  | {
      context: VoiceTurnFunctionContext;
      ok: true;
    }
  | {
      message: string;
      ok: false;
      status: number;
    };

export function validateVoiceTurnRequest(args: {
  authorization: string | null;
  audioSize: number | null;
  contextRaw: string | null;
}): ValidationResult {
  if (!args.authorization?.startsWith('Bearer ')) {
    return { message: 'Voice turns require an authenticated Supabase session.', ok: false, status: 401 };
  }

  if (args.audioSize === null) {
    return { message: 'Voice turns require an audio file.', ok: false, status: 400 };
  }

  if (args.audioSize > MAX_AUDIO_BYTES) {
    return { message: 'Voice question is too large. Keep it under 8 MB.', ok: false, status: 413 };
  }

  if (!args.contextRaw) {
    return { message: 'Voice turns require practice context.', ok: false, status: 400 };
  }

  try {
    const context = JSON.parse(args.contextRaw) as VoiceTurnFunctionContext;
    if (!context.arrangement?.id || !context.instrument || !context.sassLevel) {
      return { message: 'Voice turn context is missing required practice fields.', ok: false, status: 400 };
    }

    return { context, ok: true };
  } catch {
    return { message: 'Voice turn context must be valid JSON.', ok: false, status: 400 };
  }
}

export function buildContextSummary(context: VoiceTurnFunctionContext) {
  return {
    activeMeasure: context.activeMeasure,
    arrangement: {
      artist: context.arrangement.artist,
      bpm: context.arrangement.bpm,
      id: context.arrangement.id,
      sourceName: context.arrangement.sourceName,
      title: context.arrangement.title,
    },
    attempt: context.currentAttempt
      ? {
          affectedMeasures: context.currentAttempt.affectedMeasures,
          confidence: context.currentAttempt.confidence,
          missedNotes: context.currentAttempt.missedNotes,
          pitchScore: context.currentAttempt.pitchScore,
          recommendedDrills: context.currentAttempt.recommendedDrills,
          rhythmScore: context.currentAttempt.rhythmScore,
          timingOffsets: context.currentAttempt.timingOffsets,
          wrongNotes: context.currentAttempt.wrongNotes,
        }
      : null,
    instrument: context.instrument,
    rawPracticeAudioRetainedLocally: context.currentAttempt?.rawAudioRetainedLocally ?? false,
    sassLevel: context.sassLevel,
  };
}

export function buildVoiceSystemPrompt(context: VoiceTurnFunctionContext) {
  return [
    'You are OddioAI, a funny but useful guitar and piano practice coach.',
    'Answer as spoken mobile audio, 8 to 18 seconds.',
    'Use one behavior-based joke, one concrete correction, and one next action.',
    'Never insult identity, ability, body, age, or anything personal. Tease only the musical behavior.',
    'Do not quote, recreate, or print copyrighted notation or tablature.',
    `Sass level: ${context.sassLevel}. Instrument: ${context.instrument}.`,
  ].join(' ');
}

export function buildVoiceUserPrompt(context: VoiceTurnFunctionContext, transcript: string) {
  const attempt = context.currentAttempt;
  const missed = attempt?.missedNotes.join(', ') || 'none flagged';
  const wrong = attempt?.wrongNotes.join(', ') || 'none flagged';
  const measure = attempt?.affectedMeasures[0] ?? context.activeMeasure;
  const drill = attempt?.recommendedDrills[0] ?? 'slow loop';

  return [
    `Learner asked: "${transcript}"`,
    `Song reference: ${context.arrangement.title} by ${context.arrangement.artist}, source ${context.arrangement.sourceName}.`,
    `Current measure: ${measure}. Missed notes: ${missed}. Wrong notes: ${wrong}. Suggested drill: ${drill}.`,
    'Keep the source site as the notation source. Oddio only coaches the performance.',
  ].join('\n');
}

export function normalizeAssistantText(rawText: string, context: VoiceTurnFunctionContext) {
  const measure = context.currentAttempt?.affectedMeasures[0] ?? context.activeMeasure;
  const drill = context.currentAttempt?.recommendedDrills[0] ?? 'slow loop';
  const trimmed = rawText.replace(/\s+/g, ' ').trim();
  const fallback =
    `Measure ${measure} got a little dramatic. Correct the timing first, then run ${drill} for 30 seconds before the full phrase.`;
  const shortText = (trimmed || fallback).split(' ').slice(0, 58).join(' ');
  const hasAction = /\b(loop|practice|run|count|slow|replay|open|use|repeat|try)\b/i.test(shortText);
  const hasCorrection = /\b(measure|beat|timing|rhythm|pitch|note|chord|tempo|hand|fret|key)\b/i.test(shortText);
  let nextText = shortText;

  if (!hasCorrection) {
    nextText = `Measure ${measure} needs the correction first. ${nextText}`;
  }

  if (!hasAction) {
    nextText = `${nextText} Next action: run ${drill} for 30 seconds.`;
  }

  return nextText;
}

export function buildMockEdgeVoiceTurn(
  context: VoiceTurnFunctionContext,
  transcript = 'Why did I miss that?',
): VoiceTurnFunctionResponse {
  const assistantText = normalizeAssistantText(
    `Measure ${context.activeMeasure} tried to freeload off confidence. Correct the rhythm, then run ${
      context.currentAttempt?.recommendedDrills[0] ?? 'a slow loop'
    } before the full phrase.`,
    context,
  );

  return {
    assistantText,
    audioExpiresAt: null,
    audioUrl: null,
    conversationId: context.conversationId,
    createdAt: new Date().toISOString(),
    id: `voice-edge-mock-${Date.now()}`,
    rawUserAudioRetained: false,
    source: 'mock',
    transcript,
  };
}
