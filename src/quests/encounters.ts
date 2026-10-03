import { calculateDifficulty, monsters as ALL_MONSTERS, type MonsterData } from 'battlecast-engine';
import { freeze } from '../core/freeze';
import type { DeepReadonly } from '../core/readonly';
import type { Rng } from '../core/rng';
import { themeMonsters, type ThemeId } from './themes';

export type Difficulty = 'easy' | 'intermediate' | 'hard';
export const DIFFICULTIES: Difficulty[] = ['easy', 'intermediate', 'hard'];

export interface MonsterGroup {
  name: string;
  count: number;
  xpEach: number;
}

export interface EncounterSpec {
  difficulty: Difficulty;
  monsters: MonsterGroup[];
  totalXp: number;
  /** The engine's own DMG 2024 tier for this budget, for display. */
  tier: string;
}

/** How a fight is put together. */
type Pattern = 'solo' | 'horde' | 'leader' | 'mixed';

/** Encounter composition. The company size an encounter was built for is received, not stored here. */
export interface EncounterConfig {
  maxMonsters: number;
  compositionAttempts: number;
  /** Monsters at or below this XP are skipped when the theme has nothing in band. */
  minimumFallbackXp: number;
  patterns: { item: Pattern; weight: number }[];
  soloMinFactor: number;
  hordeTargetDivisor: number;
  hordeMinimum: number;
  leaderMinFactor: number;
  leaderMaxFactor: number;
  mixedKinds: [number, number];
  mixedShareDivisor: number;
  mixedGroupCap: number;
  scaleRoundingBias: number;
  /** Easy sits between these fractions of the engine's Low threshold. */
  easyBand: [number, number];
}

export const DEFAULT_ENCOUNTER_CONFIG: EncounterConfig = freeze({
  maxMonsters: 6,
  compositionAttempts: 30,
  minimumFallbackXp: 10,
  patterns: [
    { item: 'solo', weight: 2 },
    { item: 'horde', weight: 3 },
    { item: 'leader', weight: 3 },
    { item: 'mixed', weight: 2 },
  ],
  soloMinFactor: 0.7,
  hordeTargetDivisor: 3,
  hordeMinimum: 3,
  leaderMinFactor: 0.35,
  leaderMaxFactor: 0.7,
  mixedKinds: [2, 3],
  mixedShareDivisor: 3,
  mixedGroupCap: 3,
  scaleRoundingBias: 0.25,
  easyBand: [0.5, 0.85],
});

/**
 * XP band per difficulty, derived from the 2024 DMG thresholds the engine ships.
 *
 * The DMG tiers assume a table of players who retreat, heal and think; the
 * engine's AI fights to the death and this game chains three fights with a
 * short breather between them. Calibrated against `scripts/calibrate.ts`, one
 * DMG tier down reads as "easy / intermediate / hard" in practice:
 * easy sits below "Low", intermediate is "Low", hard is "Moderate".
 */
export function xpBand(partySize: number, level: number, difficulty: Difficulty, scale = 1, rules: EncounterConfig = DEFAULT_ENCOUNTER_CONFIG): { min: number; max: number } {
  const t = calculateDifficulty(partySize, level, 0).thresholds;
  const band = (min: number, max: number) => ({ min: Math.round(min * scale), max: Math.round(max * scale) });
  switch (difficulty) {
    case 'easy':
      return band(t.low * rules.easyBand[0], t.low * rules.easyBand[1]);
    case 'intermediate':
      return band(t.low, t.moderate - 1);
    case 'hard':
      return band(t.moderate, (t.moderate + t.high) / 2);
  }
}

function fitsBand(total: number, band: { min: number; max: number }): boolean {
  return total >= band.min && total <= band.max;
}

/**
 * Build an encounter whose total monster XP lands inside the difficulty band.
 * Tries the theme's roster first, then any SRD monster if the theme has nothing
 * in range (a level 1 "dragons" quest still needs something to fight).
 */
export function buildEncounter(
  rng: Rng,
  theme: ThemeId,
  partySize: number,
  level: number,
  difficulty: Difficulty,
  scale = 1,
  rules: EncounterConfig = DEFAULT_ENCOUNTER_CONFIG,
): EncounterSpec {
  const band = xpBand(partySize, level, difficulty, scale, rules);
  const roster = themeMonsters(theme);
  const groups =
    compose(rng, roster, band, rules) ?? compose(rng, ALL_MONSTERS.filter((m) => m.xp > rules.minimumFallbackXp), band, rules) ?? [{ name: 'Goblin Warrior', count: 1, xpEach: 50 }];
  const totalXp = groups.reduce((s, g) => s + g.count * g.xpEach, 0);
  const tier = calculateDifficulty(partySize, level, totalXp).label;
  return { difficulty, monsters: groups, totalXp, tier };
}

