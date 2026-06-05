import type { Arrangement, DetectedNote, InputMode, PerformanceAttempt } from '../types/music';

type SimulateAttemptArgs = {
  arrangement: Arrangement;
  inputMode: InputMode;
  runIndex: number;
  tempo: number;
};

export function simulatePerformanceAttempt({
  arrangement,
  inputMode,
  runIndex,
  tempo,
}: SimulateAttemptArgs): PerformanceAttempt {
  const seed = hash(`${arrangement.id}-${inputMode}-${runIndex}-${tempo}`);
  const measureCount = arrangement.measures.length;
  const primaryMeasure = (seed % measureCount) + 1;
  const secondaryMeasure = ((primaryMeasure + 1) % measureCount) + 1;
  const primary = arrangement.measures[primaryMeasure - 1];
  const secondary = arrangement.measures[secondaryMeasure - 1];
  const expected = [...primary.expectedNotes, ...secondary.expectedNotes];
  const wrongNotes = expected.filter((_, index) => (seed + index) % (inputMode === 'midi' ? 7 : 5) === 0).slice(0, 2);
  const missedNotes = expected.filter((_, index) => (seed + index) % (inputMode === 'midi' ? 9 : 6) === 1).slice(0, 2);
  const timingOffsets = expected.slice(0, 6).map((_, index) => {
    const direction = (seed + index) % 2 === 0 ? 1 : -1;
    const base = inputMode === 'midi' ? 18 : 42;
    return direction * (base + ((seed + index * 13) % 54));
  });
  const pitchPenalty = wrongNotes.length * (inputMode === 'midi' ? 0.08 : 0.12) + missedNotes.length * 0.1;
  const rhythmPenalty = average(timingOffsets.map((offset) => Math.abs(offset))) / (inputMode === 'midi' ? 260 : 210);
  const improvementBonus = Math.min(runIndex - 1, 5);
  const pitchScore = clamp(0.48, 0.99, 0.97 - pitchPenalty + improvementBonus * 0.015);
  const rhythmScore = clamp(0.42, 0.99, 0.94 - rhythmPenalty + improvementBonus * 0.012);

  return {
    id: `attempt-${Date.now()}-${runIndex}`,
    arrangementId: arrangement.id,
    instrument: arrangement.instrument,
    inputType: inputMode,
    detectedNotes: buildDetectedNotes(expected, timingOffsets, inputMode),
    timingOffsets,
    missedNotes,
    wrongNotes,
    rhythmScore,
    pitchScore,
    confidence: inputMode === 'midi' ? 0.96 : clamp(0.62, 0.9, 0.82 - wrongNotes.length * 0.04),
    affectedMeasures: Array.from(new Set([primaryMeasure, secondaryMeasure])).sort((a, b) => a - b),
    recommendedDrills: buildRecommendedDrills(arrangement, wrongNotes, missedNotes, timingOffsets),
    rawAudioRetainedLocally: true,
    createdAt: new Date().toISOString(),
  };
}

function buildDetectedNotes(notes: string[], offsets: number[], inputMode: InputMode): DetectedNote[] {
  return notes.slice(0, 8).map((note, index) => ({
    midi: noteNameToMidi(note),
    name: note,
    centsOff: inputMode === 'midi' ? (index % 2 === 0 ? 0 : 2) : ((index % 3) - 1) * 11,
    onsetMs: index * 500 + (offsets[index % offsets.length] ?? 0),
    durationMs: 360,
    confidence: inputMode === 'midi' ? 0.98 : 0.78,
  }));
}

function buildRecommendedDrills(
  arrangement: Arrangement,
  wrongNotes: string[],
  missedNotes: string[],
  timingOffsets: number[],
) {
  const rhythmDrift = average(timingOffsets.map((offset) => Math.abs(offset)));
  const drills = new Set<string>();

  if (rhythmDrift > 58) {
    drills.add('rhythm clapback');
    drills.add('slow loop');
  }

  if (wrongNotes.length > 0) {
    drills.add(arrangement.instrument === 'guitar' ? 'fret map' : 'right-hand map');
  }

  if (missedNotes.length > 0) {
    drills.add(arrangement.instrument === 'guitar' ? 'string skip reset' : 'left-hand anchor');
  }

  if (drills.size < 2) {
    drills.add('tempo ramp');
  }

  return Array.from(drills).slice(0, 4);
}

function noteNameToMidi(note: string) {
  const pitch = note.match(/^([A-G])(#|b)?(\d)?$/);

  if (!pitch) {
    return 60;
  }

  const semitones: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };
  const letter = pitch[1];
  const accidental = pitch[2] === '#' ? 1 : pitch[2] === 'b' ? -1 : 0;
  const octave = Number(pitch[3] ?? 4);

  return (octave + 1) * 12 + semitones[letter] + accidental;
}

function hash(value: string) {
  return value.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
}

function average(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / Math.max(1, values.length);
}

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}
