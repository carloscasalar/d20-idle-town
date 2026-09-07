import type { Rng } from '../core/rng';
import { rollLootItem, type MagicItem } from '../items/items';
import { ASSET_KINDS, type Asset } from '../town/assets';
import type { Lair } from '../town/lairs';
import type { Employer } from '../town/town';
import { buildEncounter, type Difficulty, type EncounterSpec } from './encounters';
import { THEMES, themeMonsters, type ThemeId } from './themes';

export type QuestStatus = 'open' | 'taken' | 'done' | 'failed';

export type QuestKind = 'contract' | 'assault';

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

let questCounter = 0;

const DIFFICULTY_WEIGHTS: { item: Difficulty; weight: number }[] = [
  { item: 'easy', weight: 4 },
  { item: 'intermediate', weight: 4 },
  { item: 'hard', weight: 2 },
];

const DIFFICULTY_PAY: Record<Difficulty, number> = { easy: 1, intermediate: 1.5, hard: 2.5 };

export const MIN_ENCOUNTERS = 2;
export const MAX_ENCOUNTERS = 6;

/** Short jobs are common, long ones rare. */
export function rollEncounterCount(rng: Rng): number {
  return rng.weighted([
    { item: 2, weight: 3 },
    { item: 3, weight: 4 },
    { item: 4, weight: 3 },
    { item: 5, weight: 2 },
    { item: 6, weight: 1 },
  ]);
}

export function rollDifficulties(rng: Rng, count: number): Difficulty[] {
  return Array.from({ length: count }, () => rng.weighted(DIFFICULTY_WEIGHTS));
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
export function generateQuest(rng: Rng, terms: QuestTerms): Quest {
  const { employer, asset, theme, level, partySize, tick } = terms;
  const def = ASSET_KINDS[asset.kind];
  const threatLabel = terms.lair ? `${THEMES[theme].label} of ${terms.lair.name}` : THEMES[theme].label;
  const title = rng.pick(def.titles).replace('{place}', asset.name).replace('{threat}', threatLabel);
  const difficulties = rollDifficulties(rng, rollEncounterCount(rng));
  const encounters = difficulties.map((d) => buildEncounter(rng, theme, partySize, level, d, terms.difficultyScale ?? 1));
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
    kind: 'contract',
    title,
    place: asset.name,
    giverId: employer.id,
    assetId: asset.id,
    lairId: terms.lair?.id ?? null,
    theme,
    level,
    encounters,
    revealed: 1,
    countRevealed: false,
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
export function generateAssault(rng: Rng, lair: Lair, guild: Employer, partySize: number, tick: number, difficultyScale = 1): Quest {
  const count = rng.int(3, 5);
  const difficulties: Difficulty[] = Array.from({ length: count - 1 }, () =>
    rng.weighted([
      { item: 'easy' as Difficulty, weight: 2 },
      { item: 'intermediate' as Difficulty, weight: 4 },
      { item: 'hard' as Difficulty, weight: 2 },
    ]),
  );
  const encounters = difficulties.map((d) => buildEncounter(rng, lair.theme, partySize, lair.level, d, difficultyScale));
  encounters.push(buildBossEncounter(rng, lair, partySize, difficultyScale));
  const bounty = Math.min(guild.treasury, 150 * lair.level);
  const title = rng.pick(ASSAULT_TITLES).replace('{lair}', lair.name).replace('{boss}', lair.boss).replace('{place}', lair.place);
  return {
    id: `quest-${++questCounter}`,
    kind: 'assault',
    title: title.charAt(0).toUpperCase() + title.slice(1),
    place: lair.place,
    giverId: guild.id,
    assetId: null,
    lairId: lair.id,
    theme: lair.theme,
    level: lair.level,
    encounters,
    revealed: 1,
    countRevealed: true,
    reward: bounty,
    itemReward: rollLootItem(rng, lair.level + 2),
    // The guild wants the lair gone more than it wants dues: anyone may take the bounty.
    guildOnly: false,
    status: 'open',
    partyId: null,
    postedAt: tick,
  };
}

/** The boss and whatever guard fills a "high" budget around it. */
function buildBossEncounter(rng: Rng, lair: Lair, partySize: number, scale: number): EncounterSpec {
  const spec = buildEncounter(rng, lair.theme, partySize, lair.level, 'hard', scale);
  const boss = themeMonsters(lair.theme).find((m) => m.name === lair.boss);
  if (!boss) return spec;
  const guard = spec.monsters.filter((g) => g.name !== boss.name);
  const monsters = [{ name: boss.name, count: 1, xpEach: boss.xp }, ...guard.slice(0, 1)];
  const totalXp = monsters.reduce((s, g) => s + g.count * g.xpEach, 0);
  return { ...spec, monsters, totalXp };
}

export function questXp(q: Quest): number {
  return q.encounters.reduce((s, e) => s + e.totalXp, 0);
}

export function isFullyKnown(q: Quest): boolean {
  return q.countRevealed && q.revealed >= q.encounters.length;
}

/** Learn the next thing about the job: first how long it is, then one more encounter each time. */
export function revealNext(q: Quest): 'count' | 'encounter' | null {
  if (!q.countRevealed) {
    q.countRevealed = true;
    return 'count';
  }
  if (q.revealed < q.encounters.length) {
    q.revealed += 1;
    return 'encounter';
  }
  return null;
}

export function revealAll(q: Quest): void {
  q.countRevealed = true;
  q.revealed = q.encounters.length;
}

/** "I/?/?" for a three-fight job with one known; "I/…" while even the length is a secret. */
export function difficultyCode(q: Quest): string {
  const known = q.encounters.slice(0, q.revealed).map((e) => e.difficulty[0]!.toUpperCase());
  if (!q.countRevealed) return q.revealed < q.encounters.length ? `${known.join('/')}/…` : known.join('/');
  const hidden = q.encounters.length - q.revealed;
  return [...known, ...Array.from({ length: hidden }, () => '?')].join('/');
}
