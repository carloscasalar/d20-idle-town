import assert from 'node:assert/strict';
import { describe, expect, it } from 'vitest';
import { createParty, type Party } from '../src/adventurers/party';
import { Rng } from '../src/core/rng';
import { generateAssault, generateQuest } from '../src/quests/quest';
import { Board, WORK_KINDS, DEFAULT_BOARD_CONFIG, type BoardConfig, type BoardContext, type BoardLedger, type WorkKinds, type WorkBehavior } from '../src/sim/board';
import { Game } from '../src/sim/game';
import { createAsset, type Asset } from '../src/town/assets';
import { createLair, type Lair } from '../src/town/lairs';
import { serviceOf, type Employer, type ServiceKind, type Town } from '../src/town/town';
import { LONG_SIMULATION_TIMEOUT_MS, readSimulationState } from './helpers/simulation';

interface BoardWorld {
  quests: readonly {
    id: string;
    kind: string;
    status: string;
    assetId: string | null;
    lairId: string | null;
    partyId: string | null;
  }[];
  parties: readonly { id: string; questId: string | null }[];
  lairs: readonly { id: string; questId: string | null }[];
  town: { employers: readonly { assets: readonly { id: string; questId: string | null }[] }[] };
}

/** The four links the Board keeps: holding, lair, company, and finished work. */
export function assertBoardInvariant(world: BoardWorld): void {
  const quests = new Map(world.quests.map((quest) => [quest.id, quest]));
  const linkedWork = new Set<string>();
  for (const employer of world.town.employers) {
    for (const holding of employer.assets) {
      if (holding.questId === null) continue;
      linkedWork.add(holding.questId);
      const contract = quests.get(holding.questId);
      assert.ok(contract, `holding ${holding.id}: missing work ${holding.questId}`);
      assert.equal(contract.assetId, holding.id, `holding ${holding.id}: Contract target`);
      assert.notEqual(contract.kind, 'assault', `holding ${holding.id}: Contract kind`);
      assert.ok(contract.status === 'open' || contract.status === 'taken', `holding ${holding.id}: live work`);
    }
  }
  for (const lair of world.lairs) {
    if (lair.questId === null) continue;
    linkedWork.add(lair.questId);
    const bounty = quests.get(lair.questId);
    assert.ok(bounty, `lair ${lair.id}: missing work ${lair.questId}`);
    assert.equal(bounty.kind, 'assault', `lair ${lair.id}: Bounty kind`);
    assert.equal(bounty.lairId, lair.id, `lair ${lair.id}: Bounty target`);
    assert.ok(bounty.status === 'open' || bounty.status === 'taken', `lair ${lair.id}: live work`);
  }
  for (const company of world.parties) {
    if (company.questId === null) continue;
    linkedWork.add(company.questId);
    const work = quests.get(company.questId);
    assert.ok(work, `company ${company.id}: missing work ${company.questId}`);
    assert.equal(work.status, 'taken', `company ${company.id}: accepted work`);
    assert.equal(work.partyId, company.id, `company ${company.id}: work assignee`);
  }
  // Set membership is equivalent to checking every holder against every
  // finished quest, including duplicate links. Rebuild from today's holders
  // each tick so a new or changed stale link can never escape the check.
  for (const quest of world.quests) {
    if (quest.status !== 'done' && quest.status !== 'failed') continue;
    assert.equal(linkedWork.has(quest.id), false, `finished work ${quest.id}: released links`);
  }
}

function employer(rng: Rng, service: ServiceKind | null = null): Employer {
  return {
    id: rng.id('employer'),
    name: service === 'guild' ? 'The Adventurers’ Guild' : 'House Test',
    kind: service === 'guild' ? 'faction' : 'noble',
    title: service === 'guild' ? 'Adventurers’ Guild' : 'House Test',
    service,
    assets: [],
    treasury: 1_000,
    upkeepPerDay: 0,
    generosity: 1,
    reputation: 0,
    cooldown: 0,
    ruined: false,
    questsPosted: 0,
    questsCompleted: 0,
    questsFailed: 0,
    earned: 0,
    spent: 0,
    stock: [],
    restockIn: 0,
    favoredPartyId: null,
  };
}

