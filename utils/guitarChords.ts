import { CurrentKeyData, SpellingMode, Tonality, DiatonicChordDiagram, ChordDiagramShape } from '../types';

type PitchClass = number;
type FretValue = number | 'x';

interface CandidateFret {
  fret: number;
  pitchClass: PitchClass;
}

interface ChordVoicing {
  frets: FretValue[];
  stringPitches: Array<PitchClass | null>;
  fretSpan: { min: number; max: number };
  windowStart: number;
  windowEnd: number;
}

interface ScoredVoicing {
  voicing: ChordVoicing;
  score: number;
}

const STANDARD_TUNING: PitchClass[] = [4, 9, 2, 7, 11, 4]; // E A D G B E (low -> high)
const TOTAL_FRETS = 12;
const WINDOW_FRET_SPAN = 3;

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

const ROMAN_MAJOR = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const ROMAN_MINOR = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const LETTER_TO_PC: Record<(typeof LETTERS)[number], PitchClass> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const PREFERRED_SHAPES: Record<string, { frets: FretValue[]; fingers: Array<number | null> }> = {
  C: { frets: ['x', 3, 2, 0, 1, 0], fingers: [null, 3, 2, null, 1, null] },
  D: { frets: ['x', 'x', 0, 2, 3, 2], fingers: [null, null, null, 1, 3, 2] },
  E: { frets: [0, 2, 2, 1, 0, 0], fingers: [null, 2, 3, 1, null, null] },
  G: { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, null, null, null, 3] },
  A: { frets: ['x', 0, 2, 2, 2, 0], fingers: [null, null, 1, 2, 3, null] },
  Am: { frets: ['x', 0, 2, 2, 1, 0], fingers: [null, null, 2, 3, 1, null] },
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [null, 2, 3, null, null, null] },
  Dm: { frets: ['x', 'x', 0, 2, 3, 1], fingers: [null, null, null, 2, 3, 1] },
  F: { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1] },
  Bm: { frets: ['x', 2, 4, 4, 3, 2], fingers: [null, 1, 3, 4, 2, 1] },
  B: { frets: ['x', 2, 4, 4, 4, 2], fingers: [null, 1, 3, 3, 3, 1] },
};

const normalizePitch = (value: number): PitchClass => ((value % 12) + 12) % 12;

const stripMinorSuffix = (note: string): string => (note.endsWith('m') ? note.slice(0, -1) : note);

const parseNoteName = (note: string) => {
  const trimmed = note.trim();
  const letter = trimmed[0].toUpperCase() as (typeof LETTERS)[number];
  const accidentalPart = trimmed.slice(1);
  let accidental = 0;
  for (const char of accidentalPart) {
    if (char === '#') accidental += 1;
    if (char === 'b') accidental -= 1;
  }
  const pitchClass = normalizePitch(LETTER_TO_PC[letter] + accidental);
  return { letter, accidental, pitchClass };
};

const formatAccidental = (value: number): string => {
  if (value === 0) return '';
  if (value > 0) return '#'.repeat(value);
  return 'b'.repeat(Math.abs(value));
};

const getScaleNotes = (rootName: string, intervals: number[]) => {
  const { letter: rootLetter, pitchClass: rootPc } = parseNoteName(rootName);
  const rootIndex = LETTERS.indexOf(rootLetter);

  return intervals.map((interval, degree) => {
    const letterIndex = (rootIndex + degree) % 7;
    const letter = LETTERS[letterIndex];
    const targetPc = normalizePitch(rootPc + interval);
    const basePc = LETTER_TO_PC[letter];
    const diff = normalizePitch(targetPc - basePc);
    const accidental = diff <= 6 ? diff : diff - 12;
    return {
      name: `${letter}${formatAccidental(accidental)}`,
      pitchClass: targetPc,
    };
  });
};

const getChordQuality = (intervals: number[]) => {
  const key = intervals.join(',');
  if (key === '0,4,7') return 'major';
  if (key === '0,3,7') return 'minor';
  if (key === '0,3,6') return 'diminished';
  if (key === '0,4,8') return 'augmented';
  return 'major';
};

const getChordSuffix = (quality: string): string => {
  if (quality === 'minor') return 'm';
  if (quality === 'diminished') return 'dim';
  if (quality === 'augmented') return 'aug';
  return '';
};

const getFifthIntervals = (intervals: number[]): number[] =>
  intervals.filter((interval) => interval === 6 || interval === 7 || interval === 8);

const getRequiredIntervals = (intervals: number[]): number[] => {
  const third = intervals.find((interval) => interval === 3 || interval === 4);
  const fifths = getFifthIntervals(intervals);
  return [0, ...(typeof third === 'number' ? [third] : []), ...fifths];
};

const hasFifth = (voicing: ChordVoicing, root: PitchClass, intervals: number[]): boolean => {
  const fifthIntervals = new Set(getFifthIntervals(intervals));
  return voicing.stringPitches.some((pitch) => {
    if (pitch === null) return false;
    const interval = normalizePitch(pitch - root);
    return fifthIntervals.has(interval);
  });
};

