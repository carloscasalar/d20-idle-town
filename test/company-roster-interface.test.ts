import { describe, expect, it } from 'vitest';
import { CompanyRoster, DEFAULT_COMPANY_ROSTER_CONFIG, type CompanyRosterConfig, type RosterEvent, type RosterContext } from '../src/adventurers/company-roster';
import { aliveMembers, createParty, type Party, type ReadonlyParty } from '../src/adventurers/party';
import { killHero, resurrectionCost } from '../src/adventurers/hero';
import { Rng } from '../src/core/rng';
import { instantiate, ITEM_CATALOGUE } from '../src/items/items';
import { Board, DEFAULT_BOARD_CONFIG } from '../src/sim/board';
import { emptyGoldStatistics, openCoin } from '../src/town/coin';
import { generateTown, serviceOf } from '../src/town/town';
import type { Quest } from '../src/quests/quest';
import { SERVICE_SUPPLIES, STARTING_GOLD } from './helpers/supplied-config';
import { DEFAULT_HERO_ECONOMY } from '../src/adventurers/hero';
import { DEFAULT_TOWN_CONFIG } from '../src/town/town';
import { DEFAULT_HOLDING_CONFIG } from '../src/town/assets';

function setup(config: Partial<CompanyRosterConfig> = {}) {
  const rng = new Rng(8);
  const town = generateTown(rng, DEFAULT_TOWN_CONFIG, DEFAULT_HOLDING_CONFIG);
  const roster = new CompanyRoster({ ...DEFAULT_COMPANY_ROSTER_CONFIG, ...config }, DEFAULT_HERO_ECONOMY, DEFAULT_TOWN_CONFIG, DEFAULT_HOLDING_CONFIG);
  const events: RosterEvent[] = [];
  const context: RosterContext = {
    town, rng, tick: 1,
    ledger: { partiesArrived: 0, resurrections: 0, retirements: 0 },
    coin: openCoin(emptyGoldStatistics()), report: (event) => events.push(event),
  };
  const board = new Board(DEFAULT_BOARD_CONFIG);
  const company = (level = 1, size = 4): Party => createParty(rng, level, size, 0, STARTING_GOLD);
  const arrivals = () => roster.arrivals({ ...context, board });
  return { roster, context, company, events, board, arrivals };
}

function openWork(level: number): Quest {
  return {
    id: 'work', title: 'Work', kind: 'contract', level, place: 'Holding', theme: 'goblins',
    giverId: 'employer', assetId: null, lairId: null, encounters: [], revealed: 0,
    countRevealed: false, reward: 10, itemReward: null, guildOnly: false,
    status: 'open', partyId: null, postedAt: 0,
  };
}

// These are compile-time assertions on every query, never runtime mutations.
function readonlyQueries(roster: CompanyRoster) {
  const all = roster.all();
  const active = roster.active();
  const company = roster.byId('id')!;
  // @ts-expect-error Query arrays cannot add companies.
  all.push(company);
  // @ts-expect-error Active query arrays cannot remove companies.
  active.pop();
  // @ts-expect-error Membership is read-only through all().
  all[0]!.members.push(company.members[0]!);
  // @ts-expect-error Heroes are read-only through active().
  active[0]!.members[0]!.level = 9;
  // @ts-expect-error Equipment is deeply read-only through byId().
  company.members[0]!.items[0]!.effect.hp = 2;
  // @ts-expect-error Company status is read-only through byId().
  company.status = 'disbanded';
}
void readonlyQueries;

function memberNames(company: ReadonlyParty): string[] { return aliveMembers(company).map((hero) => hero.name); }