function world(config: Partial<BoardConfig> = {}, kinds: WorkKinds = WORK_KINDS) {
  const rng = new Rng(4);
  const patron = employer(rng);
  const guild = employer(rng, 'guild');
  const holding = createAsset(rng, 'watchtower', patron.id);
  patron.assets.push(holding);
  const town: Town = { name: 'Testtown', tavernName: 'The Inn', deity: 'A Test', employers: [patron, guild] };
  const lairs: Lair[] = [];
  const parties: Party[] = [];
  const ledger: BoardLedger = {
    questsCompleted: 0, questsFailed: 0, questsExpired: 0, itemsFound: 0, raids: 0, lairsCleared: 0,
  };
  const context: BoardContext = {
    town,
    lairs,
    rng,
    tick: 0,
    ledger,
    statistics: { goldPaid: 0, goldSpentByHeroes: 0 },
    report: () => {},
    payHoard: (lair, company) => {
      const gold = lair.hoard.gold;
      company.gold += gold;
      company.earned += gold;
      company.stash.push(...lair.hoard.items);
      const found = [gold > 0 ? `${gold} gp` : '', ...lair.hoard.items.map((item) => item.name)].filter(Boolean).join(', ');
      lair.hoard = { gold: 0, items: [] };
      return found;
    },
  };
  const board = new Board({ ...DEFAULT_BOARD_CONFIG, difficultyScale: 1, ...config }, kinds);
  const check = () => assertBoardInvariant({ quests: board.all(), town, lairs, parties });
  return { rng, patron, guild, holding, town, lairs, parties, context, board, check };
}

function companyOf(rng: Rng, parties: Party[]): Party {
  const company = createParty(rng, 5, 4, 0);
  parties.push(company);
  return company;
}

function lairOf(rng: Rng, lairs: Lair[]): Lair {
  const lair = createLair(rng, 'goblins', 5, 0);
  lairs.push(lair);
  return lair;
}

describe('Board invariant kind checks', () => {
  it.each(['Lair naming a raid Contract', 'Holding naming a Bounty'] as const)('rejects a %s', (invalid) => {
    const state: BoardWorld = {
      quests: [{ id: 'work', kind: invalid.startsWith('Lair') ? 'contract' : 'assault', status: 'open', assetId: 'holding', lairId: 'lair', partyId: null }],
      parties: [],
      lairs: [{ id: 'lair', questId: invalid.startsWith('Lair') ? 'work' : null }],
      town: { employers: [{ assets: [{ id: 'holding', questId: invalid.startsWith('Holding') ? 'work' : null }] }] },
    };
    expect(() => assertBoardInvariant(state)).toThrow();
  });
});

