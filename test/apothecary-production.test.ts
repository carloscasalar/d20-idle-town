import { describe, expect, it } from 'vitest';
import { createHero } from '../src/adventurers/hero';
import { createParty } from '../src/adventurers/party';
import { DEFAULT_POLICIES_CONFIG } from '../src/adventurers/policies';
import { DEFAULT_POTION_CONFIG, type PotionTier } from '../src/adventurers/potions';
import { Rng } from '../src/core/rng';
import { Game } from '../src/sim/game';
import { balance, emptyGoldStatistics, openCoin, type Coin } from '../src/town/coin';
import { TOWN_SERVICE_STEPS, visitTownServices } from '../src/town/services';
import { DEFAULT_TOWN_CONFIG, generateTown, serviceOf } from '../src/town/town';
import { DEFAULT_HOLDING_CONFIG } from '../src/town/assets';
import { ApothecaryTracker, formatScaleReport } from '../scripts/tune-report';
import { SERVICE_SUPPLIES, STARTING_GOLD } from './helpers/supplied-config';

function serviceVisit(tier: PotionTier, opening = 0, ruined = false) {
  const rng = new Rng(3);
  const party = createParty(rng, 1, 1, 0, STARTING_GOLD, DEFAULT_POLICIES_CONFIG.potionSharing);
  party.members = [createHero(rng, 1, 'Fighter')];
  party.members[0]!.maxHp = 32;
  party.gold = 1190;
  const town = generateTown(rng, DEFAULT_TOWN_CONFIG, DEFAULT_HOLDING_CONFIG);
  const shop = serviceOf(town, 'apothecary');
  Object.assign(shop, { treasury: opening, earned: 0, spent: 0, ruined });
  const statistics = emptyGoldStatistics();
  const realCoin = openCoin(statistics);
  const observations: unknown[] = [];
  // The context's public coin boundary records actual movements and balances;
  // all accounting runs through the real coin, with no module spies.
  const coin: Coin = {
    ...realCoin,
    sink(from, amount, reason, adventurer) {
      realCoin.sink(from, amount, reason, adventurer);
      observations.push({ kind: 'sink', reason, amount, balance: balance(from), adventurer, stats: { ...statistics } });
    },
    transfer(from, to, amount, reason, adventurer) {
      realCoin.transfer(from, to, amount, reason, adventurer);
      observations.push({ kind: 'sale', reason, amount, balance: balance(to), adventurer, stats: { ...statistics } });
    },
  };
  const bought = visitTownServices(party, {
    ...SERVICE_SUPPLIES, potions: { tiers: [tier] }, town, day: 1,
    ledger: { itemsSold: 0 }, coin,
    report: (event) => observations.push({ kind: 'event', text: event.text }),
  }, [TOWN_SERVICE_STEPS.potions!]);
  return { bought, party, shop, statistics, observations };
}

