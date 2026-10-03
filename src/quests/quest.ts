import { freeze } from '../core/freeze';
import type { DeepReadonly } from '../core/readonly';
import type { Rng } from '../core/rng';
import { rollLootItem, type ItemConfig, type MagicItem } from '../items/items';
import { ASSET_KINDS, type Asset, type AssetKind } from '../town/assets';
import type { Lair } from '../town/lairs';
import type { Employer, EmployerKind } from '../town/town';
import { buildEncounter, type Difficulty, type EncounterConfig, type EncounterSpec } from './encounters';
import { knowledgeAtPosting, type JobIntelConfig } from './job-intel';
import { THEMES, themeMonsters, type ThemeId } from './themes';

export { difficultyCode, isFullyKnown } from './job-intel';

export type QuestStatus = 'open' | 'taken' | 'done' | 'failed';

export type QuestKind = 'contract' | 'assault' | (string & {});

export type ReadonlyQuest = DeepReadonly<Quest>;

export interface Quest {
  id: string;
  kind: QuestKind;
  title: string;
  place: string;
  giverId: string;
  /** The holding under threat; none for an assault on a lair. */
  assetId: string | null;
  /** The lair the trouble comes from, or the lair being assaulted. */
  lairId: string | null;
  theme: ThemeId;
  level: number;
  /** Two to six fights. Only the first is public; the rest come out through investigation or on arrival. */
  encounters: EncounterSpec[];
  /** How many encounters the board (and the companies) know the composition of. */
  revealed: number;
  /** Whether the number of encounters is known. */
  countRevealed: boolean;
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

/** How a Contract or Bounty is sized and paid. */
export interface QuestConfig {
  encounterCounts: { count: number; weight: number }[];
  difficultyWeights: { difficulty: Difficulty; weight: number }[];
  difficultyPay: Record<Difficulty, number>;
  ravagedPayFactor: number;
  incomeDays: number;
  levelPayFactor: number;
  rewardScale: number;
  minimumReward: number;
  treasuryShare: number;
  relicHoldings: AssetKind[];
  relicItemChance: number;
  ordinaryItemChance: number;
  nobleItemChance: number;
  guildOnlyKinds: EmployerKind[];
  guildOnlyLevel: number;
  assaultEncounters: [number, number];
  assaultDifficultyWeights: { difficulty: Difficulty; weight: number }[];
  bountyPerLevel: number;
  bossLootLevelBonus: number;
  bossGuardCount: number;
}

export const DEFAULT_QUEST_CONFIG: QuestConfig = freeze({
  encounterCounts: [
    { count: 2, weight: 3 },
    { count: 3, weight: 4 },
    { count: 4, weight: 3 },
    { count: 5, weight: 2 },
    { count: 6, weight: 1 },
  ],
  difficultyWeights: [
    { difficulty: 'easy', weight: 4 },
    { difficulty: 'intermediate', weight: 4 },
    { difficulty: 'hard', weight: 2 },
  ],
  difficultyPay: { easy: 1, intermediate: 1.5, hard: 2.5 },
  ravagedPayFactor: 1.5,
  incomeDays: 2,
  levelPayFactor: 10,
  rewardScale: 0.6,
  minimumReward: 20,
  treasuryShare: 0.8,
  relicHoldings: ['archive', 'catacombs', 'shrine', 'cemetery'],
  relicItemChance: 0.12,
  ordinaryItemChance: 0.04,
  nobleItemChance: 0.04,
  guildOnlyKinds: ['noble', 'faction'],
  guildOnlyLevel: 2,
  assaultEncounters: [3, 5],
  assaultDifficultyWeights: [
    { difficulty: 'easy', weight: 2 },
    { difficulty: 'intermediate', weight: 4 },
    { difficulty: 'hard', weight: 2 },
  ],
  bountyPerLevel: 150,
  bossLootLevelBonus: 2,
  bossGuardCount: 1,
});

export interface QuestGeneration {
  quests: QuestConfig;
  encounters: EncounterConfig;
  intel: JobIntelConfig;
  items: ItemConfig;
}

/** Short jobs are common, long ones rare. */
export function rollEncounterCount(rng: Rng, quests: QuestConfig): number {
  return rng.weighted(quests.encounterCounts.map((entry) => ({ item: entry.count, weight: entry.weight })));
}

export function rollDifficulties(rng: Rng, count: number, quests: QuestConfig): Difficulty[] {
  const weights = quests.difficultyWeights.map((entry) => ({ item: entry.difficulty, weight: entry.weight }));
  return Array.from({ length: count }, () => rng.weighted(weights));
}

export interface QuestTerms {
  employer: Employer;
  asset: Asset;
  theme: ThemeId;
  level: number;
  partySize: number;
  tick: number;
  /** Multiplier on the XP budget of every encounter; the game's difficulty knob. */
  difficultyScale?: number;
  /** Where the raid comes from, if a lair is behind it. */
  lair?: Lair | null;
}

/**
 * Reward: what the asset is worth to its owner over a few days, scaled by how
 * dangerous the job is, how generous the employer is, and how desperate (a
 * ravaged asset pays more). Capped by what the employer can actually pay.
 */
export function generateQuest(rng: Rng, terms: QuestTerms, generation: QuestGeneration): Quest {
  const { quests, encounters: encountersRules, intel, items } = generation;
  const { employer, asset, theme, level, partySize, tick } = terms;
  const def = ASSET_KINDS[asset.kind];
  const threatLabel = terms.lair ? `${THEMES[theme].label} of ${terms.lair.name}` : THEMES[theme].label;
  const title = rng.pick(def.titles).replace('{place}', asset.name).replace('{threat}', threatLabel);
  const difficulties = rollDifficulties(rng, rollEncounterCount(rng, quests), quests);
  const encounters = difficulties.map((d) => buildEncounter(rng, theme, partySize, level, d, terms.difficultyScale ?? 1, encountersRules));
  const payFactor = difficulties.reduce((s, d) => s + quests.difficultyPay[d], 0);
  const desperation = asset.status === 'ravaged' ? quests.ravagedPayFactor : 1;
  const base = asset.incomePerDay * quests.incomeDays + level * level * quests.levelPayFactor;
  const wanted = Math.round(base * payFactor * employer.generosity * desperation * quests.rewardScale);
  const reward = Math.max(quests.minimumReward, Math.min(wanted, Math.floor(employer.treasury * quests.treasuryShare)));
  // Relics turn up in old places, and rich employers sometimes pay in kind.
  const itemChance = (quests.relicHoldings.includes(asset.kind) ? quests.relicItemChance : quests.ordinaryItemChance) + (employer.kind === 'noble' ? quests.nobleItemChance : 0);
  const itemReward = rng.chance(itemChance) ? rollLootItem(rng, level, items) : null;
  // Noble houses and factions deal through the guild, but even they post the small jobs in public.
  const guildOnly = quests.guildOnlyKinds.includes(employer.kind) && level >= quests.guildOnlyLevel;
  return {
    id: rng.id('quest'),
    kind: 'contract',
    title,
    place: asset.name,
    giverId: employer.id,
    assetId: asset.id,
    lairId: terms.lair?.id ?? null,
    theme,
    level,
    encounters,
    ...knowledgeAtPosting('contract', intel),
    reward,
    itemReward,
    guildOnly,
    status: 'open',
    partyId: null,
    postedAt: tick,
  };
}

const ASSAULT_TITLES = ['Break {lair}', 'End the reign of {boss}', 'Storm {place}', 'Bring back the head of {boss}'];

/**
 * The standing contract to clear a lair: long, mostly hard, and the boss with
 * its guard at the end. The lair's own hoard is the prize, plus the guild's bounty.
 */
export function generateAssault(rng: Rng, lair: Lair, guild: Employer, partySize: number, tick: number, difficultyScale: number, generation: QuestGeneration): Quest {
  const { quests, encounters: encountersRules, intel, items } = generation;
  const count = rng.int(...quests.assaultEncounters);
  const assaultWeights = quests.assaultDifficultyWeights.map((entry) => ({ item: entry.difficulty, weight: entry.weight }));
  const difficulties: Difficulty[] = Array.from({ length: count - 1 }, () => rng.weighted(assaultWeights));
  const encounters = difficulties.map((d) => buildEncounter(rng, lair.theme, partySize, lair.level, d, difficultyScale, encountersRules));
  encounters.push(buildBossEncounter(rng, lair, partySize, difficultyScale, quests, encountersRules));
  const bounty = Math.min(guild.treasury, quests.bountyPerLevel * lair.level);
  const title = rng.pick(ASSAULT_TITLES).replace('{lair}', lair.name).replace('{boss}', lair.boss).replace('{place}', lair.place);
  return {
    id: rng.id('quest'),
    kind: 'assault',
    title: title.charAt(0).toUpperCase() + title.slice(1),
    place: lair.place,
    giverId: guild.id,
    assetId: null,
    lairId: lair.id,
    theme: lair.theme,
    level: lair.level,
    encounters,
    ...knowledgeAtPosting('assault', intel),
    reward: bounty,
    itemReward: rollLootItem(rng, lair.level + quests.bossLootLevelBonus, items),
    // The guild wants the lair gone more than it wants dues: anyone may take the bounty.
    guildOnly: false,
    status: 'open',
    partyId: null,
    postedAt: tick,
  };
}

/** The boss and whatever guard fills a "high" budget around it. */
function buildBossEncounter(rng: Rng, lair: Lair, partySize: number, scale: number, quests: QuestConfig, encounters: EncounterConfig): EncounterSpec {
  const spec = buildEncounter(rng, lair.theme, partySize, lair.level, 'hard', scale, encounters);
  const boss = themeMonsters(lair.theme).find((m) => m.name === lair.boss);
  if (!boss) return spec;
  const guard = spec.monsters.filter((g) => g.name !== boss.name);
  const monsters = [{ name: boss.name, count: 1, xpEach: boss.xp }, ...guard.slice(0, quests.bossGuardCount)];
  const totalXp = monsters.reduce((s, g) => s + g.count * g.xpEach, 0);
  return { ...spec, monsters, totalXp };
}

export function questXp(q: ReadonlyQuest): number {
  return q.encounters.reduce((s, e) => s + e.totalXp, 0);
}

