import { partyName } from '../core/names';
import type { Rng } from '../core/rng';
import type { MagicItem } from '../items/items';
import { HERO_CLASS_NAMES, type HeroClassName } from 'battlecast-engine';
import type { DeepReadonly } from '../core/readonly';
import { createHero, type Hero } from './hero';

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
  /** What this company has tried in order to learn about each job. Job intelligence is the only writer. */
  investigations: JobInquiry[];
}

/** What one company has tried for one job. */
export interface JobInquiry {
  jobId: string;
  /** The free attempt at the tavern has been made. */
  freeAttempt: boolean;
  /** Paid rounds bought. */
  roundsBought: number;
  /** The road has been read. */
  roadRead: boolean;
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

export function createParty(rng: Rng, level: number, size: number, tick: number, startingGoldPerLevel: number): Party {
  const members: Hero[] = rollClasses(rng, size).map((cls) => createHero(rng, level, cls));
  return {
    id: rng.id('party'),
    name: partyName(rng),
    members,
    gold: startingGoldPerLevel * level,
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
    investigations: [],
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

export function describeParty(p: ReadonlyParty, companySize: number): string {
  const n = aliveMembers(p).length;
  return `${p.name} (lvl ${partyLevel(p)}, ${n < companySize ? `${n} of ${companySize} needed` : `${n} strong`})`;
}
