import type { Arrangement, Instrument, PracticeMeasure } from '../types/music';

const commonRights = {
  territory: 'External source',
  permittedUse: 'Reference and learner navigation only',
  reviewRequired: true,
};

export const seedCatalog: Arrangement[] = [
  createReference({
    id: 'songsterr-house-rising-sun-guitar',
    title: 'House of the Rising Sun',
    artist: 'The Animals / Traditional',
    instrument: 'guitar',
    source: 'songsterr-reference',
    sourceName: 'Songsterr',
    externalUrl: 'https://www.songsterr.com/?pattern=house+of+the+rising+sun',
    difficulty: 'easy',
    bpm: 74,
    key: 'Am',
    focus: ['intro arpeggio', 'chord changes', 'barre prep', 'steady triplet feel'],
    notes:
      'Searches Songsterr for existing community/publisher tablature. OddioAI does not copy or re-host the tab.',
  }),
  createReference({
    id: 'songsterr-blues-ladder-guitar',
    title: 'Beginner Blues References',
    artist: 'Songsterr search',
    instrument: 'guitar',
    source: 'songsterr-reference',
    sourceName: 'Songsterr',
    externalUrl: 'https://www.songsterr.com/?pattern=beginner+blues+guitar',
    difficulty: 'starter',
    bpm: 68,
    key: 'E',
    focus: ['alternate picking', 'bend control', 'shuffle timing', 'clean stops'],
    notes: 'Reference-only Songsterr search for blues learning material.',
  }),
  createReference({
    id: 'songsterr-ode-to-joy-guitar',
    title: 'Ode to Joy',
    artist: 'L. van Beethoven',
    instrument: 'guitar',
    source: 'songsterr-reference',
    sourceName: 'Songsterr',
    externalUrl: 'https://www.songsterr.com/?pattern=ode+to+joy',
    difficulty: 'starter',
    bpm: 88,
    key: 'C',
    focus: ['stepwise melody', 'clean repeats', 'phrase endings', 'tempo hold'],
    notes: 'Reference-only Songsterr search for existing Ode to Joy guitar tabs.',
  }),
  createReference({
    id: 'musicnotes-ode-to-joy-piano',
    title: 'Ode to Joy',
    artist: 'L. van Beethoven',
    instrument: 'piano',
    source: 'musicnotes-reference',
    sourceName: 'Musicnotes',
    externalUrl: 'https://www.musicnotes.com/search/go?w=ode%20to%20joy%20piano',
    difficulty: 'starter',
    bpm: 88,
    key: 'C',
    focus: ['right hand melody', 'finger reset', 'repeat accuracy', 'cadence'],
    notes: 'Reference-only Musicnotes search. Users view or purchase notation at the source.',
  }),
  createReference({
    id: 'imslp-canon-piano',
    title: 'Canon in D',
    artist: 'J. Pachelbel',
    instrument: 'piano',
    source: 'imslp-reference',
    sourceName: 'IMSLP',
    externalUrl: 'https://imslp.org/wiki/Canon_and_Gigue_in_D_major_(Pachelbel,_Johann)',
    difficulty: 'easy',
    bpm: 70,
    key: 'D',
    focus: ['broken chords', 'left hand anchor', 'finger reset', 'quiet release'],
    notes: 'Reference-only IMSLP source page for public-domain sheet music options.',
  }),
  createReference({
    id: 'imslp-moonlight-piano',
    title: 'Moonlight Sonata',
    artist: 'L. van Beethoven',
    instrument: 'piano',
    source: 'imslp-reference',
    sourceName: 'IMSLP',
    externalUrl: 'https://imslp.org/wiki/Piano_Sonata_No.14,_Op.27_No.2_(Beethoven,_Ludwig_van)',
    difficulty: 'stretch',
    bpm: 54,
    key: 'C# minor',
    focus: ['triplet evenness', 'bass sustain', 'voicing', 'slow control'],
    notes: 'Reference-only IMSLP source page for public-domain editions.',
  }),
];

type CreateReferenceArgs = {
  id: string;
  title: string;
  artist: string;
  instrument: Instrument;
  source: Arrangement['source'];
  sourceName: string;
  externalUrl: string;
  difficulty: Arrangement['difficulty'];
  bpm: number;
  key: string;
  focus: string[];
  notes: string;
};

export function createReference(args: CreateReferenceArgs): Arrangement {
  return {
    id: args.id,
    title: args.title,
    artist: args.artist,
    instrument: args.instrument,
    format: 'external-reference',
    difficulty: args.difficulty,
    bpm: args.bpm,
    key: args.key,
    source: args.source,
    sourceName: args.sourceName,
    licenseStatus: 'reference-only',
    externalUrl: args.externalUrl,
    referenceOnly: true,
    rights: {
      ...commonRights,
      owner: args.sourceName,
      sourceUrl: args.externalUrl,
      notes: args.notes,
    },
    tracks:
      args.instrument === 'guitar'
        ? [
            { id: `${args.id}-source`, name: 'External tab source', role: 'melody', muted: false, solo: false },
            { id: `${args.id}-pulse`, name: 'Oddio practice pulse', role: 'rhythm', muted: false, solo: false },
          ]
        : [
            { id: `${args.id}-source`, name: 'External sheet source', role: 'right-hand', muted: false, solo: false },
            { id: `${args.id}-coach`, name: 'Oddio practice coach', role: 'left-hand', muted: false, solo: false },
          ],
    measures: createFocusMeasures(args.focus),
    createdAt: '2026-06-03T00:00:00.000Z',
  };
}

function createFocusMeasures(focus: string[]): PracticeMeasure[] {
  return focus.map((technique, index) => ({
    number: index + 1,
    beatCount: 4,
    technique,
    expectedNotes: [`source pitch ${index + 1}`, `source rhythm ${index + 1}`],
  }));
}
