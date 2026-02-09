import { SpellingMode, Tonality } from '../types';

type FunctionFamily = 'Tonic' | 'Predominant' | 'Dominant';

export type SubstitutionComplexity = 'common' | 'advanced';

export interface SubstitutionEntry {
  chord: string;
  reason: string;
  resolvesTo: string;
  complexity: SubstitutionComplexity;
}

export interface SubstitutionGroup {
  id: string;
  label: string;
  items: SubstitutionEntry[];
}

export interface DegreeSubstitutions {
  degree: string;
  chord: string;
  functionFamily: FunctionFamily;
  groups: SubstitutionGroup[];
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_PCS: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

const MAJOR_ROMAN = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const MINOR_ROMAN = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

const MAJOR_QUALITIES: ChordQuality[] = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'];
const MINOR_QUALITIES: ChordQuality[] = ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'];

type ChordQuality = 'major' | 'minor' | 'diminished' | 'dominant' | 'diminished7';

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const normalizeDiff = (diff: number) => {
  let adjusted = diff;
  while (adjusted > 6) adjusted -= 12;
  while (adjusted < -6) adjusted += 12;
  return adjusted;
};

const diffToAccidental = (diff: number) => {
  if (diff === 0) return '';
  if (diff === 1) return '#';
  if (diff === 2) return '##';
  if (diff === -1) return 'b';
  if (diff === -2) return 'bb';
  return diff > 0 ? '#'.repeat(diff) : 'b'.repeat(Math.abs(diff));
};

const parseNoteName = (note: string) => {
  const clean = note.replace(/m$/, '');
  const match = clean.match(/^([A-G])([b#]{0,2})/);
  if (!match) {
    return { letter: 'C', accidental: '' };
  }
  return { letter: match[1], accidental: match[2] };
};

const noteToPc = (note: string) => {
  const { letter, accidental } = parseNoteName(note);
  const base = NATURAL_PCS[letter];
  const offset = accidental.split('').reduce((sum, char) => sum + (char === '#' ? 1 : -1), 0);
  return (base + offset + 12) % 12;
};

const spellNoteFromDegree = (tonic: string, interval: number, degree: number) => {
  const { letter } = parseNoteName(tonic);
  const tonicPc = noteToPc(tonic);
  const tonicIndex = LETTERS.indexOf(letter);
  const targetLetter = LETTERS[(tonicIndex + degree - 1) % LETTERS.length];
  const naturalPc = NATURAL_PCS[targetLetter];
  const desiredPc = (tonicPc + interval + 12) % 12;
  const diff = normalizeDiff(desiredPc - naturalPc);
  return `${targetLetter}${diffToAccidental(diff)}`;
};

const spellNoteFromPc = (pc: number, spellingMode: SpellingMode, tonic: string) => {
  if (spellingMode === SpellingMode.Sharps) return SHARP_NAMES[pc];
  if (spellingMode === SpellingMode.Flats) return FLAT_NAMES[pc];
  const { accidental } = parseNoteName(tonic);
  const preferSharps = accidental.includes('#');
  return preferSharps ? SHARP_NAMES[pc] : FLAT_NAMES[pc];
};

const formatChord = (root: string, quality: ChordQuality) => {
  switch (quality) {
    case 'minor':
      return `${root}m`;
    case 'diminished':
      return `${root}dim`;
    case 'diminished7':
      return `${root}dim7`;
    case 'dominant':
      return `${root}7`;
    default:
      return root;
  }
};

const getFunctionFamily = (tonality: Tonality, degreeIndex: number): FunctionFamily => {
  if (tonality === 'major') {
    if ([0, 2, 5].includes(degreeIndex)) return 'Tonic';
    if ([1, 3].includes(degreeIndex)) return 'Predominant';
    return 'Dominant';
  }
  if ([0, 2, 5].includes(degreeIndex)) return 'Tonic';
  if ([1, 3].includes(degreeIndex)) return 'Predominant';
  return 'Dominant';
};

// Build diatonic triads using scale-degree letter spelling so enharmonics stay consistent.
const createDiatonicChords = (tonic: string, tonality: Tonality) => {
  const intervals = tonality === 'major' ? MAJOR_INTERVALS : MINOR_INTERVALS;
  const roman = tonality === 'major' ? MAJOR_ROMAN : MINOR_ROMAN;
  const qualities = tonality === 'major' ? MAJOR_QUALITIES : MINOR_QUALITIES;

  return intervals.map((interval, index) => {
    const root = spellNoteFromDegree(tonic, interval, index + 1);
    const quality = qualities[index];
    return {
      degree: roman[index],
      degreeIndex: index,
      root,
      quality,
      chordName: formatChord(root, quality),
      functionFamily: getFunctionFamily(tonality, index),
    };
  });
};

// Function-family swaps: tonic (I/vi/iii), predominant (ii/IV), dominant (V/vii°).
const buildDiatonicAlternatives = (
  chord: ReturnType<typeof createDiatonicChords>[number],
  diatonicChords: ReturnType<typeof createDiatonicChords>
): SubstitutionGroup | null => {
  const alternatives = diatonicChords.filter(
    (candidate) => candidate.functionFamily === chord.functionFamily && candidate.degree !== chord.degree
  );

  if (alternatives.length === 0) return null;

  return {
    id: 'diatonic-alternatives',
    label: 'Diatonic alternatives',
    items: alternatives.map((candidate) => ({
      chord: `${candidate.degree}: ${candidate.chordName}`,
      reason: `Same ${candidate.functionFamily.toLowerCase()} function as ${chord.degree}.`,
      resolvesTo: `resolves to ${candidate.degree}.`,
      complexity: 'common',
    })),
  };
};

// Applied dominants: V/X and vii°/X are generated from the target's root by interval math.
const buildSecondaryDominants = (
  chord: ReturnType<typeof createDiatonicChords>[number]
): SubstitutionGroup | null => {
  if (chord.degreeIndex === 0 || chord.quality === 'diminished') return null;

  const targetRoot = chord.root;
  const dominantRoot = spellNoteFromDegree(targetRoot, 7, 5);
  const leadingRoot = spellNoteFromDegree(targetRoot, 11, 7);

  return {
    id: 'secondary-dominants',
    label: 'Secondary dominants',
    items: [
      {
        chord: `V/${chord.degree}: ${formatChord(dominantRoot, 'dominant')}`,
        reason: `Applied dominant resolves to ${chord.degree}.`,
        resolvesTo: `resolves to ${chord.degree}.`,
        complexity: 'common',
      },
      {
        chord: `vii°/${chord.degree}: ${formatChord(leadingRoot, 'diminished')}`,
        reason: `Leading-tone approach to ${chord.degree}.`,
        resolvesTo: `resolves to ${chord.degree}.`,
        complexity: 'advanced',
      },
    ].filter(Boolean),
  };
};

// Modal interchange: borrow common chords from the parallel mode, filtered by function family.
const buildModalInterchange = (
  chord: ReturnType<typeof createDiatonicChords>[number],
  tonic: string,
  tonality: Tonality
): SubstitutionGroup | null => {
  const borrowed =
    tonality === 'major'
      ? [
          { id: 'i', degree: 1, interval: 0, quality: 'minor' as ChordQuality, family: 'Tonic' as FunctionFamily, label: 'i' },
          { id: 'bIII', degree: 3, interval: 3, quality: 'major' as ChordQuality, family: 'Tonic' as FunctionFamily, label: 'bIII' },
          { id: 'bVI', degree: 6, interval: 8, quality: 'major' as ChordQuality, family: 'Tonic' as FunctionFamily, label: 'bVI' },
          { id: 'iv', degree: 4, interval: 5, quality: 'minor' as ChordQuality, family: 'Predominant' as FunctionFamily, label: 'iv' },
          { id: 'ii°', degree: 2, interval: 2, quality: 'diminished' as ChordQuality, family: 'Predominant' as FunctionFamily, label: 'ii°' },
          { id: 'bII', degree: 2, interval: 1, quality: 'major' as ChordQuality, family: 'Predominant' as FunctionFamily, label: 'bII (Neapolitan)' },
          { id: 'bVII', degree: 7, interval: 10, quality: 'major' as ChordQuality, family: 'Dominant' as FunctionFamily, label: 'bVII' },
        ]
      : [
          { id: 'I', degree: 1, interval: 0, quality: 'major' as ChordQuality, family: 'Tonic' as FunctionFamily, label: 'I' },
          { id: 'ii', degree: 2, interval: 2, quality: 'minor' as ChordQuality, family: 'Predominant' as FunctionFamily, label: 'ii' },
          { id: 'IV', degree: 4, interval: 5, quality: 'major' as ChordQuality, family: 'Predominant' as FunctionFamily, label: 'IV' },
          { id: 'V', degree: 5, interval: 7, quality: 'dominant' as ChordQuality, family: 'Dominant' as FunctionFamily, label: 'V (harmonic minor)' },
        ];

  const options = borrowed.filter((item) => item.family === chord.functionFamily);
  if (options.length === 0) return null;

  return {
    id: 'modal-interchange',
    label: 'Modal interchange',
    items: options.map((item) => {
      const root = spellNoteFromDegree(tonic, item.interval, item.degree);
      const chordName = formatChord(root, item.quality);
      return {
        chord: `${item.label}: ${chordName}`,
        reason: `Borrowed from parallel ${tonality === 'major' ? 'minor' : 'major'}.`,
        resolvesTo: `resolves to ${chord.degree}.`,
        complexity: 'advanced',
      };
    }),
  };
};

// Tritone subs only apply to dominant-function chords.
const buildTritoneSubstitutions = (
  chord: ReturnType<typeof createDiatonicChords>[number],
  spellingMode: SpellingMode,
  tonic: string
): SubstitutionGroup | null => {
  if (chord.functionFamily !== 'Dominant') return null;
  const rootPc = noteToPc(chord.root);
  const tritoneRoot = spellNoteFromPc((rootPc + 6) % 12, spellingMode, tonic);
  return {
    id: 'tritone-subs',
    label: 'Tritone substitutions',
    items: [
      {
        chord: formatChord(tritoneRoot, 'dominant'),
        reason: 'Shares the tritone and resolves like the dominant.',
        resolvesTo: 'resolves to I.',
        complexity: 'advanced',
      },
    ],
  };
};

// Advanced diminished passing chords for chromatic approaches into ii or I.
const buildPassingDiminished = (
  chord: ReturnType<typeof createDiatonicChords>[number],
  tonic: string
): SubstitutionGroup | null => {
  if (chord.degreeIndex !== 0 && chord.functionFamily !== 'Dominant') return null;
  const items: SubstitutionEntry[] = [];

  if (chord.degreeIndex === 0) {
    const raisedTonic = spellNoteFromDegree(tonic, 1, 1);
    items.push({
      chord: formatChord(raisedTonic, 'diminished7'),
      reason: 'Chromatic approach into the predominant.',
      resolvesTo: 'resolves to ii.',
      complexity: 'advanced',
    });
  }

  if (chord.functionFamily === 'Dominant') {
    const leadingTone = spellNoteFromDegree(tonic, 11, 7);
    items.push({
      chord: formatChord(leadingTone, 'diminished7'),
      reason: 'Leading-tone diminished approaches tonic.',
      resolvesTo: 'resolves to I.',
      complexity: 'advanced',
    });
  }

  if (items.length === 0) return null;
  return {
    id: 'passing-diminished',
    label: 'Diminished passing',
    items,
  };
};

// Backdoor cadence (bVII7 → I) is an advanced, major-key option.
const buildBackdoorCadence = (
  chord: ReturnType<typeof createDiatonicChords>[number],
  tonic: string,
  tonality: Tonality
): SubstitutionGroup | null => {
  if (tonality !== 'major' || chord.degreeIndex !== 0) return null;
  const bVII = spellNoteFromDegree(tonic, 10, 7);
  return {
    id: 'backdoor',
    label: 'Backdoor / resolution variants',
    items: [
      {
        chord: `${formatChord(bVII, 'dominant')} → ${formatChord(chord.root, 'major')}`,
        reason: 'Backdoor dominant pulls to tonic.',
        resolvesTo: 'resolves to I.',
        complexity: 'advanced',
      },
    ],
  };
};

// Common reharm move: ii–V into the target chord.
const buildCommonReharm = (
  chord: ReturnType<typeof createDiatonicChords>[number]
): SubstitutionGroup | null => {
  if (chord.quality === 'diminished') return null;
  const iiRoot = spellNoteFromDegree(chord.root, 2, 2);
  const vRoot = spellNoteFromDegree(chord.root, 7, 5);
  return {
    id: 'common-reharm',
    label: 'Common reharmonization moves',
    items: [
      {
        chord: `${formatChord(iiRoot, 'minor')} → ${formatChord(vRoot, 'dominant')}`,
        reason: 'Classic ii–V setup into the target.',
        resolvesTo: `resolves to ${chord.degree}.`,
        complexity: 'common',
      },
    ],
  };
};

export const generateSubstitutions = (tonic: string, tonality: Tonality, spellingMode: SpellingMode) => {
  const diatonic = createDiatonicChords(tonic, tonality);

  return diatonic.map((chord) => {
    const groups = [
      buildDiatonicAlternatives(chord, diatonic),
      buildSecondaryDominants(chord),
      buildModalInterchange(chord, tonic, tonality),
      buildTritoneSubstitutions(chord, spellingMode, tonic),
      buildPassingDiminished(chord, tonic),
      buildBackdoorCadence(chord, tonic, tonality),
      buildCommonReharm(chord),
    ].filter((group): group is SubstitutionGroup => Boolean(group) && group.items.length > 0);

    return {
      degree: chord.degree,
      chord: chord.chordName,
      functionFamily: chord.functionFamily,
      groups,
    };
  });
};
