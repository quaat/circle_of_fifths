import { SpellingMode, Tonality } from '../types';
import { chordPitchClasses, createDiatonicChords, formatChord, normalizePitch, noteToPc, spellNoteFromDegree, stripMinorSuffix } from './theory';

type FunctionFamily = 'Tonic' | 'Predominant' | 'Dominant' | 'Modal';
export type SubstitutionComplexity = 'common' | 'advanced';
export type HarmonicRelation = 'replacement' | 'preparation' | 'passing' | 'cadence';
export interface SubstitutionEntry {
  chord: string;
  reason: string;
  resolvesTo: string;
  complexity: SubstitutionComplexity;
  relation: HarmonicRelation;
  source: string;
  example: string;
  destination?: string;
}
export interface SubstitutionGroup { id: string; label: string; items: SubstitutionEntry[] }
export interface DegreeSubstitutions { degree: string; chord: string; functionFamily: FunctionFamily; groups: SubstitutionGroup[] }

// Natural-minor v and VII are modal chords, not leading-tone dominants.
const getFunctionFamily = (tonality: Tonality, index: number): FunctionFamily => {
  if (index === 0) return 'Tonic';
  if ([1, 3].includes(index)) return 'Predominant';
  if (tonality === 'minor') return 'Modal';
  return [4, 6].includes(index) ? 'Dominant' : 'Tonic';
};

/** A dominant seventh's third and seventh must also occur in its substitute. */
export const getTritoneSubstitution = (dominantRoot: string, targetRoot: string) => {
  if (normalizePitch(noteToPc(dominantRoot) - noteToPc(targetRoot)) !== 7) {
    throw new Error('Dominant root must be a fifth above its destination');
  }
  const root = spellNoteFromDegree(targetRoot, 1, 2);
  const original = chordPitchClasses(dominantRoot, 'dominant');
  const replacement = chordPitchClasses(root, 'dominant');
  const guideTones = [original[1], original[3]];
  if (!guideTones.every(pc => replacement.includes(pc))) throw new Error('Substitute does not share guide tones');
  return { chord: formatChord(root, 'dominant'), original: formatChord(dominantRoot, 'dominant'), guideTones };
};

