import { calculateDifficulty, monsters as ALL_MONSTERS, type MonsterData } from 'battlecast-engine';
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

const MAX_MONSTERS = 6;
/** Prefer rosters that fit the budget with this many bodies or fewer; hordes out-action a party of four. */
const PREFERRED_MAX_COUNT = 4;

/**
 * XP band per difficulty, derived from the 2024 DMG thresholds the engine ships.
 *
 * The DMG tiers assume a table of players who retreat, heal and think; the
 * engine's AI fights to the death and this game chains three fights with a
 * short breather between them. Calibrated against `scripts/calibrate.ts`, one
 * DMG tier down reads as "easy / intermediate / hard" in practice:
 * easy sits below "Low", intermediate is "Low", hard is "Moderate".
 */
export function xpBand(partySize: number, level: number, difficulty: Difficulty): { min: number; max: number } {
  const t = calculateDifficulty(partySize, level, 0).thresholds;
  switch (difficulty) {
    case 'easy':
      return { min: Math.round(t.low * 0.5), max: Math.round(t.low * 0.85) };
    case 'intermediate':
      return { min: t.low, max: t.moderate - 1 };
    case 'hard':
      return { min: t.moderate, max: Math.round((t.moderate + t.high) / 2) };
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
): EncounterSpec {
  const band = xpBand(partySize, level, difficulty);
  const roster = themeMonsters(theme);
  const attempt = (pool: MonsterData[]): MonsterGroup[] | null => {
    const usable = pool.filter((m) => m.xp > 0 && m.xp <= band.max && m.xp * MAX_MONSTERS >= band.min);
    if (usable.length === 0) return null;
    let best: { groups: MonsterGroup[]; total: number } | null = null;
    for (let i = 0; i < 24; i++) {
      const target = rng.int(band.min, band.max);
      const strong = usable.filter((m) => m.xp * PREFERRED_MAX_COUNT >= target);
      const primary = rng.pick(strong.length > 0 && rng.chance(0.8) ? strong : usable);
      const count = Math.max(1, Math.min(MAX_MONSTERS, Math.round(target / primary.xp)));
      const groups: MonsterGroup[] = [{ name: primary.name, count, xpEach: primary.xp }];
      let total = count * primary.xp;
      if (total < band.min) {
        const room = band.max - total;
        const fillers = usable.filter((m) => m.name !== primary.name && m.xp <= room);
        if (fillers.length > 0) {
          const f = rng.pick(fillers);
          const fc = Math.max(1, Math.min(MAX_MONSTERS - count, Math.floor(room / f.xp)));
          groups.push({ name: f.name, count: fc, xpEach: f.xp });
          total += fc * f.xp;
        }
      }
      if (fitsBand(total, band)) return groups;
      const dist = total < band.min ? band.min - total : total - band.max;
      if (!best || dist < Math.abs(best.total - (total < band.min ? band.min : band.max))) best = { groups, total };
    }
    return best?.groups ?? null;
  };

  const groups = attempt(roster) ?? attempt(ALL_MONSTERS) ?? [{ name: 'Goblin Warrior', count: 1, xpEach: 50 }];
  const totalXp = groups.reduce((s, g) => s + g.count * g.xpEach, 0);
  const tier = calculateDifficulty(partySize, level, totalXp).label;
  return { difficulty, monsters: groups, totalXp, tier };
}

export function describeEncounter(spec: EncounterSpec): string {
  return spec.monsters.map((g) => (g.count > 1 ? `${g.count}x ${g.name}` : g.name)).join(', ');
}
