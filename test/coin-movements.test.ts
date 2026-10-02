import { describe, expect, it } from 'vitest';
import { createHero, killHero } from '../src/adventurers/hero';
import { createParty, partyLevel, type Party } from '../src/adventurers/party';
import { Rng } from '../src/core/rng';
import { instantiate, ITEM_CATALOGUE } from '../src/items/items';
import type { Quest } from '../src/quests/quest';
import { advanceExpedition, type ExpeditionContext } from '../src/sim/expedition';
import { Game, type GameScenario, type GameStats } from '../src/sim/game';
import { createAsset } from '../src/town/assets';
import { createLair, type Lair } from '../src/town/lairs';
import { visitTownServices } from '../src/town/services';
import { generateTown, serviceOf, type Town } from '../src/town/town';

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
  expect(after, 'world gold: opening + audited sources − audited sinks').toBe(before + sources - sinks);
}
function openings(world: Pick<World, 'town' | 'parties'>): Map<string, number> {
  return new Map([
    ...world.parties.map((p): [string, number] => [p.id, p.gold - p.earned + p.spent]),
    ...world.town.employers.map((e): [string, number] => [e.id, e.treasury - e.earned + e.spent]),
  ]);
}
function assertHolderCounters(world: Pick<World, 'town' | 'parties'>, starting: Map<string, number>): void {
  for (const p of world.parties) {
    expect(starting.has(p.id), `opening purse for ${p.id}`).toBe(true);
    expect(p.gold, `company ${p.id}: opening + earned − spent`).toBe(starting.get(p.id)! + p.earned - p.spent);
  }
  for (const e of world.town.employers) {
    expect(starting.has(e.id), `opening treasury for ${e.id}`).toBe(true);
    expect(e.treasury, `employer ${e.id}: opening + earned − spent`).toBe(starting.get(e.id)! + e.earned - e.spent);
  }
}

/** Observe domain state at public events, including arrivals before their first
 * purchase/merge. No event text, private access, or RNG position is used. */
