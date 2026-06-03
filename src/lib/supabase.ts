import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Arrangement, InputMode, Instrument, SassLevel } from '../types/music';

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
        Row: Arrangement;
        Insert: Arrangement;
        Update: Partial<Arrangement>;
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
