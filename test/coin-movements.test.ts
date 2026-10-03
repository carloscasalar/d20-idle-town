import { CompanyRoster } from '../src/adventurers/company-roster';
import assert from 'node:assert/strict';
import { describe, expect, it } from 'vitest';
import { createHero, killHero } from '../src/adventurers/hero';
import { createParty, partyLevel, type Party } from '../src/adventurers/party';
import { Rng } from '../src/core/rng';
import { instantiate, ITEM_CATALOGUE } from '../src/items/items';
import { jobKnowledge } from '../src/quests/job-intel';
import type { Quest } from '../src/quests/quest';
import { advanceExpedition, type ExpeditionContext } from '../src/sim/expedition';
import { DEFAULT_CONFIG, Game, TICKS_PER_DAY, type GameConfig, type GameScenario, type GameStats } from '../src/sim/game';
import { createAsset } from '../src/town/assets';
import { createLair, type Lair } from '../src/town/lairs';
import { defaultTownServiceSteps, visitTownServices } from '../src/town/services';
import { generateTown, RETIREMENT_PRICE, serviceOf, type Town } from '../src/town/town';
import { LONG_SIMULATION_TIMEOUT_MS, readSimulationState } from './helpers/simulation';

interface World {
  tick: number;
  town: Town;
  parties: Party[];
  lairs: Lair[];
  quests: Quest[];
  stats: GameStats;
}
const readWorld = (game: Game): World => JSON.parse(game.regressionState());

// All companies (including disbanded ones), ruined employers, cleared Lairs,
// and signed treasuries count. Items are not gold; Holding loot is gold.
function totalGold(world: Pick<World, 'town' | 'parties' | 'lairs'>): number {
  return world.parties.reduce((sum, p) => sum + p.gold, 0)
    + world.town.employers.reduce((sum, e) => sum + e.treasury
      + e.assets.reduce((loot, a) => loot + a.loot.gold, 0), 0)
    + world.lairs.reduce((sum, l) => sum + l.hoard.gold, 0);
}
function assertConservation(before: number, after: number, sources = 0, sinks = 0): void {
  assert.equal(after, before + sources - sinks, 'world gold: opening + audited sources − audited sinks');
}
function openings(world: Pick<World, 'town' | 'parties'>): Map<string, number> {
  return new Map([
    ...world.parties.map((p): [string, number] => [p.id, p.gold - p.earned + p.spent]),
    ...world.town.employers.map((e): [string, number] => [e.id, e.treasury - e.earned + e.spent]),
  ]);
}
function assertHolderCounters(world: Pick<World, 'town' | 'parties'>, starting: Map<string, number>): void {
  for (const p of world.parties) {
    assert.ok(starting.has(p.id), `opening purse for ${p.id}`);
    assert.equal(p.gold, starting.get(p.id)! + p.earned - p.spent, `company ${p.id}: opening + earned − spent`);
  }
  for (const e of world.town.employers) {
    assert.ok(starting.has(e.id), `opening treasury for ${e.id}`);
    assert.equal(e.treasury, starting.get(e.id)! + e.earned - e.spent, `employer ${e.id}: opening + earned − spent`);
  }
}

// Keep the preceding observation's indexes instead of searching its arrays
// for every holder and every work transition. They are replaced at each event,
// so pruning, arrivals, retirement and Lair respawns remain visible immediately.
function indexWorld(world: World) {
  return {
    parties: new Map(world.parties.map((p) => [p.id, p])),
    employers: new Map(world.town.employers.map((e) => [e.id, e])),
    lairs: new Map(world.lairs.map((l) => [l.id, l])),
    quests: new Map(world.quests.map((q) => [q.id, q])),
    holdings: new Map(world.town.employers.flatMap((e) => e.assets.map((a) => [a.id, a] as const))),
  };
}

/** Observe domain state at public events, including arrivals before their first
 * purchase/merge. No event text, private access, or RNG position is used. */
