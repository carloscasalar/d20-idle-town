import type { Rng } from '../core/rng';
import { rollLootItem, type MagicItem } from '../items/items';
import { ASSET_KINDS, type Asset } from '../town/assets';
import type { Employer } from '../town/town';
import { buildEncounter, type Difficulty, type EncounterSpec } from './encounters';
import { THEMES, type ThemeId } from './themes';

export type QuestStatus = 'open' | 'taken' | 'done' | 'failed';

export interface Quest {
  id: string;
  title: string;
  place: string;
  giverId: string;
  assetId: string;
  theme: ThemeId;
  level: number;
  encounters: EncounterSpec[];
  /** Gold paid on completion. */
  reward: number;
  /** Paid in kind on top of the gold. Rare. */
  itemReward: MagicItem | null;
  /** Posted through the adventurers' guild: members only. */
  guildOnly: boolean;
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

export interface QuestTerms {
  employer: Employer;
  asset: Asset;
  theme: ThemeId;
  level: number;
  partySize: number;
  tick: number;
}

/**
 * Reward: what the asset is worth to its owner over a few days, scaled by how
 * dangerous the job is, how generous the employer is, and how desperate (a
 * ravaged asset pays more). Capped by what the employer can actually pay.
 */
export function generateQuest(rng: Rng, terms: QuestTerms): Quest {
  const { employer, asset, theme, level, partySize, tick } = terms;
  const def = ASSET_KINDS[asset.kind];
  const threatLabel = THEMES[theme].label;
  const title = rng.pick(def.titles).replace('{place}', asset.name).replace('{threat}', threatLabel);
  const difficulties = rollDifficulties(rng);
  const encounters = difficulties.map((d) => buildEncounter(rng, theme, partySize, level, d));
  const payFactor = difficulties.reduce((s, d) => s + DIFFICULTY_PAY[d], 0);
  const desperation = asset.status === 'ravaged' ? 1.5 : 1;
  const base = asset.incomePerDay * 2 + level * level * 10;
  const wanted = Math.round(base * payFactor * employer.generosity * desperation * 0.6);
  const reward = Math.max(20, Math.min(wanted, Math.floor(employer.treasury * 0.8)));
  // Relics turn up in old places, and rich employers sometimes pay in kind.
  const itemChance = (['archive', 'catacombs', 'shrine', 'cemetery'].includes(asset.kind) ? 0.12 : 0.04) + (employer.kind === 'noble' ? 0.04 : 0);
  const itemReward = rng.chance(itemChance) ? rollLootItem(rng, level) : null;
  // Noble houses and factions deal through the guild, but even they post the small jobs in public.
  const guildOnly = (employer.kind === 'noble' || employer.kind === 'faction') && level >= 2;
  return {
    id: `quest-${++questCounter}`,
    title,
    place: asset.name,
    giverId: employer.id,
    assetId: asset.id,
    theme,
    level,
    encounters,
    reward,
    itemReward,
    guildOnly,
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
