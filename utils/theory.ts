import { Tonality } from '../types';

export type NoteLetter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export interface NoteSpelling { letter: NoteLetter; accidental: number }
export type ChordQuality = 'major' | 'minor' | 'diminished' | 'dominant' | 'diminished7' | 'minor7' | 'major7' | 'halfDiminished7';
export interface MusicalKey { tonic: NoteSpelling; tonality: Tonality }
const LETTERS: NoteLetter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_PCS = [0, 2, 4, 5, 7, 9, 11];
export const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
export const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];
export const MAJOR_ROMAN = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
// Scale-relative minor convention: III, VI, VII are unaltered natural-minor degrees.
export const MINOR_ROMAN = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
export const normalizePitch = (value: number) => ((value % 12) + 12) % 12;
export const parseNoteName = (input: string): NoteSpelling => {
  const match = /^([A-G])([#]*|[b]*)$/.exec(input);
  if (!match) throw new Error(`Invalid note spelling: ${input}`);
  return { letter: match[1] as NoteLetter, accidental: match[2].includes('#') ? match[2].length : -match[2].length };
};
export const formatNote = ({ letter, accidental }: NoteSpelling) => letter + (accidental >= 0 ? '#'.repeat(accidental) : 'b'.repeat(-accidental));
export const noteToPc = (note: string | NoteSpelling): number => {
  const parsed = typeof note === 'string' ? parseNoteName(note) : note;
  return normalizePitch(NATURAL_PCS[LETTERS.indexOf(parsed.letter)] + parsed.accidental);
};
export const stripMinorSuffix = (name: string) => name.endsWith('m') ? name.slice(0, -1) : name;
export const spellNoteFromDegree = (tonic: string, interval: number, degree: number): string => {
  if (!Number.isInteger(degree) || degree < 1) throw new Error('Degree must be a positive integer');
  const root = parseNoteName(tonic);
  const letterIndex = (LETTERS.indexOf(root.letter) + degree - 1) % 7;
  const desired = normalizePitch(noteToPc(root) + interval);
  const diff = normalizePitch(desired - NATURAL_PCS[letterIndex]);
  return formatNote({ letter: LETTERS[letterIndex], accidental: diff > 6 ? diff - 12 : diff });
};
export const getScaleNotes = (tonic: string, intervals: number[]) => intervals.map((interval, i) => {
  const name = spellNoteFromDegree(tonic, interval, i + 1);
  return { name, pitchClass: noteToPc(name) };
});
export const getKeyScale = (key: MusicalKey) => getScaleNotes(formatNote(key.tonic), key.tonality === 'major' ? MAJOR_INTERVALS : MINOR_INTERVALS);
const CHORD_INTERVALS: Record<ChordQuality, number[]> = {
  major: [0, 4, 7], minor: [0, 3, 7], diminished: [0, 3, 6], dominant: [0, 4, 7, 10],
  diminished7: [0, 3, 6, 9], minor7: [0, 3, 7, 10], major7: [0, 4, 7, 11], halfDiminished7: [0, 3, 6, 10],
};
export const chordPitchClasses = (root: string, quality: ChordQuality) => CHORD_INTERVALS[quality].map(interval => normalizePitch(noteToPc(root) + interval));
export const formatChord = (root: string, quality: ChordQuality) => root + ({ major: '', minor: 'm', diminished: 'dim', dominant: '7', diminished7: 'dim7', minor7: 'm7', major7: 'maj7', halfDiminished7: 'm7b5' }[quality]);
export const createDiatonicChords = (tonic: string, tonality: Tonality) => {
  const notes = getScaleNotes(tonic, tonality === 'major' ? MAJOR_INTERVALS : MINOR_INTERVALS);
  const roman = tonality === 'major' ? MAJOR_ROMAN : MINOR_ROMAN;
  return notes.map((note, index) => {
    const chordNotes = [notes[index], notes[(index + 2) % 7], notes[(index + 4) % 7]];
    const third = normalizePitch(chordNotes[1].pitchClass - note.pitchClass);
    const fifth = normalizePitch(chordNotes[2].pitchClass - note.pitchClass);
    const quality: ChordQuality = fifth === 6 ? 'diminished' : third === 3 ? 'minor' : 'major';
    return { degree: roman[index], degreeIndex: index, root: note.name, quality, chordName: formatChord(note.name, quality), notes: chordNotes.map(n => n.name) };
  });
};
