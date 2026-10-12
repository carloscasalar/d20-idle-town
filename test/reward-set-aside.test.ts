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

  it('sizes a guild Contract after its open and taken Contracts and Bounties', () => {
    const { board, company, context, post } = scene(['guild']);
    const guild = serviceOf(context.town, 'guild');
    Object.assign(guild, { treasury: 1000, generosity: 100 });
    const lairs = [1, 1].map((level) => createLair(context.rng, 'goblins', level, 0, 4, DEFAULT_CONFIG.lairs));
    context.lairs = lairs;
    const takenBounty = board.postBounty(lairs[0]!, context);
    expect(takenBounty.reward).toBe(150);
    board.take(company, takenBounty, context);
    const openBounty = board.postBounty(lairs[1]!, context);
    expect(openBounty.reward).toBe(150);
    const takenContract = post(guild);
    expect(takenContract.reward).toBe(560);
    const otherCompany = createParty(context.rng, 5, 4, 0, 50, DEFAULT_CONFIG.policies.potionSharing);
    board.take(otherCompany, takenContract, context);
    const openContract = post(guild);
    expect(openContract.reward).toBe(112);
    expect(post(guild).reward).toBe(22);
    expect(guild.treasury).toBe(1000);
  });

  it.each([
    { treasury: 1003, contract: 802, level: 2, bounty: 160 },
    { treasury: 1000, contract: 800, level: 1, bounty: 150 },
    { treasury: 26, contract: 20, level: 1, bounty: 4 },
  ])('sizes a listed guild Bounty with treasury $treasury after a Contract, without a minimum', ({ treasury, contract, level, bounty }) => {
    const { board, context, post } = scene(['guild']);
    const guild = serviceOf(context.town, 'guild');
    Object.assign(guild, { treasury, generosity: 100 });
    expect(post(guild).reward).toBe(contract);
    const lair = createLair(context.rng, 'goblins', level, 0, 4, DEFAULT_CONFIG.lairs);
    context.lairs = [lair];
    expect(board.postBounty(lair, context).reward).toBe(bounty);
    expect(guild.treasury).toBe(treasury);
  });

  it.each([0, -10, 1])('refuses a Board Bounty whose treasury %s cannot fund a positive reward', (treasury) => {
    const { board, context } = scene(['guild']);
    const guild = serviceOf(context.town, 'guild');
    guild.treasury = treasury;
    const lair = createLair(context.rng, 'goblins', 1, 0, 4, DEFAULT_CONFIG.lairs);
    context.lairs = [lair];
    expect(() => board.postBounty(lair, context)).toThrow('A Bounty needs a positive reward.');
    expect(board.all()).toHaveLength(0);
    expect(lair.questId).toBeNull();
    expect(guild.questsPosted).toBe(0);
  });

  it.each([
    { ending: 'paid', treasury: 850, contract: 560, received: 150 },
    { ending: 'failed', treasury: 1000, contract: 680, received: 0 },
  ] as const)('releases a $ending Bounty while another Bounty stays owed', ({ ending, treasury, contract, received }) => {
    const { board, company, context, post } = scene(['guild']);
    const guild = serviceOf(context.town, 'guild');
    Object.assign(guild, { treasury: 1000, generosity: 100 });
    const lairs = [1, 1].map((level) => createLair(context.rng, 'goblins', level, 0, 4, DEFAULT_CONFIG.lairs));
    context.lairs = lairs;
    const first = board.postBounty(lairs[0]!, context);
    const second = board.postBounty(lairs[1]!, context);
    expect([first.reward, second.reward]).toEqual([150, 150]);
    board.take(company, first, context);
    const purseBefore = company.gold;
    board.settle(first, company, ending === 'paid', context);
    expect(first.status).toBe(ending === 'paid' ? 'done' : 'failed');
    expect(second.status).toBe('open');
    expect(company.gold).toBe(purseBefore + received);
    expect(guild.treasury).toBe(treasury);
    expect(post(guild).reward).toBe(contract);
  });

  it('keeps an unlisted guild’s Bounties and Contracts sized from its whole treasury', () => {
    const { board, company, context, post } = scene();
    const guild = serviceOf(context.town, 'guild');
    Object.assign(guild, { treasury: 101, generosity: 100 });
    const lairs = [1, 1].map((level) => createLair(context.rng, 'goblins', level, 0, 4, DEFAULT_CONFIG.lairs));
    context.lairs = lairs;
    const first = board.postBounty(lairs[0]!, context);
    expect(first.reward).toBe(101);
    board.take(company, first, context);
    expect(board.postBounty(lairs[1]!, context).reward).toBe(101);
    expect(post(guild).reward).toBe(80);
    expect(post(guild).reward).toBe(80);
    expect(guild.treasury).toBe(101);
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
  it('waits for the listed guild’s available treasury, then posts at the threshold next hour', () => {
    const game = bountyPostingScene(['guild'], 524);
    game.step();
    expect(bountyRewards(game)).toEqual([]);
    game.step();
    expect(bountyRewards(game)).toEqual([20]);
    expect(game.view().town.employers.find((employer) => employer.service === 'guild')!.treasury).toBe(525);
  });

  it('checks an unlisted guild’s whole treasury even when its rewards owed exceed it', () => {
    const game = bountyPostingScene([], 25);
    game.step();
    expect(bountyRewards(game)).toEqual([25]);
  });

  it.each([
    { list: ['guild'], treasuryShare: 0, rewardPerLevel: 150 },
    { list: ['guild'], treasuryShare: 0.01, rewardPerLevel: 150 },
    { list: ['guild'], treasuryShare: 0.8, rewardPerLevel: 0 },
    { list: [], treasuryShare: 0.8, rewardPerLevel: 0 },
  ] as const)('never posts a zero reward with list $list, share $treasuryShare and per-level reward $rewardPerLevel', ({ list, treasuryShare, rewardPerLevel }) => {
    const game = bountyPostingScene([...list], 525, treasuryShare, rewardPerLevel);
    game.step();
    expect(bountyRewards(game)).toEqual([]);
    expect(game.view().lairs[0]!.bountyPosted).toBe(false);
  });

  it('checks the available treasury again after posting each Bounty in the same hour', () => {
    const game = bountyPostingScene(['guild'], 550, 0.8, 150, 2);
    game.step();
    expect(bountyRewards(game)).toEqual([40]);
    expect(game.view().lairs.map((lair) => lair.bountyPosted)).toEqual([true, false]);
  });

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

function bountyRewards(game: Game): number[] {
  const { open, taken } = game.view().board;
  return [...open, ...taken].filter((work) => work.kind === 'assault').map((work) => work.reward);
}

function bountyPostingScene(list: BoardConfig['rewardSetAsideFor'], treasury: number, treasuryShare = 0.8, rewardPerLevel = 150, lairCount = 1) {
  return Game.forTesting({
    seed: 7, board: { rewardSetAsideFor: list }, world: { maxOpenQuests: 0 },
    roster: { maxCompanies: 1 }, quests: { treasuryShare }, kinds: { assault: { rewardPerLevel } },
  }, (scenario) => {
    const rng = new Rng(7);
    scenario.tick = 22;
    const guild = serviceOf(scenario.town, 'guild');
    Object.assign(guild, { treasury, upkeepPerDay: 0 });
    const holding = createAsset(rng, 'herb-garden', guild.id, DEFAULT_CONFIG.holdings);
    holding.incomePerDay = 1;
    guild.assets = [holding];
    const owed = generateQuest(rng, {
      employer: guild, rewardTreasury: 1000, asset: holding, theme: 'goblins', level: 1, partySize: 4, tick: 22,
    }, DEFAULT_CONFIG);
    owed.reward = 500;
    holding.questId = owed.id;
    const lairs = Array.from({ length: lairCount }, () => {
      const lair = createLair(rng, 'goblins', 1, 0, 4, DEFAULT_CONFIG.lairs);
      lair.raidCooldown = 10_000;
      return lair;
    });
    const company = createParty(rng, 1, 4, 0, 50, DEFAULT_CONFIG.policies.potionSharing);
    company.status = 'resting';
    company.ticksLeft = 100;
    scenario.parties = [company];
    scenario.quests = [owed];
    scenario.lairs = lairs;
  });
}