describe('apothecary production', () => {
  it('sinks each potion cost before its full sale, with one receipt after both pairs', () => {
    const { bought, party, shop, statistics, observations } = serviceVisit(DEFAULT_POTION_CONFIG.tiers[0]!);
    expect(bought).toBe(true);
    expect(observations).toEqual([
      { kind: 'sink', reason: 'production', amount: 25, balance: -25, adventurer: undefined, stats: { goldPaid: 0, goldSpentByHeroes: 0, goldSpentOnProduction: 25 } },
      { kind: 'sale', reason: 'service', amount: 50, balance: 25, adventurer: undefined, stats: { goldPaid: 0, goldSpentByHeroes: 50, goldSpentOnProduction: 25 } },
      { kind: 'sink', reason: 'production', amount: 25, balance: 0, adventurer: undefined, stats: { goldPaid: 0, goldSpentByHeroes: 50, goldSpentOnProduction: 50 } },
      { kind: 'sale', reason: 'service', amount: 50, balance: 50, adventurer: undefined, stats: { goldPaid: 0, goldSpentByHeroes: 100, goldSpentOnProduction: 50 } },
      { kind: 'event', text: `${party.name} buy 2 basic healing potions from ${shop.name} for 100 gp.` },
    ]);
    expect(shop).toMatchObject({ treasury: 50, earned: 100, spent: 50, ruined: false, stock: [] });
    expect(party).toMatchObject({ gold: 1090, earned: 0, spent: 100, potions: { basic: 2 } });
    expect(party.members[0]!.goldSpent).toBe(0);
    expect(statistics).toEqual({ goldPaid: 0, goldSpentByHeroes: 100, goldSpentOnProduction: 50 });
  });

  it('uses a configured cost independent of price and still makes nonzero-tick potions instantly', () => {
    const tier = { ...DEFAULT_POTION_CONFIG.tiers[0]!, productionCost: 7, productionTicks: 3 };
    const { bought, party, shop, statistics } = serviceVisit(tier);
    expect(bought).toBe(true);
    expect(party.potions).toEqual({ basic: 2 });
    expect(shop).toMatchObject({ treasury: 86, earned: 100, spent: 14 });
    expect(statistics).toEqual({ goldPaid: 0, goldSpentByHeroes: 100, goldSpentOnProduction: 14 });
  });

  it.each([
    ['basic', 50, 25, 24], ['greater', 200, 100, 99], ['superior', 2000, 1000, 999], ['supreme', 20000, 10000, 9999],
  ] as const)('offers %s from a treasury in debt and exposes production in the game view and tuning report', (name, price, cost, finalTreasury) => {
    // Listing one tier makes the buying policy choose it without changing its rules.
    const tier = DEFAULT_POTION_CONFIG.tiers.find((entry) => entry.name === name)!;
    const game = Game.forTesting({
      seed: 42, roster: { maxCompanies: 0, companySize: 1 }, world: { maxOpenQuests: 0 },
      services: { steps: ['potions'] }, potions: { tiers: [tier] },
    }, (scenario) => {
      scenario.lairs = [];
      for (const employer of scenario.town.employers) {
        employer.assets = [];
        employer.cooldown = 10000;
      }
      const shop = serviceOf(scenario.town, 'apothecary');
      Object.assign(shop, { treasury: -1, earned: 0, spent: 0 });
      const rng = new Rng(71);
      const party = createParty(rng, 1, 1, 0, STARTING_GOLD, DEFAULT_POLICIES_CONFIG.potionSharing);
      party.members = [createHero(rng, 1, 'Fighter')];
      party.gold = 190 + price;
      scenario.parties = [party];
    });
    const tracker = new ApothecaryTracker();
    tracker.observe(game.view());
    expect(game.view().stats.goldSpentOnProduction).toBe(0);
    const receipts: unknown[] = [];
    game.onEvent((event) => {
      if (event.kind !== 'shop') return;
      const view = game.view();
      const shop = view.town.employers.find((employer) => employer.service === 'apothecary')!;
      receipts.push({ treasury: shop.treasury, earned: shop.earned, spent: shop.spent, production: view.stats.goldSpentOnProduction });
    });
    game.step();
    const view = game.view();
    const shop = view.town.employers.find((employer) => employer.service === 'apothecary')!;
    expect(shop).toMatchObject({ treasury: finalTreasury, earned: price, spent: cost, ruined: false });
    expect(shop.treasury).toBe(-1 + shop.earned - shop.spent);
    expect(view.parties[0]).toMatchObject({ gold: 190, earned: 0, spent: price, potions: { [name]: 1 } });
    expect(view.stats).toMatchObject({ goldPaid: 0, goldSpentByHeroes: price, goldSpentOnProduction: cost });
    expect(receipts).toEqual([{ treasury: finalTreasury, earned: price, spent: cost, production: cost }]);
    tracker.observe(view);
    const report = tracker.report();
    expect(report.goldSpentOnProduction).toBe(cost);
    expect(formatScaleReport({ scale: 1, metrics: { quests: 0, failed: 0, deaths: 0, deathsPerQuest: 0, wiped: 0, arrived: 0, raised: 0 }, apothecary: report })[1])
      .toBe(`apothecary: ruined 0 of 1  lowest treasury reached -1  treasury at end (mean) ${finalTreasury}  goldSpentOnProduction ${cost}`);
  });

  it('a ruined apothecary makes and sells nothing even with a wealthy treasury', () => {
    const { bought, party, shop, statistics, observations } = serviceVisit(DEFAULT_POTION_CONFIG.tiers[0]!, 10000, true);
    expect(bought).toBe(false);
    expect(party).toMatchObject({ gold: 1190, spent: 0, potions: {} });
    expect(shop).toMatchObject({ treasury: 10000, earned: 0, spent: 0, ruined: true });
    expect(statistics).toEqual({ goldPaid: 0, goldSpentByHeroes: 0, goldSpentOnProduction: 0 });
    expect(observations).toEqual([]);
  });
});
