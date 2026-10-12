import { describe, expect, it } from 'vitest';
import { createHero, resurrectionCost, DEFAULT_HERO_ECONOMY } from '../src/adventurers/hero';
import { createParty } from '../src/adventurers/party';
import { DEFAULT_POTION_CONFIG, type PotionPack, type PotionTier } from '../src/adventurers/potions';
import { Rng } from '../src/core/rng';
import { emptyGoldStatistics, openCoin } from '../src/town/coin';
import { buyPotions, DEFAULT_TOWN_SERVICE_CONFIG, type TownServiceContext } from '../src/town/services';
import type { Employer, Town } from '../src/town/town';
import { SERVICE_SUPPLIES, STARTING_GOLD } from './helpers/supplied-config';

/** Level-1 resurrection, `150 + 1² × 40`. The purse may not go below this. */
const RESERVE = 190;

const shopName = 'Mara Voss';

function visit(options: {
  heroes: { maxHp: number; alive?: boolean }[];
  gold: number;
  pack?: PotionPack;
  ruined?: boolean;
  cover?: number;
  tiers?: readonly PotionTier[];
}) {
  const rng = new Rng(3);
  const party = createParty(rng, 1, 1, 0, STARTING_GOLD);
  party.members = options.heroes.map((spec) => {
    const hero = createHero(rng, 1, 'Fighter');
    hero.maxHp = spec.maxHp;
    hero.alive = spec.alive !== false;
    hero.hp = hero.alive ? spec.maxHp : 0;
    return hero;
  });
  party.gold = options.gold;
  party.spent = 0;
  party.potions = { ...(options.pack ?? {}) };
  const shop: Employer = {
    id: 'shop-apothecary',
    name: shopName,
    kind: 'merchant',
    title: 'Apothecary',
    service: 'apothecary',
    assets: [],
    treasury: 0,
    upkeepPerDay: 0,
    generosity: 1,
    reputation: 0,
    cooldown: 0,
    ruined: options.ruined ?? false,
    questsPosted: 0,
    questsCompleted: 0,
    questsFailed: 0,
    earned: 0,
    spent: 0,
    stock: [],
    restockIn: 0,
    favoredPartyId: null,
  };
  const town: Town = { name: 'Greyford', employers: [shop], tavernName: 'Inn', deity: 'Asha' };
  const events: string[] = [];
  const statistics = emptyGoldStatistics();
  const context: TownServiceContext = {
    ...SERVICE_SUPPLIES,
    services: { ...DEFAULT_TOWN_SERVICE_CONFIG, potionCoverFraction: options.cover ?? DEFAULT_TOWN_SERVICE_CONFIG.potionCoverFraction },
    potions: { tiers: options.tiers ?? DEFAULT_POTION_CONFIG.tiers },
    town,
    day: 1,
    ledger: { itemsSold: 0 },
    coin: openCoin(statistics),
    report: (event) => events.push(event.text),
  };
  const bought = buyPotions(party, context);
  return { party, bought, events, shop, statistics };
}

function receipt(partyName: string, count: number, tier: string, cost: number): string {
  return `${partyName} buy ${count} ${tier} healing potion${count === 1 ? '' : 's'} from ${shopName} for ${cost} gp.`;
}