describe('the Board', () => {
  it('posts a contract and links it to the holding', () => {
    const { board, patron, holding, context, check } = world();
    const contract = board.postContract(patron, holding, 'goblins', 5, null, context);
    check();

    expect(contract).toMatchObject({ kind: 'contract', status: 'open', assetId: holding.id, partyId: null });
    expect(holding.questId).toBe(contract.id);
    expect(board.open()).toEqual([contract]);
    expect(board.byId(contract.id)).toBe(contract);
    expect(Object.isFrozen(board.open())).toBe(true);
    check();
  });

  it('posts a Contract using the supplied employer and Holding objects', () => {
    const { board, patron, holding, context, check } = world();
    const suppliedEmployer: Employer = { ...patron, name: 'The supplied patron' };
    const suppliedHolding: Asset = { ...holding, name: 'The supplied holding' };
    const events: string[] = [];
    context.report = (event) => events.push(event.text);
    const work = board.postContract(suppliedEmployer, suppliedHolding, 'goblins', 5, null, context);
    check();
    expect(suppliedHolding.questId).toBe(work.id);
    expect(suppliedEmployer.questsPosted).toBe(1);
    expect(holding.questId).toBeNull();
    expect(patron.questsPosted).toBe(0);
    expect(events[0]).toContain(suppliedEmployer.name);
    expect(events[0]).toContain(suppliedHolding.name);
  });

  it('posts a Bounty using the supplied guild and Lair objects', () => {
    const { board, guild, rng, lairs, context, check } = world();
    const lair = lairOf(rng, lairs);
    const suppliedGuild: Employer = { ...guild };
    const suppliedLair: Lair = { ...lair, name: 'The supplied lair' };
    const events: string[] = [];
    context.report = (event) => events.push(event.text);
    const work = board.post('assault', { employer: suppliedGuild, lair: suppliedLair }, context);
    check();
    expect(suppliedLair.questId).toBe(work.id);
    expect(suppliedGuild.questsPosted).toBe(1);
    expect(lair.questId).toBeNull();
    expect(guild.questsPosted).toBe(0);
    expect(events[0]).toContain(suppliedLair.name);
  });

  it('refuses a second contract for a holding that has one', () => {
    const { board, patron, holding, context, check } = world();
    const contract = board.postContract(patron, holding, 'goblins', 5, null, context);
    check();

    expect(() => board.postContract(patron, holding, 'goblins', 5, null, context)).toThrow(/already has one/);
    expect(holding.questId).toBe(contract.id);
    expect(board.all()).toEqual([contract]);
    check();
  });

  it('posts a bounty and links it to the lair', () => {
    const { board, rng, lairs, context, check } = world();
    const lair = lairOf(rng, lairs);
    const bounty = board.postBounty(lair, context);
    check();

    expect(bounty).toMatchObject({ kind: 'assault', status: 'open', lairId: lair.id, assetId: null, partyId: null });
    expect(lair.questId).toBe(bounty.id);
    expect(board.open()).toEqual([bounty]);
    check();
  });

  it('refuses a second bounty on a lair that has one', () => {
    const { board, rng, lairs, context, check } = world();
    const lair = lairOf(rng, lairs);
    const bounty = board.postBounty(lair, context);
    check();

    expect(() => board.postBounty(lair, context)).toThrow(/already has one/);
    expect(lair.questId).toBe(bounty.id);
    expect(board.all()).toEqual([bounty]);
    check();
  });

  it('a company takes open work and both sides name each other', () => {
    const { board, patron, holding, rng, parties, context, check } = world();
    const contract = board.postContract(patron, holding, 'goblins', 5, null, context);
    check();
    const company = companyOf(rng, parties);
    board.take(company, contract, context);
    check();

    expect(contract).toMatchObject({ status: 'taken', partyId: company.id });
    expect(company.questId).toBe(contract.id);
    expect(holding.questId).toBe(contract.id);
    expect(board.taken()).toEqual([contract]);
    expect(board.open()).toEqual([]);
    check();
  });

  it('refuses work that is not open', () => {
    const { board, patron, holding, rng, parties, context, check } = world();
    const contract = board.postContract(patron, holding, 'goblins', 5, null, context);
    check();
    const company = companyOf(rng, parties);
    board.take(company, contract, context);
    check();
    const other = companyOf(rng, parties);

    expect(() => board.take(other, contract, context)).toThrow(/not open/);
    expect(other.questId).toBeNull();
    expect(contract.partyId).toBe(company.id);
    expect(company.questId).toBe(contract.id);
    check();
  });

  it('settles a succeeded contract and releases both sides', () => {
    const { board, patron, holding, rng, parties, context, check } = world();
    const contract = board.postContract(patron, holding, 'goblins', 5, null, context);
    check();
    const company = companyOf(rng, parties);
    board.take(company, contract, context);
    check();
    board.settle(contract, company, true, context);
    check();

    expect(contract.status).toBe('done');
    expect(contract.partyId).toBe(company.id);
    expect(company.questId).toBeNull();
    expect(holding.questId).toBeNull();
    check();
  });

  it('settles a failed contract and releases the holding', () => {
    const { board, patron, holding, rng, parties, context, check } = world();
    const contract = board.postContract(patron, holding, 'goblins', 5, null, context);
    check();
    const company = companyOf(rng, parties);
    board.take(company, contract, context);
    check();
    board.settle(contract, company, false, context);
    check();

    expect(contract.status).toBe('failed');
    expect(company.questId).toBeNull();
    expect(holding.questId).toBeNull();
    check();
  });

  it('refuses to settle work that is not taken', () => {
    const { board, patron, holding, rng, parties, context, check } = world();
    const contract = board.postContract(patron, holding, 'goblins', 5, null, context);
    check();
    const company = companyOf(rng, parties);

    expect(() => board.settle(contract, company, true, context)).toThrow(/not taken/);
    expect(contract.status).toBe('open');
    expect(holding.questId).toBe(contract.id);
    expect(company.questId).toBeNull();
    check();
  });

  it('settles a succeeded bounty, clears the lair, and withdraws its open contracts', () => {
    const { board, patron, holding, rng, lairs, parties, context, check } = world();
    const lair = lairOf(rng, lairs);
    const contract = board.postContract(patron, holding, 'goblins', 5, lair, context);
    check();
    const bounty = board.postBounty(lair, context);
    check();
    const company = companyOf(rng, parties);
    board.take(company, bounty, context);
    check();
    board.settle(bounty, company, true, context);
    check();

    expect(bounty.status).toBe('done');
    expect(company.questId).toBeNull();
    expect(lair.questId).toBeNull();
    expect(contract.status).toBe('failed');
    expect(holding.questId).toBeNull();
    check();
  });

  it('settles a failed bounty and releases the lair', () => {
    const { board, rng, lairs, parties, context, check } = world();
    const lair = lairOf(rng, lairs);
    const bounty = board.postBounty(lair, context);
    check();
    const company = companyOf(rng, parties);
    board.take(company, bounty, context);
    check();
    board.settle(bounty, company, false, context);
    check();

    expect(bounty.status).toBe('failed');
    expect(company.questId).toBeNull();
    expect(lair.questId).toBeNull();
    check();
  });

  it('expires an unanswered contract and releases the holding', () => {
    const { board, patron, holding, context, check } = world();
    context.tick = 0;
    const contract = board.postContract(patron, holding, 'goblins', 5, null, context);
    check();
    context.tick = 73;
    board.expireContracts(context);
    check();

    expect(contract.status).toBe('failed');
    expect(holding.questId).toBeNull();
    expect(board.open()).toEqual([]);
    check();
  });

  it('withdraws an employer’s open work and leaves taken work in place', () => {
    const { board, patron, holding, rng, parties, context, check } = world();
    const taken = board.postContract(patron, holding, 'goblins', 5, null, context);
    check();
    const company = companyOf(rng, parties);
    board.take(company, taken, context);
    check();
    const otherHolding = createAsset(rng, 'watchtower', patron.id);
    patron.assets.push(otherHolding);
    const open = board.postContract(patron, otherHolding, 'goblins', 5, null, context);
    check();
    board.withdrawOpenWork(patron, context);
    check();

    expect(open.status).toBe('failed');
    expect(otherHolding.questId).toBeNull();
    expect(taken.status).toBe('taken');
    expect(holding.questId).toBe(taken.id);
    expect(company.questId).toBe(taken.id);
    expect(taken.partyId).toBe(company.id);
    check();
  });
});