const total = (groups: MonsterGroup[]) => groups.reduce((s, g) => s + g.count * g.xpEach, 0);
const bodies = (groups: MonsterGroup[]) => groups.reduce((s, g) => s + g.count, 0);

/**
 * Try a handful of compositions and keep the first that lands in the band:
 * a single big monster, a horde of one kind, a leader with minions, or a
 * mix of two or three kinds. Falls back to whatever came closest.
 */
function compose(rng: Rng, pool: MonsterData[], band: { min: number; max: number }, rules: EncounterConfig): MonsterGroup[] | null {
  const usable = pool.filter((m) => m.xp > 0 && m.xp <= band.max && m.xp * rules.maxMonsters >= band.min);
  if (usable.length === 0) return null;
  let best: { groups: MonsterGroup[]; distance: number } | null = null;
  for (let i = 0; i < rules.compositionAttempts; i++) {
    const target = rng.int(band.min, band.max);
    const groups = attempt(rng, usable, target, rng.weighted(rules.patterns), rules);
    if (!groups || bodies(groups) > rules.maxMonsters) continue;
    const xp = total(groups);
    if (xp >= band.min && xp <= band.max) return groups;
    const distance = xp < band.min ? band.min - xp : xp - band.max;
    if (!best || distance < best.distance) best = { groups, distance };
  }
  return best?.groups ?? null;
}

function attempt(rng: Rng, usable: MonsterData[], target: number, pattern: Pattern, rules: EncounterConfig): MonsterGroup[] | null {
  const within = (lo: number, hi: number) => usable.filter((m) => m.xp >= lo && m.xp <= hi);
  const group = (m: MonsterData, count: number): MonsterGroup => ({ name: m.name, count, xpEach: m.xp });
  switch (pattern) {
    case 'solo': {
      const big = within(target * rules.soloMinFactor, target);
      return big.length ? [group(rng.pick(big), 1)] : null;
    }
    case 'horde': {
      const small = within(target / rules.maxMonsters, target / rules.hordeTargetDivisor);
      if (!small.length) return null;
      const m = rng.pick(small);
      return [group(m, Math.max(rules.hordeMinimum, Math.min(rules.maxMonsters, Math.round(target / m.xp))))];
    }
    case 'leader': {
      const leaders = within(target * rules.leaderMinFactor, target * rules.leaderMaxFactor);
      if (!leaders.length) return null;
      const boss = rng.pick(leaders);
      const room = target - boss.xp;
      const minions = within(room / (rules.maxMonsters - 1), room).filter((m) => m.name !== boss.name);
      if (!minions.length) return [group(boss, 1)];
      const m = rng.pick(minions);
      return [group(boss, 1), group(m, Math.max(1, Math.min(rules.maxMonsters - 1, Math.round(room / m.xp))))];
    }
    case 'mixed': {
      const kinds = rng.int(...rules.mixedKinds);
      const share = target / kinds;
      const groups: MonsterGroup[] = [];
      for (let k = 0; k < kinds; k++) {
        const options = within(share / rules.mixedShareDivisor, share).filter((m) => !groups.some((g) => g.name === m.name));
        if (!options.length) break;
        const m = rng.pick(options);
        groups.push(group(m, Math.max(1, Math.min(rules.mixedGroupCap, Math.round(share / m.xp)))));
      }
      return groups.length >= 2 ? groups : null;
    }
  }
}

/**
 * Contracts are budgeted for four. A bigger company meets proportionally more
 * of the same monsters (a lone boss stays alone until the count would double).
 */
export function scaleEncounter(spec: DeepReadonly<EncounterSpec>, partySize: number, baseSize: number, rules: EncounterConfig = DEFAULT_ENCOUNTER_CONFIG): DeepReadonly<EncounterSpec> {
  if (partySize <= baseSize) return spec;
  const factor = partySize / baseSize;
  const monsters = spec.monsters.map((g) => ({ ...g, count: Math.max(g.count, Math.floor(g.count * factor + rules.scaleRoundingBias)) }));
  const totalXp = monsters.reduce((s, g) => s + g.count * g.xpEach, 0);
  return { ...spec, monsters, totalXp };
}

export function describeEncounter(spec: DeepReadonly<EncounterSpec>): string {
  return spec.monsters.map((g) => (g.count > 1 ? `${g.count}x ${g.name}` : g.name)).join(', ');
}
