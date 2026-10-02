/**
 * The only writer of a gold balance or a gold counter.
 *
 * A movement is a transfer between two holders, a source (gold enters the
 * world) or a sink (gold leaves it). `coinReasons` decides which counters and
 * lifetime statistics that reason touches. Callers decide whether anyone can
 * afford the amount; a balance may still fall below zero, as it does for an
 * employer's upkeep.
 */

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
  spent: boolean;
  earned: boolean;
  goldPaid: boolean;
  goldSpentByHeroes: boolean;
  /** When set, an adventurer named on the movement has `goldSpent` increased. */
  adventurer: boolean;
}

/**
 * One entry per reason. Similar movements that the world treats differently
 * stay different here; nothing in the movement code branches on the name.
 */
export const coinReasons: Record<string, CoinEffects> = {
  /** A company pays an employer for a service. */
  service: { spent: true, earned: true, goldPaid: false, goldSpentByHeroes: true, adventurer: true },
  /** An employer buys gear back from a company. */
  resale: { spent: true, earned: true, goldPaid: false, goldSpentByHeroes: false, adventurer: false },
  /** An employer pays a completed Contract or Bounty. */
  reward: { spent: true, earned: true, goldPaid: true, goldSpentByHeroes: false, adventurer: false },
  /** Daily income from a Holding. */
  income: { spent: false, earned: true, goldPaid: false, goldSpentByHeroes: false, adventurer: false },
  /** Income recovered when a Holding is freed. Same counters as daily income. */
  windfall: { spent: false, earned: true, goldPaid: false, goldSpentByHeroes: false, adventurer: false },
  /** Gold taken from a Lair's hoard or a Holding's loot. Not a reward. */
  spoils: { spent: false, earned: true, goldPaid: false, goldSpentByHeroes: false, adventurer: false },
  /** An unanswered Contract's loss, taken by an active Lair. */
  looting: { spent: true, earned: false, goldPaid: false, goldSpentByHeroes: false, adventurer: false },
  /** That same loss when no active Lair receives it. Same counters as upkeep. */
  forfeit: { spent: true, earned: false, goldPaid: false, goldSpentByHeroes: false, adventurer: false },
  /** A wiped company's purse, left in the field. Not a purchase. */
  wipe: { spent: true, earned: false, goldPaid: false, goldSpentByHeroes: false, adventurer: false },
  /** Survivors bring their company's purse to the host company. */
  merger: { spent: true, earned: true, goldPaid: false, goldSpentByHeroes: false, adventurer: false },
  /** An employer's daily costs. The treasury may go into debt. */
  upkeep: { spent: true, earned: false, goldPaid: false, goldSpentByHeroes: false, adventurer: false },
  /** Buying a business. The new treasury is opening capital, not earnings. */
  retirement: { spent: true, earned: false, goldPaid: false, goldSpentByHeroes: true, adventurer: false },
};

export function emptyGoldStatistics(): GoldStatistics {
  return { goldPaid: 0, goldSpentByHeroes: 0 };
}

/**
 * Statistics slices omit the gold fields, but the object Game passes — and the
 * ledgers tests already hold — still carry whichever of them the movement uses.
 */
export function goldStatistics(ledger: object): GoldStatistics {
  return ledger as unknown as GoldStatistics;
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
export function transfer(
  from: Holder,
  to: Holder,
  amount: number,
  reason: string,
  statistics: GoldStatistics,
  adventurer?: AdventurerSpending,
): void {
  move(reason, amount, statistics, from, to, adventurer);
}

/** Gold enters the world and is credited to one holder. */
export function source(to: Holder, amount: number, reason: string, statistics: GoldStatistics): void {
  move(reason, amount, statistics, undefined, to);
}

/** Gold leaves the world from one holder. */
export function sink(
  from: Holder,
  amount: number,
  reason: string,
  statistics: GoldStatistics,
  adventurer?: AdventurerSpending,
): void {
  move(reason, amount, statistics, from, undefined, adventurer);
}

function move(
  reason: string,
  amount: number,
  statistics: GoldStatistics,
  from?: Holder,
  to?: Holder,
  adventurer?: AdventurerSpending,
): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`A coin movement needs a whole number of gold pieces, not ${amount}.`);
  }
  const effects = coinReasons[reason];
  if (!effects) throw new Error(`Unknown coin reason "${reason}".`);
  if (from) {
    setBalance(from, balance(from) - amount);
    if (effects.spent) addSpent(from, amount);
  }
  if (to) {
    setBalance(to, balance(to) + amount);
    if (effects.earned) addEarned(to, amount);
  }
  if (effects.goldPaid) statistics.goldPaid += amount;
  if (effects.goldSpentByHeroes) statistics.goldSpentByHeroes += amount;
  if (effects.adventurer && adventurer) adventurer.goldSpent += amount;
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
