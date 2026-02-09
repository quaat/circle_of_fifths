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