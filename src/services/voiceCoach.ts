import { ensureAnonymousSession, isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  Arrangement,
  InputMode,
  Instrument,
  LearnerProfile,
  PerformanceAttempt,
  SassLevel,
  VoiceTurnContext,
  VoiceTurnResponse,
} from '../types/music';

type ExpoEnv = {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

type BuildVoiceContextArgs = {
  activeMeasure: number;
  arrangement: Arrangement;
  attempt: PerformanceAttempt | null;
  conversationId: string;
  instrument: Instrument;
  learner: LearnerProfile;
  recentProgress: PerformanceAttempt[];
  sassLevel: SassLevel;
};

type SubmitVoiceTurnArgs = {
  context: VoiceTurnContext;
  inputMode: InputMode;
  recordingUri?: string | null;
};

const env = (globalThis as ExpoEnv).process?.env ?? {};

export function shouldUseMockVoice() {
  return env.EXPO_PUBLIC_ODDIO_VOICE_MOCK === '1' || !isSupabaseConfigured;
}

export function buildVoiceTurnContext({
  activeMeasure,
  arrangement,
  attempt,
  conversationId,
  instrument,
  learner,
  recentProgress,
  sassLevel,
}: BuildVoiceContextArgs): VoiceTurnContext {
  return {
    activeMeasure,
    arrangement: {
      artist: arrangement.artist,
      bpm: arrangement.bpm,
      id: arrangement.id,
      instrument: arrangement.instrument,
      key: arrangement.key,
      licenseStatus: arrangement.licenseStatus,
      referenceOnly: arrangement.referenceOnly,
      sourceName: arrangement.sourceName,
      title: arrangement.title,
    },
    conversationId,
    currentAttempt: attempt
      ? {
          affectedMeasures: attempt.affectedMeasures,
          confidence: attempt.confidence,
          inputType: attempt.inputType,
          missedNotes: attempt.missedNotes,
          pitchScore: attempt.pitchScore,
          rawAudioRetainedLocally: attempt.rawAudioRetainedLocally,
          recommendedDrills: attempt.recommendedDrills,
          rhythmScore: attempt.rhythmScore,
          timingOffsets: attempt.timingOffsets,
          wrongNotes: attempt.wrongNotes,
        }
      : null,
    instrument,
    learner,
    recentProgress: recentProgress.map((progress) => ({
      affectedMeasures: progress.affectedMeasures,
      confidence: progress.confidence,
      createdAt: progress.createdAt,
      inputType: progress.inputType,
      pitchScore: progress.pitchScore,
      recommendedDrills: progress.recommendedDrills,
      rhythmScore: progress.rhythmScore,
    })),
    sassLevel,
  };
}

export async function submitVoiceTurn({
  context,
  inputMode,
  recordingUri,
}: SubmitVoiceTurnArgs): Promise<VoiceTurnResponse> {
  if (shouldUseMockVoice()) {
    if (context.arrangement.title.toLowerCase().includes('voice mock fail')) {
      throw new Error('Mock voice backend failed on request.');
    }

    return buildMockVoiceTurn(context, inputMode);
  }

  if (!supabase) {
    throw new Error('Voice coach needs Supabase configuration or mock mode.');
  }

  if (!recordingUri) {
    throw new Error('Voice coach needs a recorded question before it can answer.');
  }

  await ensureAnonymousSession();

  const body = new FormData();
  body.append('context', JSON.stringify(context));
  body.append('audio', {
    name: 'oddio-voice-turn.m4a',
    type: 'audio/m4a',
    uri: recordingUri,
  } as unknown as Blob);

  const { data, error } = await supabase.functions.invoke<VoiceTurnResponse>('voice-turn', {
    body,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Voice coach returned no response.');
  }

  return data;
}

function buildMockVoiceTurn(context: VoiceTurnContext, inputMode: InputMode): VoiceTurnResponse {
  const attempt = context.currentAttempt;
  const measure = attempt?.affectedMeasures[0] ?? context.activeMeasure;
  const rhythmDrift = attempt
    ? Math.max(0, ...attempt.timingOffsets.map((offset) => Math.abs(offset)))
    : 0;
  const issue = attempt?.wrongNotes[0]
    ? `${attempt.wrongNotes[0]} crashed the party`
    : rhythmDrift > 60
      ? `measure ${measure} tried to outrun the metronome`
      : `measure ${measure} is asking for a cleaner entrance`;
  const drill = attempt?.recommendedDrills[0] ?? (context.instrument === 'guitar' ? 'slow loop' : 'hands-alone loop');
  const modeLabel = inputMode === 'mic' ? 'your mic pass' : 'the MIDI lane';

  return {
    assistantText: `${issue}. Use ${context.arrangement.sourceName} as the source, slow ${modeLabel} down, and run ${drill} for 30 seconds before the full phrase.`,
    audioExpiresAt: null,
    audioUrl: null,
    conversationId: context.conversationId,
    createdAt: new Date().toISOString(),
    id: `voice-mock-${Date.now()}`,
    rawUserAudioRetained: false,
    source: 'mock',
    transcript: 'Why did I miss that, and what should I practice next?',
  };
}
