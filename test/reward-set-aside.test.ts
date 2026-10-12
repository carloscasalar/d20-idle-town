import { describe, expect, it } from 'vitest';
import { createParty } from '../src/adventurers/party';
import { Rng } from '../src/core/rng';
import { Board, type BoardConfig, type BoardContext } from '../src/sim/board';
import { DEFAULT_CONFIG } from '../src/sim/config';
import { Game } from '../src/sim/game';
import { generateQuest } from '../src/quests/quest';
import { createAsset } from '../src/town/assets';
import { openCoin, treasury } from '../src/town/coin';
import { createLair } from '../src/town/lairs';
import { generateTown, serviceOf, type Employer } from '../src/town/town';

function scene(rewardSetAsideFor: BoardConfig['rewardSetAsideFor'] = DEFAULT_CONFIG.board.rewardSetAsideFor) {
  const rng = new Rng(4);
  const town = generateTown(rng, DEFAULT_CONFIG.town, DEFAULT_CONFIG.holdings);
  const employer = serviceOf(town, 'apothecary');
  Object.assign(employer, { treasury: 1000, generosity: 100 });
  const board = new Board({ ...DEFAULT_CONFIG.board, rewardSetAsideFor });
  const company = createParty(rng, 5, 4, 0, DEFAULT_CONFIG.heroes.startingGoldPerLevel, DEFAULT_CONFIG.policies.potionSharing);
  const context: BoardContext = {
    rng, town, tick: 0, lairs: [],
    ledger: { questsCompleted: 0, questsFailed: 0, questsExpired: 0, itemsFound: 0, raids: 0, lairsCleared: 0 },
    coin: openCoin({ goldPaid: 0, goldSpentByHeroes: 0, goldSpentOnProduction: 0 }),
    report: () => {}, payHoard: () => '',
    companySize: 4, renownCap: 10, lairStrengthCap: 8,
    quests: DEFAULT_CONFIG.quests, encounters: DEFAULT_CONFIG.encounters,
    intel: DEFAULT_CONFIG.intel, items: DEFAULT_CONFIG.items,
  };
  const post = (patron: Employer = employer) => {
    const holding = createAsset(rng, 'herb-garden', patron.id, DEFAULT_CONFIG.holdings);
    holding.incomePerDay = 10;
    patron.assets.push(holding);
    return board.postContract(patron, holding, 'goblins', 5, null, context);
  };
  return { board, employer, company, context, post };
}