describe('CompanyRoster queries and hourly actions', () => {
  it('backs scenario replacement, returns frozen query arrays and keeps disbanded history by id', () => {
    const { roster, company } = setup();
    const first = company();
    const gone = company();
    roster.replaceForScenario([first, gone]);
    expect(roster.recordsForScenario()).toEqual([first, gone]);
    const before = roster.active();
    roster.disband(gone);
    expect(before).toHaveLength(2); // array is a copy, records are live
    expect(roster.active()).toEqual([first]);
    expect(roster.all()).toEqual([first, gone]);
    expect(roster.byId(gone.id)?.status).toBe('disbanded');
    expect(roster.byId(null)).toBeUndefined();
    expect(roster.byId('missing')).toBeUndefined();
    expect(Object.isFrozen(roster.all())).toBe(true);
    expect(Object.isFrozen(roster.active())).toBe(true);
    roster.replaceForScenario([]);
    expect(roster.all()).toEqual([]);
  });

  it('updates in renown order, preserving ties and the initial hourly population', () => {
    const { roster, company } = setup();
    const low = company();
    const first = company();
    const second = company();
    first.renown = second.renown = 4;
    roster.replaceForScenario([low, first, second]);
    const seen: string[] = [];
    roster.updateActive((p) => { seen.push(p.id); if (p === first) roster.disband(second); });
    expect(seen).toEqual([first.id, second.id, low.id]);
    const later: string[] = [];
    roster.updateActive((p) => later.push(p.id));
    expect(later).toEqual([first.id, low.id]);
  });

  it('uses configured readiness and maximum size, counting only living members', () => {
    const { roster, company } = setup({ companySize: 3, maxCompanySize: 5 });
    const p = company(1, 5);
    expect(roster.isReady(p)).toBe(true);
    expect(roster.hasRoom(p)).toBe(false);
    killHero(p.members[0]!);
    expect(roster.hasRoom(p)).toBe(true);
    killHero(p.members[1]!);
    killHero(p.members[2]!);
    expect(roster.isReady(p)).toBe(false);
  });
});

describe('CompanyRoster arrivals', () => {
  it('admits a normal company and publishes its complete state synchronously', () => {
    const { roster, context, arrivals } = setup();
    context.report = (event) => {
      expect(event.kind).toBe('party');
      expect(context.ledger.partiesArrived).toBe(1);
      expect(roster.active()[0]).toMatchObject({ status: 'idle', arrivedAt: 1, gold: 20 });
    };
    arrivals();
    expect(roster.active()).toHaveLength(1);
    expect(roster.active()[0]!.members).toHaveLength(4);
  });

  it('honours first arrival time and interval without admitting twice in one hour', () => {
    const { roster, context, arrivals } = setup({ firstArrivalTick: 5, arrivalInterval: 2 });
    arrivals();
    expect(roster.all()).toHaveLength(0);
    context.tick = 5;
    arrivals();
    arrivals();
    expect(roster.all()).toHaveLength(1);
    for (context.tick = 6; context.tick <= 9 && roster.all().length === 1; context.tick++) arrivals();
    expect(roster.all()).toHaveLength(2);
  });

  it('spends a scheduled arrival at capacity and disbanded companies free a place', () => {
    const { roster, company, context, arrivals } = setup({ maxCompanies: 1, arrivalInterval: 4 });
    const p = company();
    roster.replaceForScenario([p]);
    arrivals();
    roster.disband(p);
    arrivals();
    expect(context.ledger.partiesArrived).toBe(0);
    context.tick = 2; // minimum delay is two hours
    arrivals();
    expect(context.ledger.partiesArrived).toBe(0);
    context.tick = 9;
    arrivals();
    expect(context.ledger.partiesArrived).toBe(1);
    expect(roster.all()).toHaveLength(2);
    expect(roster.active()).toHaveLength(1);
  });

  it('brings strangers at the patience boundary with the stranded company’s level and missing seats', () => {
    const { roster, company, arrivals } = setup({ patienceTicks: 7, companySize: 5, strangerExtraMembers: 0 });
    const p = company(3, 2);
    p.idleTicks = 7;
    roster.replaceForScenario([p]);
    arrivals();
    const band = roster.all()[1]!;
    expect(band.members).toHaveLength(3);
    expect(band.members.every((h) => h.level === 3)).toBe(true);
    expect(roster.byId(p.id)?.members).toHaveLength(2);
  });

  it('does not bring strangers before patience, or for a resting company', () => {
    for (const status of ['idle', 'resting'] as const) {
      const { roster, company, arrivals } = setup({ patienceTicks: 7 });
      const p = company(3, 2);
      p.status = status;
      p.idleTicks = status === 'idle' ? 6 : 7;
      roster.replaceForScenario([p]);
      arrivals();
      expect(roster.all()[1]!.members).toHaveLength(4);
      expect(roster.all()[1]!.members[0]!.level).toBe(1);
    }
  });

  it.each([0, 1])('uses the configured chance %i to match open work', (chance) => {
    const { roster, board, arrivals } = setup({ arrivalQuestLevelChance: chance });
    board.replaceForScenario([openWork(6)]);
    arrivals();
    expect(roster.all()[0]!.members.every((h) => h.level === (chance ? 6 : 1))).toBe(true);
  });
});

