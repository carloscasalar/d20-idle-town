import { freeze } from '../core/freeze';

/** One tick is one hour. A day is this many ticks. */
export const TICKS_PER_DAY = 24;

/**
 * Rules Game still applies itself: posting work, choosing its level, ruin,
 * and which lairs the town starts with.
 */
export interface WorldConfig {
  maxOpenQuests: number;
  postingThreshold: number;
  postingCooldown: [number, number];
  ruinDays: number;
  assaultAppetite: number;
  bountyLevelGap: number;
  idleLevelWeight: number;
  busyLevelWeight: number;
  stretchReputation: number;
  stretchPostChance: number;
  idleStretchTicks: number;
  levelStretch: number;
  firstRefusalTicks: number;
  startingLairs: [number, number];
  startingLairLevels: [number, number];
  lairRespawnDays: number;
  lairRespawnSameThemeChance: number;
  lairRespawnLevelGain: [number, number];
  eventLogLimit: number;
  chronicleLimit: number;
}

export const DEFAULT_WORLD_CONFIG: WorldConfig = freeze({
  maxOpenQuests: 8,
  postingThreshold: 25,
  postingCooldown: [12, 30],
  ruinDays: 3,
  assaultAppetite: 0.35,
  bountyLevelGap: 1,
  idleLevelWeight: 3,
  busyLevelWeight: 1,
  stretchReputation: 3,
  stretchPostChance: 0.1,
  idleStretchTicks: TICKS_PER_DAY,
  levelStretch: 1,
  firstRefusalTicks: TICKS_PER_DAY,
  startingLairs: [2, 3],
  startingLairLevels: [5, 8],
  lairRespawnDays: 12,
  lairRespawnSameThemeChance: 0.5,
  lairRespawnLevelGain: [1, 2],
  eventLogLimit: 600,
  chronicleLimit: 300,
});