function watchBooks(game: Game, config: Partial<GameConfig> = {}) {
  const rules = { ...DEFAULT_CONFIG, ...config };
  let previous = readSimulationState(game);
  let previousIndex = indexWorld(previous);
  const starting = openings(previous);
  let sources = 0;
  let sinks = 0;
  const observe = () => {
    const current = readSimulationState(game);
    const currentIndex = indexWorld(current);
    for (const p of current.parties) {
      if (!previousIndex.parties.has(p.id)) {
        // C01: derive opening gold from the public constructor, using an
        // independent RNG so observation cannot affect the simulation.
        const purse = createParty(new Rng(0), partyLevel(p), p.members.length, p.arrivedAt).gold;
        starting.set(p.id, purse);
        sources += purse;
      }
    }
    let retirementCapital = 0;
    for (const e of current.town.employers) {
      if (!previousIndex.employers.has(e.id)) {
        starting.set(e.id, e.treasury); // C04: record the business's opening capital at birth.
        retirementCapital += e.treasury;
      }
    }
    for (const l of current.lairs) {
      if (!previousIndex.lairs.has(l.id)) {
        sources += createLair(new Rng(0), l.theme, l.level, l.spawnedAt).hoard.gold; // C03
      }
    }
    sinks += RETIREMENT_PRICE * (current.stats.retirements - previous.stats.retirements) - retirementCapital; // G03
    for (const work of current.quests) {
      const old = previousIndex.quests.get(work.id);
      if (old?.status === 'taken' && work.status === 'done' && work.kind === 'contract') {
        const holding = currentIndex.holdings.get(work.assetId ?? '');
        sources += (holding?.incomePerDay ?? 0) * rules.windfallDays; // B02, independent of treasury delta.
      }
      if (old?.status === 'open' && work.status === 'failed'
        && current.stats.questsExpired > previous.stats.questsExpired) {
        const origin = previousIndex.lairs.get(work.lairId ?? '');
        if (origin?.status !== 'active') {
          const payer = previousIndex.employers.get(work.giverId)!;
          const holding = payer.assets.find((a) => a.id === work.assetId)!;
          sinks += Math.max(0, Math.min(payer.treasury, holding.incomePerDay * rules.lootingDays)); // B06
        }
      }
    }
    previous = current;
    previousIndex = currentIndex;
  };
  game.onEvent(observe);
  return {
    step() {
      // The final observation of the preceding tick is its immutable opening.
      const before = previous;
      sources = 0;
      sinks = 0;
      if ((before.tick + 1) % TICKS_PER_DAY === 0) {
        for (const e of before.town.employers.filter((e) => !e.ruined)) {
          sources += e.assets.reduce((sum, a) => sum + (a.status === 'safe' ? a.incomePerDay
            : a.status === 'threatened' ? Math.floor(a.incomePerDay / 2) : 0), 0); // G01
          sinks += e.upkeepPerDay; // G02
        }
      }
      game.step();
      observe();
      const after = previous;
      assertConservation(totalGold(before), totalGold(after), sources, sinks);
      assertHolderCounters(after, starting);
    },
  };
}

function provisioned(rng: Rng, level = 1, gold = 1000): Party {
  const p = createParty(rng, level, 4, 0);
  p.members = Array.from({ length: 4 }, () => createHero(rng, level, 'Fighter'));
  Object.assign(p, { gold, potions: 4, blessed: true, guildMember: true, duesPaidDay: 1 });
  for (const hero of p.members) hero.armorTier = 3;
  return p;
}
function scene(configure: (s: GameScenario, rng: Rng) => void, config: Partial<GameConfig> = {}): Game {
  return Game.forTesting({ seed: 42, maxParties: 0, maxOpenQuests: 0, ...config }, (s) => {
    s.lairs = [];
    s.quests = [];
    for (const e of s.town.employers) {
      Object.assign(e, { treasury: 1000, earned: 0, spent: 0, cooldown: 10000, restockIn: 10000, stock: [], upkeepPerDay: 0 });
      e.assets = [];
    }
    configure(s, new Rng(71));
  });
}
function work(town: Town, p: Party, overrides: Partial<Quest> = {}): Quest {
  return {
    id: 'work', kind: 'contract', title: 'Recover the tower', place: 'Tower',
    giverId: town.employers[0]!.id, assetId: null, lairId: null, theme: 'goblins', level: 1,
    encounters: [{ difficulty: 'easy', monsters: [{ name: 'Goblin Warrior', count: 1, xpEach: 50 }], totalXp: 50, tier: 'Low' }],
    revealed: 0, countRevealed: false, reward: 50, itemReward: null, guildOnly: false,
    status: 'open', partyId: overrides.status === 'taken' ? p.id : null, postedAt: 0, ...overrides,
  };
}
function employer(game: Game, service: NonNullable<ReturnType<typeof serviceOf>['service']>) {
  return game.view().town.employers.find((e) => e.service === service)!;
}