describe('CompanyRoster recruitment and absorption', () => {
  it('raises affordable fallen members at the temple before looking for a donor', () => {
    const { roster, company, context, events } = setup();
    const p = company(2);
    const dead = p.members[0]!;
    killHero(dead);
    p.gold = resurrectionCost(dead.level, DEFAULT_HERO_ECONOMY);
    const donor = company(2, 1);
    roster.replaceForScenario([p, donor]);
    const temple = serviceOf(context.town, 'temple');
    const treasury = temple.treasury;
    roster.recruit(p, context);
    expect(dead.alive).toBe(true);
    expect(p.members).toHaveLength(4);
    expect(donor.members).toHaveLength(1);
    expect(p.gold).toBe(0);
    expect(temple.treasury).toBe(treasury + resurrectionCost(dead.level, DEFAULT_HERO_ECONOMY));
    expect(context.ledger.resurrections).toBe(1);
    expect(context.coin.statistics.goldSpentByHeroes).toBe(resurrectionCost(dead.level, DEFAULT_HERO_ECONOMY));
    expect(events).toMatchObject([{ kind: 'temple', chronicle: true }]);
  });

  it('a ruined temple does not raise anyone, but another idle short company can join', () => {
    const { roster, company, context } = setup();
    const host = company(2, 3);
    killHero(host.members[0]!);
    host.gold = 1000;
    const donor = company(2, 2);
    roster.replaceForScenario([host, donor]);
    serviceOf(context.town, 'temple').ruined = true;
    roster.recruit(host, context);
    expect(context.ledger.resurrections).toBe(0);
    expect(aliveMembers(host)).toHaveLength(4);
    expect(host.members.every((h) => h.alive)).toBe(true);
    expect(donor.status).toBe('disbanded');
  });

  it('joins a ready nearby host at the configured disband boundary, preferring level then size', () => {
    const { roster, company, context, events } = setup({ disbandTicks: 9, recruitLevelTolerance: 2 });
    const donor = company(3, 1);
    donor.gold = 0;
    const farther = company(5);
    const bigger = company(4, 5);
    const host = company(4);
    host.status = 'resting';
    roster.replaceForScenario([donor, farther, bigger, host]);
    donor.idleTicks = 8;
    roster.recruit(donor, context);
    expect(donor.status).toBe('idle');
    donor.idleTicks = 9;
    roster.recruit(donor, context);
    expect(donor.status).toBe('disbanded');
    expect(aliveMembers(host)).toHaveLength(5);
    expect(events.at(-1)?.text).toContain('give up waiting');
  });

  it.each([1, 2])('host level tolerance %i changes whether survivors can join', (tolerance) => {
    const { roster, company, context } = setup({ disbandTicks: 0, recruitLevelTolerance: tolerance });
    const donor = company(2, 1);
    donor.gold = 0;
    const host = company(4);
    roster.replaceForScenario([donor, host]);
    roster.recruit(donor, context);
    expect(donor.status).toBe(tolerance === 2 ? 'disbanded' : 'idle');
  });

  it('merge moves only those who fit, but transfers all purse, supplies, stash and greater renown', () => {
    const { roster, company, context } = setup({ maxCompanySize: 5 });
    const host = company(2, 4);
    const donor = company(2, 3);
    const kept = donor.members.slice(1);
    host.gold = 10;
    donor.gold = 30;
    host.potions = 1;
    donor.potions = 2;
    donor.renown = 7;
    const item = instantiate(context.rng, ITEM_CATALOGUE[0]!);
    donor.stash = [item];
    roster.replaceForScenario([host, donor]);
    expect(roster.merge(host, donor, context)).toEqual(kept);
    expect(aliveMembers(host)).toHaveLength(5);
    expect(host).toMatchObject({ gold: 40, earned: 30, potions: 3, renown: 7, stash: [item] });
    expect(donor).toMatchObject({ gold: 0, spent: 30, potions: 0, stash: [], status: 'idle' });
    expect(context.coin.statistics).toEqual(emptyGoldStatistics());
  });

  it('absorb disbands an emptied donor and buries the dead before its final company event', () => {
    const { roster, company, context } = setup();
    const host = company(2, 3);
    const donor = company(2, 3);
    killHero(host.members[0]!);
    killHero(donor.members[0]!);
    const joining = memberNames(donor);
    roster.replaceForScenario([host, donor]);
    const observed: { kind: string; donorStatus: string; hostNames: string[] }[] = [];
    context.report = (event) => observed.push({ kind: event.kind, donorStatus: donor.status, hostNames: memberNames(host) });
    roster.absorb(roster.byId(host.id)!, roster.byId(donor.id)!, false, context);
    expect(donor.members).toEqual([]);
    expect(host.members.every((h) => h.alive)).toBe(true);
    expect(memberNames(host)).toEqual(expect.arrayContaining(joining));
    expect(observed.map((e) => e.kind)).toEqual(['death', 'party', 'death']);
    expect(observed[0]!.donorStatus).toBe('idle');
    expect(observed[1]!.donorStatus).toBe('disbanded');
  });

  it('partial absorption leaves a waiting donor and reports which adventurers stayed', () => {
    const { roster, company, context, events } = setup();
    const host = company(2, 5);
    const donor = company(2, 3);
    const staying = donor.members.slice(1);
    roster.replaceForScenario([host, donor]);
    roster.absorb(roster.byId(host.id)!, roster.byId(donor.id)!, false, context);
    expect(host.members).toHaveLength(6);
    expect(donor.members).toEqual(staying);
    expect(donor.status).toBe('idle');
    expect(events[0]!.text).toContain('stay behind');
  });
});

