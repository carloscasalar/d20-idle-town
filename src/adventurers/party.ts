import { partyName } from '../core/names';
import type { Rng } from '../core/rng';
import type { MagicItem } from '../items/items';
import { createHero, type Hero } from './hero';

export const PARTY_SIZE = 4;

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

let partyCounter = 0;

export function createParty(rng: Rng, level: number, size: number, tick: number): Party {
  const members: Hero[] = [];
  for (let i = 0; i < size; i++) members.push(createHero(rng, level));
  return {
    id: `party-${++partyCounter}`,
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

export function aliveMembers(p: Party): Hero[] {
  return p.members.filter((m) => m.alive);
}

export function deadMembers(p: Party): Hero[] {
  return p.members.filter((m) => !m.alive);
}

export function isFull(p: Party): boolean {
  return aliveMembers(p).length >= PARTY_SIZE;
}

export function partyLevel(p: Party): number {
  const alive = aliveMembers(p);
  if (alive.length === 0) return 1;
  return Math.max(1, Math.round(alive.reduce((s, h) => s + h.level, 0) / alive.length));
}

/**
 * Moves survivors of `donor` into `host` until the host is full.
 * Returns the survivors that did not fit (the donor keeps them).
 */
export function mergeParties(host: Party, donor: Party): Hero[] {
  const moved: Hero[] = [];
  for (const h of aliveMembers(donor)) {
    if (isFull(host)) break;
    host.members.push(h);
    moved.push(h);
  }
  donor.members = donor.members.filter((h) => !moved.includes(h));
  host.gold += donor.gold;
  donor.gold = 0;
  host.potions += donor.potions;
  donor.potions = 0;
  host.stash.push(...donor.stash);
  donor.stash = [];
  host.renown = Math.max(host.renown, donor.renown);
  return aliveMembers(donor);
}

/** Drops fallen members who will never be raised (party gave up on them). */
export function buryDead(p: Party): Hero[] {
  const dead = deadMembers(p);
  p.members = p.members.filter((m) => m.alive);
  return dead;
}

export function describeParty(p: Party): string {
  return `${p.name} (lvl ${partyLevel(p)}, ${aliveMembers(p).length}/${PARTY_SIZE})`;
}