describe('board invariant across a run', () => {
  it.each([7, 42, 20260907])('holds after every tick for seed %s', (seed) => {
    const game = new Game({ seed });
    for (let tick = 0; tick < 400; tick++) {
      game.step();
      assertBoardInvariant(readSimulationState(game));
    }
  }, LONG_SIMULATION_TIMEOUT_MS);
});

describe('Board configuration', () => {
  it('uses configured windfall days when a Contract restores income', () => {
    const { board, patron, holding, rng, parties, context, check } = world({ windfallDays: 7 });
    holding.incomePerDay = 10;
    const work = board.postContract(patron, holding, 'goblins', 5, null, context);
    check();
    const company = companyOf(rng, parties);
    board.take(company, work, context);
    check();
    board.settle(work, company, true, context);
    check();
    expect(patron.earned).toBe(70);
  });

  it('uses configured looting days when an unanswered Contract expires', () => {
    const { board, patron, holding, context, check } = world({ lootingDays: 3 });
    holding.incomePerDay = 10;
    board.postContract(patron, holding, 'goblins', 5, null, context);
    check();
    context.tick = 73;
    board.expireContracts(context);
    check();
    expect(patron.treasury).toBe(970);
    expect(patron.spent).toBe(30);
  });

  it.each([{ before: 1, after: 6 }, { before: 5, after: 7 }])('uses Bounty renown and its cap: $before becomes $after', ({ before, after }) => {
    const { board, rng, lairs, parties, context, check } = world({ bountyRenown: 5, renownCap: 7 });
    const work = board.postBounty(lairOf(rng, lairs), context);
    check();
    const company = companyOf(rng, parties);
    company.renown = before;
    board.take(company, work, context);
    check();
    board.settle(work, company, true, context);
    check();
    expect(company.renown).toBe(after);
  });

  it.each([{ before: 1, after: 5 }, { before: 5, after: 6 }])('uses Contract renown and its cap: $before becomes $after', ({ before, after }) => {
    const { board, patron, holding, rng, parties, context, check } = world({ contractRenown: 4, renownCap: 6 });
    const work = board.postContract(patron, holding, 'goblins', 5, null, context);
    check();
    const company = companyOf(rng, parties);
    company.renown = before;
    board.take(company, work, context);
    check();
    board.settle(work, company, true, context);
    check();
    expect(company.renown).toBe(after);
  });

  it.each(['contract', 'assault'] as const)('uses configured reputation gain for a successful %s', (kind) => {
    const { board, patron, holding, guild, rng, lairs, parties, context, check } = world({ reputationGain: 4 });
    const work = kind === 'contract'
      ? board.postContract(patron, holding, 'goblins', 5, null, context)
      : board.postBounty(lairOf(rng, lairs), context);
    check();
    const company = companyOf(rng, parties);
    board.take(company, work, context);
    check();
    board.settle(work, company, true, context);
    check();
    expect((kind === 'contract' ? patron : guild).reputation).toBe(4);
  });

  it.each(['contract', 'assault'] as const)('uses configured renown loss for a failed %s', (kind) => {
    const { board, patron, holding, rng, lairs, parties, context, check } = world({ failureRenownLoss: 4 });
    const work = kind === 'contract'
      ? board.postContract(patron, holding, 'goblins', 5, null, context)
      : board.postBounty(lairOf(rng, lairs), context);
    check();
    const company = companyOf(rng, parties);
    company.renown = 6;
    board.take(company, work, context);
    check();
    board.settle(work, company, false, context);
    check();
    expect(company.renown).toBe(2);
  });

  it.each(['expiry', 'failure'] as const)('uses the configured %s cooldown range', (outcome) => {
    const { board, patron, holding, rng, parties, context, check } = world({ expiryCooldown: [17, 19], failureCooldown: [23, 25] });
    patron.cooldown = 100;
    const work = board.postContract(patron, holding, 'goblins', 5, null, context);
    check();
    if (outcome === 'expiry') {
      context.tick = 73;
      board.expireContracts(context);
      check();
      expect(patron.cooldown).toBeGreaterThanOrEqual(17);
      expect(patron.cooldown).toBeLessThanOrEqual(19);
    } else {
      const company = companyOf(rng, parties);
      board.take(company, work, context);
      check();
      board.settle(work, company, false, context);
      check();
      expect(patron.cooldown).toBeGreaterThanOrEqual(23);
      expect(patron.cooldown).toBeLessThanOrEqual(25);
    }
  });

  it('prunes finished records only above the configured threshold and keeps open and taken work', () => {
    const { board, patron, holding, rng, parties, context, check } = world({ pruningThreshold: 2 });
    const finished = board.postContract(patron, holding, 'goblins', 5, null, context);
    check();
    const company = companyOf(rng, parties);
    board.take(company, finished, context);
    check();
    board.settle(finished, company, true, context);
    check();
    const taken = board.postContract(patron, holding, 'goblins', 5, null, context);
    check();
    board.take(company, taken, context);
    check();
    board.expireContracts(context);
    check();
    expect(board.all()).toEqual([finished, taken]);
    const other = createAsset(rng, 'watchtower', patron.id);
    patron.assets.push(other);
    const open = board.postContract(patron, other, 'goblins', 5, null, context);
    check();
    board.expireContracts(context);
    check();
    expect(board.all()).toEqual([taken, open]);
  });

  it('keeps a Contract open for the configured ticks and never expires a Bounty', () => {
    const { board, patron, holding, rng, lairs, context, check } = world({ contractOpenTicks: 5 });
    const contract = board.postContract(patron, holding, 'goblins', 5, null, context);
    check();
    const bounty = board.postBounty(lairOf(rng, lairs), context);
    check();
    context.tick = 5;
    board.expireContracts(context);
    check();
    expect(contract.status).toBe('open');
    context.tick = 6;
    board.expireContracts(context);
    check();
    expect(contract.status).toBe('failed');
    expect(bounty.status).toBe('open');
  });

  it('supplies configured travel time while leaving expedition state to Expedition', () => {
    const { board, patron, holding, rng, parties, context, check } = world({ travelTicks: 9 });
    const work = board.postContract(patron, holding, 'goblins', 5, null, context);
    check();
    const company = companyOf(rng, parties);
    company.idleTicks = 12;
    const departure = board.take(company, work, context);
    check();
    expect(departure.travelTicks).toBe(9);
    expect(company).toMatchObject({ status: 'idle', ticksLeft: 0, idleTicks: 12 });
    expect(departure.acceptance.text).toContain(`accept "${work.title}"`);
  });

  it.each(['contract', 'assault'] as const)('uses configured difficulty scale when posting a %s', (kind) => {
    const totals = [0.25, 2].map((difficultyScale) => {
      const { board, patron, holding, rng, lairs, context, check } = world({ difficultyScale });
      const work = kind === 'contract'
        ? board.postContract(patron, holding, 'goblins', 5, null, context)
        : board.postBounty(lairOf(rng, lairs), context);
      check();
      return work.encounters.reduce((total, encounter) => total + encounter.totalXp, 0);
    });
    expect(totals[1]).toBeGreaterThan(totals[0]!);
  });

  it.each(['contract', 'assault'] as const)('budgets a %s for the configured company size', (kind) => {
    const totals = [1, 8].map((encounterPartySize) => {
      const { board, patron, holding, rng, lairs, context, check } = world({ encounterPartySize });
      const work = kind === 'contract'
        ? board.postContract(patron, holding, 'goblins', 5, null, context)
        : board.postBounty(lairOf(rng, lairs), context);
      check();
      return work.encounters.reduce((total, encounter) => total + encounter.totalXp, 0);
    });
    expect(totals[1]).toBeGreaterThan(totals[0]!);
  });

  it.each(['expiry', 'contract failure', 'bounty failure'] as const)('uses configured lair strength gain and cap on %s', (outcome) => {
    const { board, patron, holding, rng, lairs, parties, context, check } = world({ lairStrengthGain: 3, lairStrengthCap: 8 });
    const lair = lairOf(rng, lairs);
    lair.strength = 4;
    const work = outcome === 'bounty failure'
      ? board.postBounty(lair, context)
      : board.postContract(patron, holding, 'goblins', 5, lair, context);
    check();
    if (outcome === 'expiry') {
      context.tick = 73;
      board.expireContracts(context);
    } else {
      const company = companyOf(rng, parties);
      board.take(company, work, context);
      check();
      board.settle(work, company, false, context);
    }
    check();
    expect(lair.strength).toBe(7);
    const again = board.postBounty(lair, context);
    check();
    const company = companyOf(rng, parties);
    board.take(company, again, context);
    check();
    board.settle(again, company, false, context);
    check();
    expect(lair.strength).toBe(8);
  });
});