function investigationScene(gold: number) {
  const game = scene((s, rng) => {
    const p = provisioned(rng, 1, gold);
    const q = work(s.town, p);
    // One free attempt cannot reveal this whole Contract.
    q.encounters = Array.from({ length: 3 }, () => structuredClone(q.encounters[0]!));
    s.parties = [p];
    s.quests = [q];
  });
  const books = watchBooks(game);
  books.step();
  expect(game.view().parties[0]).toMatchObject({ gold, earned: 0, spent: 0 });
  expect(game.view().stats.goldSpentByHeroes).toBe(0);
  expect(readWorld(game).quests[0]!.status).toBe('open');
  return { game, books };
}

// Service rows with incomplete existing ledger assertions are exercised with
// literal outcomes; fixtures start with nonzero lifetime entries as well.
describe('service purchase ledgers', () => {
  it.each([
    { gold: 225, potions: 1, left: 190, spent: 35, treasury: 1035 },
    { gold: 224, potions: 0, left: 224, spent: 0, treasury: 1000 },
    { gold: 260, potions: 2, left: 190, spent: 70, treasury: 1070 },
    { gold: 259, potions: 1, left: 224, spent: 35, treasury: 1035 },
  ])('buys $potions potions from a $gold gp purse while keeping the reserve', ({ gold, potions, left, spent, treasury }) => {
    const game = scene((s, rng) => {
      const p = provisioned(rng, 1, gold);
      p.potions = 0;
      s.parties = [p];
    });
    watchBooks(game).step();
    expect(game.view().parties[0]).toMatchObject({ gold: left, earned: 0, spent, potions });
    expect(employer(game, 'apothecary')).toMatchObject({ treasury, earned: spent, spent: 0 });
    expect(readWorld(game).parties[0]!.members.map((h) => h.goldSpent)).toEqual([0, 0, 0, 0]);
    expect(game.view().stats).toMatchObject({ goldSpentByHeroes: spent, itemsSold: 0 });
  });

  it.each([
    { gold: 990, bought: true, left: 190, spent: 800, treasury: 1800 },
    { gold: 989, bought: false, left: 989, spent: 0, treasury: 1000 },
  ])('buys a magic item only when its price fits the $gold gp purse minus reserve', ({ gold, bought, left, spent, treasury }) => {
    const game = scene((s, rng) => {
      s.parties = [provisioned(rng, 1, gold)];
      serviceOf(s.town, 'enchanter').stock = [instantiate(rng, ITEM_CATALOGUE.find((i) => i.name === 'Shield +1')!)];
    });
    watchBooks(game).step();
    const world = readWorld(game);
    expect(world.parties[0]).toMatchObject({ gold: left, earned: 0, spent });
    expect(employer(game, 'enchanter')).toMatchObject({ treasury, earned: spent, spent: 0 });
    expect(world.parties[0]!.members.map((h) => h.goldSpent)).toEqual(bought ? [800, 0, 0, 0] : [0, 0, 0, 0]);
    expect(world.parties[0]!.members.map((h) => h.items.map((i) => i.name))).toEqual(bought ? [['Shield +1'], [], [], []] : [[], [], [], []]);
    expect(serviceOf(world.town, 'enchanter').stock.map((i) => i.name)).toEqual(bought ? [] : ['Shield +1']);
    expect(game.view().stats).toMatchObject({ goldSpentByHeroes: spent, itemsSold: 0 });
  });

  it.each([
    { service: 'apothecary', cost: 70, left: 930, spent: 80, treasury: 1070, earned: 90, totalSpent: 77 },
    { service: 'guild', cost: 60, left: 940, spent: 70, treasury: 1060, earned: 80, totalSpent: 67 },
    { service: 'temple', cost: 40, left: 960, spent: 50, treasury: 1040, earned: 60, totalSpent: 47 },
    { service: 'smith', cost: 120, left: 880, spent: 130, treasury: 1120, earned: 140, totalSpent: 127 },
    { service: 'enchanter', cost: 800, left: 200, spent: 810, treasury: 1800, earned: 820, totalSpent: 807 },
  ] as const)('records a $cost gp purchase at the $service', ({ service, cost, left, spent, treasury, earned, totalSpent }) => {
    const rng = new Rng(8);
    const town = generateTown(rng);
    const p = provisioned(rng);
    p.earned = 30;
    p.spent = 10;
    const shop = serviceOf(town, service);
    Object.assign(shop, { treasury: 1000, earned: 20, spent: 5 });
    if (service === 'apothecary') p.potions = 2;
    if (service === 'guild') { p.guildMember = false; p.duesPaidDay = -1; }
    if (service === 'temple') p.blessed = false;
    if (service === 'smith') p.members[0]!.armorTier = 0;
    if (service === 'enchanter') shop.stock = [instantiate(rng, ITEM_CATALOGUE.find((i) => i.name === 'Shield +1')!)];
    const world = { town, parties: [p], lairs: [] };
    const starting = openings(world);
    const before = totalGold(world);
    const ledger = { itemsSold: 3 };
    const statistics = { goldPaid: 0, goldSpentByHeroes: 7 };

    expect(visitTownServices(p, { town, day: 1, ledger, statistics, report: () => {} }, defaultTownServiceSteps())).toBe(true);

    expect(p).toMatchObject({ gold: left, earned: 30, spent });
    expect(shop).toMatchObject({ treasury, earned, spent: 5 });
    expect(ledger).toEqual({ itemsSold: 3 });
    expect(statistics.goldSpentByHeroes).toBe(totalSpent);
    expect(p.members.map((h) => h.goldSpent)).toEqual(service === 'smith' || service === 'enchanter' ? [cost, 0, 0, 0] : [0, 0, 0, 0]);
    if (service === 'apothecary') expect(p.potions).toBe(4);
    if (service === 'guild') expect(p).toMatchObject({ guildMember: true, duesPaidDay: 1 });
    if (service === 'temple') expect(p.blessed).toBe(true);
    if (service === 'smith') expect(p.members[0]!.armorTier).toBe(1);
    if (service === 'enchanter') { expect(shop.stock).toEqual([]); expect(p.members[0]!.items[0]!.name).toBe('Shield +1'); }
    assertConservation(before, totalGold(world));
    assertHolderCounters(world, starting);
  });
});

