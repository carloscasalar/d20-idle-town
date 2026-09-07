/** 5e experience thresholds: XP_THRESHOLDS[n] is the XP needed to be level n+1. */
export const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000,
  165000, 195000, 225000, 265000, 305000, 355000,
] as const;

export const MAX_LEVEL = 20;

export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= (XP_THRESHOLDS[i] as number)) level = i + 1;
  }
  return Math.min(level, MAX_LEVEL);
}

export function xpToNextLevel(level: number): number | null {
  if (level >= MAX_LEVEL) return null;
  return XP_THRESHOLDS[level] as number;
}
