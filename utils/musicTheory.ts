import { KeyDefinition, SpellingMode, CurrentKeyData } from '../types';

// The Circle of Fifths order (Clockwise starting from C at 12 o'clock)
// Index 0: C, Index 1: G, ... Index 11: F
const CIRCLE_DATA: KeyDefinition[] = [
  { major: ['C'], minor: ['Am'] },                     // 0
  { major: ['G'], minor: ['Em'] },                     // 1
  { major: ['D'], minor: ['Bm'] },                     // 2
  { major: ['A'], minor: ['F#m', 'Gbm'] },             // 3
  { major: ['E'], minor: ['C#m', 'Dbm'] },             // 4
  { major: ['B', 'Cb'], minor: ['G#m', 'Abm'] },       // 5
  { major: ['F#', 'Gb'], minor: ['D#m', 'Ebm'] },      // 6
  { major: ['C#', 'Db'], minor: ['A#m', 'Bbm'] },      // 7
  { major: ['G#', 'Ab'], minor: ['Fm'] },              // 8
  { major: ['D#', 'Eb'], minor: ['Cm'] },              // 9
  { major: ['A#', 'Bb'], minor: ['Gm'] },              // 10
  { major: ['F'], minor: ['Dm'] },                     // 11
];

/**
 * Gets the display label for a key based on the spelling mode.
 * @param keys Array of key names (e.g. ['F#', 'Gb'])
 * @param index The index in the circle (0-11)
 * @param mode Current spelling mode
 */
export const getKeyLabel = (keys: string[], index: number, mode: SpellingMode): string => {
  if (keys.length === 1) return keys[0];

  const [sharp, flat] = keys; // Assuming structure [Sharp, Flat] for length 2

  if (mode === SpellingMode.Sharps) return sharp;
  if (mode === SpellingMode.Flats) return flat;

  // Auto Mode Logic
  // Right side (G to E) prefers sharps.
  // Bottom (B/Cb, F#/Gb, C#/Db) is tricky, but often:
  // F# is common in sharp keys, Gb in flat keys.
  // Let's bias based on typical usage in the circle.
  // 0-5 (C-B): Sharps
  // 6 (F#/Gb): Crossover. Usually Gb in "Flat" heavy contexts, F# in "Sharp". 
  // Standard circle often puts F# / Gb split. Let's return the one that makes sense for the side.
  // 6 is bottom. 7-11 are flats.
  
  if (index >= 0 && index <= 5) return sharp; // C, G, D, A, E, B
  if (index === 6) return mode === SpellingMode.Auto ? `${sharp}/${flat}` : sharp; // Special case for bottom
  return flat; // Db, Ab, Eb, Bb, F
};

export const getKeyDataAtIndex = (index: number, mode: SpellingMode): CurrentKeyData => {
  // Normalize index to 0-11
  const normalizedIndex = (index % 12 + 12) % 12;
  const data = CIRCLE_DATA[normalizedIndex];
  
  // Specific override for Auto mode visual label cleaning
  // In the "Key" display, we might want just one if it's the selected key, 
  // but for the circle labels we might show both or one.
  // Let's assume standard behavior:
  // If Auto, we pick the most common.
  let major = data.major[0];
  let minor = data.minor[0];

  if (data.major.length > 1) {
    if (mode === SpellingMode.Flats) major = data.major[1];
    else if (mode === SpellingMode.Sharps) major = data.major[0];
    else {
      // Auto
      // Prefer Flats for 6-11, Sharps for 0-5
      if (normalizedIndex > 5 || normalizedIndex === 11) major = data.major[1]; 
      if (normalizedIndex === 6) major = data.major[0]; // F# is slightly more standard at 6 in some circles, but Gb is also valid. Let's stick to F# for 6 in auto unless user forces flats.
    }
  }

  if (data.minor.length > 1) {
     if (mode === SpellingMode.Flats) minor = data.minor[1];
     else minor = data.minor[0];
  }

  return {
    index: normalizedIndex,
    major,
    minor
  };
};

// Calculate the index based on rotation.
// 0 deg = Index 0 (C)
// -30 deg = Index 1 (G)
export const getIndexFromRotation = (rotationDeg: number): number => {
  const segmentAngle = 30;
  // Negative rotation moves clockwise in indices
  const index = Math.round(-rotationDeg / segmentAngle);
  return (index % 12 + 12) % 12;
};

export const snapRotationToIndex = (rotationDeg: number): number => {
  const segmentAngle = 30;
  const index = Math.round(rotationDeg / segmentAngle);
  return index * segmentAngle;
};

// Get the Neighbors relative to current
export const getContextKeys = (currentIndex: number, mode: SpellingMode) => {
  return {
    left: getKeyDataAtIndex(currentIndex - 1, mode), // 4th (CCW)
    center: getKeyDataAtIndex(currentIndex, mode),   // Key
    right: getKeyDataAtIndex(currentIndex + 1, mode) // 5th (CW)
  };
};

// Chord progressions
export const getChords = (currentIndex: number, mode: SpellingMode) => {
  // Simple Diatonic mapping relative to Major scale
  // I, ii, iii, IV, V, vi, dim
  // Circle indices:
  // I = current
  // IV = left (CCW)
  // V = right (CW)
  // vi = relative minor of I
  // ii = relative minor of IV
  // iii = relative minor of V
  
  const I = getKeyDataAtIndex(currentIndex, mode).major;
  const IV = getKeyDataAtIndex(currentIndex - 1, mode).major;
  const V = getKeyDataAtIndex(currentIndex + 1, mode).major;
  const vi = getKeyDataAtIndex(currentIndex, mode).minor;
  const ii = getKeyDataAtIndex(currentIndex - 1, mode).minor;
  const iii = getKeyDataAtIndex(currentIndex + 1, mode).minor;

  return [
    { name: 'Pop Punk / Classic', progression: `${I} – ${V} – ${vi} – ${IV}` },
    { name: 'Jazz 2-5-1', progression: `${ii} – ${V} – ${I}` },
    { name: 'Ballad', progression: `${I} – ${vi} – ${IV} – ${V}` },
    { name: 'Blues Turn', progression: `${I} – ${IV} – ${I} – ${V} – ${IV} – ${I}` },
  ];
};
