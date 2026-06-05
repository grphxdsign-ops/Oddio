import {
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  buildVoiceTurnContext,
  shouldUseMockVoice,
  submitVoiceTurn,
} from '../services/voiceCoach';
import { nextVoiceTurnStatus } from '../services/voiceCoachState';
import type {
  Arrangement,
  InputMode,
  Instrument,
  LearnerProfile,
  PerformanceAttempt,
  SassLevel,
  VoiceConversationTurn,
  VoiceTurnStatus,
} from '../types/music';

type UseVoiceCoachArgs = {
  activeMeasure: number;
  arrangement: Arrangement | null;
  attempt: PerformanceAttempt | null;
  inputMode: InputMode;
  instrument: Instrument;
  learner: LearnerProfile;
  micReady: boolean;
  onBeforeVoiceRecording?: () => Promise<void>;
  recentProgress: PerformanceAttempt[];
  sassLevel: SassLevel;
};

const MAX_VOICE_SECONDS = 20;

export function useVoiceCoach({
  activeMeasure,
  arrangement,
  attempt,
  inputMode,
  instrument,
  learner,
  micReady,
  onBeforeVoiceRecording,
  recentProgress,
  sassLevel,
}: UseVoiceCoachArgs) {
  const [conversationId] = useState(() => `voice-${Date.now()}`);
  const [status, setStatus] = useState<VoiceTurnStatus>('idle');
  const [lastTurn, setLastTurn] = useState<VoiceConversationTurn | null>(null);
  const [muted, setMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const voiceTurnBusyRef = useRef(false);

  const voiceRecorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const voiceRecorderState = useAudioRecorderState(voiceRecorder);
  const voicePlayer = useAudioPlayer(null, { downloadFirst: true, updateInterval: 250 });
  const voicePlayerStatus = useAudioPlayerStatus(voicePlayer);
  const mockVoiceEnabled = shouldUseMockVoice();

  const context = useMemo(() => {
    if (!arrangement) {
      return null;
    }

    return buildVoiceTurnContext({
      activeMeasure,
      arrangement,
      attempt,
      conversationId,
      instrument,
      learner,
      recentProgress,
      sassLevel,
    });
  }, [
    activeMeasure,
    arrangement,
    attempt,
    conversationId,
    instrument,
    learner,
    recentProgress,
    sassLevel,
  ]);

  const playTurn = useCallback(
    async (turn: VoiceConversationTurn) => {
      if (muted || !turn.audioUrl) {
        setStatus(nextVoiceTurnStatus('thinking', 'reply_ready'));
        return;
      }

      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        });
        voicePlayer.replace({ name: 'OddioAI coach', uri: turn.audioUrl });
        voicePlayer.volume = muted ? 0 : 1;
        voicePlayer.play();
        setStatus(nextVoiceTurnStatus('thinking', 'playback_started'));
      } catch {
        setErrorMessage('Voice playback failed, but the coach text is ready below.');
        setStatus(nextVoiceTurnStatus('thinking', 'fail'));
      }
    },
    [muted, voicePlayer],
  );

  const startVoiceTurn = useCallback(async () => {
    if (
      !context ||
      voiceTurnBusyRef.current ||
      status === 'recording' ||
      status === 'uploading' ||
      status === 'thinking' ||
      status === 'speaking'
    ) {
      return;
    }

    voiceTurnBusyRef.current = true;
    setErrorMessage(null);

    try {
      await onBeforeVoiceRecording?.();

      if (!mockVoiceEnabled && !micReady) {
        throw new Error('Microphone unavailable for voice chat.');
      }

      if (!mockVoiceEnabled) {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        await voiceRecorder.prepareToRecordAsync();
        await voiceRecorder.record();
      }

      setStatus(nextVoiceTurnStatus('idle', 'start_recording'));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Voice recording could not start.');
      setStatus(nextVoiceTurnStatus(status, 'fail'));
    }
  }, [
    context,
    micReady,
    mockVoiceEnabled,
    onBeforeVoiceRecording,
    status,
    voiceRecorder,
  ]);

  useEffect(() => {
    if (status === 'idle' || status === 'error') {
      voiceTurnBusyRef.current = false;
    }
  }, [status]);

  const finishVoiceTurn = useCallback(async () => {
    if (!context || status !== 'recording') {
      return;
    }

    let failureStatus: VoiceTurnStatus = 'recording';

    try {
      let recordingUri: string | null = null;
      failureStatus = nextVoiceTurnStatus('recording', 'audio_captured');
      setStatus(failureStatus);

      if (!mockVoiceEnabled) {
        await voiceRecorder.stop();
        recordingUri = voiceRecorder.uri;
      }

      failureStatus = nextVoiceTurnStatus('uploading', 'request_sent');
      setStatus(failureStatus);
      const turn = await submitVoiceTurn({
        context,
        inputMode,
        recordingUri,
      });

      setLastTurn(turn);
      await playTurn(turn);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Oddio voice coach missed the cue.');
      setStatus(nextVoiceTurnStatus(failureStatus, 'fail'));
    }
  }, [context, inputMode, mockVoiceEnabled, playTurn, status, voiceRecorder]);

  const stopVoice = useCallback(async () => {
    if (status === 'recording') {
      if (voiceRecorderState.isRecording) {
        await voiceRecorder.stop();
      }
      setStatus(nextVoiceTurnStatus('recording', 'reset'));
      return;
    }

    if (status === 'speaking') {
      voicePlayer.pause();
      await voicePlayer.seekTo(0);
      setStatus(nextVoiceTurnStatus('speaking', 'reset'));
    }
  }, [status, voicePlayer, voiceRecorder, voiceRecorderState.isRecording]);

  const replayVoice = useCallback(async () => {
    setErrorMessage(null);

    if (!lastTurn) {
      return;
    }

    if (!lastTurn.audioUrl) {
      setErrorMessage('Mock voice mode has text only. Real audio plays after Supabase and OpenAI are configured.');
      return;
    }

    await playTurn(lastTurn);
  }, [lastTurn, playTurn]);

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const nextMuted = !current;
      voicePlayer.volume = nextMuted ? 0 : 1;
      return nextMuted;
    });
  }, [voicePlayer]);

  useEffect(() => {
    if (status !== 'recording') {
      return undefined;
    }

    const timer = setTimeout(() => {
      finishVoiceTurn().catch(() => {
        setErrorMessage('Voice recording could not be sent.');
        setStatus(nextVoiceTurnStatus('recording', 'fail'));
      });
    }, MAX_VOICE_SECONDS * 1000);

    return () => clearTimeout(timer);
  }, [finishVoiceTurn, status]);

  useEffect(() => {
    if (status === 'speaking' && voicePlayerStatus.didJustFinish) {
      setStatus(nextVoiceTurnStatus('speaking', 'playback_finished'));
    }
  }, [status, voicePlayerStatus.didJustFinish]);

  return {
    errorMessage,
    finishVoiceTurn,
    lastTurn,
    mockVoiceEnabled,
    muted,
    replayVoice,
    startVoiceTurn,
    status,
    stopVoice,
    toggleMute,
    voicePlayerStatus,
    voiceRecorderState,
  };
}