const getVoicingScore = (voicing: ChordVoicing, root: PitchClass, targetStrings: number): number => {
  const frets = voicing.frets.filter((fret) => fret !== 'x') as number[];
  if (!frets.length) {
    return Number.POSITIVE_INFINITY;
  }

  const minFret = Math.min(...frets);
  const maxFret = Math.max(...frets);
  const spanPenalty = (maxFret - minFret) * 2;
  const mutedCount = voicing.frets.filter((fret) => fret === 'x').length;

  let jumpPenalty = 0;
  for (let i = 0; i < voicing.frets.length - 1; i += 1) {
    const current = voicing.frets[i];
    const next = voicing.frets[i + 1];
    if (current !== 'x' && next !== 'x') {
      const diff = Math.abs((current as number) - (next as number));
      if (diff > 3) {
        jumpPenalty += diff - 3;
      }
    }
  }

  const bassIndex = voicing.frets.findIndex((fret) => fret !== 'x');
  const bassPitch = bassIndex >= 0 ? voicing.stringPitches[bassIndex] : null;
  const bassPenalty = bassPitch !== null && bassPitch !== root ? 2 : 0;

  const stringPenalty = Math.abs(targetStrings - frets.length);
  const positionPenalty = minFret * 0.2;

  return spanPenalty + jumpPenalty + mutedCount + bassPenalty + stringPenalty + positionPenalty;
};

const generateChordVoicings = (chordTones: PitchClass[], root: PitchClass, startFret: number): ScoredVoicing[] => {
  const allowOpen = startFret <= 1;
  const windowStart = allowOpen ? 0 : startFret;
  const windowEnd = Math.min(windowStart + WINDOW_FRET_SPAN, TOTAL_FRETS);
  const toneSet = new Set<PitchClass>(chordTones);
  const intervals = chordTones
    .map((tone) => normalizePitch(tone - root))
    .sort((a, b) => a - b);
  const requiredIntervals = new Set(getRequiredIntervals(intervals));

  const candidatesPerString: CandidateFret[][] = STANDARD_TUNING.map((openPitch) => {
    const candidates: CandidateFret[] = [];
    for (let fret = windowStart; fret <= windowEnd; fret += 1) {
      const pitchClass = normalizePitch(openPitch + fret);
      if (toneSet.has(pitchClass)) {
        candidates.push({ fret, pitchClass });
      }
    }
    return candidates;
  });

  const hasRequiredToneOnString = STANDARD_TUNING.map((openPitch) => {
    for (let fret = windowStart; fret <= windowEnd; fret += 1) {
      const interval = normalizePitch(openPitch + fret - root);
      if (requiredIntervals.has(interval)) {
        return true;
      }
    }
    return false;
  });

  const voicings: ChordVoicing[] = [];
  const seenPatterns = new Set<string>();
  const minStrings = 3;
  const maxStrings = 6;

  const selection: Array<CandidateFret | null> = new Array(6).fill(null);

  const recordCandidate = () => {
    const activeStrings = selection.filter((value) => value !== null) as CandidateFret[];
    const activeCount = activeStrings.length;
    if (activeCount < minStrings || activeCount > maxStrings) {
      return;
    }

    const intervalsPresent = new Set<number>();
    const frets: number[] = [];
    selection.forEach((choice) => {
      if (!choice) return;
      const interval = normalizePitch(choice.pitchClass - root);
      intervalsPresent.add(interval);
      frets.push(choice.fret);
    });

    let missingRequired = false;
    requiredIntervals.forEach((interval) => {
      if (!intervalsPresent.has(interval)) {
        missingRequired = true;
      }
    });
    if (missingRequired) {
      return;
    }

    const minFret = Math.min(...frets);
    const maxFret = Math.max(...frets);
    if (maxFret - minFret > WINDOW_FRET_SPAN) {
      return;
    }

    const strings = selection.map((choice) => (choice ? choice.fret : 'x'));
    for (let stringIndex = 0; stringIndex < strings.length; stringIndex += 1) {
      if (strings[stringIndex] === 'x' && hasRequiredToneOnString[stringIndex]) {
        return;
      }
    }

    const pattern = strings.join('-');
    if (seenPatterns.has(pattern)) {
      return;
    }
    seenPatterns.add(pattern);

    const stringPitches = selection.map((choice) => (choice ? choice.pitchClass : null));

    voicings.push({
      frets: strings,
      stringPitches,
      fretSpan: { min: minFret, max: maxFret },
      windowStart,
      windowEnd,
    });
  };

  const walk = (stringIndex: number, activeCount: number) => {
    if (stringIndex === 6) {
      recordCandidate();
      return;
    }

    const remaining = 6 - stringIndex;
    if (activeCount > maxStrings || activeCount + remaining < minStrings) {
      return;
    }

    const candidates = candidatesPerString[stringIndex];
    selection[stringIndex] = null;
    walk(stringIndex + 1, activeCount);

    candidates.forEach((candidate) => {
      selection[stringIndex] = candidate;
      walk(stringIndex + 1, activeCount + 1);
      selection[stringIndex] = null;
    });
  };

  walk(0, 0);

  let filteredVoicings = voicings;
  const hasCompleteTriad = voicings.some((voicing) => hasFifth(voicing, root, intervals));
  if (hasCompleteTriad) {
    filteredVoicings = voicings.filter((voicing) => hasFifth(voicing, root, intervals));
  }

  const scored = filteredVoicings
    .map((voicing) => ({
      voicing,
      score: getVoicingScore(voicing, root, 4),
    }))
    .sort((a, b) => a.score - b.score);

  return scored;
};

