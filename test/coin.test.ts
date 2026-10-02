import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import {
  balance,
  coinReasons,
  counters,
  heldGold,
  hoard,
  loot,
  purse,
  sink,
  source,
  transfer,
  treasury,
  type CoinEffects,
  type Holder,
} from '../src/town/coin';

const AMOUNT = 10;

function books() {
  return { goldPaid: 13, goldSpentByHeroes: 17 };
}

function accounts() {
  const company = { gold: 40, earned: 3, spent: 5 };
  const employer = { treasury: 80, earned: 7, spent: 11 };
  const lair = { hoard: { gold: 9 } };
  const holding = { loot: { gold: 4 } };
  const adventurer = { goldSpent: 2 };
  const statistics = books();
  const holders: Record<'purse' | 'treasury' | 'hoard' | 'loot', Holder> = {
    purse: purse(company),
    treasury: treasury(employer),
    hoard: hoard(lair),
    loot: loot(holding),
  };
  return { company, employer, lair, holding, adventurer, statistics, holders };
}

/** A reason whose flags are all observable, and which asks for counters a hoard does not have. */
const PROBE = Object.freeze({
  probe: Object.freeze({ spent: true, earned: true, goldPaid: true, goldSpentByHeroes: true, adventurer: true } satisfies CoinEffects),
});