function watchBooks(game: Game) {
  let previous = readWorld(game);
  const starting = openings(previous);
  const excluded = new Map<string, number>();
  let sources = 0;
  let sinks = 0;
  const excludeMovement = (old: Party, current: Party, moved: number) => {
    const counted = current.earned - old.earned - (current.spent - old.spent);
    // Subtract only this movement's discrepancy. Future earnings/spending are
    // still checked, and recording the transfer correctly needs no correction.
    excluded.set(old.id, (excluded.get(old.id) ?? 0) + moved - counted);
  };
  const observe = () => {
    const current = readWorld(game);
    for (const p of current.parties) {
      if (!previous.parties.some((old) => old.id === p.id)) {
        const purse = 20 * partyLevel(p); // Audit C01: arrival is an external source.
        starting.set(p.id, purse);
        sources += purse;
      }
    }
    for (const e of current.town.employers) {
      if (!previous.town.employers.some((old) => old.id === e.id)) {
        starting.set(e.id, 5000); // C04: capital transferred from retirement's 25000 gp payment.
      }
    }
    for (const l of current.lairs) {
      if (!previous.lairs.some((old) => old.id === l.id)) sources += 100 * l.level; // C03
    }
    sinks += 20000 * (current.stats.retirements - previous.stats.retirements); // G03: the other 5000 stays in the business.
    for (const work of current.quests) {
      const old = previous.quests.find((q) => q.id === work.id);
      if (old?.status === 'taken' && work.status === 'done' && work.kind === 'contract') {
        const holding = current.town.employers.flatMap((e) => e.assets).find((a) => a.id === work.assetId);
        sources += (holding?.incomePerDay ?? 0) * 4; // B02, independent of treasury delta.
      }
      if (old?.status === 'open' && work.status === 'failed'
        && current.stats.questsExpired > previous.stats.questsExpired) {
        const origin = previous.lairs.find((l) => l.id === work.lairId);
        if (origin?.status !== 'active') {
          const payer = previous.town.employers.find((e) => e.id === work.giverId)!;
          const holding = payer.assets.find((a) => a.id === work.assetId)!;
          sinks += Math.max(0, Math.min(payer.treasury, holding.incomePerDay * 2)); // B06
        }
      }
    }
    for (const old of previous.parties) {
      const p = current.parties.find((candidate) => candidate.id === old.id)!;
      if (old.status !== 'disbanded' && p.status === 'disbanded') {
        const work = previous.quests.find((q) => q.id === old.questId);
        const lair = previous.lairs.find((l) => l.id === work?.lairId);
        const holding = previous.town.employers.flatMap((e) => e.assets).find((a) => a.id === work?.assetId);
        if (work && (lair || holding)) {
          // AUDIT.md F01: exclude only the wiped purse's missing spent entry.
          excludeMovement(old, p, -old.gold);
          continue;
        }
      }
      const movedHeroes = old.members.filter((hero) => hero.alive && !p.members.some((member) => member.id === hero.id));
      const host = current.parties.find((candidate) => candidate.id !== old.id
        && movedHeroes.some((hero) => candidate.members.some((member) => member.id === hero.id)));
      if (host) {
        const oldHost = previous.parties.find((candidate) => candidate.id === host.id)!;
        // AUDIT.md F02: exclude precisely the donor purse movement, on each
        // side. Never drop a company, a tick, or its subsequent counters.
        excludeMovement(old, p, -old.gold);
        excludeMovement(oldHost, host, old.gold);
      }
    }
    previous = current;
  };
  game.onEvent(observe);
  return {
    step() {
      const before = readWorld(game);
      sources = 0;
      sinks = 0;
      if ((before.tick + 1) % 24 === 0) {
        for (const e of before.town.employers.filter((e) => !e.ruined)) {
          sources += e.assets.reduce((sum, a) => sum + (a.status === 'safe' ? a.incomePerDay
            : a.status === 'threatened' ? Math.floor(a.incomePerDay / 2) : 0), 0); // G01
          sinks += e.upkeepPerDay; // G02
        }
      }
      game.step();
      observe();
      const after = readWorld(game);
      assertConservation(totalGold(before), totalGold(after), sources, sinks);
      // Remove only F01/F02 movements from the counter input, leaving the
      // assertion helper strict and all other movements under its guard.
      assertHolderCounters({ ...after, parties: after.parties.map((p) => ({
        ...p, gold: p.gold - (excluded.get(p.id) ?? 0),
      })) }, starting);
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
function scene(configure: (s: GameScenario, rng: Rng) => void): Game {
  return Game.forTesting({ seed: 42, maxParties: 0, maxOpenQuests: 0 }, (s) => {
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

// Service rows with incomplete existing ledger assertions are exercised with
// literal outcomes; fixtures start with nonzero lifetime entries as well.
describe('service purchase ledgers', () => {
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
    const ledger = { goldSpentByHeroes: 7, itemsSold: 3 };

    expect(visitTownServices(p, { town, day: 1, ledger, report: () => {}, tryRetire: () => false })).toBe(true);

    expect(p).toMatchObject({ gold: left, earned: 30, spent });
    expect(shop).toMatchObject({ treasury, earned, spent: 5 });
    expect(ledger).toEqual({ goldSpentByHeroes: totalSpent, itemsSold: 3 });
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
    { service: 'temple', gold: 1000, left: 940, treasury: 1060, cost: 60, revealed: 1 },
    { service: 'tavern', gold: 250, left: 235, treasury: 1015, cost: 15, revealed: 0 },
  ] as const)('pays the $service for Contract intelligence', ({ service, gold, left, treasury, cost, revealed }) => {
    const game = scene((s, rng) => {
      const p = provisioned(rng, 1, gold);
      const q = work(s.town, p);
      p.investigations[`${q.id}:talk`] = 1;
      s.parties = [p];
      s.quests = [q];
    });
    watchBooks(game).step();
    expect(game.view().parties[0]).toMatchObject({ gold: left, earned: 0, spent: cost });
    expect(employer(game, service)).toMatchObject({ treasury, earned: cost, spent: 0 });
    expect(game.view().stats.goldSpentByHeroes).toBe(cost);
    expect(readWorld(game).quests[0]).toMatchObject({ revealed, countRevealed: true, status: 'open' });
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
    { success: false, gold: 200, spent: 12, left: 188, treasury: 1012, renown: 0 },
    { success: true, gold: 212, spent: 22, left: 190, treasury: 1022, renown: 1 },
    { success: true, gold: 1012, spent: 62, left: 950, treasury: 1062, renown: 1 },
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
    const ledger = { heroesDied: 0, partiesWiped: 0, goldSpentByHeroes: 0 };
    const context: ExpeditionContext = {
      town, quest: q, rng, ledger, travelTicks: 2, restTicks: 8, shortRestHealFraction: 0.5, skillDc: 15,
      combat: () => { throw new Error('Homecoming does not fight'); }, report: () => {},
      learnIntel: () => '', revealAll: () => {}, leaveLoot: () => {},
      settleQuest: (_q, company) => { company.questId = null; },
    };
    advanceExpedition(p, context);
    expect(p).toMatchObject({ gold: left, spent, earned: 0, renown, status: 'resting' });
    expect(tavern).toMatchObject({ treasury, earned: spent, spent: 0 });
    expect(ledger).toEqual({ heroesDied: 0, partiesWiped: 0, goldSpentByHeroes: spent });
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

describe('company purse transfers', () => {
  it('conserves both purses when survivors join another company', () => {
    const game = scene((s, rng) => {
      const host = provisioned(rng, 1, 10);
      const donor = provisioned(rng, 1, 5);
      host.members = host.members.slice(0, 2);
      donor.members = donor.members.slice(0, 2);
      s.parties = [host, donor];
    });
    watchBooks(game).step();
    expect(readWorld(game).parties.map((p) => p.gold)).toEqual([15, 0]);
    // F02: missing transfer counters are reported, never asserted as correct.
    expect(game.view().stats).toMatchObject({ goldPaid: 0 });
  });
  it.each(['Holding', 'Lair'] as const)('leaves the wiped company’s purse at the %s', (destination) => {
    const game = scene((s, rng) => {
      const p = provisioned(rng, 1, 37);
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
    expect(after.parties[0]).toMatchObject({ gold: 0, status: 'disbanded' });
    expect(after.town.employers[0]!.assets[0]!.loot.gold).toBe(destination === 'Holding' ? 48 : 11);
    if (destination === 'Lair') expect(after.lairs[0]!.hoard.gold).toBe(137);
    const store = destination === 'Lair' ? after.lairs[0]!.hoard : after.town.employers[0]!.assets[0]!.loot;
    expect(store.items.map((item) => item.name)).toEqual(['Longsword +1', 'Shield +1']);
    expect(after.parties[0]!.stash).toEqual([]);
    expect(after.parties[0]!.members.flatMap((h) => h.items)).toEqual([]);
    // F01: missing company spent is excluded only for this purse movement.
    expect(after.stats).toMatchObject({ partiesWiped: 1, heroesDied: 4, goldPaid: 0, itemsFound: 0 });
    expect(after.town.employers[0]).toMatchObject({ treasury: 1000, earned: 0, spent: 0 });
  });
});

describe('bookkeeping across 400 hours', () => {
  it.each([7, 42, 20260907])('checks conservation and every holder after every tick for seed %s', (seed) => {
    const game = new Game({ seed });
    const books = watchBooks(game);
    for (let hour = 0; hour < 400; hour++) books.step();
  });
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
    assertHolderCounters(world, openings(world));
  });
  it('starts each Lair with gold in its hoard', () => {
    const game = new Game({ seed: 42 });
    const world = readWorld(game);
    expect(world.lairs.map((l) => [l.level, l.hoard.gold])).toEqual([[6, 600], [7, 700], [8, 800]]);
    assertConservation(0, totalGold({ ...world, town: { ...world.town, employers: [] } }), 2100);
    assertHolderCounters(world, openings(world));
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
