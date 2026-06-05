import type { SassLevel, TutorRequest, TutorResponse } from '../types/music';

type TutorRequestArgs = Omit<TutorRequest, 'recentProgress'> & {
  recentProgress: TutorRequest['recentProgress'];
};

export function buildTutorRequest(args: TutorRequestArgs): TutorRequest {
  return args;
}

export function buildTutorResponse(request: TutorRequest): TutorResponse {
  const worstOffset = request.attempt.timingOffsets.reduce(
    (largest, offset) => (Math.abs(offset) > Math.abs(largest) ? offset : largest),
    0,
  );
  const missed = request.attempt.missedNotes[0];
  const wrong = request.attempt.wrongNotes[0];
  const displayMissed = request.arrangement.referenceOnly ? 'that source target' : missed;
  const displayWrong = request.arrangement.referenceOnly ? 'that source pitch' : wrong;
  const measure = request.attempt.affectedMeasures[0] ?? request.activeMeasure;
  const issue =
    Math.abs(worstOffset) > 64
      ? 'rhythm'
      : wrong
        ? 'pitch'
        : missed
          ? 'miss'
          : 'clean';

  const jab = makeJab(request.sassLevel, issue, {
    measure,
    wrong: displayWrong,
    missed: displayMissed,
    earlyLate: worstOffset > 0 ? 'late' : 'early',
  });
  const rawAdvice = makeAdvice(request, issue, measure, wrong, missed, worstOffset);
  const advice =
    request.arrangement.referenceOnly && !rawAdvice.includes(request.arrangement.sourceName)
      ? `${rawAdvice} Keep ${request.arrangement.sourceName} as the notation source.`
      : rawAdvice;
  const nextAction = makeNextAction(request, issue, measure);

  return {
    jab,
    advice,
    nextAction,
    drillPrompt: request.attempt.recommendedDrills[0] ?? 'tempo ramp',
    toneSafety: 'supportive-tease',
  };
}

function makeJab(
  sassLevel: SassLevel,
  issue: 'rhythm' | 'pitch' | 'miss' | 'clean',
  context: { measure: number; wrong?: string; missed?: string; earlyLate: 'early' | 'late' },
) {
  const lines: Record<SassLevel, Record<typeof issue, string>> = {
    light: {
      rhythm: `Measure ${context.measure} got a little ${context.earlyLate}. Nothing tragic, just mildly dramatic.`,
      pitch: `${context.wrong ?? 'That note'} wandered off for a tiny scenic tour.`,
      miss: `${context.missed ?? 'One note'} ghosted the phrase. Bold choice, questionable timing.`,
      clean: 'That pass was clean enough that I almost had to be nice. Weird feeling.',
    },
    balanced: {
      rhythm: `Measure ${context.measure} entered the room ${context.earlyLate} and pretended that was the plan.`,
      pitch: `${context.wrong ?? 'That note'} showed up like it had a fake ID and confidence.`,
      miss: `${context.missed ?? 'One note'} disappeared so fast I thought it had a rideshare waiting.`,
      clean: 'That was solid. Annoyingly solid. I had jokes prepared and everything.',
    },
    savage: {
      rhythm: `Beat discipline in measure ${context.measure} briefly left to pursue other opportunities.`,
      pitch: `${context.wrong ?? 'That note'} was not invited, yet there it was, sitting in the front row.`,
      miss: `${context.missed ?? 'One note'} skipped work and still expected full credit.`,
      clean: 'Fine. That pass slapped. I will allow this temporary competence.',
    },
  };

  return lines[sassLevel][issue];
}

function makeAdvice(
  request: TutorRequest,
  issue: 'rhythm' | 'pitch' | 'miss' | 'clean',
  measure: number,
  wrong?: string,
  missed?: string,
  offset = 0,
) {
  if (issue === 'rhythm') {
    return `Lock measure ${measure} to the count before adding speed. Your largest timing drift was ${Math.abs(offset)} ms, so count out loud and land beat 3 first.`;
  }

  if (issue === 'pitch') {
    if (request.arrangement.referenceOnly) {
      return `Open the ${request.arrangement.sourceName} reference and compare the source bar slowly. Oddio is flagging the contour, not reprinting the notes.`;
    }

    return request.instrument === 'guitar'
      ? `Check the fret before the pick moves. ${wrong ?? 'The wrong pitch'} points to a left-hand map problem, not a speed problem.`
      : `Reset your hand shape before the next attack. ${wrong ?? 'The wrong key'} means the finger arrived before the ear did.`;
  }

  if (issue === 'miss') {
    if (request.arrangement.referenceOnly) {
      return `Use the ${request.arrangement.sourceName} page as the source of truth, then replay the two beats before the missing target. Oddio keeps the coaching; the source keeps the notation.`;
    }

    return request.instrument === 'guitar'
      ? `Keep the picking hand moving through ${missed ?? 'the missing note'} even if the fretting hand hesitates.`
      : `Give ${missed ?? 'the missing note'} a louder mental cue and practice the two notes before it as a pickup.`;
  }

  return `Keep the tempo where it is for one more clean pass. If the next run stays above 90, nudge the tempo by 4 bpm.`;
}

function makeNextAction(
  request: TutorRequest,
  issue: 'rhythm' | 'pitch' | 'miss' | 'clean',
  measure: number,
) {
  if (issue === 'clean') {
    return `Run measures ${measure}-${Math.min(measure + 1, request.arrangement.measures.length)} twice, then raise the tempo one click.`;
  }

  const drill = request.attempt.recommendedDrills[0] ?? 'slow loop';
  return `Loop measure ${measure} with ${drill} for 30 seconds, then replay the full phrase.`;
}