function escortBehavior(expires = false): WorkBehavior {
  return {
    create: (kind, { employer, holding, lair }, context) => {
      if (!holding) throw new Error('An Escort needs a holding.');
      if (holding.questId !== null) throw new Error('The holding already has work.');
      return {
        id: context.rng.id('quest'),
        kind,
        title: 'Escort the caravan',
        place: holding.name,
        giverId: employer.id,
        assetId: holding.id,
        lairId: lair?.id ?? null,
        theme: 'goblins',
        level: 5,
        encounters: [],
        revealed: 0,
        countRevealed: true,
        reward: 11,
        itemReward: null,
        guildOnly: false,
        status: 'open',
        partyId: null,
        postedAt: context.tick,
      };
    },
    post: (work, { holding }) => {
      if (holding) holding.questId = work.id;
    },
    acceptance: (work, company) => ({ kind: 'quest', text: `${company.name} escort the caravan for "${work.title}".` }),
    success: (work, company, _employer, holding) => {
      company.gold += work.reward + 11;
      if (holding) holding.status = 'safe';
    },
    failure: (_work, company) => { company.gold -= 11; },
    expire: expires ? () => () => {} : undefined,
    withdrawOnLairBreak: (work, context) => {
      const holding = context.town.employers.flatMap((employer) => employer.assets).find((holding) => holding.id === work.assetId);
      if (holding) holding.status = 'safe';
    },
  };
}

