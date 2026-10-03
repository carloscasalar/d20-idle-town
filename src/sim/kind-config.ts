/**
 * Tunables that belong to one kind of work, keyed by that kind's id.
 * A YAML file describes each kind in one place. The validator rejects a key
 * that is not a registered kind.
 */

import { freeze } from '../core/freeze';
import type { DeepReadonly } from '../core/readonly';
import type { Difficulty } from '../quests/encounters';

export interface ContractKindConfig {
  /** Renown gained when this kind succeeds. */
  renown: number;
  /** Hours unanswered work of a kind that expires may stay open. */
  openTicks: number;
}

export interface AssaultKindConfig {
  /** Renown gained for breaking the lair. */
  renown: number;
  /** When the profile says `configured`, posting reveals the encounter count. */
  revealsCount: boolean;
  /** Chance an idle company that can pay a resurrection takes this work. */
  appetite: number;
  /** Posted once some company is within this many levels of the lair. */
  levelGap: number;
  /** Fights before the boss, inclusive, plus the boss. */
  encounters: [number, number];
  /** Weight of each difficulty. */
  difficultyWeights: { difficulty: Difficulty; weight: number }[];
  /** Guild gold per lair level, limited by the guild's treasury. */
  rewardPerLevel: number;
}

/** The kinds the configuration knows. A new kind is a new key. */
export interface WorkKindConfigs {
  contract: ContractKindConfig;
  assault: AssaultKindConfig;
}

export const DEFAULT_KIND_CONFIGS: WorkKindConfigs = freeze({
  contract: {
    renown: 1,
    openTicks: 72,
  },
  assault: {
    renown: 3,
    revealsCount: true,
    appetite: 0.35,
    levelGap: 1,
    encounters: [3, 5],
    difficultyWeights: [
      { difficulty: 'easy', weight: 2 },
      { difficulty: 'intermediate', weight: 4 },
      { difficulty: 'hard', weight: 2 },
    ],
    rewardPerLevel: 150,
  },
});

/** Renown configured for a kind that grants it. */
export function renownOf(kinds: DeepReadonly<WorkKindConfigs>, id: string): number {
  const entry = kinds[id as keyof WorkKindConfigs];
  if (!entry) throw new Error(`Kind "${id}" grants renown but has no configuration.`);
  return entry.renown;
}

/** Appetite of a kind an idle company is offered as a lair. */
export function appetiteOf(kinds: DeepReadonly<WorkKindConfigs>, id: string): number {
  const entry = kinds[id as keyof WorkKindConfigs];
  if (!entry || !('appetite' in entry)) throw new Error(`Kind "${id}" is offered like a lair but has no appetite.`);
  return entry.appetite;
}
