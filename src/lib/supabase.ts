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
      performance_attempts: {
        Row: {
          id: string;
          user_id: string;
          arrangement_id: string;
          instrument: Instrument;
          input_type: InputMode;
          attempt_summary: Record<string, unknown>;
          raw_audio_retained_locally: boolean;
          created_at: string;
        };
        Insert: Database['public']['Tables']['performance_attempts']['Row'];
        Update: Partial<Database['public']['Tables']['performance_attempts']['Insert']>;
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
