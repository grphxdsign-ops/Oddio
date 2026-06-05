import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type {
  ArrangementFormat,
  Difficulty,
  InputMode,
  Instrument,
  LicenseStatus,
  SassLevel,
} from '../types/music';

type ArrangementRow = {
  id: string;
  owner_id: string | null;
  title: string;
  artist: string;
  instrument: Instrument;
  format: ArrangementFormat;
  difficulty: Difficulty;
  bpm: number;
  song_key: string;
  source: string;
  source_name: string;
  license_status: LicenseStatus;
  external_url: string;
  reference_only: boolean;
  rights_metadata: Record<string, unknown>;
  tracks: Record<string, unknown>[];
  measures: Record<string, unknown>[];
  file_path: string | null;
  created_at: string;
};

type ArrangementInsert = Omit<ArrangementRow, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

type VoiceTurnRow = {
  id: string;
  user_id: string;
  arrangement_id: string | null;
  instrument: Instrument;
  sass_level: SassLevel;
  user_transcript: string;
  assistant_text: string;
  context_summary: Record<string, unknown>;
  audio_object_path: string | null;
  audio_expires_at: string | null;
  raw_user_audio_retained: boolean;
  created_at: string;
};

type VoiceTurnInsert = Omit<VoiceTurnRow, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

type UploadRow = {
  id: string;
  user_id: string;
  arrangement_id: string | null;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  rights_confirmed: boolean;
  created_at: string;
};

type UploadInsert = Omit<UploadRow, 'id' | 'created_at' | 'rights_confirmed'> & {
  id?: string;
  rights_confirmed?: boolean;
  created_at?: string;
};

type PerformanceAttemptRow = {
  id: string;
  user_id: string;
  arrangement_id: string | null;
  instrument: Instrument;
  input_type: InputMode;
  attempt_summary: Record<string, unknown>;
  raw_audio_retained_locally: boolean;
  created_at: string;
};

type PerformanceAttemptInsert = Omit<
  PerformanceAttemptRow,
  'id' | 'created_at' | 'raw_audio_retained_locally'
> & {
  id?: string;
  raw_audio_retained_locally?: boolean;
  created_at?: string;
};

type ProgressEventRow = {
  id: string;
  user_id: string;
  arrangement_id: string | null;
  event_type: string;
  event_payload: Record<string, unknown>;
  created_at: string;
};

type ProgressEventInsert = Omit<ProgressEventRow, 'id' | 'created_at' | 'event_payload'> & {
  id?: string;
  event_payload?: Record<string, unknown>;
  created_at?: string;
};

type ExpoEnv = {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

const env = (globalThis as ExpoEnv).process?.env ?? {};
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          target_level: string;
          sass_level: SassLevel;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          target_level?: string;
          sass_level?: SassLevel;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      arrangements: {
        Row: ArrangementRow;
        Insert: ArrangementInsert;
        Update: Partial<ArrangementInsert>;
      };
      uploads: {
        Row: UploadRow;
        Insert: UploadInsert;
        Update: Partial<UploadInsert>;
      };
      performance_attempts: {
        Row: PerformanceAttemptRow;
        Insert: PerformanceAttemptInsert;
        Update: Partial<PerformanceAttemptInsert>;
      };
      voice_turns: {
        Row: VoiceTurnRow;
        Insert: VoiceTurnInsert;
        Update: Partial<VoiceTurnInsert>;
      };
      progress_events: {
        Row: ProgressEventRow;
        Insert: ProgressEventInsert;
        Update: Partial<ProgressEventInsert>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: false,
          persistSession: true,
          storage: AsyncStorage,
        },
      })
    : null;

export const isSupabaseConfigured = Boolean(supabase);

export async function ensureAnonymousSession() {
  if (!supabase) {
    return null;
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }

  if (sessionData.session) {
    return sessionData.session;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw error;
  }

  return data.session;
}