describe('paid investigation', () => {
  it.each([
    { service: 'temple', gold: 1000, left: 940, treasury: 1060, cost: 60, revealed: 3 },
    { service: 'tavern', gold: 250, left: 235, treasury: 1015, cost: 15, revealed: 0 },
  ] as const)('pays the $service for Contract intelligence', ({ service, gold, left, treasury, cost, revealed }) => {
    const { game, books } = investigationScene(gold);
    books.step();
    expect(game.view().parties[0]).toMatchObject({ gold: left, earned: 0, spent: cost });
    expect(employer(game, service)).toMatchObject({ treasury, earned: cost, spent: 0 });
    expect(game.view().stats.goldSpentByHeroes).toBe(cost);
    expect(readWorld(game).quests[0]).toMatchObject({ revealed, countRevealed: true, status: 'open' });
  });

  it.each([
    { gold: 440, left: 380, spent: 60, temple: 1060, templeEarned: 60, tavern: 1000, tavernEarned: 0, revealed: 3 },
    { gold: 439, left: 424, spent: 15, temple: 1000, templeEarned: 0, tavern: 1015, tavernEarned: 15, revealed: 0 },
  ])('buys divination only when a $gold gp purse leaves twice the reserve', ({ gold, left, spent, temple, templeEarned, tavern, tavernEarned, revealed }) => {
    const { game, books } = investigationScene(gold);
    books.step();
    expect(game.view().parties[0]).toMatchObject({ gold: left, earned: 0, spent });
    expect(employer(game, 'temple')).toMatchObject({ treasury: temple, earned: templeEarned, spent: 0 });
    expect(employer(game, 'tavern')).toMatchObject({ treasury: tavern, earned: tavernEarned, spent: 0 });
    expect(game.view().stats.goldSpentByHeroes).toBe(spent);
    expect(readWorld(game).parties[0]!.members.map((h) => h.goldSpent)).toEqual([0, 0, 0, 0]);
    expect(readWorld(game).quests[0]).toMatchObject({ revealed, countRevealed: true, status: 'open' });
  });

  it.each([
    { gold: 205, left: 190, spent: 15, treasury: 1015, status: 'open' },
    { gold: 204, left: 204, spent: 0, treasury: 1000, status: 'taken' },
  ])('buys a tavern round only when a $gold gp purse leaves the reserve', ({ gold, left, spent, treasury, status }) => {
    const { game, books } = investigationScene(gold);
    books.step();
    expect(game.view().parties[0]).toMatchObject({ gold: left, earned: 0, spent });
    expect(employer(game, 'tavern')).toMatchObject({ treasury, earned: spent, spent: 0 });
    expect(employer(game, 'temple')).toMatchObject({ treasury: 1000, earned: 0, spent: 0 });
    expect(game.view().stats.goldSpentByHeroes).toBe(spent);
    expect(readWorld(game).parties[0]!.members.map((h) => h.goldSpent)).toEqual([0, 0, 0, 0]);
    expect(readWorld(game).quests[0]!.status).toBe(status);
  });
});

