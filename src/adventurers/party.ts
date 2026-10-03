import { partyName } from '../core/names';
import type { Rng } from '../core/rng';
import type { MagicItem } from '../items/items';
import { HERO_CLASS_NAMES, type HeroClassName } from 'battlecast-engine';
import type { DeepReadonly } from '../core/readonly';
import { createHero, type Hero } from './hero';

/** Shared default company sizes; roster and encounter configuration read these definitions. */
export const PARTY_SIZE = 4;
export const MAX_PARTY_SIZE = 6;

/** Maximum fame from expeditions; Board configuration uses the same default. */
export const MAX_RENOWN = 10;

export type PartyStatus =
  | 'idle'
  | 'traveling'
  | 'questing'
  | 'returning'
  | 'resting'
  | 'disbanded';

export interface Party {
  id: string;
  name: string;
  members: Hero[];
  gold: number;
  status: PartyStatus;
  questId: string | null;
  /** Index of the next encounter to fight while questing. */
  progress: number;
  /** Ticks left in the current timed status. */
  ticksLeft: number;
  /** Ticks spent waiting idle (used to escalate recruitment). */
  idleTicks: number;
  questsDone: number;
  questsFailed: number;
  arrivedAt: number;
  /** Healing potions in the shared pack. */
  potions: number;
  /** Lifetime ledger. */
  earned: number;
  spent: number;
  /** Magic items nobody is wearing: loot to equip or sell. */
  stash: MagicItem[];
  /** Fame in town. Grows with contracts and tavern tales; famous companies get first pick of work. */
  renown: number;
  /** A temple blessing carried into the next contract. */
  blessed: boolean;
  /** Adventurers' guild membership: needed for noble and faction contracts. */
  guildMember: boolean;
  /** In-game day the dues were last paid. */
  duesPaidDay: number;
  /** Rounds bought at the tavern to learn about a contract, by quest id. */
  investigations: Record<string, number>;
}

/** A full company covers the classic roles; smaller bands are whoever survived. */
export const ROLES: HeroClassName[][] = [
  ['Fighter', 'Barbarian', 'Paladin', 'Monk'],
  ['Cleric', 'Druid', 'Bard'],
  ['Rogue', 'Ranger', 'Bard', 'Monk'],
  ['Wizard', 'Sorcerer', 'Warlock', 'Druid'],
];

export function rollClasses(rng: Rng, size: number): HeroClassName[] {
  if (size < ROLES.length) return Array.from({ length: size }, () => rng.pick(rng.pick(ROLES)));
  const chosen: HeroClassName[] = [];
  for (const role of rng.shuffle(ROLES)) {
    const options = role.filter((c) => !chosen.includes(c));
    chosen.push(rng.pick(options.length > 0 ? options : role));
  }
  while (chosen.length < size) chosen.push(rng.pick(HERO_CLASS_NAMES));
  return chosen;
}

export function createParty(rng: Rng, level: number, size: number, tick: number): Party {
  const members: Hero[] = rollClasses(rng, size).map((cls) => createHero(rng, level, cls));
  return {
    id: rng.id('party'),
    name: partyName(rng),
    members,
    gold: 20 * level,
    status: 'idle',
    questId: null,
    progress: 0,
    ticksLeft: 0,
    idleTicks: 0,
    questsDone: 0,
    questsFailed: 0,
    arrivedAt: tick,
    potions: 0,
    earned: 0,
    spent: 0,
    stash: [],
    renown: 0,
    blessed: false,
    guildMember: false,
    duesPaidDay: -1,
    investigations: {},
  };
}

export type ReadonlyParty = DeepReadonly<Party>;

export function aliveMembers(p: Party): Hero[];
export function aliveMembers(p: ReadonlyParty): DeepReadonly<Hero>[];
export function aliveMembers(p: ReadonlyParty): DeepReadonly<Hero>[] {
  return p.members.filter((m) => m.alive);
}

export function deadMembers(p: Party): Hero[];
export function deadMembers(p: ReadonlyParty): DeepReadonly<Hero>[];
export function deadMembers(p: ReadonlyParty): DeepReadonly<Hero>[] {
  return p.members.filter((m) => !m.alive);
}

export function partyLevel(p: ReadonlyParty): number {
  const alive = aliveMembers(p);
  if (alive.length === 0) return 1;
  return Math.max(1, Math.round(alive.reduce((s, h) => s + h.level, 0) / alive.length));
}

export function describeParty(p: ReadonlyParty, companySize = PARTY_SIZE): string {
  const n = aliveMembers(p).length;
  return `${p.name} (lvl ${partyLevel(p)}, ${n < companySize ? `${n} of ${companySize} needed` : `${n} strong`})`;
}