describe('CompanyRoster retirement and compatibility operations', () => {
  it('retires the most seasoned eligible veteran with equipment and coin settled before reporting', () => {
    const { roster, company, context } = setup({ retirementLevel: 5, retirementPrice: 1000, retirementCapitalShare: 0.3 });
    const p = company(5);
    p.members[1]!.xp += 1;
    const veteran = p.members[1]!;
    const item = instantiate(context.rng, ITEM_CATALOGUE[0]!);
    veteran.items = [item];
    p.gold = 1000 + resurrectionCost(5, DEFAULT_HERO_ECONOMY);
    roster.replaceForScenario([p]);
    context.report = (event) => {
      expect(event).toMatchObject({ kind: 'town', chronicle: true });
      expect(p.members).not.toContain(veteran);
      expect(p.gold).toBe(resurrectionCost(5, DEFAULT_HERO_ECONOMY));
      expect(context.town.employers.at(-1)).toMatchObject({ treasury: 300, earned: 0, favoredPartyId: p.id, name: veteran.name });
      expect(context.ledger.retirements).toBe(1);
    };
    expect(roster.retire(p, context)).toBe(true);
    expect(p.stash).toEqual([item]);
    expect(veteran.items).toEqual([]);
    expect(p.spent).toBe(1000);
    expect(context.coin.statistics.goldSpentByHeroes).toBe(1000);
  });

  it('refuses ineligible, fallen and unaffordable veterans without consuming a service hour', () => {
    const { roster, company, context } = setup();
    const p = company(7);
    p.gold = 100000;
    roster.replaceForScenario([p]);
    expect(roster.retire(p, context)).toBe(false);
    p.members[0]!.level = 8;
    killHero(p.members[0]!);
    expect(roster.retire(p, context)).toBe(false);
    p.members[1]!.level = 8;
    p.gold = 25000;
    expect(roster.retire(p, context)).toBe(false);
    expect(context.ledger.retirements).toBe(0);
  });

  it('contributes a retirement step that consumes the service hour', () => {
    const { roster, company, context } = setup();
    const p = company(8);
    p.gold = 100000;
    roster.replaceForScenario([p]);
    const serviceContext = { ...SERVICE_SUPPLIES, town: context.town, day: 1, ledger: { itemsSold: 0 }, coin: context.coin, report: () => {} };
    expect(roster.retirementStep(context)(p, serviceContext)).toBe(true);
    expect(p.members).toHaveLength(3);
  });

  it('merges, buries and disbands owned companies through the roster', () => {
    const { roster, company, context } = setup();
    const host = company(1, 3);
    const donor = company(1, 2);
    const dead = donor.members[0]!;
    killHero(dead);
    roster.replaceForScenario([host, donor]);
    expect(roster.merge(host, donor, context)).toEqual([]);
    expect(roster.bury(donor)).toEqual([dead]);
    expect(donor.members).toEqual([]);
    roster.disband(donor);
    expect(donor.status).toBe('disbanded');
  });
});
