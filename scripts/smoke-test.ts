import assert from 'node:assert/strict';

import {
  buildExternalReferenceSearches,
  searchArrangements,
} from '../src/services/contentProvider';
import { simulatePerformanceAttempt } from '../src/services/practiceAnalyzer';
import { buildTutorRequest, buildTutorResponse } from '../src/services/tutorEngine';

const guitarResults = searchArrangements('house', 'guitar');
assert.equal(guitarResults.length > 0, true, 'guitar search should return source references');
assert.equal(
  guitarResults.every((arrangement) => arrangement.referenceOnly),
  true,
  'search should only return reference-only arrangements',
);
assert.equal(
  guitarResults.every((arrangement) => Boolean(arrangement.externalUrl)),
  true,
  'references should include source URLs',
);

const pianoReferences = buildExternalReferenceSearches('some unavailable pop song', 'piano');
assert.equal(pianoReferences.length > 0, true, 'missing search should return external source searches');
assert.equal(
  pianoReferences.every((arrangement) => arrangement.licenseStatus === 'reference-only'),
  true,
  'missing search should not generate original notation',
);

const attempt = simulatePerformanceAttempt({
  arrangement: guitarResults[0],
  inputMode: 'midi',
  runIndex: 1,
  tempo: guitarResults[0].bpm,
});
assert.equal(attempt.rawAudioRetainedLocally, true, 'attempt should keep raw audio local by default');
assert.equal(attempt.affectedMeasures.length > 0, true, 'attempt should identify affected focus areas');

const longSessionAttempt = simulatePerformanceAttempt({
  arrangement: guitarResults[0],
  inputMode: 'midi',
  runIndex: 40,
  tempo: guitarResults[0].bpm,
});
assert.equal(
  longSessionAttempt.wrongNotes.length > 0 && longSessionAttempt.pitchScore < 0.99,
  true,
  'long sessions should not hide simulated wrong notes behind an uncapped improvement bonus',
);

const request = buildTutorRequest({
  activeMeasure: 1,
  arrangement: guitarResults[0],
  attempt,
  instrument: 'guitar',
  learner: {
    id: 'test',
    displayName: 'Test Player',
    targetLevel: 'beginner-intermediate',
    practiceStreak: 1,
  },
  recentProgress: [],
  sassLevel: 'savage',
});
const response = buildTutorResponse(request);
assert.equal(response.toneSafety, 'supportive-tease', 'coach tone should remain supportive teasing');
assert.equal(response.advice.includes(guitarResults[0].sourceName), true, 'coach should reference source ownership');
assert.equal(response.nextAction.length > 20, true, 'coach should include a next action');

console.log('OddioAI source-reference smoke test passed');
