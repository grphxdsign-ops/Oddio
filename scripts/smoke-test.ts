import assert from 'node:assert/strict';

import {
  buildExternalReferenceSearches,
  searchArrangements,
} from '../src/services/contentProvider';
import { simulatePerformanceAttempt } from '../src/services/practiceAnalyzer';
import { buildTutorRequest, buildTutorResponse } from '../src/services/tutorEngine';
import { buildVoiceTurnContext, submitVoiceTurn } from '../src/services/voiceCoach';
import { nextVoiceTurnStatus } from '../src/services/voiceCoachState';
import {
  MAX_AUDIO_BYTES,
  buildMockEdgeVoiceTurn,
  normalizeAssistantText,
  validateVoiceTurnRequest,
} from '../supabase/functions/voice-turn/coach';

async function main() {
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

  const learner = {
    id: 'test',
    displayName: 'Test Player',
    targetLevel: 'beginner-intermediate',
    practiceStreak: 1,
  };
  const request = buildTutorRequest({
    activeMeasure: 1,
    arrangement: guitarResults[0],
    attempt,
    instrument: 'guitar',
    learner,
    recentProgress: [],
    sassLevel: 'savage',
  });
  const response = buildTutorResponse(request);
  assert.equal(response.toneSafety, 'supportive-tease', 'coach tone should remain supportive teasing');
  assert.equal(response.advice.includes(guitarResults[0].sourceName), true, 'coach should reference source ownership');
  assert.equal(response.nextAction.length > 20, true, 'coach should include a next action');

  const voiceContext = buildVoiceTurnContext({
    activeMeasure: 1,
    arrangement: guitarResults[0],
    attempt,
    conversationId: 'smoke-voice',
    instrument: 'guitar',
    learner,
    recentProgress: [attempt],
    sassLevel: 'balanced',
  });
  assert.equal(voiceContext.currentAttempt?.rawAudioRetainedLocally, true, 'voice context may include summary privacy flags');
  assert.equal(
    /recordingUri|audioBlob|audioBytes/i.test(JSON.stringify(voiceContext)),
    false,
    'voice context should not include raw audio bytes or file handles',
  );

  const voiceStatusFlow = [
    nextVoiceTurnStatus('idle', 'start_recording'),
    nextVoiceTurnStatus('recording', 'audio_captured'),
    nextVoiceTurnStatus('uploading', 'request_sent'),
    nextVoiceTurnStatus('thinking', 'playback_started'),
    nextVoiceTurnStatus('speaking', 'playback_finished'),
  ];
  assert.deepEqual(
    voiceStatusFlow,
    ['recording', 'uploading', 'thinking', 'speaking', 'idle'],
    'voice state machine should cover the happy path',
  );
  assert.equal(nextVoiceTurnStatus('thinking', 'fail'), 'error', 'voice state machine should recover through errors');

  const mockVoiceTurn = await submitVoiceTurn({
    context: voiceContext,
    inputMode: 'midi',
  });
  assert.equal(mockVoiceTurn.rawUserAudioRetained, false, 'mock voice path should not retain raw user voice');
  assert.equal(mockVoiceTurn.source, 'mock', 'unconfigured local voice path should be deterministic mock mode');
  assert.equal(mockVoiceTurn.assistantText.includes(guitarResults[0].sourceName), true, 'voice coach should cite the source reference');

  const unauthenticatedVoiceTurn = validateVoiceTurnRequest({
    audioSize: 1024,
    authorization: null,
    contextRaw: JSON.stringify(voiceContext),
  });
  assert.equal(unauthenticatedVoiceTurn.ok, false, 'edge function should reject unauthenticated voice turns');
  if (!unauthenticatedVoiceTurn.ok) {
    assert.equal(unauthenticatedVoiceTurn.status, 401);
  }

  const missingAudioVoiceTurn = validateVoiceTurnRequest({
    audioSize: null,
    authorization: 'Bearer test',
    contextRaw: JSON.stringify(voiceContext),
  });
  assert.equal(missingAudioVoiceTurn.ok, false, 'edge function should reject missing audio');
  if (!missingAudioVoiceTurn.ok) {
    assert.equal(missingAudioVoiceTurn.status, 400);
  }

  const emptyAudioVoiceTurn = validateVoiceTurnRequest({
    audioSize: 0,
    authorization: 'Bearer test',
    contextRaw: JSON.stringify(voiceContext),
  });
  assert.equal(emptyAudioVoiceTurn.ok, false, 'edge function should reject empty audio');
  if (!emptyAudioVoiceTurn.ok) {
    assert.equal(emptyAudioVoiceTurn.status, 400);
  }

  const oversizedVoiceTurn = validateVoiceTurnRequest({
    audioSize: MAX_AUDIO_BYTES + 1,
    authorization: 'Bearer test',
    contextRaw: JSON.stringify(voiceContext),
  });
  assert.equal(oversizedVoiceTurn.ok, false, 'edge function should reject oversized voice turns');
  if (!oversizedVoiceTurn.ok) {
    assert.equal(oversizedVoiceTurn.status, 413);
  }

  const mismatchedInstrumentVoiceTurn = validateVoiceTurnRequest({
    audioSize: 1024,
    authorization: 'Bearer test',
    contextRaw: JSON.stringify({ ...voiceContext, instrument: 'piano' }),
  });
  assert.equal(
    mismatchedInstrumentVoiceTurn.ok,
    false,
    'edge function should reject mismatched instrument context',
  );

  const edgeTurn = buildMockEdgeVoiceTurn(voiceContext);
  assert.equal(edgeTurn.rawUserAudioRetained, false, 'edge mock should preserve no raw voice storage policy');
  assert.equal(edgeTurn.assistantText.length > 30, true, 'edge mock should produce coach text');
  assert.match(
    normalizeAssistantText('Nice.', voiceContext),
    /Next action|run|loop/i,
    'edge text normalizer should enforce a useful next action',
  );

  console.log('OddioAI source-reference smoke test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