// The third kind defines all its consequences without reusing a built-in entry.
const escortKinds: WorkKinds = { ...WORK_KINDS, escort: escortBehavior() };

describe('registered kinds of work', () => {
  it.each([true, false])('posts, takes and settles an Escort with success %s', (success) => {
    const { board, patron, holding, rng, parties, context, check } = world({}, escortKinds);
    const work = board.post('escort', { employer: patron, holding, theme: 'goblins', level: 5 }, context);
    check();
    expect(work).toMatchObject({ kind: 'escort', status: 'open', assetId: holding.id });
    context.tick = 100;
    board.expireContracts(context);
    check();
    expect(work.status).toBe('open');
    const company = companyOf(rng, parties);
    const gold = company.gold;
    const departure = board.take(company, work, context);
    check();
    expect(departure.acceptance.text).toContain('escort the caravan');
    board.settle(work, company, success, context);
    check();
    expect(work.status).toBe(success ? 'done' : 'failed');
    expect(company.gold).toBe(success ? gold + work.reward + 11 : gold - 11);
    expect(company.questId).toBeNull();
    expect(holding.questId).toBeNull();
  });

  it('withdraws an Escort through its registered rule when its lair is broken', () => {
    const { board, patron, holding, rng, lairs, parties, context, check } = world({}, escortKinds);
    const lair = lairOf(rng, lairs);
    const work = board.post('escort', { employer: patron, holding, theme: 'goblins', level: 5, lair }, context);
    check();
    const bounty = board.postBounty(lair, context);
    check();
    const company = companyOf(rng, parties);
    board.take(company, bounty, context);
    check();
    board.settle(bounty, company, true, context);
    check();
    expect(work.status).toBe('failed');
    expect(holding).toMatchObject({ status: 'safe', questId: null });
  });
});

