import { describe, expect, it } from 'vitest';
import { getKeyDataAtIndex, getChords, getIndexFromRotation } from '../utils/musicTheory';
import { SpellingMode } from '../types';
import { chordPitchClasses, createDiatonicChords, getScaleNotes, MAJOR_INTERVALS, MINOR_INTERVALS, noteToPc, parseNoteName, stripMinorSuffix } from '../utils/theory';

describe('contextual spelling', () => {
  it('keeps Db major and its relative minor/progression consistent', () => {
    expect(getKeyDataAtIndex(7, SpellingMode.Auto)).toEqual({ index: 7, major: 'Db', minor: 'Bbm' });
    expect(getChords(7, SpellingMode.Auto)[0].progression).toBe('Db – Ab – Bbm – Gb');
  });
  it('spells F# major V as C# and derives relative minors by letter', () => {
    expect(getChords(6, SpellingMode.Auto)[0].progression).toBe('F# – C# – D#m – B');
    expect(getKeyDataAtIndex(8, SpellingMode.Sharps).minor).toBe('E#m');
    expect(getKeyDataAtIndex(3, SpellingMode.Flats).minor).toBe('F#m');
  });
  for (const mode of Object.values(SpellingMode)) for (let index = 0; index < 12; index++) {
    it(`preserves scale letters, pitch intervals and chord tones at ${index}/${mode}`, () => {
      const key = getKeyDataAtIndex(index, mode);
      expect(getKeyDataAtIndex(index + 12, mode)).toEqual(key);
      expect(getIndexFromRotation(-30 * index)).toBe(index);
      for (const tonality of ['major', 'minor'] as const) {
        const tonic = tonality === 'major' ? key.major : stripMinorSuffix(key.minor);
        const intervals = tonality === 'major' ? MAJOR_INTERVALS : MINOR_INTERVALS;
        const notes = getScaleNotes(tonic, intervals);
        expect(new Set(notes.map(n => n.name[0])).size).toBe(7);
        expect(notes.map(n => (n.pitchClass - noteToPc(tonic) + 12) % 12)).toEqual(intervals);
        for (const chord of createDiatonicChords(tonic, tonality)) {
          expect(chord.notes.map(noteToPc)).toEqual(chordPitchClasses(chord.root, chord.quality));
        }
      }
    });
  }
  it('rejects invalid note input instead of silently using C', () => {
    for (const invalid of ['H', 'Cm', 'C#b', 'Db7', '', 'C garbage']) expect(() => parseNoteName(invalid)).toThrow();
  });
});
