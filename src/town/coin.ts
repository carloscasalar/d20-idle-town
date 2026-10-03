/**
 * The only writer of a gold balance or a gold counter.
 *
 * A movement is a transfer between two holders, a source (gold enters the
 * world) or a sink (gold leaves it). Build one `Coin` for a world: it keeps
 * the gold statistics and the reason table, and callers move gold through it.
 * The reason's named effects decide which counters and lifetime statistics
 * that reason touches. Callers decide whether anyone can afford the amount;
 * a balance may still fall below zero, as it does for an employer's upkeep.
 */

import { freeze } from '../core/freeze';

/** Lifetime gold statistics. Other ledgers no longer carry these fields. */
export interface GoldStatistics {
  goldPaid: number;
  goldSpentByHeroes: number;
}

/** What one adventurer has had spent on them. Named by the movement that spends it. */
export interface AdventurerSpending {
  goldSpent: number;
}

/**
 * What a reason does to counters and statistics.
 * `spent` is the giver, `earned` is the receiver. A holder with no such
 * counter (a hoard, a loot store) simply has none. A source has no giver;
 * a sink has no receiver.
 */
export interface CoinEffects {
  readonly spent: boolean;
  readonly earned: boolean;
  readonly goldPaid: boolean;
  readonly goldSpentByHeroes: boolean;
  /** When set, an adventurer named on the movement has `goldSpent` increased. */
  readonly adventurer: boolean;
}

/** A table of reasons. A movement's reason must be one of its keys. */
export type CoinTable<Reason extends string> = Readonly<Record<Reason, CoinEffects>>;

/** A company pays an employer. Paying to learn about work is that same payment. */
const purchase: CoinEffects = freeze({
  spent: true,
  earned: true,
  goldPaid: false,
  goldSpentByHeroes: true,
  adventurer: true,
});

/** Daily income from a Holding. A windfall is that income, recovered when the Holding is freed. */
const income: CoinEffects = freeze({
  spent: false,
  earned: true,
  goldPaid: false,
  goldSpentByHeroes: false,
  adventurer: false,
});

/** An employer's daily costs. A forfeit is that same loss when no Lair receives an unanswered Contract. */
const upkeep: CoinEffects = freeze({
  spent: true,
  earned: false,
  goldPaid: false,
  goldSpentByHeroes: false,
  adventurer: false,
});

/**
 * One entry per reason. Similar movements that the world treats differently
 * stay different keys; nothing in the movement code branches on the name.
 * Frozen: a new reason is a new key, and a typo is a compile error.
 *
 * These effects are the accounting identity of each movement, not a tunable
 * of the world, so the table stays in code rather than in the configuration.
 */
export const coinReasons = freeze({
  /** A company pays an employer for a service. */
  service: purchase,
  /** A company pays to learn about a Contract or Bounty. */
  intel: purchase,
  /** An employer buys gear back from a company. */
  resale: freeze({ spent: true, earned: true, goldPaid: false, goldSpentByHeroes: false, adventurer: false }),
  /** An employer pays a completed Contract or Bounty. */
  reward: freeze({ spent: true, earned: true, goldPaid: true, goldSpentByHeroes: false, adventurer: false }),
  /** Daily income from a Holding. */
  income,
  /** Income recovered when a Holding is freed. */
  windfall: income,
  /** Gold taken from a Lair's hoard or a Holding's loot. */
  spoils: freeze({ spent: false, earned: true, goldPaid: false, goldSpentByHeroes: false, adventurer: false }),
  /** An unanswered Contract's loss, taken by an active Lair. */
  looting: freeze({ spent: true, earned: false, goldPaid: false, goldSpentByHeroes: false, adventurer: false }),
  /** That same loss when no active Lair receives it. */
  forfeit: upkeep,
  /** A wiped company's purse, left in the field. */
  wipe: freeze({ spent: true, earned: false, goldPaid: false, goldSpentByHeroes: false, adventurer: false }),
  /** Survivors bring their company's purse to the host company. */
  merger: freeze({ spent: true, earned: true, goldPaid: false, goldSpentByHeroes: false, adventurer: false }),
  /** An employer's daily costs. The treasury may go into debt. */
  upkeep,
  /** Buying a business. The new treasury is opening capital, not earnings. */
  retirement: freeze({ spent: true, earned: false, goldPaid: false, goldSpentByHeroes: true, adventurer: false }),
});

export type CoinReason = keyof typeof coinReasons;

export function emptyGoldStatistics(): GoldStatistics {
  return { goldPaid: 0, goldSpentByHeroes: 0 };
}

/** The world's gold statistics and the reason table, built once. */
export interface Coin<Reason extends string = CoinReason> {
  readonly statistics: GoldStatistics;
  transfer(from: Holder, to: Holder, amount: number, reason: Reason, adventurer?: AdventurerSpending): void;
  source(to: Holder, amount: number, reason: Reason): void;
  sink(from: Holder, amount: number, reason: Reason, adventurer?: AdventurerSpending): void;
}

export function openCoin(statistics: GoldStatistics): Coin<CoinReason>;
export function openCoin<Reason extends string>(statistics: GoldStatistics, reasons: CoinTable<Reason>): Coin<Reason>;
export function openCoin<Reason extends string>(
  statistics: GoldStatistics,
  reasons: CoinTable<Reason> = coinReasons as unknown as CoinTable<Reason>,
): Coin<Reason> {
  return {
    statistics,
    transfer(from, to, amount, reason, adventurer) {
      transfer(from, to, amount, reason, statistics, reasons, adventurer);
    },
    source(to, amount, reason) {
      source(to, amount, reason, statistics, reasons);
    },
    sink(from, amount, reason, adventurer) {
      sink(from, amount, reason, statistics, reasons, adventurer);
    },
  };
}