describe('resurrection payment', () => {
  it('pays the temple to raise one fallen adventurer', () => {
    const game = scene((s, rng) => {
      const p = provisioned(rng, 1, 190);
      killHero(p.members[0]!);
      s.parties = [p];
    });
    watchBooks(game).step();
    expect(game.view().parties[0]).toMatchObject({ gold: 0, earned: 0, spent: 190 });
    expect(employer(game, 'temple')).toMatchObject({ treasury: 1190, earned: 190, spent: 0 });
    expect(readWorld(game).parties[0]!.members.map((h) => h.goldSpent)).toEqual([190, 0, 0, 0]);
    expect(readWorld(game).parties[0]!.members.every((h) => h.alive)).toBe(true);
    expect(game.view().stats).toMatchObject({ resurrections: 1, goldSpentByHeroes: 190 });
  });
});

describe('homecoming payments', () => {
  it.each([
    { success: false, gold: 12, spent: 12, left: 0, treasury: 1012, renown: 0 },
    { success: false, gold: 11, spent: 0, left: 11, treasury: 1000, renown: 0 },
    { success: false, gold: 200, spent: 12, left: 188, treasury: 1012, renown: 0 },
    { success: true, gold: 212, spent: 22, left: 190, treasury: 1022, renown: 1 },
    { success: true, gold: 1012, spent: 62, left: 950, treasury: 1062, renown: 1 },
    { success: true, gold: 1032, spent: 63, left: 969, treasury: 1063, renown: 1 },
    { success: true, gold: 1031, spent: 62, left: 969, treasury: 1062, renown: 1 },
  ])('charges $spent gp for a homecoming from a $gold gp purse (success=$success)', ({ success, gold, spent, left, treasury, renown }) => {
    const rng = new Rng(8);
    const town = generateTown(rng);
    const p = provisioned(rng, 1, gold);
    const tavern = serviceOf(town, 'tavern');
    tavern.treasury = 1000;
    const q = work(town, p, { status: 'taken' });
    Object.assign(p, { status: 'returning', ticksLeft: 1, progress: success ? 1 : 0, questId: q.id });
    const world = { town, parties: [p], lairs: [] };
    const starting = openings(world);
    const before = totalGold(world);
    const ledger = { heroesDied: 0, partiesWiped: 0 };
    const statistics = { goldPaid: 0, goldSpentByHeroes: 0 };
    const reports: string[] = [];
    const roster = new CompanyRoster();
    roster.replaceForScenario([p]);
    const context: ExpeditionContext = {
      town, quest: q, rng, ledger, statistics, travelTicks: 2, restTicks: 8, shortRestHealFraction: 0.5, skillDc: 15,
      combat: () => { throw new Error('Homecoming does not fight'); }, report: (event) => { reports.push(event.text); },
      disband: (company) => roster.disband(company),
      knowledge: () => jobKnowledge(q), leaveLoot: () => {},
      settleQuest: (_q, company) => { company.questId = null; },
    };
    advanceExpedition(p, context);
    expect(p).toMatchObject({ gold: left, spent, earned: 0, renown, status: 'resting' });
    expect(tavern).toMatchObject({ treasury, earned: spent, spent: 0 });
    expect(ledger).toEqual({ heroesDied: 0, partiesWiped: 0 });
    expect(statistics.goldSpentByHeroes).toBe(spent);
    expect(reports.some((line) => line.includes('take rooms'))).toBe(gold !== 11);
    expect(reports.some((line) => line.includes('bed down in the stables'))).toBe(gold === 11);
    assertConservation(before, totalGold(world));
    assertHolderCounters(world, starting);
  });
});