describe('Board ownership of terminal work', () => {
  it('closes and unlinks an expired Escort even when its expiry consequences do nothing', () => {
    const kinds: WorkKinds = { ...WORK_KINDS, escort: escortBehavior(true) };
    const { board, patron, holding, context, check } = world({}, kinds);
    const work = board.post('escort', { employer: patron, holding }, context);
    check();
    context.tick = 73;
    board.expireContracts(context);
    check();
    expect(work.status).toBe('failed');
    expect(holding.questId).toBeNull();
    expect(context.ledger.questsExpired).toBe(1);
  });

  it('releases a Lair link when an independent Bounty entry omits release consequences', () => {
    const independent = escortBehavior();
    independent.create = (kind, { employer, lair }, context) => {
      if (!lair) throw new Error('A Bounty needs a lair.');
      return {
        id: context.rng.id('quest'), kind, title: 'Independent bounty', place: lair.place,
        giverId: employer.id, assetId: null, lairId: lair.id, theme: lair.theme, level: lair.level,
        encounters: [], revealed: 0, countRevealed: true, reward: 11, itemReward: null,
        guildOnly: false, status: 'open', partyId: null, postedAt: context.tick,
      };
    };
    independent.post = (work, { lair }) => { if (lair) lair.questId = work.id; };
    const { board, guild, rng, lairs, parties, context, check } = world({}, { ...WORK_KINDS, assault: independent });
    const lair = lairOf(rng, lairs);
    const work = board.post('assault', { employer: guild, lair }, context);
    check();
    const company = companyOf(rng, parties);
    board.take(company, work, context);
    check();
    board.settle(work, company, false, context);
    check();
    expect(work.status).toBe('failed');
    expect(lair.questId).toBeNull();
    expect(company.questId).toBeNull();
  });
});

describe('Board refusals and intelligence', () => {
  it.each(['employer', 'holding'] as const)('refuses to expire a Contract missing its %s', (missing) => {
    const { board, patron, holding, context, check } = world();
    const work = board.postContract(patron, holding, 'goblins', 5, null, context);
    check();
    if (missing === 'employer') context.town.employers = [];
    else patron.assets = [];
    context.tick = 73;
    expect(() => board.expireContracts(context)).toThrow(`its ${missing} is missing`);
    check();
    expect(work.status).toBe('open');
    expect(context.ledger.questsExpired).toBe(0);
  });

  it('reveals intelligence through Board operations and exposes deeply read-only work', () => {
    const { board, patron, holding, context, check } = world();
    const work = board.postContract(patron, holding, 'goblins', 5, null, context);
    check();
    expect(work.countRevealed).toBe(false);
    expect(board.learnIntel(work)).toContain('fights');
    check();
    expect(board.byId(work.id)?.countRevealed).toBe(true);
    board.revealAll(work);
    check();
    expect(work.revealed).toBe(work.encounters.length);
    // Compile-time checks: none of the query routes exposes writable work.
    if (false) {
      const consequence = null as unknown as Parameters<WorkBehavior['success']>[0];
      // @ts-expect-error Kind consequences cannot assign terminal work status.
      consequence.status = 'done';
      // @ts-expect-error Kind consequences cannot assign company links.
      consequence.partyId = null;
      // @ts-expect-error Board status is read-only.
      board.open()[0]!.status = 'failed';
      // @ts-expect-error Board company links are read-only.
      board.taken()[0]!.partyId = null;
      // @ts-expect-error Posting terms are read-only.
      board.byId(work.id)!.assetId = null;
      // @ts-expect-error Encounter arrays are deeply read-only.
      board.all()[0]!.encounters.push(work.encounters[0]!);
      // @ts-expect-error Encounter members are deeply read-only.
      board.all()[0]!.encounters[0]!.monsters[0]!.count = 0;
      // @ts-expect-error Item rewards are deeply read-only.
      board.byId(work.id)!.itemReward!.effect.resistances!.push('fire');
    }
  });
});

