import Ionicons from '@expo/vector-icons/Ionicons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ArrangementCard } from './src/components/ArrangementCard';
import { SegmentedControl } from './src/components/SegmentedControl';
import { SourceReferencePanel } from './src/components/SourceReferencePanel';
import {
  buildExternalReferenceSearches,
  searchArrangements,
} from './src/services/contentProvider';
import { simulatePerformanceAttempt } from './src/services/practiceAnalyzer';
import { buildTutorRequest, buildTutorResponse } from './src/services/tutorEngine';
import { getNativeAudioSessionStatus } from './src/native/OddioAudioSession';
import type {
  Arrangement,
  InputMode,
  Instrument,
  PerformanceAttempt,
  SassLevel,
  TutorResponse,
} from './src/types/music';

const learnerProfile = {
  id: 'demo-learner',
  displayName: 'Ricki',
  targetLevel: 'beginner-intermediate',
  practiceStreak: 4,
};

const instrumentOptions: { label: string; value: Instrument; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Guitar', value: 'guitar', icon: 'radio-outline' },
  { label: 'Piano', value: 'piano', icon: 'musical-notes-outline' },
];

const sassOptions: { label: string; value: SassLevel }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Balanced', value: 'balanced' },
  { label: 'Savage', value: 'savage' },
];

const inputOptions: { label: string; value: InputMode; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Mic', value: 'mic', icon: 'mic-outline' },
  { label: 'MIDI', value: 'midi', icon: 'hardware-chip-outline' },
];