describe('retirement capital', () => {
  it('spends 25000 gp and starts the veteran’s business with 5000 gp', () => {
    const game = scene((s, rng) => { s.parties = [provisioned(rng, 8, 30000)]; });
    watchBooks(game).step();
    expect(game.view().parties[0]).toMatchObject({ gold: 5000, earned: 0, spent: 25000 });
    const veteran = game.view().town.employers.find((e) => e.title === 'Retired adventurer')!;
    expect(veteran).toMatchObject({ treasury: 5000, earned: 0, spent: 0 });
    expect(game.view().stats).toMatchObject({ retirements: 1, goldSpentByHeroes: 25000 });
    expect(readWorld(game).parties[0]!.members.map((h) => h.goldSpent)).toEqual([0, 0, 0]);
  });
});

describe('daily income and upkeep', () => {
  it('collects full, half and zero Holding income', () => {
    const game = scene((s, rng) => {
      s.tick = 23;
      const e = s.town.employers[0]!;
      e.upkeepPerDay = 0;
      e.assets = ['safe', 'threatened', 'ravaged'].map((status) => {
        const a = createAsset(rng, 'watchtower', e.id);
        Object.assign(a, { status, incomePerDay: 11 });
        return a;
      });
    });
    watchBooks(game).step();
    expect(readWorld(game).town.employers[0]).toMatchObject({ treasury: 1016, earned: 16, spent: 0 });
    expect(game.view().stats).toMatchObject({ goldPaid: 0, goldSpentByHeroes: 0 });
  });
  it('keeps paid upkeep in the ledger even when it puts the employer in debt', () => {
    const game = scene((s) => { s.tick = 23; s.town.employers[0]!.treasury = 7; s.town.employers[0]!.upkeepPerDay = 10; });
    watchBooks(game).step();
    expect(readWorld(game).town.employers[0]).toMatchObject({ treasury: -3, earned: 0, spent: 10 });
  });
});

describe('expiry looting', () => {
  it('checks the looting sink with a configured three-day loss', () => {
    const config = { lootingDays: 3 };
    const game = scene((s, rng) => {
      s.tick = 100;
      const e = s.town.employers[0]!;
      const a = createAsset(rng, 'watchtower', e.id);
      Object.assign(a, { incomePerDay: 10, status: 'threatened', questId: 'work' });
      e.assets = [a];
      s.quests = [work(s.town, provisioned(rng), { assetId: a.id })];
    }, config);
    watchBooks(game, config).step();
    expect(readWorld(game).town.employers[0]).toMatchObject({ treasury: 970, spent: 30, earned: 0 });
    expect(game.view().stats).toMatchObject({ questsExpired: 1, goldPaid: 0, goldSpentByHeroes: 0 });
  });

  it('moves expiry looting from the employer into the active Lair’s hoard', () => {
    const game = scene((s, rng) => {
      s.tick = 100;
      const p = provisioned(rng);
      const e = s.town.employers[0]!;
      const a = createAsset(rng, 'watchtower', e.id);
      Object.assign(a, { incomePerDay: 10, status: 'threatened', questId: 'work' });
      e.assets = [a];
      const l = createLair(rng, 'goblins', 5, 0);
      Object.assign(l, { raidCooldown: 10000 });
      l.hoard.gold = 100;
      s.lairs = [l];
      s.quests = [work(s.town, p, { assetId: a.id, lairId: l.id })];
    });
    watchBooks(game).step();
    expect(readWorld(game).town.employers[0]).toMatchObject({ treasury: 980, spent: 20, earned: 0 });
    expect(game.view().lairs[0]!.hoardGold).toBe(120);
    expect(game.view().stats).toMatchObject({ questsExpired: 1, goldPaid: 0, goldSpentByHeroes: 0 });
  });
});

