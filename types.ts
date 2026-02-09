export enum SpellingMode {
  Auto = 'Auto',
  Sharps = 'Sharps',
  Flats = 'Flats',
}

export interface KeyDefinition {
  major: string[]; // [Sharp spelling, Flat spelling] or single if neutral
  minor: string[]; // [Sharp spelling, Flat spelling]
}

export interface CircleSegment {
  index: number;
  labelMajor: string;
  labelMinor: string;
}

export interface CurrentKeyData {
  index: number;
  major: string;
  minor: string;
}

export type Tonality = 'major' | 'minor';

export interface ChordDiagramShape {
  frets: Array<number | 'x'>;
  fingers: Array<number | null>;
  startFret: number;
  barre?: {
    fret: number;
    fromString: number;
    toString: number;
    finger: number;
  } | null;
}

export interface DiatonicChordDiagram {
  id: string;
  degree: string;
  name: string;
  shape: ChordDiagramShape;
}
