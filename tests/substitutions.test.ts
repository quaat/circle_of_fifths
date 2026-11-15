import { describe, expect, it } from 'vitest';
import { generateSubstitutions, getTritoneSubstitution } from '../utils/substitutions';
import { chordPitchClasses } from '../utils/theory';
import { getKeyDataAtIndex } from '../utils/musicTheory';
import { SpellingMode } from '../types';
const groups = (tonic: string, mode: 'major' | 'minor') => generateSubstitutions(tonic, mode, SpellingMode.Auto);
const entries = (tonic: string, mode: 'major' | 'minor') => groups(tonic, mode).flatMap(d => d.groups.flatMap(g => g.items));
describe('harmonic relations', () => {
  it('substitutes Db7 for G7 and verifies guide tones', () => {
    const sub = getTritoneSubstitution('G', 'C');
    expect(sub.chord).toBe('Db7');
    expect(sub.guideTones).toEqual([11, 5]);
    expect(sub.guideTones.every(pc => chordPitchClasses('Db', 'dominant').includes(pc))).toBe(true);
    expect(() => getTritoneSubstitution('B', 'C')).toThrow();
  });
  it('does not apply a dominant-seventh tritone claim to vii° or minor v', () => {
    expect(groups('C', 'major')[6].groups.some(g => g.id === 'tritone-subs')).toBe(false);
    expect(groups('Cm', 'minor')[4].groups.some(g => g.id === 'tritone-subs')).toBe(false);
    expect(groups('Cm', 'minor')[4].functionFamily).toBe('Modal');
    expect(entries('C', 'major').some(e => e.chord === 'F7' && e.source === 'Dominant-seventh substitution')).toBe(false);
  });
  it('uses half-diminished ii and V7 into a minor target', () => {
    const prep = groups('Cm', 'minor')[0].groups.find(g => g.id === 'common-reharm')!.items[0];
    expect(prep.example).toBe('Dm7b5 → G7 → Cm');
    expect(prep.relation).toBe('preparation');
    expect(prep.destination).toBe('Cm');
    const altered = groups('Cm', 'minor')[4].groups.find(g => g.id === 'minor-dominant')!.items[0];
    expect(altered.chord).toBe('V7: G7');
    expect(altered.source).toBe('Harmonic minor');
  });
  it('explains the Neapolitan independently from parallel-minor borrowing', () => {
    const n = groups('C', 'major')[1].groups.find(g => g.id === 'neapolitan')!.items[0];
    expect(n.example).toBe('Db/F → G7 → C');
    expect(n.source).toBe('Neapolitan harmony');
    expect(n.destination).toBe('G7');
  });
  for (const index of [0, 6, 7]) for (const tonality of ['major', 'minor'] as const) {
    it(`provides contextual examples and destinations for ${index}/${tonality}`, () => {
      const key = getKeyDataAtIndex(index, SpellingMode.Auto);
      for (const entry of entries(tonality === 'major' ? key.major : key.minor, tonality)) {
        expect(entry.source.length).toBeGreaterThan(0);
        expect(entry.example.length).toBeGreaterThan(0);
        if (entry.relation !== 'replacement') expect(entry.destination).toBeTruthy();
        if (entry.source === 'Major scale' || entry.source === 'Natural minor') expect(entry.resolvesTo).toContain('no resolution is implied');
      }
    });
  }
});