describe('configured Contract windfall', () => {
  it('checks the gold source with a configured seven-day windfall', () => {
    const config = { windfallDays: 7 };
    const game = scene((s, rng) => {
      const p = provisioned(rng, 1, 0);
      const e = s.town.employers[0]!;
      const a = createAsset(rng, 'watchtower', e.id);
      Object.assign(a, { incomePerDay: 10, status: 'ravaged', questId: 'work' });
      e.assets = [a];
      const q = work(s.town, p, { status: 'taken', assetId: a.id });
      Object.assign(p, { status: 'returning', ticksLeft: 1, progress: 1, questId: q.id });
      s.parties = [p];
      s.quests = [q];
    }, config);
    watchBooks(game, config).step();
    expect(readWorld(game).town.employers[0]).toMatchObject({ treasury: 1020, earned: 70, spent: 50 });
    expect(game.view().parties[0]).toMatchObject({ gold: 38, earned: 50, spent: 12 });
    expect(employer(game, 'tavern')).toMatchObject({ treasury: 1012, earned: 12, spent: 0 });
    expect(game.view().stats).toMatchObject({ goldPaid: 50, goldSpentByHeroes: 12, questsCompleted: 1 });
  });
});

describe('company purse transfers', () => {
  it('records a merged purse as donor spending and host earnings', () => {
    const game = scene((s, rng) => {
      const host = provisioned(rng, 1, 10);
      const donor = provisioned(rng, 1, 5);
      Object.assign(host, { earned: 3, spent: 2 });
      Object.assign(donor, { earned: 2, spent: 1 });
      host.members = host.members.slice(0, 2);
      donor.members = donor.members.slice(0, 2);
      s.parties = [host, donor];
      s.stats.goldSpentByHeroes = 9;
      s.stats.goldPaid = 11;
    });
    const before = readWorld(game);
    watchBooks(game).step();
    const after = readWorld(game);
    expect(after.parties[0]).toMatchObject({ gold: 15, earned: 8, spent: 2 });
    expect(after.parties[1]).toMatchObject({ gold: 0, earned: 2, spent: 6 });
    expect(after.stats).toEqual(before.stats);
  });
  it.each(['Holding', 'Lair'] as const)('records the wiped purse as company spending when left at the %s', (destination) => {
    const game = scene((s, rng) => {
      const p = provisioned(rng, 1, 37);
      Object.assign(p, { earned: 13, spent: 7 });
      s.stats.goldSpentByHeroes = 9;
      const e = s.town.employers[0]!;
      const a = createAsset(rng, 'watchtower', e.id);
      e.assets = [a];
      a.loot.gold = 11;
      const l = createLair(rng, 'goblins', 5, 0);
      l.hoard.gold = 100;
      l.raidCooldown = 10000;
      const q = work(s.town, p, {
        status: 'taken', assetId: a.id, lairId: destination === 'Lair' ? l.id : null,
        encounters: [{ difficulty: 'hard', monsters: [{ name: 'Ancient Red Dragon', count: 6, xpEach: 62000 }], totalXp: 372000, tier: 'High' }],
      });
      Object.assign(p, { status: 'questing', questId: q.id, potions: 0 });
      for (const h of p.members) h.hp = 1;
      p.members[0]!.items = [instantiate(rng, ITEM_CATALOGUE[0]!)];
      p.stash = [instantiate(rng, ITEM_CATALOGUE.find((item) => item.name === 'Shield +1')!)];
      s.parties = [p]; s.quests = [q]; s.lairs = destination === 'Lair' ? [l] : [];
    });
    watchBooks(game).step();
    const after = readWorld(game);
    expect(after.parties[0]).toMatchObject({ gold: 0, earned: 13, spent: 44, status: 'disbanded' });
    expect(after.town.employers[0]!.assets[0]!.loot.gold).toBe(destination === 'Holding' ? 48 : 11);
    if (destination === 'Lair') expect(after.lairs[0]!.hoard.gold).toBe(137);
    const store = destination === 'Lair' ? after.lairs[0]!.hoard : after.town.employers[0]!.assets[0]!.loot;
    expect(store.items.map((item) => item.name)).toEqual(['Longsword +1', 'Shield +1']);
    expect(after.parties[0]!.stash).toEqual([]);
    expect(after.parties[0]!.members.flatMap((h) => h.items)).toEqual([]);
    expect(after.stats).toMatchObject({ partiesWiped: 1, heroesDied: 4, goldPaid: 0, itemsFound: 0, goldSpentByHeroes: 9 });
    expect(after.town.employers[0]).toMatchObject({ treasury: 1000, earned: 0, spent: 0 });
  });
});

