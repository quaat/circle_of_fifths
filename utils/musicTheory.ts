import { SpellingMode, CurrentKeyData, Tonality } from '../types';
import { createDiatonicChords, spellNoteFromDegree } from './theory';

// Choose a whole key's spelling first; derive every related note in that context.
const CIRCLE_TONICS = [
  ['C', 'C'], ['G', 'G'], ['D', 'D'], ['A', 'A'], ['E', 'E'], ['B', 'Cb'],
  ['F#', 'Gb'], ['C#', 'Db'], ['G#', 'Ab'], ['D#', 'Eb'], ['A#', 'Bb'], ['F', 'F'],
];
export const getKeyLabel = (keys: string[], index: number, mode: SpellingMode): string => {
  if (keys.length === 1) return keys[0];
  return keys[mode === SpellingMode.Flats || (mode === SpellingMode.Auto && index > 6) ? 1 : 0];
};
export const getKeyDataAtIndex = (index: number, mode: SpellingMode): CurrentKeyData => {
  const normalizedIndex = (index % 12 + 12) % 12;
  const major = getKeyLabel(CIRCLE_TONICS[normalizedIndex], normalizedIndex, mode);
  return { index: normalizedIndex, major, minor: `${spellNoteFromDegree(major, 9, 6)}m` };
};
export const getIndexFromRotation = (rotationDeg: number): number => {
  const index = Math.round(-rotationDeg / 30);
  return (index % 12 + 12) % 12;
};
export const snapRotationToIndex = (rotationDeg: number): number => Math.round(rotationDeg / 30) * 30;
export const getContextKeys = (currentIndex: number, mode: SpellingMode) => ({
  left: getKeyDataAtIndex(currentIndex - 1, mode),
  center: getKeyDataAtIndex(currentIndex, mode),
  right: getKeyDataAtIndex(currentIndex + 1, mode),
});
export const getChords = (currentIndex: number, mode: SpellingMode, tonality: Tonality = 'major') => {
  const key = getKeyDataAtIndex(currentIndex, mode);
  const tonic = tonality === 'major' ? key.major : key.minor.slice(0, -1);
  const chords = createDiatonicChords(tonic, tonality);
  const progression = (degrees: number[]) => degrees.map(i => chords[i].chordName).join(' – ');
  return tonality === 'major' ? [
    { name: 'I–V–vi–IV', progression: progression([0, 4, 5, 3]) },
    { name: 'ii–V–I (triads)', progression: progression([1, 4, 0]) },
    { name: 'I–vi–IV–V', progression: progression([0, 5, 3, 4]) },
    { name: 'I–IV–I–V–IV–I', progression: progression([0, 3, 0, 4, 3, 0]) },
  ] : [
    { name: 'i–VI–III–VII (natural minor)', progression: progression([0, 5, 2, 6]) },
    { name: 'iiø7–V7–i (raised leading tone)', progression: `${chords[1].root}m7b5 – ${chords[4].root}7 – ${chords[0].chordName}` },
    { name: 'i–iv–v–i (natural minor)', progression: progression([0, 3, 4, 0]) },
  ];
};
