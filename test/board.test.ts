import { describe, expect, it } from 'vitest';
import { createParty, type Party } from '../src/adventurers/party';
import { Rng } from '../src/core/rng';
import { Board, type BoardContext, type BoardLedger } from '../src/sim/board';
import { Game } from '../src/sim/game';
import { createAsset, type Asset } from '../src/town/assets';
import { createLair, type Lair } from '../src/town/lairs';
import { type Employer, type ServiceKind, type Town } from '../src/town/town';

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
  for (const employer of world.town.employers) {
    for (const holding of employer.assets) {
      if (holding.questId === null) continue;
      const contract = quests.get(holding.questId);
      expect(contract, `holding ${holding.id}`).toMatchObject({
        kind: 'contract',
        assetId: holding.id,
      });
      expect(['open', 'taken']).toContain(contract!.status);
    }
  }
  for (const lair of world.lairs) {
    if (lair.questId === null) continue;
    const bounty = quests.get(lair.questId);
    expect(bounty, `lair ${lair.id}`).toMatchObject({
      kind: 'assault',
      lairId: lair.id,
    });
    expect(['open', 'taken']).toContain(bounty!.status);
  }
  for (const company of world.parties) {
    if (company.questId === null) continue;
    const work = quests.get(company.questId);
    expect(work, `company ${company.id}`).toMatchObject({
      status: 'taken',
      partyId: company.id,
    });
  }
  for (const quest of world.quests) {
    if (quest.status !== 'done' && quest.status !== 'failed') continue;
    for (const employer of world.town.employers) {
      for (const holding of employer.assets) expect(holding.questId).not.toBe(quest.id);
    }
    for (const lair of world.lairs) expect(lair.questId).not.toBe(quest.id);
    for (const company of world.parties) expect(company.questId).not.toBe(quest.id);
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

function world() {
  const rng = new Rng(4);
  const patron = employer(rng);
  const guild = employer(rng, 'guild');
  const holding = createAsset(rng, 'watchtower', patron.id);
  patron.assets.push(holding);
  const town: Town = { name: 'Testtown', tavernName: 'The Inn', deity: 'A Test', employers: [patron, guild] };
  const lairs: Lair[] = [];
  const parties: Party[] = [];
  const ledger: BoardLedger = {
    questsCompleted: 0, questsFailed: 0, questsExpired: 0, goldPaid: 0, itemsFound: 0, raids: 0, lairsCleared: 0,
  };
  const context: BoardContext = {
    town,
    lairs,
    rng,
    tick: 0,
    difficultyScale: 1,
    ledger,
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
  const board = new Board();
  const check = () => assertBoardInvariant({ quests: board.records(), town, lairs, parties });
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

describe('the Board', () => {
  it('posts a contract and links it to the holding', () => {
    const { board, patron, holding, context, check } = world();
    const contract = board.postContract(patron, holding, 'goblins', 5, null, context);

    expect(contract).toMatchObject({ kind: 'contract', status: 'open', assetId: holding.id, partyId: null });
    expect(holding.questId).toBe(contract.id);
    expect(board.open()).toEqual([contract]);
    expect(board.byId(contract.id)).toBe(contract);
    expect(Object.isFrozen(board.open())).toBe(true);
    check();
  });

  it('refuses a second contract for a holding that has one', () => {
    const { board, patron, holding, context, check } = world();
    const contract = board.postContract(patron, holding, 'goblins', 5, null, context);

    expect(() => board.postContract(patron, holding, 'goblins', 5, null, context)).toThrow(/already has one/);
    expect(holding.questId).toBe(contract.id);
    expect(board.all()).toEqual([contract]);
    check();
  });

  it('posts a bounty and links it to the lair', () => {
    const { board, rng, lairs, context, check } = world();
    const lair = lairOf(rng, lairs);
    const bounty = board.postBounty(lair, context);

    expect(bounty).toMatchObject({ kind: 'assault', status: 'open', lairId: lair.id, assetId: null, partyId: null });
    expect(lair.questId).toBe(bounty.id);
    expect(board.open()).toEqual([bounty]);
    check();
  });

  it('refuses a second bounty on a lair that has one', () => {
    const { board, rng, lairs, context, check } = world();
    const lair = lairOf(rng, lairs);
    const bounty = board.postBounty(lair, context);

    expect(() => board.postBounty(lair, context)).toThrow(/already has one/);
    expect(lair.questId).toBe(bounty.id);
    expect(board.all()).toEqual([bounty]);
    check();
  });

  it('a company takes open work and both sides name each other', () => {
    const { board, patron, holding, rng, parties, context, check } = world();
    const contract = board.postContract(patron, holding, 'goblins', 5, null, context);
    const company = companyOf(rng, parties);
    board.take(company, contract, 2, context);

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
    const company = companyOf(rng, parties);
    board.take(company, contract, 2, context);
    const other = companyOf(rng, parties);

    expect(() => board.take(other, contract, 2, context)).toThrow(/not open/);
    expect(other.questId).toBeNull();
    expect(contract.partyId).toBe(company.id);
    expect(company.questId).toBe(contract.id);
    check();
  });

  it('settles a succeeded contract and releases both sides', () => {
    const { board, patron, holding, rng, parties, context, check } = world();
    const contract = board.postContract(patron, holding, 'goblins', 5, null, context);
    const company = companyOf(rng, parties);
    board.take(company, contract, 2, context);
    board.settle(contract, company, true, context);

    expect(contract.status).toBe('done');
    expect(contract.partyId).toBe(company.id);
    expect(company.questId).toBeNull();
    expect(holding.questId).toBeNull();
    check();
  });

  it('settles a failed contract and releases the holding', () => {
    const { board, patron, holding, rng, parties, context, check } = world();
    const contract = board.postContract(patron, holding, 'goblins', 5, null, context);
    const company = companyOf(rng, parties);
    board.take(company, contract, 2, context);
    board.settle(contract, company, false, context);

    expect(contract.status).toBe('failed');
    expect(company.questId).toBeNull();
    expect(holding.questId).toBeNull();
    check();
  });

  it('refuses to settle work that is not taken', () => {
    const { board, patron, holding, rng, parties, context, check } = world();
    const contract = board.postContract(patron, holding, 'goblins', 5, null, context);
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
    const bounty = board.postBounty(lair, context);
    const company = companyOf(rng, parties);
    board.take(company, bounty, 2, context);
    board.settle(bounty, company, true, context);

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
    const company = companyOf(rng, parties);
    board.take(company, bounty, 2, context);
    board.settle(bounty, company, false, context);

    expect(bounty.status).toBe('failed');
    expect(company.questId).toBeNull();
    expect(lair.questId).toBeNull();
    check();
  });

  it('expires an unanswered contract and releases the holding', () => {
    const { board, patron, holding, context, check } = world();
    context.tick = 0;
    const contract = board.postContract(patron, holding, 'goblins', 5, null, context);
    context.tick = 73;
    board.expireContracts(context, 72);

    expect(contract.status).toBe('failed');
    expect(holding.questId).toBeNull();
    expect(board.open()).toEqual([]);
    check();
  });

  it('withdraws an employer’s open work and leaves taken work in place', () => {
    const { board, patron, holding, rng, parties, context, check } = world();
    const taken = board.postContract(patron, holding, 'goblins', 5, null, context);
    const company = companyOf(rng, parties);
    board.take(company, taken, 2, context);
    const otherHolding = createAsset(rng, 'watchtower', patron.id);
    patron.assets.push(otherHolding);
    const open = board.postContract(patron, otherHolding, 'goblins', 5, null, context);
    board.withdrawOpenWork(patron, context);

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
      assertBoardInvariant(JSON.parse(game.regressionState()) as BoardWorld);
    }
  });
});