describe('bookkeeping across 400 hours', () => {
  it.each([7, 42, 20260907])('checks conservation and every holder after every tick for seed %s', (seed) => {
    const game = new Game({ seed });
    const books = watchBooks(game);
    for (let hour = 0; hour < 400; hour++) books.step();
  }, LONG_SIMULATION_TIMEOUT_MS);
});

describe('opening gold sources', () => {
  it('starts the town’s employers with treasury capital and empty counters', () => {
    const game = new Game({ seed: 42 });
    const world = readWorld(game);
    expect(world.town.employers.map((e) => e.treasury)).toEqual([2437, 1759, 1355, 1548, 1069, 1050, 698, 1527, 1194, 967, 924]);
    expect(world.town.employers.map((e) => [e.earned, e.spent])).toEqual([
      [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],
    ]);
    for (const holding of world.town.employers.flatMap((e) => e.assets)) {
      expect(holding.loot).toEqual({ gold: 0, items: [] });
    }
    assertConservation(0, totalGold({ ...world, lairs: [] }), 14528);
  });
  it('starts each Lair with gold in its hoard', () => {
    const game = new Game({ seed: 42 });
    const world = readWorld(game);
    expect(world.lairs.map((l) => [l.level, l.hoard.gold])).toEqual([[6, 600], [7, 700], [8, 800]]);
    assertConservation(0, totalGold({ ...world, town: { ...world.town, employers: [] } }), 2100);
  });
  it('brings a new company’s 20 gp starting purse into the world', () => {
    const game = Game.forTesting({ seed: 42, maxParties: 1, maxOpenQuests: 0 }, (s) => { s.lairs = []; });
    watchBooks(game).step();
    expect(readWorld(game).parties[0]).toMatchObject({ gold: 20, earned: 0, spent: 0 });
    expect(game.view().stats).toMatchObject({ partiesArrived: 1, goldPaid: 0, goldSpentByHeroes: 0 });
  });
});

describe('fallen equipment and the surviving purse', () => {
  it.each(['Holding', 'Lair'] as const)('leaves fallen equipment at the %s while survivors keep all their gold', (destination) => {
    const game = scene((s, rng) => {
      const p = provisioned(rng, 1, 37);
      p.members[0]!.hp = 1;
      p.members[0]!.items = [instantiate(rng, ITEM_CATALOGUE[0]!)];
      const e = s.town.employers[0]!;
      const a = createAsset(rng, 'watchtower', e.id);
      a.loot.gold = 11;
      e.assets = [a];
      const l = createLair(rng, 'goblins', 5, 0);
      l.raidCooldown = 10000;
      l.hoard.gold = 100;
      const q = work(s.town, p, { status: 'taken', assetId: a.id, lairId: destination === 'Lair' ? l.id : null,
        encounters: [{ difficulty: 'hard', monsters: [{ name: 'Goblin Warrior', count: 7, xpEach: 50 }], totalXp: 350, tier: 'High' }],
      });
      Object.assign(p, { status: 'questing', questId: q.id, potions: 0 });
      s.parties = [p]; s.quests = [q]; s.lairs = destination === 'Lair' ? [l] : [];
    });
    watchBooks(game).step();
    const after = readWorld(game);
    expect(after.parties[0]).toMatchObject({ gold: 37, earned: 0, spent: 0, status: 'returning' });
    expect(after.town.employers[0]).toMatchObject({ treasury: 1000, earned: 0, spent: 0 });
    expect(after.town.employers[0]!.assets[0]!.loot.gold).toBe(11);
    if (destination === 'Lair') expect(after.lairs[0]!.hoard.gold).toBe(100);
    const store = destination === 'Lair' ? after.lairs[0]!.hoard : after.town.employers[0]!.assets[0]!.loot;
    expect(store.items.map((item) => item.name)).toEqual(['Longsword +1']);
    expect(after.parties[0]!.members[0]!.items).toEqual([]);
    expect(after.stats).toMatchObject({ heroesDied: 2, partiesWiped: 0, itemsFound: 0, goldPaid: 0, goldSpentByHeroes: 0 });
  });
});