describe('coin movements', () => {
  it('sources, sinks and transfers each kind of holder', () => {
    for (const kind of ['purse', 'treasury', 'hoard', 'loot'] as const) {
      const sourced = accounts();
      const before = heldGold(Object.values(sourced.holders));
      source(sourced.holders[kind], AMOUNT, 'probe', sourced.statistics, PROBE);
      expect(balance(sourced.holders[kind])).toBe(balance(accounts().holders[kind]) + AMOUNT);
      expect(heldGold(Object.values(sourced.holders))).toBe(before + AMOUNT);

      const sunk = accounts();
      const sunkBefore = heldGold(Object.values(sunk.holders));
      sink(sunk.holders[kind], AMOUNT, 'probe', sunk.statistics, PROBE, sunk.adventurer);
      expect(balance(sunk.holders[kind])).toBe(balance(accounts().holders[kind]) - AMOUNT);
      expect(heldGold(Object.values(sunk.holders))).toBe(sunkBefore - AMOUNT);
    }

    const moved = accounts();
    const sum = heldGold(Object.values(moved.holders));
    const cycle: Array<'purse' | 'treasury' | 'hoard' | 'loot'> = ['purse', 'treasury', 'hoard', 'loot'];
    for (let i = 0; i < cycle.length; i++) {
      const from = cycle[i]!;
      const to = cycle[(i + 1) % cycle.length]!;
      transfer(moved.holders[from], moved.holders[to], AMOUNT, 'probe', moved.statistics, PROBE, moved.adventurer);
    }
    expect(heldGold(Object.values(moved.holders))).toBe(sum);
    expect(balance(moved.holders.purse)).toBe(40);
    expect(balance(moved.holders.treasury)).toBe(80);
    expect(balance(moved.holders.hoard)).toBe(9);
    expect(balance(moved.holders.loot)).toBe(4);

    expect(counters(moved.holders.purse)).toEqual({ earned: 3 + AMOUNT, spent: 5 + AMOUNT });
    expect(counters(moved.holders.treasury)).toEqual({ earned: 7 + AMOUNT, spent: 11 + AMOUNT });
    expect(counters(moved.holders.hoard)).toBeUndefined();
    expect(counters(moved.holders.loot)).toBeUndefined();
    expect(moved.lair).toEqual({ hoard: { gold: 9 } });
    expect(moved.holding).toEqual({ loot: { gold: 4 } });
    expect(moved.statistics).toEqual({ goldPaid: 13 + AMOUNT * 4, goldSpentByHeroes: 17 + AMOUNT * 4 });
    expect(moved.adventurer.goldSpent).toBe(2 + AMOUNT * 4);
  });

  it('lets a treasury go into debt and a purse go below zero', () => {
    const employer = { treasury: 5, earned: 1, spent: 2 };
    const statistics = books();
    sink(treasury(employer), 8, 'upkeep', statistics, coinReasons);
    expect(employer).toEqual({ treasury: -3, earned: 1, spent: 10 });
    expect(statistics).toEqual(books());

    const company = { gold: 3, earned: 1, spent: 2 };
    const shop = { treasury: 4, earned: 0, spent: 0 };
    transfer(purse(company), treasury(shop), AMOUNT, 'service', statistics, coinReasons);
    expect(company.gold).toBe(-7);
    expect(shop.treasury).toBe(14);
  });

  it('accepts a zero amount', () => {
    const { company, statistics } = accounts();
    source(purse(company), 0, 'income', statistics, coinReasons);
    expect(company).toEqual({ gold: 40, earned: 3, spent: 5 });
    expect(statistics).toEqual(books());
  });

  it.each([-1, 1.5])('refuses %s', (amount) => {
    const { company, employer, statistics, adventurer } = accounts();
    expect(() => transfer(purse(company), treasury(employer), amount, 'service', statistics, coinReasons, adventurer)).toThrow(/whole number/);
    expect(company).toEqual({ gold: 40, earned: 3, spent: 5 });
    expect(employer).toEqual({ treasury: 80, earned: 7, spent: 11 });
    expect(statistics).toEqual(books());
    expect(adventurer.goldSpent).toBe(2);
  });

  it.each([
    // reason, purse gold, purse spent, purse earned, treasury, treasury earned, treasury spent, goldPaid, goldSpentByHeroes, adventurer goldSpent
    ['service', 30, 15, 3, 90, 17, 11, 13, 27, 12],
    ['resale', 30, 15, 3, 90, 17, 11, 13, 17, 2],
    ['reward', 30, 15, 3, 90, 17, 11, 23, 17, 2],
    ['income', 30, 5, 3, 90, 17, 11, 13, 17, 2],
    ['windfall', 30, 5, 3, 90, 17, 11, 13, 17, 2],
    ['spoils', 30, 5, 3, 90, 17, 11, 13, 17, 2],
    ['looting', 30, 15, 3, 90, 7, 11, 13, 17, 2],
    ['forfeit', 30, 15, 3, 90, 7, 11, 13, 17, 2],
    ['wipe', 30, 15, 3, 90, 7, 11, 13, 17, 2],
    ['merger', 30, 15, 3, 90, 17, 11, 13, 17, 2],
    ['upkeep', 30, 15, 3, 90, 7, 11, 13, 17, 2],
    ['retirement', 30, 15, 3, 90, 7, 11, 13, 27, 2],
  ] as const)(
    '%s moves only the counters and statistics named for it',
    (reason, purseGold, purseSpent, purseEarned, treasuryBalance, treasuryEarned, treasurySpent, goldPaid, goldSpentByHeroes, goldSpent) => {
      const { company, employer, statistics, adventurer } = accounts();
      transfer(purse(company), treasury(employer), AMOUNT, reason, statistics, coinReasons, adventurer);
      expect(company).toEqual({ gold: purseGold, earned: purseEarned, spent: purseSpent });
      expect(employer).toEqual({ treasury: treasuryBalance, earned: treasuryEarned, spent: treasurySpent });
      expect(statistics).toEqual({ goldPaid, goldSpentByHeroes });
      expect(adventurer.goldSpent).toBe(goldSpent);
      expect(heldGold([purse(company), treasury(employer)])).toBe(120);
    },
  );

  it('applies a reason from a table passed in, on a source and a sink as well as a transfer', () => {
    const tribute = Object.freeze({
      tribute: Object.freeze({ spent: false, earned: true, goldPaid: true, goldSpentByHeroes: false, adventurer: false } satisfies CoinEffects),
    });

    const gifted = accounts();
    source(hoard(gifted.lair), AMOUNT, 'tribute', gifted.statistics, tribute);
    expect(gifted.lair.hoard.gold).toBe(19);
    expect(gifted.lair).toEqual({ hoard: { gold: 19 } });
    expect(gifted.statistics).toEqual({ goldPaid: 23, goldSpentByHeroes: 17 });
    expect(counters(hoard(gifted.lair))).toBeUndefined();

    const lost = accounts();
    sink(loot(lost.holding), AMOUNT, 'tribute', lost.statistics, tribute, lost.adventurer);
    expect(lost.holding.loot.gold).toBe(-6);
    expect(lost.adventurer.goldSpent).toBe(2);
    expect(lost.statistics.goldPaid).toBe(23);
    expect(lost.statistics.goldSpentByHeroes).toBe(17);

    const moved = accounts();
    transfer(purse(moved.company), treasury(moved.employer), AMOUNT, 'tribute', moved.statistics, tribute);
    expect(moved.company).toEqual({ gold: 30, earned: 3, spent: 5 });
    expect(moved.employer).toEqual({ treasury: 90, earned: 17, spent: 11 });
    expect(moved.statistics).toEqual({ goldPaid: 23, goldSpentByHeroes: 17 });
  });

  it('conserves gold over random sequences of movements', () => {
    const quiet = Object.freeze({
      probe: Object.freeze({ spent: false, earned: false, goldPaid: false, goldSpentByHeroes: false, adventurer: false } satisfies CoinEffects),
    });
    const rng = new Rng(6);
    const company = { gold: 100, earned: 0, spent: 0 };
    const employer = { treasury: 40, earned: 0, spent: 0 };
    const lair = { hoard: { gold: 15 } };
    const holding = { loot: { gold: 5 } };
    const holders = [purse(company), treasury(employer), hoard(lair), loot(holding)];
    const statistics = books();
    let expected = heldGold(holders);
    for (let i = 0; i < 400; i++) {
      const amount = rng.int(0, 25);
      const from = holders[rng.int(0, holders.length - 1)]!;
      const to = holders[rng.int(0, holders.length - 1)]!;
      const kind = rng.int(0, 2);
      if (kind === 0) transfer(from, to, amount, 'probe', statistics, quiet);
      else if (kind === 1) {
        source(to, amount, 'probe', statistics, quiet);
        expected += amount;
      } else {
        sink(from, amount, 'probe', statistics, quiet);
        expected -= amount;
      }
      expect(heldGold(holders)).toBe(expected);
    }
    expect(statistics).toEqual(books());
  });
});
