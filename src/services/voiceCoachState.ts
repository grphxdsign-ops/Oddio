import type { VoiceTurnStatus } from '../types/music';

export type VoiceTurnEvent =
  | 'start_recording'
  | 'audio_captured'
  | 'request_sent'
  | 'reply_ready'
  | 'playback_started'
  | 'playback_finished'
  | 'fail'
  | 'reset';

const transitions: Record<VoiceTurnStatus, Partial<Record<VoiceTurnEvent, VoiceTurnStatus>>> = {
  idle: {
    start_recording: 'recording',
    fail: 'error',
  },
  recording: {
    audio_captured: 'uploading',
    fail: 'error',
    reset: 'idle',
  },
  uploading: {
    request_sent: 'thinking',
    fail: 'error',
    reset: 'idle',
  },
  thinking: {
    reply_ready: 'idle',
    playback_started: 'speaking',
    fail: 'error',
    reset: 'idle',
  },
  speaking: {
    playback_finished: 'idle',
    fail: 'error',
    reset: 'idle',
  },
  error: {
    reset: 'idle',
    start_recording: 'recording',
  },
};

export function nextVoiceTurnStatus(status: VoiceTurnStatus, event: VoiceTurnEvent) {
  return transitions[status][event] ?? status;
}