describe('Game and Board expedition ownership', () => {
  it.each(['contract', 'assault'] as const)('publishes %s acceptance after linking work and starting the journey', (kind) => {
    const game = Game.forTesting({ seed: 31, maxParties: 0, maxOpenQuests: 0, travelTicks: 7 }, (scenario) => {
      const rng = new Rng(71);
      scenario.tick = 100;
      scenario.lairs = [];
      scenario.events = [];
      scenario.chronicle = [];
      for (const employer of scenario.town.employers) {
        employer.cooldown = 10_000;
        employer.restockIn = 10_000;
        employer.stock = [];
      }
      const patron = scenario.town.employers[0]!;
      const holding = patron.assets[0]!;
      const company = createParty(rng, 5, 4, scenario.tick);
      Object.assign(company, { gold: kind === 'assault' ? 2000 : 0, potions: 100, blessed: true, duesPaidDay: 5, guildMember: true, idleTicks: 12 });
      for (const hero of company.members) hero.armorTier = 3;
      const lair = createLair(rng, 'goblins', 5, scenario.tick);
      lair.raidCooldown = 10_000;
      const work = kind === 'contract'
        ? generateQuest(rng, { employer: patron, asset: holding, theme: 'goblins', level: 5, partySize: 4, tick: scenario.tick })
        : generateAssault(rng, lair, serviceOf(scenario.town, 'guild'), 4, scenario.tick);
      work.countRevealed = true;
      work.revealed = work.encounters.length;
      work.guildOnly = false;
      if (kind === 'contract') {
        holding.questId = work.id;
        holding.status = 'threatened';
      } else {
        lair.questId = work.id;
        scenario.lairs = [lair];
      }
      scenario.quests = [work];
      scenario.parties = [company];
    });
    let accepted = 0;
    let acceptanceText = '';
    game.onEvent((event) => {
      if (event.kind !== 'quest' || !/accept|take the guild/.test(event.text)) return;
      const state = JSON.parse(game.regressionState());
      assertBoardInvariant(state);
      expect(state.parties[0]).toMatchObject({ status: 'traveling', ticksLeft: 7, idleTicks: 0, questId: state.quests[0].id });
      expect(state.quests[0]).toMatchObject({ status: 'taken', partyId: state.parties[0].id });
      expect(game.view().chronicle.some((entry) => entry.text === event.text)).toBe(false);
      acceptanceText = event.text;
      accepted += 1;
    });
    // The guild bounty appetite is random; a provisioned idle company keeps trying.
    for (let tick = 0; tick < 20 && accepted === 0; tick++) {
      game.step();
      assertBoardInvariant(JSON.parse(game.regressionState()));
    }
    expect(accepted).toBe(1);
    expect(game.view().chronicle.some((entry) => entry.text === acceptanceText)).toBe(kind === 'assault');
  });

  it.each([
    { kind: 'contract', end: 'wipe' }, { kind: 'assault', end: 'wipe' },
    { kind: 'contract', end: 'homecoming' }, { kind: 'assault', end: 'homecoming' },
  ] as const)('settlement releases the company after $kind $end through Game', ({ kind, end }) => {
    const game = Game.forTesting({ seed: 31, maxParties: 0, maxOpenQuests: 0 }, (scenario) => {
      const rng = new Rng(71);
      const patron = scenario.town.employers[0]!;
      const holding = patron.assets[0]!;
      const lair = createLair(rng, 'goblins', 5, 0);
      lair.raidCooldown = 10_000;
      const company = createParty(rng, 1, 4, 0);
      const work = kind === 'contract'
        ? generateQuest(rng, { employer: patron, asset: holding, theme: 'goblins', level: 1, partySize: 4, tick: 0 })
        : generateAssault(rng, lair, serviceOf(scenario.town, 'guild'), 4, 0);
      work.encounters = [{ difficulty: 'hard', monsters: [{ name: 'Ancient Red Dragon', count: 6, xpEach: 62_000 }], totalXp: 372_000, tier: 'High' }];
      work.status = 'taken';
      work.partyId = company.id;
      company.questId = work.id;
      company.status = end === 'wipe' ? 'questing' : 'returning';
      company.progress = end === 'wipe' ? 0 : work.encounters.length;
      company.ticksLeft = 1;
      for (const hero of company.members) hero.hp = 1;
      if (kind === 'contract') {
        holding.questId = work.id;
        holding.status = 'threatened';
      } else lair.questId = work.id;
      scenario.lairs = kind === 'assault' ? [lair] : [];
      scenario.quests = [work];
      scenario.parties = [company];
    });
    game.step();
    const state = JSON.parse(game.regressionState());
    assertBoardInvariant(state);
    expect(state.parties[0]).toMatchObject({ questId: null, progress: 0, status: end === 'wipe' ? 'disbanded' : 'resting' });
    expect(state.quests[0].status).toBe(end === 'wipe' ? 'failed' : 'done');
    expect(game.view().stats.partiesWiped).toBe(end === 'wipe' ? 1 : 0);
  });
});