describe('buying potions through the potions step', () => {
  it('keeps one resurrection of 190 gp at level 1', () => {
    expect(resurrectionCost(1, DEFAULT_HERO_ECONOMY)).toBe(RESERVE);
    expect(DEFAULT_TOWN_SERVICE_CONFIG.potionCoverFraction).toBe(0.5);
  });

  it('buys two basic for a 32 HP fighter alone', () => {
    const { party, bought, events, shop, statistics } = visit({ heroes: [{ maxHp: 32 }], gold: RESERVE + 1000 });
    expect(bought).toBe(true);
    expect(party.potions).toEqual({ basic: 2 });
    expect(party.gold).toBe(RESERVE + 900);
    expect(party.spent).toBe(100);
    expect(party.members[0]!.goldSpent).toBe(0);
    expect(shop.treasury).toBe(100);
    expect(shop.earned).toBe(100);
    expect(shop.spent).toBe(0);
    expect(statistics.goldSpentByHeroes).toBe(100);
    expect(events).toEqual([receipt(party.name, 2, 'basic', 100)]);
  });

  it('buys three basic for a 33 HP hero alone', () => {
    const { party, bought, events } = visit({ heroes: [{ maxHp: 33 }], gold: RESERVE + 1000 });
    expect(bought).toBe(true);
    expect(party.potions).toEqual({ basic: 3 });
    expect(party.gold).toBe(RESERVE + 850);
    expect(party.spent).toBe(150);
    expect(events).toEqual([receipt(party.name, 3, 'basic', 150)]);
  });

  it('buys nothing when the pack already covers half of each living hero and holds one potion each', () => {
    const covered = visit({ heroes: [{ maxHp: 32 }], gold: RESERVE + 1000, pack: { greater: 1 } });
    expect(covered.bought).toBe(false);
    expect(covered.party.potions).toEqual({ greater: 1 });
    expect(covered.party.gold).toBe(RESERVE + 1000);
    expect(covered.events).toEqual([]);

    const over = visit({ heroes: [{ maxHp: 32 }], gold: RESERVE + 1000, pack: { basic: 3 } });
    expect(over.bought).toBe(false);
    expect(over.party.potions).toEqual({ basic: 3 });
    expect(over.party.gold).toBe(RESERVE + 1000);
  });

  it('buys one basic so two heroes are not left sharing a single supreme', () => {
    const { party, bought, events } = visit({
      heroes: [{ maxHp: 32 }, { maxHp: 32 }],
      gold: RESERVE + 1000,
      pack: { supreme: 1 },
    });
    expect(bought).toBe(true);
    expect(party.potions).toEqual({ supreme: 1, basic: 1 });
    expect(party.gold).toBe(RESERVE + 950);
    expect(events).toEqual([receipt(party.name, 1, 'basic', 50)]);
  });

  it('buys three greater for a 90 HP hero alone', () => {
    const { party, bought, events } = visit({ heroes: [{ maxHp: 90 }], gold: RESERVE + 10000 });
    expect(bought).toBe(true);
    expect(party.potions).toEqual({ greater: 3 });
    expect(party.gold).toBe(RESERVE + 9400);
    expect(party.spent).toBe(600);
    expect(events).toEqual([receipt(party.name, 3, 'greater', 600)]);
  });

  it('buys the tier whose assurance is exactly half the need, not the tier just above it', () => {
    const tiers: PotionTier[] = [
      { name: 'low', formula: '1d2+8', price: 10 },
      { name: 'mid', formula: '1d2+18', price: 100 },
      { name: 'high', formula: '1d1+19', price: 1000 },
    ];
    const { party, bought, events } = visit({ heroes: [{ maxHp: 80 }], gold: RESERVE + 10000, tiers });
    expect(bought).toBe(true);
    expect(party.potions).toEqual({ mid: 2 });
    expect(party.gold).toBe(RESERVE + 9800);
    expect(events).toEqual([receipt(party.name, 2, 'mid', 200)]);
  });

  it('buys two greater for a 64 HP hero, the tier whose assurance equals half the need', () => {
    const { party, bought, events } = visit({ heroes: [{ maxHp: 64 }], gold: RESERVE + 10000 });
    expect(bought).toBe(true);
    expect(party.potions).toEqual({ greater: 2 });
    expect(party.gold).toBe(RESERVE + 9600);
    expect(events).toEqual([receipt(party.name, 2, 'greater', 400)]);
  });

  it('stocks the living hero and ignores a fallen companion', () => {
    const { party, bought, events } = visit({
      heroes: [{ maxHp: 32 }, { maxHp: 90, alive: false }],
      gold: RESERVE + 1000,
    });
    expect(bought).toBe(true);
    expect(party.potions).toEqual({ basic: 2 });
    expect(party.gold).toBe(RESERVE + 900);
    expect(events).toEqual([receipt(party.name, 2, 'basic', 100)]);
  });

  it('buys nothing when nobody is alive', () => {
    const { party, bought, events } = visit({ heroes: [{ maxHp: 90, alive: false }], gold: RESERVE + 10000 });
    expect(bought).toBe(false);
    expect(party.potions).toEqual({});
    expect(party.gold).toBe(RESERVE + 10000);
    expect(events).toEqual([]);
  });

  it('steps down to six basic when three greater cost one gold more than the purse above the reserve', () => {
    const { party, bought, events } = visit({ heroes: [{ maxHp: 90 }], gold: RESERVE + 599 });
    expect(bought).toBe(true);
    expect(party.potions).toEqual({ basic: 6 });
    expect(party.gold).toBe(RESERVE + 299);
    expect(party.spent).toBe(300);
    expect(events).toEqual([receipt(party.name, 6, 'basic', 300)]);
  });

  it('buys four basic when the six that would meet the target do not fit above the reserve', () => {
    const { party, bought, events } = visit({ heroes: [{ maxHp: 90 }], gold: RESERVE + 200 });
    expect(bought).toBe(true);
    expect(party.potions).toEqual({ basic: 4 });
    expect(party.gold).toBe(RESERVE);
    expect(events).toEqual([receipt(party.name, 4, 'basic', 200)]);
  });

  it('buys one basic when two would spend the resurrection reserve', () => {
    const { party, bought, events } = visit({ heroes: [{ maxHp: 32 }], gold: RESERVE + 99 });
    expect(bought).toBe(true);
    expect(party.potions).toEqual({ basic: 1 });
    expect(party.gold).toBe(RESERVE + 49);
    expect(events).toEqual([receipt(party.name, 1, 'basic', 50)]);
  });

  it('buys nothing when the purse is exactly the resurrection reserve', () => {
    const { party, bought, events } = visit({ heroes: [{ maxHp: 32 }], gold: RESERVE });
    expect(bought).toBe(false);
    expect(party.potions).toEqual({});
    expect(party.gold).toBe(RESERVE);
    expect(party.spent).toBe(0);
    expect(events).toEqual([]);
  });

  it('buys a free tier without taking gold from the reserve', () => {
    const free: PotionTier = { name: 'basic', formula: '2d4+2', price: 0 };
    const { party, bought, events, shop } = visit({
      heroes: [{ maxHp: 32 }],
      gold: RESERVE,
      tiers: [free],
    });
    expect(bought).toBe(true);
    expect(party.potions).toEqual({ basic: 2 });
    expect(party.gold).toBe(RESERVE);
    expect(shop.treasury).toBe(0);
    expect(events).toEqual([receipt(party.name, 2, 'basic', 0)]);
  });

  it('buys nothing from a ruined apothecary', () => {
    const { party, bought, events, shop } = visit({ heroes: [{ maxHp: 32 }], gold: RESERVE + 1000, ruined: true });
    expect(bought).toBe(false);
    expect(party.potions).toEqual({});
    expect(party.gold).toBe(RESERVE + 1000);
    expect(party.spent).toBe(0);
    expect(shop.treasury).toBe(0);
    expect(events).toEqual([]);
  });

  it('buys nothing from an empty catalogue', () => {
    const { party, bought, events } = visit({ heroes: [{ maxHp: 32 }], gold: RESERVE + 1000, tiers: [] });
    expect(bought).toBe(false);
    expect(party.potions).toEqual({});
    expect(party.gold).toBe(RESERVE + 1000);
    expect(events).toEqual([]);
  });

  it('buys the lowest tier by assured healing when the catalogue has no tier named basic', () => {
    const tiers: PotionTier[] = [
      { name: 'major', formula: '4d4+4', price: 10 },
      { name: 'minor', formula: '1d4+1', price: 80 },
    ];
    const { party, bought, events } = visit({ heroes: [{ maxHp: 4 }], gold: RESERVE + 1000, tiers });
    expect(bought).toBe(true);
    expect(party.potions).toEqual({ minor: 1 });
    expect(party.gold).toBe(RESERVE + 920);
    expect(events).toEqual([receipt(party.name, 1, 'minor', 80)]);
  });

  it('breaks an assured-healing tie toward the earlier catalogue tier, not the cheaper one', () => {
    const tiers: PotionTier[] = [
      { name: 'earlier', formula: '1d4+1', price: 40 },
      { name: 'later', formula: '1d4+1', price: 5 },
    ];
    const { party, bought, events } = visit({ heroes: [{ maxHp: 4 }], gold: RESERVE + 1000, tiers });
    expect(bought).toBe(true);
    expect(party.potions).toEqual({ earlier: 1 });
    expect(party.gold).toBe(RESERVE + 960);
    expect(events).toEqual([receipt(party.name, 1, 'earlier', 40)]);
  });

  it('steps down to five weak when the stronger cheaper tier is above the chosen one', () => {
    const tiers: PotionTier[] = [
      { name: 'weak', formula: '1d2+2', price: 10 },
      { name: 'mid', formula: '2d4+2', price: 100 },
      { name: 'odd', formula: '4d4+4', price: 50 },
    ];
    const { party, bought, events } = visit({ heroes: [{ maxHp: 40 }], gold: RESERVE + 299, tiers });
    expect(bought).toBe(true);
    expect(party.potions).toEqual({ weak: 5 });
    expect(party.gold).toBe(RESERVE + 249);
    expect(party.spent).toBe(50);
    expect(events).toEqual([receipt(party.name, 5, 'weak', 50)]);
  });

  it('steps down the healing ladder to the next cheaper tier whose count the purse can pay', () => {
    const tiers: PotionTier[] = [
      { name: 'mild', formula: '2d4+2', price: 400 },
      { name: 'steep', formula: '8d4+8', price: 5000 },
      { name: 'bargain', formula: '4d4+4', price: 50 },
    ];
    const { party, bought, events } = visit({ heroes: [{ maxHp: 128 }], gold: RESERVE + 3500, tiers });
    expect(bought).toBe(true);
    expect(party.potions).toEqual({ bargain: 4 });
    expect(party.gold).toBe(RESERVE + 3300);
    expect(events).toEqual([receipt(party.name, 4, 'bargain', 200)]);
  });

  it('buys as many of the cheapest tier as the purse affords when no full count fits', () => {
    const tiers: PotionTier[] = [
      { name: 'mild', formula: '2d4+2', price: 400 },
      { name: 'steep', formula: '8d4+8', price: 5000 },
      { name: 'bargain', formula: '4d4+4', price: 50 },
    ];
    const { party, bought, events } = visit({ heroes: [{ maxHp: 128 }], gold: RESERVE + 100, tiers });
    expect(bought).toBe(true);
    expect(party.potions).toEqual({ bargain: 2 });
    expect(party.gold).toBe(RESERVE);
    expect(events).toEqual([receipt(party.name, 2, 'bargain', 100)]);
  });

  it('covers the whole maximum when potionCoverFraction is 1, so a 32 HP fighter buys two greater', () => {
    const { party, bought, events } = visit({ heroes: [{ maxHp: 32 }], gold: RESERVE + 10000, cover: 1 });
    expect(bought).toBe(true);
    expect(party.potions).toEqual({ greater: 2 });
    expect(party.gold).toBe(RESERVE + 9600);
    expect(events).toEqual([receipt(party.name, 2, 'greater', 400)]);
  });
});
