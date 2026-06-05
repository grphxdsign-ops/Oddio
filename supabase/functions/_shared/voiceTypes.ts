export type VoiceInstrument = 'guitar' | 'piano';

export type VoiceSassLevel = 'light' | 'balanced' | 'savage';

export type VoiceInputMode = 'mic' | 'midi';

export type VoiceLicenseStatus =
  | 'licensed'
  | 'public-domain'
  | 'reference-only'
  | 'user-owned'
  | 'unverified';

export type VoiceTurnStatus =
  | 'idle'
  | 'recording'
  | 'uploading'
  | 'thinking'
  | 'speaking'
  | 'error';

export type VoiceTurnContext = {
  conversationId: string;
  learner: {
    displayName: string;
    id: string;
    practiceStreak: number;
    targetLevel: string;
  };
  arrangement: {
    artist: string;
    bpm: number;
    id: string;
    instrument: VoiceInstrument;
    key: string;
    licenseStatus: VoiceLicenseStatus;
    referenceOnly: boolean;
    sourceName: string;
    title: string;
  };
  instrument: VoiceInstrument;
  sassLevel: VoiceSassLevel;
  activeMeasure: number;
  currentAttempt: {
    affectedMeasures: number[];
    confidence: number;
    inputType: VoiceInputMode;
    missedNotes: string[];
    pitchScore: number;
    rawAudioRetainedLocally: boolean;
    recommendedDrills: string[];
    rhythmScore: number;
    timingOffsets: number[];
    wrongNotes: string[];
  } | null;
  recentProgress: Array<{
    affectedMeasures: number[];
    confidence: number;
    createdAt: string;
    inputType: VoiceInputMode;
    pitchScore: number;
    recommendedDrills: string[];
    rhythmScore: number;
  }>;
};

export type VoiceTurnResponse = {
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

export type VoiceConversationTurn = VoiceTurnResponse;
