export type Instrument = 'guitar' | 'piano';

export type ArrangementFormat =
  | 'alphatex'
  | 'external-reference'
  | 'guitar-pro'
  | 'hybrid-tab'
  | 'midi'
  | 'musicxml';

export type LicenseStatus =
  | 'licensed'
  | 'public-domain'
  | 'reference-only'
  | 'user-owned'
  | 'unverified';

export type Difficulty = 'starter' | 'easy' | 'medium' | 'stretch';

export type SassLevel = 'light' | 'balanced' | 'savage';

export type InputMode = 'mic' | 'midi';

export type TrackRole = 'melody' | 'rhythm' | 'left-hand' | 'right-hand' | 'chords';

export type DetectedNote = {
  midi: number;
  name: string;
  centsOff: number;
  onsetMs: number;
  durationMs: number;
  confidence: number;
};

export type ArrangementTrack = {
  id: string;
  name: string;
  role: TrackRole;
  muted: boolean;
  solo: boolean;
};

export type RightsMetadata = {
  owner: string;
  territory: string;
  permittedUse: string;
  reviewRequired: boolean;
  sourceUrl?: string;
  notes: string;
};

export type PracticeMeasure = {
  number: number;
  beatCount: number;
  technique: string;
  expectedNotes: string[];
  tab?: string[];
  sheet?: string[];
};

export type Arrangement = {
  id: string;
  title: string;
  artist: string;
  instrument: Instrument;
  format: ArrangementFormat;
  difficulty: Difficulty;
  bpm: number;
  key: string;
  source:
    | 'external-reference'
    | 'imslp-reference'
    | 'musicnotes-reference'
    | 'songsterr-reference'
    | 'user-upload';
  sourceName: string;
  licenseStatus: LicenseStatus;
  rights: RightsMetadata;
  tracks: ArrangementTrack[];
  measures: PracticeMeasure[];
  externalUrl: string;
  referenceOnly: boolean;
  fileUri?: string;
  createdAt: string;
};

export type PerformanceAttempt = {
  id: string;
  arrangementId: string;
  instrument: Instrument;
  inputType: InputMode;
  detectedNotes: DetectedNote[];
  timingOffsets: number[];
  missedNotes: string[];
  wrongNotes: string[];
  rhythmScore: number;
  pitchScore: number;
  confidence: number;
  affectedMeasures: number[];
  recommendedDrills: string[];
  rawAudioRetainedLocally: boolean;
  createdAt: string;
};

export type LearnerProfile = {
  id: string;
  displayName: string;
  targetLevel: string;
  practiceStreak: number;
};

export type TutorRequest = {
  learner: LearnerProfile;
  arrangement: Arrangement;
  attempt: PerformanceAttempt;
  instrument: Instrument;
  sassLevel: SassLevel;
  activeMeasure: number;
  recentProgress: PerformanceAttempt[];
};

export type TutorResponse = {
  jab: string;
  advice: string;
  nextAction: string;
  drillPrompt: string;
  toneSafety: 'supportive-tease';
};
