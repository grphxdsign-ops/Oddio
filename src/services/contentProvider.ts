import { createReference, seedCatalog } from '../data/catalog';
import type { Arrangement, Instrument } from '../types/music';

export function searchArrangements(query: string, instrument: Instrument): Arrangement[] {
  const normalizedQuery = query.trim().toLowerCase();
  const referenceCatalog = seedCatalog.filter(
    (arrangement) =>
      arrangement.instrument === instrument &&
      arrangement.referenceOnly &&
      arrangement.licenseStatus === 'reference-only',
  );

  if (!normalizedQuery) {
    return referenceCatalog;
  }

  return referenceCatalog.filter((arrangement) => {
    const searchable = [
      arrangement.title,
      arrangement.artist,
      arrangement.key,
      arrangement.difficulty,
      arrangement.sourceName,
      arrangement.measures.map((measure) => measure.technique).join(' '),
    ]
      .join(' ')
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}

export function buildExternalReferenceSearches(query: string, instrument: Instrument): Arrangement[] {
  const cleanTitle = query.trim().replace(/\s+/g, ' ') || `${instrument} song`;
  const encodedPlus = encodeURIComponent(cleanTitle).replace(/%20/g, '+');
  const encoded = encodeURIComponent(`${cleanTitle} ${instrument}`);

  const sourceSearches =
    instrument === 'guitar'
      ? [
          {
            id: `songsterr-search-${slugify(cleanTitle)}`,
            source: 'songsterr-reference' as const,
            sourceName: 'Songsterr',
            externalUrl: `https://www.songsterr.com/?pattern=${encodedPlus}`,
            notes: 'Reference-only Songsterr search. OddioAI links out instead of recreating tab.',
          },
          {
            id: `musicnotes-search-${slugify(cleanTitle)}`,
            source: 'musicnotes-reference' as const,
            sourceName: 'Musicnotes',
            externalUrl: `https://www.musicnotes.com/search/go?w=${encoded}`,
            notes: 'Reference-only Musicnotes search for licensed sheet music and tab options.',
          },
        ]
      : [
          {
            id: `musicnotes-search-${slugify(cleanTitle)}`,
            source: 'musicnotes-reference' as const,
            sourceName: 'Musicnotes',
            externalUrl: `https://www.musicnotes.com/search/go?w=${encoded}`,
            notes: 'Reference-only Musicnotes search. Users view or purchase notation at the source.',
          },
          {
            id: `imslp-search-${slugify(cleanTitle)}`,
            source: 'imslp-reference' as const,
            sourceName: 'IMSLP',
            externalUrl: `https://imslp.org/index.php?search=${encodeURIComponent(cleanTitle)}&title=Special:MediaSearch`,
            notes: 'Reference-only IMSLP search for public-domain editions where available.',
          },
        ];

  return sourceSearches.map((source, index) =>
    createReference({
      id: source.id,
      title: cleanTitle,
      artist: `${source.sourceName} search`,
      instrument,
      source: source.source,
      sourceName: source.sourceName,
      externalUrl: source.externalUrl,
      difficulty: index === 0 ? 'easy' : 'medium',
      bpm: instrument === 'guitar' ? 76 : 84,
      key: 'Source key',
      focus:
        instrument === 'guitar'
          ? ['source intro', 'source phrase', 'rhythm check', 'clean replay']
          : ['source melody', 'hand map', 'rhythm check', 'clean replay'],
      notes: source.notes,
    }),
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}