export default function App() {
  const [instrument, setInstrument] = useState<Instrument>('guitar');
  const [sassLevel, setSassLevel] = useState<SassLevel>('balanced');
  const [inputMode, setInputMode] = useState<InputMode>('mic');
  const [query, setQuery] = useState('');
  const [selectedArrangement, setSelectedArrangement] = useState<Arrangement | null>(null);
  const [tempo, setTempo] = useState(82);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [countInEnabled, setCountInEnabled] = useState(true);
  const [activeMeasure, setActiveMeasure] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [runIndex, setRunIndex] = useState(0);
  const [lastAttempt, setLastAttempt] = useState<PerformanceAttempt | null>(null);
  const [coachResponse, setCoachResponse] = useState<TutorResponse | null>(null);
  const [recentProgress, setRecentProgress] = useState<PerformanceAttempt[]>([]);
  const [micReady, setMicReady] = useState(false);
  const [nativeAudioStatus, setNativeAudioStatus] = useState('JS fallback');

  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  useEffect(() => {
    let isMounted = true;

    const prepareMic = async () => {
      try {
        const nativeStatus = await getNativeAudioSessionStatus();
        if (isMounted) {
          setNativeAudioStatus(nativeStatus.label);
        }

        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!isMounted) {
          return;
        }

        setMicReady(Boolean(status.granted));
        if (status.granted) {
          await setAudioModeAsync({
            allowsRecording: true,
            playsInSilentMode: true,
          });
        }
      } catch {
        if (isMounted) {
          setMicReady(false);
        }
      }
    };

    prepareMic();

    return () => {
      isMounted = false;
    };
  }, []);

  const searchResults = useMemo(
    () => searchArrangements(query, instrument),
    [instrument, query],
  );

  const externalSearches = useMemo(() => {
    if (query.trim().length < 2 || searchResults.length > 0) {
      return [];
    }

    return buildExternalReferenceSearches(query, instrument);
  }, [instrument, query, searchResults.length]);

  const visibleResults = searchResults.length > 0 ? searchResults : externalSearches;

  useEffect(() => {
    const firstPlayable = visibleResults[0] ?? null;
    const selectionStillVisible =
      selectedArrangement &&
      visibleResults.some((arrangement) => arrangement.id === selectedArrangement.id);

    if (!selectionStillVisible || selectedArrangement.instrument !== instrument) {
      setSelectedArrangement(firstPlayable);
      setActiveMeasure(1);
      setLastAttempt(null);
      setCoachResponse(null);
    }
  }, [instrument, selectedArrangement, visibleResults]);

  useEffect(() => {
    if (inputMode !== 'mic' && recorderState.isRecording) {
      recorder.stop().catch(() => {
        setMicReady(false);
      });
    }
  }, [inputMode, recorder, recorderState.isRecording]);

  useEffect(() => {
    if (!isPlaying || !selectedArrangement) {
      return;
    }

    const measureCount = selectedArrangement.measures.length;
    const timer = setInterval(() => {
      setActiveMeasure((currentMeasure) => {
        if (loopEnabled && lastAttempt?.affectedMeasures.length) {
          const loopMeasures = lastAttempt.affectedMeasures;
          const currentLoopIndex = loopMeasures.indexOf(currentMeasure);
          return currentLoopIndex >= 0
            ? loopMeasures[(currentLoopIndex + 1) % loopMeasures.length]
            : loopMeasures[0];
        }

        return currentMeasure >= measureCount ? 1 : currentMeasure + 1;
      });
    }, Math.max(420, (60000 / tempo) * 2));

    return () => clearInterval(timer);
  }, [isPlaying, lastAttempt, loopEnabled, selectedArrangement, tempo]);

  const runAnalysis = (modeOverride?: InputMode) => {
    if (!selectedArrangement) {
      return;
    }

    const nextRunIndex = runIndex + 1;
    const nextAttempt = simulatePerformanceAttempt({
      arrangement: selectedArrangement,
      inputMode: modeOverride ?? inputMode,
      runIndex: nextRunIndex,
      tempo,
    });
    const tutorRequest = buildTutorRequest({
      learner: learnerProfile,
      arrangement: selectedArrangement,
      attempt: nextAttempt,
      instrument,
      sassLevel,
      activeMeasure,
      recentProgress,
    });
    const nextCoachResponse = buildTutorResponse(tutorRequest);

    setRunIndex(nextRunIndex);
    setLastAttempt(nextAttempt);
    setCoachResponse(nextCoachResponse);
    setRecentProgress((progress) => [nextAttempt, ...progress].slice(0, 4));
    setActiveMeasure(nextAttempt.affectedMeasures[0] ?? activeMeasure);
  };

  const handleRecordToggle = async () => {
    if (!selectedArrangement) {
      return;
    }

    if (!micReady) {
      Alert.alert('Microphone unavailable', 'OddioAI can still run a simulated pass from the MIDI lane.');
      return;
    }

    try {
      if (recorderState.isRecording) {
        await recorder.stop();
        runAnalysis('mic');
        return;
      }

      await recorder.prepareToRecordAsync();
      await recorder.record();
    } catch {
      Alert.alert('Recording issue', 'The practice pass could not start on this device.');
    }
  };

  const accuracy = lastAttempt
    ? Math.round((lastAttempt.pitchScore * 0.58 + lastAttempt.rhythmScore * 0.42) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.safeArea} testID="oddio-root">
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand} testID="brand-title">OddioAI</Text>
            <Text style={styles.headerMeta}>
              {instrument === 'guitar' ? 'Guitar lab' : 'Piano room'} / streak {learnerProfile.practiceStreak}
            </Text>
          </View>
          <View style={[styles.signalPill, micReady ? styles.signalReady : styles.signalWaiting]}>
            <Ionicons
              color={micReady ? '#0D5B4D' : '#9A4B28'}
              name={micReady ? 'radio-outline' : 'alert-circle-outline'}
              size={16}
            />
            <Text style={[styles.signalText, micReady ? styles.signalTextReady : styles.signalTextWaiting]}>
              {micReady ? 'Local listen' : 'Sim lane'}
            </Text>
          </View>
        </View>

        <View style={styles.searchPanel}>
          <View style={styles.searchInputWrap}>
            <Ionicons color="#5A615F" name="search-outline" size={18} />
            <TextInput
              autoCorrect={false}
              onChangeText={setQuery}
              placeholder="Search a song or source reference"
              placeholderTextColor="#7B817F"
              style={styles.searchInput}
              testID="song-search-input"
              value={query}
            />
          </View>
          <Pressable
            disabled={!selectedArrangement}
            onPress={() => selectedArrangement && Linking.openURL(selectedArrangement.externalUrl)}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            testID="open-source-shortcut"
          >
            <Ionicons color="#F7F4EA" name="open-outline" size={20} />
          </Pressable>
        </View>

        <SegmentedControl
          options={instrumentOptions}
          testIDPrefix="instrument"
          value={instrument}
          onChange={setInstrument}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.resultRail}>
          {visibleResults.map((arrangement) => (
            <ArrangementCard
              arrangement={arrangement}
              isSelected={selectedArrangement?.id === arrangement.id}
              key={arrangement.id}
              onPress={() => {
                setSelectedArrangement(arrangement);
                setActiveMeasure(1);
                setLastAttempt(null);
                setCoachResponse(null);
              }}
            />
          ))}
        </ScrollView>

        {selectedArrangement ? (
          <View style={styles.practiceSurface} testID="practice-surface">
            <View style={styles.practiceHeader}>
              <View style={styles.practiceTitleBlock}>
                <Text style={styles.practiceTitle} testID="selected-arrangement-title">
                  {selectedArrangement.title}
                </Text>
                <Text style={styles.practiceSubtitle}>
                  {selectedArrangement.sourceName} / {selectedArrangement.key} / {selectedArrangement.bpm} bpm
                </Text>
              </View>
              <View style={styles.rightsBadge}>
                <Text style={styles.rightsBadgeText} testID="license-status">
                  {selectedArrangement.licenseStatus}
                </Text>
              </View>
            </View>

            <SourceReferencePanel
              activeMeasure={activeMeasure}
              arrangement={selectedArrangement}
              tempo={tempo}
            />

            <View style={styles.transport}>
              <ControlButton
                icon={isPlaying ? 'pause' : 'play'}
                label={isPlaying ? 'Pause' : 'Play'}
                onPress={() => setIsPlaying((current) => !current)}
                primary
                testID="play-toggle"
              />
              <ControlButton
                icon="repeat"
                label={loopEnabled ? 'Loop' : 'Free'}
                onPress={() => setLoopEnabled((current) => !current)}
                testID="loop-toggle"
              />
              <ControlButton
                icon="timer-outline"
                label={countInEnabled ? 'Count' : 'Now'}
                onPress={() => setCountInEnabled((current) => !current)}
                testID="count-in-toggle"
              />
              <View style={styles.tempoStepper}>
                <Pressable
                  onPress={() => setTempo((current) => Math.max(42, current - 4))}
                  style={styles.tempoButton}
                  testID="tempo-down"
                >
                  <Ionicons color="#18201C" name="remove" size={16} />
                </Pressable>
                <Text style={styles.tempoText} testID="tempo-value">{tempo}</Text>
                <Pressable
                  onPress={() => setTempo((current) => Math.min(180, current + 4))}
                  style={styles.tempoButton}
                  testID="tempo-up"
                >
                  <Ionicons color="#18201C" name="add" size={16} />
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.listenGrid}>
          <View style={styles.listenPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Input</Text>
              <Text style={styles.panelMeta}>{inputMode === 'midi' ? 'tight timing' : 'room aware'}</Text>
            </View>
            <SegmentedControl
              compact
              options={inputOptions}
              testIDPrefix="input"
              value={inputMode}
              onChange={setInputMode}
            />
            <View style={styles.listenButtons}>
              <Pressable
                disabled={!selectedArrangement}
                onPress={inputMode === 'mic' ? handleRecordToggle : () => runAnalysis('midi')}
                style={({ pressed }) => [
                  styles.listenButton,
                  recorderState.isRecording && styles.recordingButton,
                  pressed && styles.pressed,
                ]}
                testID="run-practice-pass"
              >
                <Ionicons
                  color="#F7F4EA"
                  name={inputMode === 'mic' && recorderState.isRecording ? 'stop' : 'radio'}
                  size={18}
                />
                <Text style={styles.listenButtonText}>
                  {inputMode === 'mic' && recorderState.isRecording ? 'Stop pass' : 'Run pass'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.scorePanel}>
            <Text style={styles.scoreLabel}>Run score</Text>
            <Text style={styles.scoreNumber} testID="run-score">{lastAttempt ? accuracy : '--'}</Text>
            <View style={styles.scoreBars}>
              <ScoreBar label="Pitch" value={lastAttempt?.pitchScore ?? 0} color="#2E7D6E" />
              <ScoreBar label="Rhythm" value={lastAttempt?.rhythmScore ?? 0} color="#C84C31" />
            </View>
          </View>
        </View>

        <View style={styles.coachPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Coach</Text>
            <SegmentedControl
              compact
              options={sassOptions}
              testIDPrefix="sass"
              value={sassLevel}
              onChange={setSassLevel}
            />
          </View>

          <View style={styles.coachBubble}>
            <Text style={styles.coachJab} testID="coach-jab">
              {coachResponse?.jab ?? 'Play a pass. I am listening with judgment and a metronome.'}
            </Text>
            <Text style={styles.coachAdvice} testID="coach-advice">
              {coachResponse?.advice ??
                'Your first target is clean attack, even spacing, and no heroic tempo choices before breakfast.'}
            </Text>
            <View style={styles.nextAction}>
              <Ionicons color="#C84C31" name="navigate-circle-outline" size={18} />
              <Text style={styles.nextActionText}>
                {coachResponse?.nextAction ?? 'Start with one slow loop, then add speed only after two clean passes.'}
              </Text>
            </View>
          </View>

          {lastAttempt ? (
            <View style={styles.drillRow}>
              {lastAttempt.recommendedDrills.map((drill) => (
                <View key={drill} style={styles.drillPill}>
                  <Text style={styles.drillText}>{drill}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.timelinePanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Focus Areas</Text>
            <Text style={styles.panelMeta}>bar {activeMeasure}</Text>
          </View>
          <Text style={styles.nativeMeta} testID="native-audio-status">
            {nativeAudioStatus}
          </Text>
          <View style={styles.measureGrid}>
            {(selectedArrangement?.measures ?? []).map((measure) => {
              const isHot = lastAttempt?.affectedMeasures.includes(measure.number);
              const isActive = activeMeasure === measure.number;

              return (
                <Pressable
                  key={measure.number}
                  onPress={() => setActiveMeasure(measure.number)}
                  style={[
                    styles.measureCell,
                    isActive && styles.measureCellActive,
                    isHot && styles.measureCellHot,
                  ]}
                  testID={`focus-area-${measure.number}`}
                >
                  <Text style={[styles.measureNumber, isActive && styles.measureNumberActive]}>
                    {measure.number}
                  </Text>
                  <Text style={[styles.measureTag, isActive && styles.measureNumberActive]}>
                    {measure.technique}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type ControlButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
  testID?: string;
};

function ControlButton({ icon, label, onPress, primary = false, testID }: ControlButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.controlButton,
        primary && styles.controlButtonPrimary,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      <Ionicons color={primary ? '#F7F4EA' : '#18201C'} name={icon} size={17} />
      <Text style={[styles.controlButtonText, primary && styles.controlButtonTextPrimary]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ScoreBar({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.scoreBarRow}>
      <Text style={styles.scoreBarLabel}>{label}</Text>
      <View style={styles.scoreTrack}>
        <View style={[styles.scoreFill, { backgroundColor: color, width: `${Math.round(value * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F3EA',
  },
  scrollContent: {
    gap: 18,
    padding: 18,
    paddingBottom: 36,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: {
    color: '#18201C',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
  },
  headerMeta: {
    color: '#68706B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  signalPill: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  signalReady: {
    backgroundColor: '#DCEDE6',
    borderColor: '#A8D1C4',
  },
  signalWaiting: {
    backgroundColor: '#F7E5D6',
    borderColor: '#E0B489',
  },
  signalText: {
    fontSize: 12,
    fontWeight: '900',
  },
  signalTextReady: {
    color: '#0D5B4D',
  },
  signalTextWaiting: {
    color: '#9A4B28',
  },
  searchPanel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  searchInputWrap: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4DED1',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: '#18201C',
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 0,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#18201C',
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  resultRail: {
    marginHorizontal: -18,
    paddingHorizontal: 18,
  },
  practiceSurface: {
    backgroundColor: '#18201C',
    borderRadius: 8,
    gap: 14,
    padding: 14,
  },
  practiceHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  practiceTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  practiceTitle: {
    color: '#F7F4EA',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0,
  },
  practiceSubtitle: {
    color: '#BFC7BE',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  rightsBadge: {
    backgroundColor: '#D9B44A',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rightsBadgeText: {
    color: '#2B2612',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  transport: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: '#F7F4EA',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 5,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  controlButtonPrimary: {
    backgroundColor: '#2E7D6E',
  },
  controlButtonText: {
    color: '#18201C',
    fontSize: 12,
    fontWeight: '900',
  },
  controlButtonTextPrimary: {
    color: '#F7F4EA',
  },
  tempoStepper: {
    alignItems: 'center',
    backgroundColor: '#F7F4EA',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 9,
    minHeight: 40,
    paddingHorizontal: 8,
  },
  tempoButton: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  tempoText: {
    color: '#18201C',
    fontSize: 14,
    fontWeight: '900',
  },
  listenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  listenPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4DED1',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 12,
    minWidth: 240,
    padding: 14,
  },
  scorePanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4DED1',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 10,
    minWidth: 148,
    padding: 14,
  },
  panelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  panelTitle: {
    color: '#18201C',
    fontSize: 17,
    fontWeight: '900',
  },
  panelMeta: {
    color: '#68706B',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  listenButtons: {
    flexDirection: 'row',
  },
  listenButton: {
    alignItems: 'center',
    backgroundColor: '#2E7D6E',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  recordingButton: {
    backgroundColor: '#C84C31',
  },
  listenButtonText: {
    color: '#F7F4EA',
    fontSize: 14,
    fontWeight: '900',
  },
  scoreLabel: {
    color: '#68706B',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  scoreNumber: {
    color: '#18201C',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 46,
  },
  scoreBars: {
    gap: 8,
  },
  scoreBarRow: {
    gap: 5,
  },
  scoreBarLabel: {
    color: '#505853',
    fontSize: 12,
    fontWeight: '800',
  },
  scoreTrack: {
    backgroundColor: '#EBE6DA',
    borderRadius: 999,
    height: 7,
    overflow: 'hidden',
  },
  scoreFill: {
    borderRadius: 999,
    height: 7,
  },
  coachPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4DED1',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  coachBubble: {
    backgroundColor: '#F4F0E5',
    borderColor: '#E5D8BE',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  coachJab: {
    color: '#18201C',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
  },
  coachAdvice: {
    color: '#4E5851',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  nextAction: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  nextActionText: {
    color: '#7A2E1E',
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  drillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  drillPill: {
    backgroundColor: '#E8F2EE',
    borderColor: '#B7D5C9',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  drillText: {
    color: '#0D5B4D',
    fontSize: 12,
    fontWeight: '900',
  },
  timelinePanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4DED1',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  measureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  measureCell: {
    backgroundColor: '#F6F3EA',
    borderColor: '#E4DED1',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 58,
    padding: 9,
    width: '23%',
  },
  measureCellActive: {
    backgroundColor: '#18201C',
    borderColor: '#18201C',
  },
  measureCellHot: {
    borderColor: '#C84C31',
    borderWidth: 2,
  },
  measureNumber: {
    color: '#18201C',
    fontSize: 14,
    fontWeight: '900',
  },
  measureNumberActive: {
    color: '#F7F4EA',
  },
  measureTag: {
    color: '#68706B',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 5,
  },
  nativeMeta: {
    color: '#68706B',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.74,
    transform: [{ translateY: 1 }],
  },
});