export const generateSubstitutions = (tonicInput: string, tonality: Tonality, _spellingMode: SpellingMode): DegreeSubstitutions[] => {
  const tonic = stripMinorSuffix(tonicInput);
  const diatonic = createDiatonicChords(tonic, tonality);
  const tonicChord = diatonic[0].chordName;
  const dominant = formatChord(diatonic[4].root, 'dominant');
  const isMinor = tonality === 'minor';
  return diatonic.map(chord => {
    const groups: SubstitutionGroup[] = [];
    const family = getFunctionFamily(tonality, chord.degreeIndex);
    const add = (id: string, label: string, items: SubstitutionEntry[]) => {
      if (items.length) groups.push({ id, label, items });
    };
    // These are conditional replacements, not claims that one chord resolves to another.
    const alternatives = diatonic.filter(candidate => candidate.degree !== chord.degree &&
      getFunctionFamily(tonality, candidate.degreeIndex) === family && family !== 'Modal');
    add('diatonic-alternatives', 'Possible diatonic replacements', alternatives.map(candidate => ({
      chord: `${candidate.degree}: ${candidate.chordName}`, relation: 'replacement', source: isMinor ? 'Natural minor' : 'Major scale',
      reason: 'A related harmonic role can permit this replacement; check melody, bass and surrounding chords.',
      resolvesTo: `May replace ${chord.chordName}; no resolution is implied.`,
      example: `${chord.chordName} ⇒ ${candidate.chordName} (context-dependent)`, complexity: 'common',
    })));

    if (chord.degreeIndex !== 0 && chord.quality !== 'diminished') {
      const applied = formatChord(spellNoteFromDegree(chord.root, 7, 5), 'dominant');
      const leading = formatChord(spellNoteFromDegree(chord.root, 11, 7), 'diminished');
      add('secondary-dominants', 'Prepare this chord: applied dominants', [
        { chord: `V7/${chord.degree}: ${applied}`, relation: 'preparation', source: 'Tonicization', destination: chord.chordName,
          reason: 'Insert an applied dominant before the target; this prepares rather than replaces it.',
          resolvesTo: `Resolves to ${chord.chordName}.`, example: `${applied} → ${chord.chordName}`, complexity: 'common' },
        { chord: `vii°/${chord.degree}: ${leading}`, relation: 'preparation', source: 'Tonicization', destination: chord.chordName,
          reason: 'The target’s raised leading tone supports a leading-tone diminished triad.',
          resolvesTo: `Resolves to ${chord.chordName}.`, example: `${leading} → ${chord.chordName}`, complexity: 'advanced' },
      ]);
    }

    if (!isMinor && chord.degreeIndex === 3) {
      const iv = formatChord(chord.root, 'minor');
      add('modal-interchange', 'Parallel-minor borrowing', [{
        chord: `iv: ${iv}`, relation: 'replacement', source: 'Parallel natural minor', destination: tonicChord,
        reason: 'Borrow minor iv for a plagal color; its lowered sixth can descend to the fifth of tonic.',
        resolvesTo: `Can lead to ${tonicChord}.`, example: `${chord.chordName} → ${iv} → ${tonicChord}`, complexity: 'advanced',
      }]);
    }
    if (isMinor && chord.degreeIndex === 4) {
      add('minor-dominant', 'Raised leading tone in minor', [{
        chord: `V7: ${dominant}`, relation: 'replacement', source: 'Harmonic minor', destination: tonicChord,
        reason: 'Raise scale degree 7 to form a leading-tone dominant seventh in place of natural-minor v.',
        resolvesTo: `Resolves to ${tonicChord}.`, example: `${dominant} → ${tonicChord}`, complexity: 'common',
      }]);
    }
    if ([1, 3].includes(chord.degreeIndex)) {
      const neapolitan = spellNoteFromDegree(tonic, 1, 2);
      const bass = spellNoteFromDegree(tonic, 5, 4);
      add('neapolitan', 'Chromatic predominant', [{
        chord: `♭II6: ${neapolitan}/${bass}`, relation: 'preparation', source: 'Neapolitan harmony', destination: dominant,
        reason: 'A major chord on lowered degree 2, usually in first inversion. It is not diatonic to parallel natural minor.',
        resolvesTo: `Typically prepares ${dominant}, then ${tonicChord}.`,
        example: `${neapolitan}/${bass} → ${dominant} → ${tonicChord}`, complexity: 'advanced',
      }]);
    }
    // On the V row, this explicitly replaces V7, not a minor v or diminished vii°.
    if ((!isMinor && chord.degreeIndex === 4) || chord.degreeIndex === 0) {
      const sub = getTritoneSubstitution(diatonic[4].root, tonic);
      add('tritone-subs', 'Dominant-seventh tritone substitution', [{
        chord: sub.chord, relation: chord.degreeIndex === 0 ? 'cadence' : 'replacement', source: 'Dominant-seventh substitution', destination: tonicChord,
        reason: `Replaces ${sub.original}, sharing its third/seventh pitch classes enharmonically; the bass approaches tonic by semitone.`,
        resolvesTo: `Resolves to ${tonicChord}; check melody and voicing.`,
        example: `${sub.original} → ${tonicChord} ⇒ ${sub.chord} → ${tonicChord}`, complexity: 'advanced',
      }]);
    }
    if (chord.degreeIndex === 0) {
      const leading = formatChord(spellNoteFromDegree(tonic, 11, 7), 'diminished7');
      add('leading-tone', 'Leading-tone cadence', [{
        chord: leading, relation: 'cadence', source: isMinor ? 'Harmonic minor' : 'Borrowed diminished seventh (parallel harmonic minor)', destination: tonicChord,
        reason: 'A fully diminished seventh on the leading tone approaches tonic; its seventh is not diatonic in major.',
        resolvesTo: `Resolves to ${tonicChord}.`, example: `${leading} → ${tonicChord}`, complexity: 'advanced',
      }]);
      if (!isMinor) {
        const backdoor = formatChord(spellNoteFromDegree(tonic, 10, 7), 'dominant');
        add('backdoor', 'Backdoor cadence', [{
          chord: backdoor, relation: 'cadence', source: 'Jazz backdoor dominant', destination: tonicChord,
          reason: '♭VII7 can approach major tonic with suitable voice leading, often following iv7.',
          resolvesTo: `Can resolve to ${tonicChord}.`, example: `${backdoor} → ${tonicChord}`, complexity: 'advanced',
        }]);
      }
    }
    if (chord.quality !== 'diminished') {
      const ii = formatChord(spellNoteFromDegree(chord.root, 2, 2), chord.quality === 'minor' ? 'halfDiminished7' : 'minor7');
      const v = formatChord(spellNoteFromDegree(chord.root, 7, 5), 'dominant');
      add('common-reharm', 'Prepare this chord: ii–V', [{
        chord: `${ii} → ${v}`, relation: 'preparation', source: chord.quality === 'minor' ? 'Minor iiø7–V7–i' : 'Major ii7–V7–I', destination: chord.chordName,
        reason: 'Insert a local ii–V before the target; chromatic notes may need melody adjustments.',
        resolvesTo: `Resolves to ${chord.chordName}.`, example: `${ii} → ${v} → ${chord.chordName}`, complexity: 'common',
      }]);
    }
    return { degree: chord.degree, chord: chord.chordName, functionFamily: family, groups };
  });
};
