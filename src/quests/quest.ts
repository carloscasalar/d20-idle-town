import type { Rng } from '../core/rng';
import type { QuestGiver } from '../town/town';
import { buildEncounter, type Difficulty, type EncounterSpec } from './encounters';
import { THEMES, type ThemeId } from './themes';

export type QuestStatus = 'open' | 'taken' | 'done' | 'failed';

export interface Quest {
  id: string;
  title: string;
  place: string;
  giverId: string;
  theme: ThemeId;
  level: number;
  encounters: EncounterSpec[];
  /** Gold paid on completion. */
  reward: number;
  status: QuestStatus;
  partyId: string | null;
  postedAt: number;
}

let questCounter = 0;

const DIFFICULTY_WEIGHTS: { item: Difficulty; weight: number }[] = [
  { item: 'easy', weight: 4 },
  { item: 'intermediate', weight: 4 },
  { item: 'hard', weight: 2 },
];

const DIFFICULTY_PAY: Record<Difficulty, number> = { easy: 1, intermediate: 1.5, hard: 2.5 };

export function rollDifficulties(rng: Rng): [Difficulty, Difficulty, Difficulty] {
  return [rng.weighted(DIFFICULTY_WEIGHTS), rng.weighted(DIFFICULTY_WEIGHTS), rng.weighted(DIFFICULTY_WEIGHTS)];
}

export function generateQuest(rng: Rng, giver: QuestGiver, level: number, partySize: number, tick: number): Quest {
  const eligible = giver.themes.filter((t) => THEMES[t].minLevel <= level);
  const theme = eligible.length > 0 ? rng.pick(eligible) : rng.pick(giver.themes);
  const def = THEMES[theme];
  const place = rng.pick(def.places);
  const title = rng.pick(def.titles).replace('{place}', place);
  const difficulties = rollDifficulties(rng);
  const encounters = difficulties.map((d) => buildEncounter(rng, theme, partySize, level, d));
  const payFactor = difficulties.reduce((s, d) => s + DIFFICULTY_PAY[d], 0);
  const reward = Math.round(level * level * 12 * payFactor * giver.wealth + 30 * payFactor);
  return {
    id: `quest-${++questCounter}`,
    title,
    place,
    giverId: giver.id,
    theme,
    level,
    encounters,
    reward,
    status: 'open',
    partyId: null,
    postedAt: tick,
  };
}

export function questXp(q: Quest): number {
  return q.encounters.reduce((s, e) => s + e.totalXp, 0);
}

export function difficultyCode(q: Quest): string {
  return q.encounters.map((e) => e.difficulty[0]!.toUpperCase()).join('/');
}
