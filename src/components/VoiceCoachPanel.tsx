import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { VoiceConversationTurn, VoiceTurnStatus } from '../types/music';

type VoiceCoachPanelProps = {
  disabled?: boolean;
  errorMessage: string | null;
  lastTurn: VoiceConversationTurn | null;
  mockVoiceEnabled: boolean;
  muted: boolean;
  onFinish: () => void;
  onMuteToggle: () => void;
  onReplay: () => void;
  onStart: () => void;
  onStop: () => void;
  practiceRecording?: boolean;
  status: VoiceTurnStatus;
};

const statusCopy: Record<VoiceTurnStatus, string> = {
  error: 'Needs a retry',
  idle: 'Ready',
  recording: 'Listening',
  speaking: 'Speaking',
  thinking: 'Thinking',
  uploading: 'Sending',
};

export function VoiceCoachPanel({
  disabled = false,
  errorMessage,
  lastTurn,
  mockVoiceEnabled,
  muted,
  onFinish,
  onMuteToggle,
  onReplay,
  onStart,
  onStop,
  practiceRecording = false,
  status,
}: VoiceCoachPanelProps) {
  const recording = status === 'recording';
  const busy = status === 'uploading' || status === 'thinking';
  const speaking = status === 'speaking';
  const blocked = disabled || practiceRecording || busy || speaking;
  const talkLabel = recording ? 'Send voice' : 'Ask coach';
  const subtitle = practiceRecording
    ? 'Practice mic is busy'
    : mockVoiceEnabled
      ? 'Mock voice lane'
      : 'AI voice lane';

  return (
    <View style={styles.panel} testID="voice-coach-panel">
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Voice Coach</Text>
          <Text style={styles.meta} testID="voice-status-label">
            {subtitle} / {statusCopy[status]}
          </Text>
        </View>
        <View style={[styles.statusPill, recording && styles.statusPillLive]}>
          <Ionicons
            color={recording ? '#7A2E1E' : '#0D5B4D'}
            name={recording ? 'radio' : 'sparkles-outline'}
            size={14}
          />
          <Text style={[styles.statusText, recording && styles.statusTextLive]}>
            {recording ? 'On air' : 'Voice'}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          accessibilityState={{ disabled: blocked }}
          disabled={blocked}
          onPress={recording ? onFinish : onStart}
          style={({ pressed }) => [
            styles.talkButton,
            recording && styles.talkButtonRecording,
            blocked && styles.disabledButton,
            pressed && styles.pressed,
          ]}
          testID="voice-talk-button"
        >
          <Ionicons color="#F7F4EA" name={recording ? 'send' : 'mic'} size={18} />
          <Text style={styles.talkButtonText}>{talkLabel}</Text>
        </Pressable>

        <Pressable
          onPress={speaking || recording ? onStop : onMuteToggle}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          testID={speaking || recording ? 'voice-stop-button' : 'voice-mute-toggle'}
        >
          <Ionicons
            color="#18201C"
            name={speaking || recording ? 'stop' : muted ? 'volume-mute' : 'volume-high'}
            size={18}
          />
        </Pressable>

        <Pressable
          accessibilityState={{ disabled: !lastTurn }}
          disabled={!lastTurn}
          onPress={onReplay}
          style={({ pressed }) => [
            styles.iconButton,
            !lastTurn && styles.disabledLightButton,
            pressed && styles.pressed,
          ]}
          testID="voice-replay-button"
        >
          <Ionicons color="#18201C" name="refresh" size={18} />
        </Pressable>
      </View>

      <View style={styles.disclosure} testID="voice-disclosure">
        <Ionicons color="#6F5A17" name="information-circle-outline" size={16} />
        <Text style={styles.disclosureText}>AI-generated voice. Raw voice is not stored by default.</Text>
      </View>

      {lastTurn ? (
        <View style={styles.turnCard}>
          <Text style={styles.turnLabel}>You</Text>
          <Text style={styles.transcript} testID="voice-transcript">
            {lastTurn.transcript}
          </Text>
          <Text style={styles.turnLabel}>Oddio</Text>
          <Text style={styles.answer} testID="voice-assistant-text">
            {lastTurn.assistantText}
          </Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorRow} testID="voice-error">
          <Ionicons color="#7A2E1E" name="alert-circle-outline" size={16} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  answer: {
    color: '#18201C',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21,
  },
  disabledButton: {
    backgroundColor: '#87918B',
  },
  disabledLightButton: {
    opacity: 0.42,
  },
  disclosure: {
    alignItems: 'center',
    backgroundColor: '#F8EEC9',
    borderColor: '#E4CE81',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  disclosureText: {
    color: '#6F5A17',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  errorRow: {
    alignItems: 'flex-start',
    backgroundColor: '#F8E2D8',
    borderColor: '#E7B39B',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  errorText: {
    color: '#7A2E1E',
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#F7F4EA',
    borderColor: '#E1D8C4',
    borderRadius: 8,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  meta: {
    color: '#68706B',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D8CFBB',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  pressed: {
    opacity: 0.74,
    transform: [{ translateY: 1 }],
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: '#E8F2EE',
    borderColor: '#B7D5C9',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusPillLive: {
    backgroundColor: '#F8E2D8',
    borderColor: '#E7B39B',
  },
  statusText: {
    color: '#0D5B4D',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  statusTextLive: {
    color: '#7A2E1E',
  },
  talkButton: {
    alignItems: 'center',
    backgroundColor: '#2E7D6E',
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
  },
  talkButtonRecording: {
    backgroundColor: '#C84C31',
  },
  talkButtonText: {
    color: '#F7F4EA',
    fontSize: 14,
    fontWeight: '900',
  },
  title: {
    color: '#18201C',
    fontSize: 17,
    fontWeight: '900',
  },
  transcript: {
    color: '#4E5851',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  turnCard: {
    backgroundColor: '#F4F0E5',
    borderColor: '#E5D8BE',
    borderRadius: 8,
    borderWidth: 1,
    gap: 7,
    padding: 12,
  },
  turnLabel: {
    color: '#68706B',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