const detectBarre = (frets: FretValue[]) => {
  const fretted = frets
    .map((fret, index) => (typeof fret === 'number' && fret > 0 ? { fret, index } : null))
    .filter((value): value is { fret: number; index: number } => Boolean(value));

  if (!fretted.length) {
    return null;
  }

  const minFret = Math.min(...fretted.map((note) => note.fret));
  const barreStrings = fretted.filter((note) => note.fret === minFret).map((note) => note.index);
  if (barreStrings.length < 2) {
    return null;
  }

  return {
    fret: minFret,
    fromString: Math.min(...barreStrings),
    toString: Math.max(...barreStrings),
    finger: 1,
  };
};

const assignFingerNumbers = (frets: FretValue[]) => {
  const fretted = frets
    .map((fret, index) => (typeof fret === 'number' && fret > 0 ? { fret, index } : null))
    .filter((value): value is { fret: number; index: number } => Boolean(value));
  const fingers = new Array(6).fill(null) as Array<number | null>;

  if (!fretted.length) {
    return fingers;
  }

  const uniqueFrets = Array.from(new Set(fretted.map((note) => note.fret))).sort((a, b) => a - b);
  uniqueFrets.forEach((fret, idx) => {
    const finger = Math.min(idx + 1, 4);
    fretted.filter((note) => note.fret === fret).forEach((note) => {
      fingers[note.index] = finger;
    });
  });

  return fingers;
};

const buildChordShape = (
  frets: FretValue[],
  providedFingers?: Array<number | null>
): ChordDiagramShape => {
  const numericFrets = frets.filter((fret) => typeof fret === 'number' && fret > 0) as number[];
  const minFret = numericFrets.length ? Math.min(...numericFrets) : 1;
  const startFret = minFret > 1 ? minFret : 1;
  const fingers = providedFingers ?? assignFingerNumbers(frets);
  const barre = detectBarre(frets);
  return {
    frets,
    fingers,
    startFret,
    barre,
  };
};

const getBestVoicingShape = (chordTones: PitchClass[], root: PitchClass): ChordDiagramShape => {
  let best: ScoredVoicing | null = null;
  for (let startFret = 1; startFret <= TOTAL_FRETS; startFret += 1) {
    const scored = generateChordVoicings(chordTones, root, startFret);
    const candidate = scored[0];
    if (!candidate) continue;
    const adjustedScore = candidate.score + startFret * 0.3;
    if (!best || adjustedScore < best.score + best.voicing.windowStart * 0.3) {
      best = candidate;
    }
  }

  if (!best) {
    return buildChordShape(['x', 'x', 'x', 'x', 'x', 'x']);
  }

  return buildChordShape(best.voicing.frets);
};

export const getDiatonicChordDiagrams = (
  currentKey: CurrentKeyData,
  spellingMode: SpellingMode,
  tonality: Tonality
): DiatonicChordDiagram[] => {
  const keyName = tonality === 'major' ? currentKey.major : currentKey.minor;
  const rootName = stripMinorSuffix(keyName);
  const intervals = tonality === 'major' ? MAJOR_INTERVALS : MINOR_INTERVALS;
  const scaleNotes = getScaleNotes(rootName, intervals);
  const degreeLabels = tonality === 'major' ? ROMAN_MAJOR : ROMAN_MINOR;

  return scaleNotes.map((note, index) => {
    const chordTones = [
      scaleNotes[index % 7].pitchClass,
      scaleNotes[(index + 2) % 7].pitchClass,
      scaleNotes[(index + 4) % 7].pitchClass,
    ];
    const intervalsFromRoot = chordTones
      .map((tone) => normalizePitch(tone - note.pitchClass))
      .sort((a, b) => a - b);
    const quality = getChordQuality(intervalsFromRoot);
    const suffix = getChordSuffix(quality);
    const chordName = `${note.name}${suffix}`;

    const preferredShape = PREFERRED_SHAPES[chordName];
    const shape = preferredShape
      ? buildChordShape(preferredShape.frets, preferredShape.fingers)
      : getBestVoicingShape(chordTones, note.pitchClass);

    return {
      id: `${tonality}-${index}-${chordName}`,
      degree: degreeLabels[index] ?? `${index + 1}`,
      name: chordName,
      shape,
    };
  });
};