/** A company's purse: `gold`, with `earned` and `spent`. */
export interface Purse {
  gold: number;
  earned: number;
  spent: number;
}

/** An employer's treasury, with `earned` and `spent`. */
export interface TreasuryAccount {
  treasury: number;
  earned: number;
  spent: number;
}

/** A Lair's hoard. Gold only; no earned or spent counter. */
export interface HoardStore {
  hoard: { gold: number };
}

/** A Holding's loot. Gold only; no earned or spent counter. */
export interface LootStore {
  loot: { gold: number };
}

export type Holder =
  | { readonly kind: 'purse'; readonly purse: Purse }
  | { readonly kind: 'treasury'; readonly treasury: TreasuryAccount }
  | { readonly kind: 'hoard'; readonly hoard: HoardStore }
  | { readonly kind: 'loot'; readonly loot: LootStore };

export function purse(company: Purse): Holder {
  return { kind: 'purse', purse: company };
}

export function treasury(employer: TreasuryAccount): Holder {
  return { kind: 'treasury', treasury: employer };
}

export function hoard(lair: HoardStore): Holder {
  return { kind: 'hoard', hoard: lair };
}

export function loot(holding: LootStore): Holder {
  return { kind: 'loot', loot: holding };
}

export function balance(holder: Holder): number {
  switch (holder.kind) {
    case 'purse':
      return holder.purse.gold;
    case 'treasury':
      return holder.treasury.treasury;
    case 'hoard':
      return holder.hoard.hoard.gold;
    case 'loot':
      return holder.loot.loot.gold;
  }
}

/** Earned and spent, or nothing when the holder has no such counters. */
export function counters(holder: Holder): { earned: number; spent: number } | undefined {
  switch (holder.kind) {
    case 'purse':
      return { earned: holder.purse.earned, spent: holder.purse.spent };
    case 'treasury':
      return { earned: holder.treasury.earned, spent: holder.treasury.spent };
    case 'hoard':
    case 'loot':
      return undefined;
  }
}

/** Sum of gold across the named holders. */
export function heldGold(holders: readonly Holder[]): number {
  return holders.reduce((sum, holder) => sum + balance(holder), 0);
}

/** Move gold from one holder to another. The sum over holders is unchanged. */
function transfer<Reason extends string>(
  from: Holder,
  to: Holder,
  amount: number,
  reason: Reason,
  statistics: GoldStatistics,
  reasons: CoinTable<Reason>,
  adventurer?: AdventurerSpending,
): void {
  move(reasons, reason, amount, statistics, from, to, adventurer);
}

/** Gold enters the world and is credited to one holder. */
function source<Reason extends string>(
  to: Holder,
  amount: number,
  reason: Reason,
  statistics: GoldStatistics,
  reasons: CoinTable<Reason>,
): void {
  move(reasons, reason, amount, statistics, undefined, to);
}

/** Gold leaves the world from one holder. */
function sink<Reason extends string>(
  from: Holder,
  amount: number,
  reason: Reason,
  statistics: GoldStatistics,
  reasons: CoinTable<Reason>,
  adventurer?: AdventurerSpending,
): void {
  move(reasons, reason, amount, statistics, from, undefined, adventurer);
}

function move<Reason extends string>(
  reasons: CoinTable<Reason>,
  reason: Reason,
  amount: number,
  statistics: GoldStatistics,
  from?: Holder,
  to?: Holder,
  adventurer?: AdventurerSpending,
): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`A coin movement needs a whole number of gold pieces, not ${amount}.`);
  }
  const reasonEffects = reasons[reason];
  if (!reasonEffects) throw new Error(`Unknown coin reason "${reason}".`);
  if (from) {
    setBalance(from, balance(from) - amount);
    if (reasonEffects.spent) addSpent(from, amount);
  }
  if (to) {
    setBalance(to, balance(to) + amount);
    if (reasonEffects.earned) addEarned(to, amount);
  }
  if (reasonEffects.goldPaid) statistics.goldPaid += amount;
  if (reasonEffects.goldSpentByHeroes) statistics.goldSpentByHeroes += amount;
  if (reasonEffects.adventurer && adventurer) adventurer.goldSpent += amount;
}

function setBalance(holder: Holder, amount: number): void {
  switch (holder.kind) {
    case 'purse':
      holder.purse.gold = amount;
      return;
    case 'treasury':
      holder.treasury.treasury = amount;
      return;
    case 'hoard':
      holder.hoard.hoard.gold = amount;
      return;
    case 'loot':
      holder.loot.loot.gold = amount;
      return;
  }
}

function addSpent(holder: Holder, amount: number): void {
  switch (holder.kind) {
    case 'purse':
      holder.purse.spent += amount;
      return;
    case 'treasury':
      holder.treasury.spent += amount;
      return;
    case 'hoard':
    case 'loot':
      return;
  }
}

function addEarned(holder: Holder, amount: number): void {
  switch (holder.kind) {
    case 'purse':
      holder.purse.earned += amount;
      return;
    case 'treasury':
      holder.treasury.earned += amount;
      return;
    case 'hoard':
    case 'loot':
      return;
  }
}