describe('Reward set-aside through the Board', () => {
  it('sizes new rewards after both open and taken Contracts, without moving treasury', () => {
    const { board, employer, company, context, post } = scene();
    const first = post();
    expect(first.reward).toBe(800);
    const second = post();
    expect(second.reward).toBe(160);
    board.take(company, first, context);
    expect(post().reward).toBe(32);
    expect(employer.treasury).toBe(1000);
  });

  it('leaves an employer outside the list unchanged and keeps each employer’s obligations separate', () => {
    const { employer, context, post } = scene();
    const smith = serviceOf(context.town, 'smith');
    Object.assign(smith, { treasury: 1000, generosity: 100 });
    expect(post().reward).toBe(800);
    expect(post(smith).reward).toBe(800);
    expect(post(smith).reward).toBe(800);
    expect(post().reward).toBe(160);
    expect([employer.treasury, smith.treasury]).toEqual([1000, 1000]);
  });

  it('switches on every employer of a configured kind, including one that runs a service', () => {
    const { context, post } = scene(['merchant']);
    const merchants = context.town.employers.filter((employer) => employer.kind === 'merchant');
    expect(merchants.length).toBeGreaterThan(1);
    expect(merchants.some((employer) => employer.service === 'apothecary')).toBe(true);
    for (const merchant of merchants) {
      Object.assign(merchant, { treasury: 1000, generosity: 100 });
      expect(post(merchant).reward).toBe(800);
    }
    for (const merchant of merchants) {
      expect(post(merchant).reward).toBe(160);
      expect(merchant.treasury).toBe(1000);
    }
  });

  it('an empty list disables set-aside, including for the apothecary', () => {
    const { employer, post } = scene([]);
    expect(post().reward).toBe(800);
    expect(post().reward).toBe(800);
    expect(employer.treasury).toBe(1000);
  });

  it('sets aside Contracts only, even when a configured employer also posts a Bounty', () => {
    const { board, context, post } = scene(['guild']);
    const guild = serviceOf(context.town, 'guild');
    Object.assign(guild, { treasury: 1000, generosity: 100 });
    const lair = createLair(context.rng, 'goblins', 1, 0, 4, DEFAULT_CONFIG.lairs);
    context.lairs = [lair];
    expect(board.postBounty(lair, context).reward).toBe(150);
    expect(post(guild).reward).toBe(800);
    expect(post(guild).reward).toBe(160);
    expect(guild.treasury).toBe(1000);
  });

  it.each([
    { ending: 'paid', treasury: 240, reward: 64, received: 800 },
    { ending: 'failed', treasury: 1000, reward: 672, received: 0 },
    { ending: 'expired', treasury: 980, reward: 656, received: 0 },
  ] as const)('releases the amount when a Contract is $ending, keeping the other open reward aside', ({ ending, treasury, reward, received }) => {
    const { board, employer, company, context, post } = scene();
    const first = post();
    expect(first.reward).toBe(800);
    context.tick = 1;
    const second = post();
    expect(second.reward).toBe(160);
    const purseBefore = company.gold;
    if (ending === 'expired') {
      context.tick = 73;
      board.expireContracts(context);
      expect(context.ledger.questsExpired).toBe(1);
    } else {
      board.take(company, first, context);
      board.settle(first, company, ending === 'paid', context);
    }
    expect(first.status).toBe(ending === 'paid' ? 'done' : 'failed');
    expect(second.status).toBe('open');
    expect(company.gold).toBe(purseBefore + received);
    expect(employer.treasury).toBe(treasury);
    expect(post().reward).toBe(reward);
    expect(employer.treasury).toBe(treasury);
  });

  it('reads changes to the employer’s treasury when sizing later rewards', () => {
    const { employer, context, post } = scene();
    expect(post().reward).toBe(800);
    context.coin.source(treasury(employer), 100, 'income');
    expect(post().reward).toBe(240);
    expect(employer.treasury).toBe(1100);
  });

  it('requires the production list rather than filling in a missing Board configuration', () => {
    const { employer, context } = scene();
    const config = { ...DEFAULT_CONFIG.board };
    Reflect.deleteProperty(config, 'rewardSetAsideFor');
    const board = new Board(config);
    const holding = employer.assets[0]!;
    expect(() => board.postContract(employer, holding, 'goblins', 5, null, context)).toThrow();
    expect(board.all()).toHaveLength(0);
    expect(employer.treasury).toBe(1000);
  });
});

describe('Reward set-aside in the hourly game', () => {
  it('leaves upkeep able to take the apothecary below zero', () => {
    const game = Game.forTesting({ roster: { maxCompanies: 0 }, world: { maxOpenQuests: 0 } }, (scenario) => {
      scenario.tick = 23;
      scenario.lairs = [];
      const employer = serviceOf(scenario.town, 'apothecary');
      Object.assign(employer, { treasury: 10, upkeepPerDay: 20, assets: [] });
    });
    game.step();
    expect(game.view().town.employers.find((employer) => employer.service === 'apothecary')!.treasury).toBe(-10);
  });
  it.each([
    { list: ['apothecary'], treasury: 500, owed: 400, reward: 80 },
    { list: [], treasury: 500, owed: 400, reward: 400 },
    { list: ['apothecary'], treasury: 1000, owed: 980, reward: 20 },
  ] as const)('uses the supplied list $list with treasury $treasury and owed $owed', ({ list, treasury, owed, reward }) => {
    const game = Game.forTesting({
      board: { rewardSetAsideFor: list }, roster: { maxCompanies: 0 },
    }, (scenario) => {
      const rng = new Rng(7);
      scenario.lairs = [];
      for (const employer of scenario.town.employers) employer.cooldown = 1000;
      const employer = serviceOf(scenario.town, 'apothecary');
      Object.assign(employer, { treasury, cooldown: 0, generosity: 100 });
      const first = createAsset(rng, 'herb-garden', employer.id, DEFAULT_CONFIG.holdings);
      const second = createAsset(rng, 'herb-garden', employer.id, DEFAULT_CONFIG.holdings);
      employer.assets = [first, second];
      const work = generateQuest(rng, {
        employer, rewardTreasury: treasury, asset: first, theme: 'goblins', level: 5, partySize: 4, tick: 0,
      }, { ...DEFAULT_CONFIG, kinds: DEFAULT_CONFIG.kinds });
      work.reward = owed;
      first.questId = work.id;
      scenario.quests = [work];
    });
    game.step();
    expect(game.view().board.open.map((work) => work.reward)).toEqual([owed, reward]);
    expect(game.view().town.employers.find((employer) => employer.service === 'apothecary')!.treasury).toBe(treasury);
  });
});
