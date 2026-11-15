/** Signed shortest delta across atan2's ±180-degree boundary. */
export const angleDelta = (previous: number, current: number) => ((current - previous + 540) % 360) - 180;
/** Preserve turn count while choosing the nearest equivalent position. */
export const rotationForIndex = (rotation: number, index: number) => {
  const target = -index * 30;
  return target + Math.round((rotation - target) / 360) * 360;
};
