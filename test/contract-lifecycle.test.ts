import { describe, expect, it } from 'vitest';
import { createParty, type Party } from '../src/adventurers/party';
import { Rng } from '../src/core/rng';
import { ITEM_CATALOGUE, type MagicItem } from '../src/items/items';
import type { Quest } from '../src/quests/quest';
import type { ThemeId } from '../src/quests/themes';
import { Game, mergeConfig, type DeepPartial, type GameConfig, type GameEventView, type GameScenario } from '../src/sim/game';
import { DEFAULT_COMPANY_ROSTER_CONFIG } from '../src/adventurers/company-roster';
import { ASSET_KINDS, createAsset, type Asset } from '../src/town/assets';
import { createLair, type Lair } from '../src/town/lairs';
import { serviceOf, type Employer, type Town } from '../src/town/town';

// All mutation happens inside forTesting. The default scene keeps arrivals,
// shops, daily income and unrelated posting out of these one-hour decisions.
function scene(configure: (scenario: GameScenario, rng: Rng) => void, config: DeepPartial<GameConfig> = {}): Game {
  return Game.forTesting(mergeConfig({ seed: 31, roster: { maxCompanies: 0 }, world: { maxOpenQuests: 0 } }, config) as DeepPartial<GameConfig>, (scenario) => {
    scenario.tick = 100;
    scenario.parties = [];
    scenario.quests = [];
    scenario.lairs = [];
    scenario.events = [];
    scenario.chronicle = [];
    for (const [index, employer] of scenario.town.employers.entries()) {
      employer.name = `Employer ${index}`;
      employer.assets = [];
      employer.cooldown = 10_000;
      employer.restockIn = 10_000;
      employer.stock = [];
      employer.upkeepPerDay = 0;
      employer.reputation = 0;
      employer.treasury = 1_000;
      employer.earned = 0;
      employer.spent = 0;
    }
    configure(scenario, new Rng(71));
  });
}

function holding(rng: Rng, employer: Employer, name = 'Holding'): Asset {
  const asset = createAsset(rng, 'watchtower', employer.id);
  Object.assign(asset, { name, incomePerDay: 10 });
  employer.assets.push(asset);
  return asset;
}

function postingEmployer(scenario: GameScenario, rng: Rng, overrides: Partial<Employer> = {}): Employer {
  const employer = scenario.town.employers[0]!;
  holding(rng, employer);
  Object.assign(employer, { cooldown: 0, ...overrides });
  return employer;
}

function company(rng: Rng, level = 5): Party {
  const party = createParty(rng, level, 4, 100);
  // Fully provisioned, with current dues; no service consumes the decision hour.
  Object.assign(party, { gold: 0, potions: 4, blessed: true, duesPaidDay: 5 });
  for (const hero of party.members) hero.armorTier = 3;
  return party;
}

function lair(rng: Rng, theme: ThemeId = 'goblins', level = 5): Lair {
  const result = createLair(rng, theme, level, 100, DEFAULT_COMPANY_ROSTER_CONFIG.companySize);
  Object.assign(result, { raidCooldown: 10_000, hoard: { gold: 100, items: [] } });
  return result;
}

function contract(employer: Employer, asset: Asset, id = 'contract', overrides: Partial<Quest> = {}): Quest {
  const quest: Quest = {
    id, kind: 'contract', title: id, place: asset.name, giverId: employer.id,
    assetId: asset.id, lairId: null, theme: 'goblins', level: 5,
    encounters: [{ difficulty: 'easy', monsters: [{ name: 'Goblin', count: 1, xpEach: 50 }], totalXp: 50, tier: 'low' }],
    revealed: 1, countRevealed: true, reward: 50, itemReward: null,
    guildOnly: false, status: 'open', partyId: null, postedAt: 100, ...overrides,
  };
  asset.questId = quest.id;
  asset.status = 'threatened';
  return quest;
}

function bounty(guild: Employer, target: Lair, id = 'bounty', overrides: Partial<Quest> = {}): Quest {
  const unusedHolding: Asset = {
    id: '', name: target.place, kind: 'watchtower', ownerId: guild.id,
    incomePerDay: 0, status: 'safe', questId: null, timesRavaged: 0, loot: { gold: 0, items: [] },
  };
  const quest = contract(guild, unusedHolding, id, {
    kind: 'assault', assetId: null, lairId: target.id, level: target.level, ...overrides,
  });
  target.questId = quest.id;
  return quest;
}

function item(id: string): MagicItem {
  return { ...ITEM_CATALOGUE[0]!, id, name: id };
}

// view omits finished work and relationship IDs, cooldowns, timesRavaged,
// clearedAt, and raw stash/loot records. Read only those facts from this copy.
function hidden(game: Game): { quests: Quest[]; parties: Party[]; town: Town; lairs: Lair[] } {
  return JSON.parse(game.regressionState());
}

function employerView(game: Game, index = 0) {
  return game.view().town.employers.find((employer) => employer.name === `Employer ${index}`)!;
}

describe('posting Contracts', () => {
  it.each([
    { treasury: 24, posted: 0 }, { treasury: 25, posted: 1 },
  ])('an employer with $treasury gold posts $posted Contract', ({ treasury, posted }) => {
    const game = scene((scenario, rng) => {
      postingEmployer(scenario, rng, { treasury });
    }, { world: { maxOpenQuests: 1 } });
    game.step();
    expect(game.view().board.open).toHaveLength(posted);
    expect(employerView(game).questsPosted).toBe(posted);
  });

  it('a ruined employer cannot post a Contract', () => {
    const game = scene((scenario, rng) => {
      postingEmployer(scenario, rng, { ruined: true });
    }, { world: { maxOpenQuests: 1 } });
    game.step();
    expect(game.view().board.open).toHaveLength(0);
    expect(employerView(game).questsPosted).toBe(0);
  });

  it('an employer waits the entire last hour of its posting cooldown', () => {
    const game = scene((scenario, rng) => {
      postingEmployer(scenario, rng, { cooldown: 1 });
    }, { world: { maxOpenQuests: 1 } });
    game.step();
    expect(game.view().board.open).toHaveLength(0);
    expect(hidden(game).town.employers[0]!.cooldown).toBe(0);
    game.step();
    expect(game.view().board.open).toHaveLength(1);
  });

  it('posting a Contract sets a cooldown from twelve to thirty hours, including both limits', () => {
    const cooldowns = new Set<number>();
    for (let seed = 101; seed <= 140; seed++) {
      const game = scene((scenario, rng) => { postingEmployer(scenario, rng); }, { seed, world: { maxOpenQuests: 1 } });
      game.step();
      expect(game.view().board.open).toHaveLength(1);
      const cooldown = hidden(game).town.employers[0]!.cooldown;
      expect(cooldown).toBeGreaterThanOrEqual(12);
      expect(cooldown).toBeLessThanOrEqual(30);
      cooldowns.add(cooldown);
    }
    expect(cooldowns.has(12)).toBe(true);
    expect(cooldowns.has(30)).toBe(true);
  });

  it.each(['no Holdings', 'all Holdings committed'])('an employer with %s cannot post another Contract', (reason) => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      employer.cooldown = 0;
      if (reason === 'all Holdings committed') {
        scenario.quests = [contract(employer, holding(rng, employer), 'existing', { status: 'taken' })];
      }
    }, { world: { maxOpenQuests: 2 } });
    game.step();
    expect(game.view().board.open).toHaveLength(0);
    expect(employerView(game).questsPosted).toBe(0);
  });

  it('an overrun Holding takes precedence over a safe Holding', () => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      holding(rng, employer, 'Safe tower');
      const overrun = holding(rng, employer, 'Overrun tower');
      overrun.status = 'ravaged';
      employer.cooldown = 0;
    }, { world: { maxOpenQuests: 1 } });
    game.step();
    expect(hidden(game).quests[0]!.assetId).toBe(hidden(game).town.employers[0]!.assets[1]!.id);
    expect(employerView(game).assets.map((asset) => asset.status)).toEqual(['safe', 'ravaged']);
  });

  it('a newly posted Contract threatens its Holding and links it to the work', () => {
    const game = scene((scenario, rng) => {
      postingEmployer(scenario, rng);
    }, { world: { maxOpenQuests: 1 } });
    game.step();
    const quest = game.view().board.open[0]!;
    expect(employerView(game).assets[0]!.status).toBe('threatened');
    expect(hidden(game).town.employers[0]!.assets[0]!.questId).toBe(quest.id);
    expect(employerView(game).questsPosted).toBe(1);
    expect(game.view().events.some((event) => event.kind === 'quest' && event.text.includes(quest.title))).toBe(true);
  });

  it.each(['contract', 'assault'] as const)('an open %s fills the board’s Contract cap', (kind) => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      holding(rng, employer);
      employer.cooldown = 0;
      if (kind === 'assault') {
        const target = lair(rng);
        scenario.lairs = [target];
        scenario.quests = [bounty(serviceOf(scenario.town, 'guild'), target, 'existing')];
      } else {
        const other = scenario.town.employers[1]!;
        scenario.quests = [contract(other, holding(rng, other), 'existing')];
      }
    }, { world: { maxOpenQuests: 1 } });
    game.step();
    expect(game.view().board.open.map((quest) => quest.id)).toEqual(['existing']);
    expect(employerView(game).questsPosted).toBe(0);
  });

  it('taken work does not fill the board’s open-Contract cap', () => {
    const game = scene((scenario, rng) => {
      postingEmployer(scenario, rng);
      const other = scenario.town.employers[1]!;
      scenario.quests = [contract(other, holding(rng, other), 'existing', { status: 'taken' })];
    }, { world: { maxOpenQuests: 1 } });
    game.step();
    expect(game.view().board.open).toHaveLength(1);
    expect(game.view().board.taken).toHaveLength(1);
  });

  it('posting stops as soon as the last board place is filled', () => {
    const game = scene((scenario, rng) => {
      for (const employer of scenario.town.employers.slice(0, 2)) {
        holding(rng, employer);
        employer.cooldown = 0;
      }
    }, { world: { maxOpenQuests: 1 } });
    game.step();
    expect(game.view().board.open).toHaveLength(1);
    expect([employerView(game).questsPosted, employerView(game, 1).questsPosted]).toEqual([1, 0]);
  });

  it('trouble belongs to the active Lair of the same theme and counts as its raid', () => {
    const game = scene((scenario, rng) => {
      const employer = postingEmployer(scenario, rng);
      const asset = employer.assets[0]!;
      // Every possible threat has an origin, so no particular draw is required.
      scenario.lairs = ASSET_KINDS[asset.kind].threats.map((threat) => lair(rng, threat.item));
    }, { world: { maxOpenQuests: 1 } });
    game.step();
    const quest = hidden(game).quests[0]!;
    const origin = hidden(game).lairs.find((candidate) => candidate.id === quest.lairId)!;
    expect(origin).toBeDefined();
    expect(origin.theme).toBe(quest.theme);
    expect(game.view().lairs.find((candidate) => candidate.name === origin.name)!.raids).toBe(1);
    expect(game.view().lairs.reduce((total, candidate) => total + candidate.raids, 0)).toBe(1);
    expect(game.view().stats.raids).toBe(1);
    expect(game.view().board.open[0]!.lair!.name).toBe(origin.name);
  });

  it('a cleared Lair cannot become the origin of new trouble', () => {
    const game = scene((scenario, rng) => {
      const employer = postingEmployer(scenario, rng);
      const asset = employer.assets[0]!;
      scenario.lairs = ASSET_KINDS[asset.kind].threats.map((threat) => ({ ...lair(rng, threat.item), status: 'cleared' as const, clearedAt: 100 }));
    }, { world: { maxOpenQuests: 1 } });
    game.step();
    expect(game.view().board.open[0]!.lair).toBeNull();
    expect(game.view().stats.raids).toBe(0);
  });
});

describe('Contract levels', () => {
  it('a reputable employer never posts above level twenty for a level-twenty company', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const game = scene((scenario, rng) => {
        postingEmployer(scenario, rng, { reputation: 3 });
        const party = company(rng, 20);
        Object.assign(party, { status: 'resting', ticksLeft: 100 });
        scenario.parties = [party];
      }, { seed, world: { maxOpenQuests: 1 } });
      game.step();
      expect(game.view().board.open).toHaveLength(1);
      expect(game.view().board.open[0]!.level).toBe(20);
    }
  });

  it('an employer with reputation two never posts above the strongest company', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const game = scene((scenario, rng) => {
        postingEmployer(scenario, rng, { reputation: 2 });
        const party = company(rng, 7);
        Object.assign(party, { status: 'resting', ticksLeft: 100 });
        scenario.parties = [party];
      }, { seed, world: { maxOpenQuests: 1 } });
      game.step();
      expect(game.view().board.open).toHaveLength(1);
      expect(game.view().board.open[0]!.level).toBe(7);
    }
  });

  it('without an active company the employer posts level-one work', () => {
    const game = scene((scenario, rng) => {
      postingEmployer(scenario, rng);
      const gone = company(rng, 8);
      gone.status = 'disbanded';
      scenario.parties = [gone];
    }, { world: { maxOpenQuests: 1 } });
    game.step();
    expect(game.view().board.open[0]!.level).toBe(1);
  });

  it.each(['idle', 'resting'] as const)('the employer posts work at its sole %s company’s level', (status) => {
    const game = scene((scenario, rng) => {
      postingEmployer(scenario, rng);
      const party = company(rng, 7);
      Object.assign(party, { status, ticksLeft: 100 });
      scenario.parties = [party];
    }, { world: { maxOpenQuests: 1 } });
    game.step();
    const work = [...game.view().board.open, ...game.view().board.taken];
    expect(work).toHaveLength(1);
    expect(work[0]!.level).toBe(7);
  });

  it('ordinary employers choose only levels represented by active companies', () => {
    const levels = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const game = scene((scenario, rng) => {
        postingEmployer(scenario, rng);
        scenario.parties = [company(rng, 3), company(rng, 7)];
        for (const party of scenario.parties) Object.assign(party, { status: 'resting', ticksLeft: 100 });
      }, { seed, world: { maxOpenQuests: 1 } });
      game.step();
      const level = game.view().board.open[0]!.level;
      expect([3, 7]).toContain(level);
      levels.add(level);
    }
    expect([...levels].sort()).toEqual([3, 7]);
  });

  it('a reputable employer can offer one level above the strongest company', () => {
    const levels = new Set<number>();
    for (let seed = 1; seed <= 80; seed++) {
      const game = scene((scenario, rng) => {
        postingEmployer(scenario, rng, { reputation: 3 });
        scenario.parties = [company(rng, 3), company(rng, 7)];
        for (const party of scenario.parties) Object.assign(party, { status: 'resting', ticksLeft: 100 });
      }, { seed, world: { maxOpenQuests: 1 } });
      game.step();
      const level = game.view().board.open[0]!.level;
      expect([3, 7, 8]).toContain(level);
      levels.add(level);
    }
    expect([...levels].sort()).toEqual([3, 7, 8]);
  });

  it.each(['idle', 'resting'] as const)('an available %s company attracts more work than a busy one', (status) => {
    let availableJobs = 0;
    for (let seed = 1; seed <= 160; seed++) {
      const game = scene((scenario, rng) => {
        postingEmployer(scenario, rng);
        const available = company(rng, 3);
        Object.assign(available, { status, ticksLeft: 100 });
        const busy = company(rng, 7);
        const other = scenario.town.employers[1]!;
        const work = contract(other, holding(rng, other), 'busy', { status: 'taken', level: 7 });
        Object.assign(busy, { status: 'traveling', questId: work.id, ticksLeft: 100 });
        scenario.parties = [available, busy];
        scenario.quests = [work];
      }, { seed, world: { maxOpenQuests: 1 } });
      game.step();
      const posted = [...game.view().board.open, ...game.view().board.taken].find((quest) => quest.id !== 'busy')!;
      expect([3, 7]).toContain(posted.level);
      if (posted.level === 3) availableJobs++;
    }
    // A broad population range, not a prescribed seed's roll or RNG call order.
    expect(availableJobs).toBeGreaterThan(100);
    expect(availableJobs).toBeLessThan(140);
  });
});

describe('Lair raids', () => {
  it('the Contract belongs to the Lair that raided when two active Lairs share a theme', () => {
    const game = scene((scenario, rng) => {
      holding(rng, scenario.town.employers[0]!);
      const quiet = lair(rng);
      quiet.name = 'Quiet goblin warren';
      const raider = lair(rng);
      Object.assign(raider, { name: 'Raiding goblin warcamp', raidCooldown: 1 });
      // The first matching theme is deliberately not the Lair whose raid is due.
      scenario.lairs = [quiet, raider];
    }, { world: { maxOpenQuests: 1 } });
    game.step();
    expect(game.view().board.open).toHaveLength(1);
    expect(game.view().board.open[0]!.lair!.name).toBe('Raiding goblin warcamp');
    expect(hidden(game).quests[0]!.lairId).toBe(hidden(game).lairs[1]!.id);
    expect(game.view().lairs.map((target) => target.raids)).toEqual([0, 1]);
  });

  it('a Lair may raid an employer at the twenty-five-gold treasury threshold', () => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      employer.treasury = 25;
      holding(rng, employer);
      const target = lair(rng);
      target.raidCooldown = 1;
      scenario.lairs = [target];
    }, { world: { maxOpenQuests: 1 } });
    game.step();
    expect(game.view().board.open).toHaveLength(1);
    expect(game.view().lairs[0]!.raids).toBe(1);
  });

  it('a Lair waits until its raid cooldown ends, then resets the interval', () => {
    const game = scene((scenario, rng) => {
      holding(rng, scenario.town.employers[0]!);
      const target = lair(rng);
      target.raidCooldown = 2;
      scenario.lairs = [target];
    }, { world: { maxOpenQuests: 1 } });
    game.step();
    expect(game.view().board.open).toHaveLength(0);
    expect(game.view().lairs[0]!.nextRaidIn).toBe(1);
    game.step();
    expect(game.view().board.open).toHaveLength(1);
    expect(game.view().lairs[0]).toMatchObject({ raids: 1, nextRaidIn: 90 });
    expect(game.view().stats.raids).toBe(1);
  });

  it('a Lair raids only Holdings threatened by its theme', () => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      holding(rng, employer, 'Goblin target');
      const excluded = holding(rng, employer, 'Harbour');
      excluded.kind = 'port';
      const target = lair(rng);
      target.raidCooldown = 1;
      scenario.lairs = [target];
    }, { world: { maxOpenQuests: 2 } });
    game.step();
    expect(hidden(game).quests[0]!.assetId).toBe(hidden(game).town.employers[0]!.assets[0]!.id);
    expect(employerView(game).assets.map((asset) => asset.status)).toEqual(['threatened', 'safe']);
  });

  it.each(['open', 'taken'] as const)('a Lair does not raid a Holding with an %s Contract', (status) => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      scenario.quests = [contract(employer, holding(rng, employer), 'existing', { status })];
      const target = lair(rng);
      target.raidCooldown = 1;
      scenario.lairs = [target];
    }, { world: { maxOpenQuests: 2 } });
    game.step();
    expect([...game.view().board.open, ...game.view().board.taken].map((quest) => quest.id)).toEqual(['existing']);
    expect(game.view().lairs[0]).toMatchObject({ raids: 0, nextRaidIn: 90 });
  });

  it.each(['ruined employer', 'poor employer', 'full board', 'no matching Holding'])('a raid blocked by a %s still resets its cooldown', (reason) => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      const asset = holding(rng, employer);
      if (reason === 'ruined employer') employer.ruined = true;
      if (reason === 'poor employer') employer.treasury = 24;
      if (reason === 'no matching Holding') asset.kind = 'port';
      const target = lair(rng);
      Object.assign(target, { raidCooldown: 1, strength: 10 });
      scenario.lairs = [target];
    }, { world: { maxOpenQuests: reason === 'full board' ? 0 : 1 } });
    game.step();
    expect(game.view().board.open).toHaveLength(0);
    expect(game.view().lairs[0]).toMatchObject({ raids: 0, nextRaidIn: 36 });
  });

  it('a cleared Lair neither raids nor counts down', () => {
    const game = scene((scenario, rng) => {
      holding(rng, scenario.town.employers[0]!);
      const target = lair(rng);
      Object.assign(target, { status: 'cleared', clearedAt: 100, raidCooldown: 1 });
      scenario.lairs = [target];
    }, { world: { maxOpenQuests: 1 } });
    game.step();
    expect(game.view().board.open).toHaveLength(0);
    expect(game.view().lairs[0]!.nextRaidIn).toBe(1);
    expect(game.view().stats.raids).toBe(0);
  });
});

describe('posting Bounties', () => {
  it('a Bounty is posted once the strongest company is at least one level below the Lair, with no upper bound', () => {
    for (const { level, posted } of [{ level: 3, posted: 0 }, { level: 4, posted: 1 }, { level: 20, posted: 1 }]) {
      const game = scene((scenario, rng) => {
        scenario.parties = [company(rng, 1), company(rng, level)];
        for (const party of scenario.parties) Object.assign(party, { status: 'resting', ticksLeft: 100 });
        scenario.lairs = [lair(rng)];
      });
      game.step();
      expect(game.view().board.open).toHaveLength(posted);
      expect(game.view().lairs[0]!.bountyPosted).toBe(posted === 1);
    }
  });

  it.each([
    { level: 3, posted: 0 }, { level: 4, posted: 1 },
    { level: 5, posted: 1 }, { level: 6, posted: 1 },
  ])('a level-$level company brings $posted Bounty for a level-five Lair', ({ level, posted }) => {
    const game = scene((scenario, rng) => {
      const party = company(rng, level);
      Object.assign(party, { status: 'resting', ticksLeft: 100 });
      scenario.parties = [party];
      scenario.lairs = [lair(rng)];
    });
    game.step();
    expect(game.view().board.open).toHaveLength(posted);
    expect(game.view().lairs[0]!.bountyPosted).toBe(posted === 1);
    expect(game.view().town.employers.find((employer) => employer.service === 'guild')!.questsPosted).toBe(posted);
    if (posted) {
      const quest = game.view().board.open[0]!;
      expect(quest).toMatchObject({ kind: 'assault', level: 5 });
      expect(hidden(game).lairs[0]!.questId).toBe(quest.id);
      expect(game.view().chronicle.some((event) => event.kind === 'quest' && event.text.includes(quest.lair!.name))).toBe(true);
    }
  });

  it.each(['ruined guild', 'cleared Lair', 'disbanded company', 'no company'])('a %s prevents a new Bounty', (reason) => {
    const game = scene((scenario, rng) => {
      const party = company(rng);
      Object.assign(party, { status: reason === 'disbanded company' ? 'disbanded' : 'resting', ticksLeft: 100 });
      scenario.parties = reason === 'no company' ? [] : [party];
      const target = lair(rng);
      if (reason === 'cleared Lair') Object.assign(target, { status: 'cleared', clearedAt: 100 });
      if (reason === 'ruined guild') serviceOf(scenario.town, 'guild').ruined = true;
      scenario.lairs = [target];
    });
    game.step();
    expect(game.view().board.open).toHaveLength(0);
    expect(game.view().lairs[0]!.bountyPosted).toBe(false);
  });

  it.each(['open', 'taken'] as const)('a Lair with an %s Bounty receives no duplicate', (status) => {
    const game = scene((scenario, rng) => {
      const party = company(rng);
      Object.assign(party, { status: 'resting', ticksLeft: 100 });
      scenario.parties = [party];
      const target = lair(rng);
      scenario.lairs = [target];
      scenario.quests = [bounty(serviceOf(scenario.town, 'guild'), target, 'existing', { status })];
    });
    game.step();
    expect([...game.view().board.open, ...game.view().board.taken].map((quest) => quest.id)).toEqual(['existing']);
    expect(game.view().town.employers.find((employer) => employer.service === 'guild')!.questsPosted).toBe(0);
  });
});

describe('choosing Contracts', () => {
  it('accepting a Contract from a Lair produces an ordinary quest event rather than a Bounty chronicle entry', () => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      const target = lair(rng, 'goblins', 8);
      scenario.lairs = [target];
      scenario.quests = [contract(employer, holding(rng, employer), 'Lair-backed Contract', { lairId: target.id })];
      scenario.parties = [company(rng)];
    });
    game.step();
    const view = game.view();
    expect(view.board.taken.map((quest) => quest.id)).toEqual(['Lair-backed Contract']);
    const acceptance = view.events.filter((event) => event.kind === 'quest');
    expect(acceptance).toHaveLength(1);
    expect(acceptance[0]!.text).toContain('Lair-backed Contract');
    expect(acceptance[0]!.text).toContain(employerView(game).name);
    expect(view.chronicle.filter((event) => event.kind === 'quest')).toHaveLength(0);
  });

  it.each([
    { level: 4, waited: 0, taken: false }, { level: 5, waited: 0, taken: true },
    { level: 6, waited: 0, taken: false }, { level: 4, waited: 22, taken: false },
    { level: 6, waited: 22, taken: false }, { level: 4, waited: 23, taken: true },
    { level: 6, waited: 23, taken: true }, { level: 3, waited: 23, taken: false },
    { level: 7, waited: 23, taken: false },
  ])('a level-five company waiting $waited hours takes level-$level work: $taken', ({ level, waited, taken }) => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      scenario.quests = [contract(employer, holding(rng, employer), 'work', { level })];
      const party = company(rng);
      party.idleTicks = waited;
      scenario.parties = [party];
    });
    game.step();
    expect(game.view().board.taken).toHaveLength(taken ? 1 : 0);
    expect(game.view().board.open).toHaveLength(taken ? 0 : 1);
  });

  it.each([false, true])('guild-only Contracts require membership: member=%s', (member) => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      scenario.quests = [contract(employer, holding(rng, employer), 'guild work', { guildOnly: true })];
      const party = company(rng);
      party.guildMember = member;
      scenario.parties = [party];
    });
    game.step();
    expect(game.view().parties[0]!.guildMember).toBe(member);
    expect(game.view().board.taken).toHaveLength(member ? 1 : 0);
  });

  it.each(['favoured employer', 'closest level', 'reputation', 'reward'])('a company chooses by %s before lesser preferences', (preference) => {
    const game = scene((scenario, rng) => {
      const first = scenario.town.employers[0]!;
      const preferred = scenario.town.employers[1]!;
      const party = company(rng);
      party.idleTicks = 23;
      const lesser = contract(first, holding(rng, first), 'lesser', { reward: 500 });
      const better = contract(preferred, holding(rng, preferred), 'preferred', { reward: 20 });
      if (preference === 'favoured employer') {
        preferred.favoredPartyId = party.id;
        better.level = 6;
        first.reputation = 10;
      } else if (preference === 'closest level') {
        lesser.level = 4;
        first.reputation = 10;
      } else if (preference === 'reputation') {
        preferred.reputation = 1;
      } else {
        better.reward = 501;
      }
      scenario.parties = [party];
      // Preferred work is second on the board, so insertion order cannot pass.
      scenario.quests = [lesser, better];
    });
    game.step();
    expect(game.view().board.taken.map((quest) => quest.id)).toEqual(['preferred']);
    expect(game.view().board.open.map((quest) => quest.id)).toEqual(['lesser']);
  });

  it('accepting a Contract links company and work and starts the Expedition', () => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      scenario.quests = [contract(employer, holding(rng, employer))];
      const party = company(rng);
      party.idleTicks = 12;
      scenario.parties = [party];
    }, { board: { travelTicks: 7 } });
    const events: GameEventView[] = [];
    game.onEvent((event) => { events.push(event); });
    game.step();
    const view = game.view();
    expect(view.board.taken[0]!.partyName).toBe(view.parties[0]!.name);
    expect(hidden(game).quests[0]!.partyId).toBe(view.parties[0]!.id);
    expect(hidden(game).parties[0]).toMatchObject({ questId: 'contract', status: 'traveling', ticksLeft: 7, idleTicks: 0 });
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe('quest');
    expect(events[0]!.text).toContain(view.board.taken[0]!.title);
  });
});

describe('first refusal', () => {
  it('the retired adventurer’s old company may take its Contract immediately', () => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      const party = company(rng);
      employer.favoredPartyId = party.id;
      scenario.parties = [party];
      scenario.quests = [contract(employer, holding(rng, employer))];
    });
    game.step();
    expect(game.view().board.taken[0]!.partyName).toBe(game.view().parties[0]!.name);
  });

  it.each([
    { postedAt: 78, taken: false }, { postedAt: 77, taken: true },
  ])('other companies gain first refusal at one day: posted at $postedAt, taken=$taken', ({ postedAt, taken }) => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      const old = company(rng);
      Object.assign(old, { status: 'resting', ticksLeft: 100 });
      const newcomer = company(rng);
      employer.favoredPartyId = old.id;
      scenario.parties = [old, newcomer];
      scenario.quests = [contract(employer, holding(rng, employer), 'reserved', { postedAt })];
    });
    game.step();
    expect(game.view().board.taken).toHaveLength(taken ? 1 : 0);
    if (taken) expect(game.view().board.taken[0]!.partyName).toBe(game.view().parties[1]!.name);
  });

  it.each(['absent', 'disbanded'] as const)('a %s old company cannot reserve its employer’s Contract', (status) => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      const old = company(rng);
      old.status = 'disbanded';
      employer.favoredPartyId = old.id;
      scenario.parties = status === 'absent' ? [company(rng)] : [old, company(rng)];
      scenario.quests = [contract(employer, holding(rng, employer))];
    });
    game.step();
    expect(game.view().board.taken).toHaveLength(1);
    expect(game.view().board.taken[0]!.partyName).toBe(game.view().parties.at(-1)!.name);
  });
});

describe('choosing Bounties', () => {
  it.each([
    { level: 5, gold: 1149 }, { level: 4, gold: 1150 },
  ])('a level-$level company with $gold gold cannot take a level-five Bounty', ({ level, gold }) => {
    for (let seed = 1; seed <= 32; seed++) {
      const game = scene((scenario, rng) => {
        const target = lair(rng);
        scenario.lairs = [target];
        scenario.quests = [bounty(serviceOf(scenario.town, 'guild'), target)];
        const party = company(rng, level);
        party.gold = gold;
        // At level four the purse can afford a blessing, so keep it provisioned.
        scenario.parties = [party];
      }, { seed });
      game.step();
      expect(game.view().board.open.map((quest) => quest.id)).toEqual(['bounty']);
      expect(game.view().board.taken).toHaveLength(0);
    }
  });

  it.each([5, 6])('a level-%s company with its resurrection reserve takes a Bounty only when it has the appetite', (level) => {
    let accepted = 0;
    let declined = 0;
    for (let seed = 1; seed <= 64; seed++) {
      const game = scene((scenario, rng) => {
        const target = lair(rng);
        scenario.lairs = [target];
        const guild = serviceOf(scenario.town, 'guild');
        const party = company(rng, level);
        party.gold = level === 5 ? 1150 : 1590;
        party.guildMember = false;
        scenario.parties = [party];
        const employer = scenario.town.employers[0]!;
        scenario.quests = [contract(employer, holding(rng, employer), 'ordinary', { level }), bounty(guild, target)];
      }, { seed });
      game.step();
      expect(game.view().board.taken).toHaveLength(1);
      const chosen = game.view().board.taken[0]!;
      expect(game.view().parties[0]!.guildMember).toBe(false);
      expect(hidden(game).parties[0]!.questId).toBe(chosen.id);
      expect(hidden(game).quests.find((quest) => quest.id === chosen.id)!.partyId).toBe(game.view().parties[0]!.id);
      if (chosen.kind === 'assault') {
        accepted++;
        expect(game.view().board.open.map((quest) => quest.id)).toEqual(['ordinary']);
        expect(game.view().chronicle.some((event) => event.kind === 'quest' && event.text.includes(chosen.lair!.name))).toBe(true);
      } else {
        declined++;
        expect(chosen.id).toBe('ordinary');
      }
    }
    expect(accepted).toBeGreaterThan(10);
    expect(accepted).toBeLessThan(40);
    expect(declined).toBeGreaterThan(0);
  });
});

describe('Contract expiry', () => {
  it('an expired Contract cannot strengthen or enrich a cleared Lair', () => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      const target = lair(rng);
      Object.assign(target, { status: 'cleared', clearedAt: 100, strength: 3, raidsWon: 2 });
      target.hoard.gold = 0;
      scenario.lairs = [target];
      scenario.quests = [contract(employer, holding(rng, employer), 'old raid', {
        postedAt: 0, lairId: target.id,
      })];
    });
    game.step();
    expect(game.view().stats.questsExpired).toBe(1);
    expect(employerView(game)).toMatchObject({ treasury: 980, spent: 20 });
    expect(game.view().lairs[0]).toMatchObject({ status: 'cleared', strength: 3, raidsWon: 2, hoardGold: 0 });
  });

  it('an unanswered Contract takes no gold when its employer’s treasury is empty or in debt', () => {
    for (const treasury of [-7, 0]) {
      const game = scene((scenario, rng) => {
        const employer = scenario.town.employers[0]!;
        employer.treasury = treasury;
        const target = lair(rng);
        scenario.lairs = [target];
        scenario.quests = [contract(employer, holding(rng, employer), 'unanswered raid', {
          postedAt: 0, lairId: target.id,
        })];
      });
      game.step();
      expect(employerView(game)).toMatchObject({ treasury, spent: 0 });
      expect(game.view().lairs[0]).toMatchObject({ hoardGold: 100, strength: 2, raidsWon: 1 });
      expect(game.view().stats.questsExpired).toBe(1);
    }
  });

  it('the first overrun of a Holding is recorded in the chronicle', () => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      scenario.quests = [contract(employer, holding(rng, employer), 'unanswered', { postedAt: 0 })];
    });
    game.step();
    const name = employerView(game).assets[0]!.name;
    expect(game.view().chronicle.filter((event) => event.kind === 'economy' && event.text.includes(name))).toHaveLength(1);
  });

  it('a repeated overrun of a Holding is logged without another chronicle entry', () => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      const asset = holding(rng, employer);
      scenario.quests = [contract(employer, asset, 'unanswered again', { postedAt: 0 })];
      Object.assign(asset, { status: 'ravaged', timesRavaged: 1 });
    });
    game.step();
    const name = employerView(game).assets[0]!.name;
    expect(game.view().events.filter((event) => event.kind === 'economy' && event.text.includes(name))).toHaveLength(1);
    expect(game.view().chronicle.filter((event) => event.kind === 'economy' && event.text.includes(name))).toHaveLength(0);
  });


  it.each([
    { kind: 'contract', status: 'open', postedAt: 29, expires: false },
    { kind: 'contract', status: 'open', postedAt: 28, expires: true },
    { kind: 'contract', status: 'taken', postedAt: 0, expires: false },
    { kind: 'contract', status: 'done', postedAt: 0, expires: false },
    { kind: 'contract', status: 'failed', postedAt: 0, expires: false },
    { kind: 'assault', status: 'open', postedAt: 0, expires: false },
  ] as const)('expiry of $status $kind posted at $postedAt: $expires', ({ kind, status, postedAt, expires }) => {
    const game = scene((scenario, rng) => {
      if (kind === 'assault') {
        const target = lair(rng);
        scenario.lairs = [target];
        scenario.quests = [bounty(serviceOf(scenario.town, 'guild'), target, 'work', { status, postedAt })];
      } else {
        const employer = scenario.town.employers[0]!;
        scenario.quests = [contract(employer, holding(rng, employer), 'work', { status, postedAt })];
      }
    });
    game.step();
    expect(game.view().stats.questsExpired).toBe(expires ? 1 : 0);
    expect(hidden(game).quests[0]!.status).toBe(expires ? 'failed' : status);
  });

  it.each([
    { treasury: 7, remaining: 0, loss: 7 }, { treasury: 100, remaining: 80, loss: 20 },
  ])('unanswered work costs an employer with $treasury gold exactly $loss gold', ({ treasury, remaining, loss }) => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      employer.treasury = treasury;
      scenario.quests = [contract(employer, holding(rng, employer), 'unanswered', { postedAt: 0 })];
    });
    game.step();
    expect(employerView(game)).toMatchObject({ treasury: remaining, spent: loss, questsFailed: 0 });
    expect(game.view().stats).toMatchObject({ questsExpired: 1, questsFailed: 0 });
  });

  it.each([
    { status: 'threatened', timesRavaged: 0, after: 1 },
    { status: 'ravaged', timesRavaged: 2, after: 2 },
  ] as const)('an unanswered Contract releases its $status Holding and leaves it ravaged', ({ status, timesRavaged, after }) => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      const asset = holding(rng, employer);
      scenario.quests = [contract(employer, asset, 'unanswered', { postedAt: 0 })];
      Object.assign(asset, { status, timesRavaged });
    });
    game.step();
    expect(employerView(game).assets[0]!.status).toBe('ravaged');
    expect(hidden(game).town.employers[0]!.assets[0]).toMatchObject({ questId: null, timesRavaged: after });
    expect(game.view().events.some((event) => event.kind === 'economy' && event.text.includes('unanswered'))).toBe(true);
  });

  it.each([
    { strength: 2, after: 3 }, { strength: 10, after: 10 },
  ])('an unanswered raid enriches its Lair and changes strength $strength to $after', ({ strength, after }) => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      const target = lair(rng);
      target.strength = strength;
      scenario.lairs = [target];
      scenario.quests = [contract(employer, holding(rng, employer), 'raid', { postedAt: 0, lairId: target.id })];
    });
    game.step();
    expect(game.view().lairs[0]).toMatchObject({ strength: after, hoardGold: 120, raidsWon: 1 });
  });

  it('an unanswered Contract shortens a long employer cooldown to four through ten hours', () => {
    const cooldowns = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const game = scene((scenario, rng) => {
        const employer = scenario.town.employers[0]!;
        scenario.quests = [contract(employer, holding(rng, employer), 'unanswered', { postedAt: 0 })];
      }, { seed });
      game.step();
      const cooldown = hidden(game).town.employers[0]!.cooldown;
      expect(cooldown).toBeGreaterThanOrEqual(4);
      expect(cooldown).toBeLessThanOrEqual(10);
      cooldowns.add(cooldown);
    }
    expect(cooldowns.has(4)).toBe(true);
    expect(cooldowns.has(10)).toBe(true);
  });

  it('an unanswered Contract does not lengthen an already short cooldown', () => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      employer.cooldown = 2;
      scenario.quests = [contract(employer, holding(rng, employer), 'unanswered', { postedAt: 0 })];
    });
    game.step();
    expect(hidden(game).town.employers[0]!.cooldown).toBe(1);
  });

  it.each([
    { count: 200, retained: 200 }, { count: 201, retained: 2 },
  ])('a board history of $count entries retains $retained entries after pruning', ({ count, retained }) => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      scenario.quests = Array.from({ length: count }, (_, index) => {
        const asset = holding(rng, employer, `Holding ${index}`);
        const status = index === 0 ? 'open' : index === 1 ? 'taken' : index % 2 === 0 ? 'done' : 'failed';
        const work = contract(employer, asset, `work-${index}`, { status });
        if (status === 'done' || status === 'failed') {
          asset.questId = null;
          asset.status = status === 'done' ? 'safe' : 'ravaged';
        }
        return work;
      });
    });
    game.step();
    expect(hidden(game).quests).toHaveLength(retained);
    expect(game.view().board.open.map((quest) => quest.id)).toEqual(['work-0']);
    expect(game.view().board.taken.map((quest) => quest.id)).toEqual(['work-1']);
  });
});

function homecoming(
  kind: 'contract' | 'assault',
  success: boolean,
  configure: (scenario: GameScenario, employer: Employer, asset: Asset, target: Lair, party: Party, quest: Quest, rng: Rng) => void = () => {},
): Game {
  return scene((scenario, rng) => {
    // Rooms and carousing have their own tests; observe settlement without fees.
    serviceOf(scenario.town, 'tavern').ruined = true;
    const employer = kind === 'contract' ? scenario.town.employers[0]! : serviceOf(scenario.town, 'guild');
    const asset = holding(rng, scenario.town.employers[0]!);
    const target = lair(rng);
    const party = company(rng);
    const quest = kind === 'contract'
      ? contract(employer, asset, 'homecoming', { lairId: target.id })
      : bounty(employer, target, 'homecoming');
    Object.assign(quest, { status: 'taken', partyId: party.id });
    Object.assign(party, {
      gold: 10, renown: 2, status: 'returning', ticksLeft: 1,
      questId: quest.id, progress: success ? quest.encounters.length : 0,
    });
    scenario.parties = [party];
    scenario.quests = [quest];
    scenario.lairs = [target];
    configure(scenario, employer, asset, target, party, quest, rng);
  });
}

describe('successful Contracts', () => {
  it('a company collects gold-only loot left at a Holding', () => {
    const game = homecoming('contract', true, (_scenario, _employer, asset) => {
      asset.loot = { gold: 37, items: [] };
    });
    game.step();
    expect(game.view().parties[0]).toMatchObject({ gold: 97, earned: 87, stash: [] });
    expect(hidden(game).town.employers[0]!.assets[0]!.loot).toEqual({ gold: 0, items: [] });
    expect(employerView(game).assets[0]!.hasLoot).toBe(false);
    expect(game.view().stats).toMatchObject({ itemsFound: 0, goldPaid: 50 });
  });

  it('a company collects items-only loot left at a Holding', () => {
    const game = homecoming('contract', true, (_scenario, _employer, asset) => {
      asset.loot = { gold: 0, items: [item('Lost sword'), item('Lost shield')] };
    });
    game.step();
    expect(game.view().parties[0]).toMatchObject({ gold: 60, earned: 50, stash: ['Lost sword', 'Lost shield'] });
    expect(hidden(game).town.employers[0]!.assets[0]!.loot).toEqual({ gold: 0, items: [] });
    expect(employerView(game).assets[0]!.hasLoot).toBe(false);
    expect(game.view().stats).toMatchObject({ itemsFound: 2, goldPaid: 50 });
  });

  it('a Contract without a Holding pays the company without granting a windfall', () => {
    const game = homecoming('contract', true, (_scenario, _employer, _asset, _target, _party, quest) => {
      quest.assetId = null;
    });
    game.step();
    expect(employerView(game)).toMatchObject({ treasury: 950, earned: 0, spent: 50 });
    expect(game.view().parties[0]).toMatchObject({ gold: 60, earned: 50 });
    expect(game.view().events.some((event) => event.kind === 'reward' && event.text.includes('50 gp'))).toBe(true);
  });

  it('returning companies receive the exact reward and both ledgers record the payment', () => {
    const game = homecoming('contract', true);
    game.step();
    expect(game.view().parties[0]).toMatchObject({ gold: 60, earned: 50, questsDone: 1, questsFailed: 0 });
    expect(employerView(game)).toMatchObject({ spent: 50, questsCompleted: 1, questsFailed: 0 });
    expect(game.view().stats).toMatchObject({ questsCompleted: 1, questsFailed: 0, goldPaid: 50 });
    expect(hidden(game).quests[0]!.status).toBe('done');
    expect(game.view().board.taken).toHaveLength(0);
    expect(game.view().events.some((event) => event.kind === 'reward' && event.text.includes('50 gp'))).toBe(true);
  });

  it('recovering a Holding returns forty gold in windfall to its employer', () => {
    const game = homecoming('contract', true);
    game.step();
    expect(employerView(game)).toMatchObject({ treasury: 990, earned: 40 });
  });

  it.each(['threatened', 'ravaged'] as const)('a successful Contract releases its %s Holding and makes it safe', (status) => {
    const game = homecoming('contract', true, (_scenario, _employer, asset) => {
      asset.status = status;
      asset.timesRavaged = 2;
    });
    game.step();
    expect(employerView(game).assets[0]!.status).toBe('safe');
    expect(hidden(game).town.employers[0]!.assets[0]).toMatchObject({ questId: null, timesRavaged: 2 });
    expect(hidden(game).parties[0]!.questId).toBeNull();
  });

  it('a successful Contract increases employer reputation by one', () => {
    const game = homecoming('contract', true, (_scenario, employer) => { employer.reputation = 4; });
    game.step();
    expect(employerView(game).reputation).toBe(5);
  });

  it.each([
    { before: 2, after: 3 }, { before: 9, after: 10 }, { before: 10, after: 10 },
  ])('a successful Contract changes company renown from $before to $after', ({ before, after }) => {
    const game = homecoming('contract', true, (_scenario, _employer, _asset, _target, party) => { party.renown = before; });
    game.step();
    expect(game.view().parties[0]!.renown).toBe(after);
  });

  it('an item paid in kind goes to the company stash and is counted once', () => {
    const game = homecoming('contract', true, (scenario, _employer, _asset, _target, _party, quest) => {
      quest.itemReward = item('Promised sword');
      scenario.stats.itemsFound = 4;
    });
    game.step();
    expect(game.view().parties[0]!.stash).toEqual(['Promised sword']);
    expect(game.view().stats.itemsFound).toBe(5);
  });

  it('a company recovers and empties the gold and items left by its predecessors', () => {
    const game = homecoming('contract', true, (_scenario, _employer, asset) => {
      asset.loot = { gold: 37, items: [item('Lost sword'), item('Lost shield')] };
    });
    expect(employerView(game).assets[0]!.hasLoot).toBe(true);
    game.step();
    expect(game.view().parties[0]).toMatchObject({ gold: 97, earned: 87, stash: ['Lost sword', 'Lost shield'] });
    expect(employerView(game).assets[0]!.hasLoot).toBe(false);
    expect(hidden(game).town.employers[0]!.assets[0]!.loot).toEqual({ gold: 0, items: [] });
    expect(game.view().stats).toMatchObject({ itemsFound: 2, goldPaid: 50 });
    expect(game.view().chronicle.some((event) => event.kind === 'reward' && event.text.includes('Lost sword'))).toBe(true);
  });
});

describe('failed Contracts', () => {
  it('a Contract taken before its Lair was cleared cannot strengthen that Lair when it fails', () => {
    const game = homecoming('assault', true, (scenario, _guild, _asset, target, _winner, _bounty, rng) => {
      const employer = scenario.town.employers[1]!;
      const returning = company(rng);
      const work = contract(employer, holding(rng, employer), 'unfinished raid', {
        lairId: target.id, status: 'taken', partyId: returning.id,
      });
      Object.assign(returning, { status: 'returning', ticksLeft: 2, questId: work.id, progress: 0 });
      scenario.parties.push(returning);
      scenario.quests.push(work);
    });
    game.step();
    expect(game.view().lairs[0]!.status).toBe('cleared');
    expect(game.view().board.taken.map((quest) => quest.id)).toEqual(['unfinished raid']);
    game.step();
    expect(game.view().stats.questsFailed).toBe(1);
    expect(hidden(game).quests.find((quest) => quest.id === 'unfinished raid')!.status).toBe('failed');
    expect(game.view().lairs[0]).toMatchObject({ status: 'cleared', strength: 1, raidsWon: 0, hoardGold: 0 });
  });

  it('a failed Contract without a Lair still records failure', () => {
    const game = homecoming('contract', false, (scenario, _employer, _asset, _target, _party, quest) => {
      quest.lairId = null;
      scenario.lairs = [];
    });
    game.step();
    expect(game.view().lairs).toHaveLength(0);
    expect(game.view().stats.questsFailed).toBe(1);
    expect(game.view().parties[0]!.questsFailed).toBe(1);
    expect(employerView(game).questsFailed).toBe(1);
  });

  it('an unsuccessful company earns no reward and records failure on both sides', () => {
    const game = homecoming('contract', false, (_scenario, _employer, _asset, _target, _party, quest) => {
      quest.itemReward = item('Unpaid sword');
    });
    game.step();
    expect(hidden(game).quests[0]!.status).toBe('failed');
    expect(game.view().parties[0]).toMatchObject({ gold: 10, earned: 0, questsDone: 0, questsFailed: 1, stash: [] });
    expect(employerView(game)).toMatchObject({ treasury: 1000, earned: 0, spent: 0, reputation: 0, questsCompleted: 0, questsFailed: 1 });
    expect(game.view().stats).toMatchObject({ questsFailed: 1, questsCompleted: 0, questsExpired: 0, goldPaid: 0, itemsFound: 0 });
  });

  it.each([
    { before: 2, after: 1 }, { before: 0, after: 0 },
  ])('a failed Contract changes company renown from $before to $after', ({ before, after }) => {
    const game = homecoming('contract', false, (_scenario, _employer, _asset, _target, party) => { party.renown = before; });
    game.step();
    expect(game.view().parties[0]!.renown).toBe(after);
  });

  it('failure releases the Holding for new work but leaves its loot in enemy hands', () => {
    const game = homecoming('contract', false, (_scenario, _employer, asset) => {
      asset.status = 'ravaged';
      asset.loot = { gold: 37, items: [item('Lost sword')] };
    });
    game.step();
    expect(employerView(game).assets[0]).toMatchObject({ status: 'ravaged', hasLoot: true });
    expect(hidden(game).town.employers[0]!.assets[0]!.questId).toBeNull();
    expect(hidden(game).town.employers[0]!.assets[0]!.loot.gold).toBe(37);
    expect(game.view().parties[0]!.stash).toEqual([]);
  });

  it('failure shortens a long posting cooldown to two through eight hours', () => {
    const game = homecoming('contract', false);
    game.step();
    expect(hidden(game).town.employers[0]!.cooldown).toBeGreaterThanOrEqual(2);
    expect(hidden(game).town.employers[0]!.cooldown).toBeLessThanOrEqual(8);
  });

  it('failure does not lengthen an already short employer cooldown', () => {
    const game = homecoming('contract', false, (_scenario, employer) => { employer.cooldown = 2; });
    game.step();
    expect(hidden(game).town.employers[0]!.cooldown).toBe(1);
  });

  it.each([
    { before: 2, after: 3 }, { before: 10, after: 10 },
  ])('an abandoned raid changes Lair strength $before to $after without adding gold', ({ before, after }) => {
    const game = homecoming('contract', false, (_scenario, _employer, _asset, target) => { target.strength = before; });
    game.step();
    expect(game.view().lairs[0]).toMatchObject({ strength: after, raidsWon: 1, hoardGold: 100 });
  });
});

describe('successful Bounties', () => {
  it('breaking a Lair withdraws its open Contract even when the Holding is absent', () => {
    const game = homecoming('assault', true, (scenario, _guild, asset, target) => {
      scenario.quests.push(contract(scenario.town.employers[0]!, asset, 'orphaned raid', {
        assetId: null, lairId: target.id,
      }));
    });
    game.step();
    expect(hidden(game).quests.find((quest) => quest.id === 'orphaned raid')!.status).toBe('failed');
    expect(game.view().board.open).toHaveLength(0);
    expect(game.view().lairs[0]!.status).toBe('cleared');
  });

  it('the guild pays the exact Bounty and records payment, completion and reputation', () => {
    const game = homecoming('assault', true, (_scenario, employer, _asset, target) => {
      employer.reputation = 4;
      target.hoard.gold = 0;
    });
    game.step();
    expect(game.view().parties[0]).toMatchObject({ gold: 60, earned: 50, questsDone: 1, questsFailed: 0 });
    expect(game.view().town.employers.find((employer) => employer.service === 'guild')).toMatchObject({
      treasury: 950, earned: 0, spent: 50, reputation: 5, questsCompleted: 1, questsFailed: 0,
    });
    expect(game.view().stats).toMatchObject({ questsCompleted: 1, questsFailed: 0, goldPaid: 50 });
    expect(hidden(game).quests[0]!.status).toBe('done');
  });

  it('the Bounty’s item reward is handed to the company', () => {
    const game = homecoming('assault', true, (_scenario, _employer, _asset, _target, _party, quest) => {
      quest.itemReward = item('Guild sword');
    });
    game.step();
    expect(game.view().parties[0]!.stash).toEqual(['Guild sword']);
    expect(game.view().stats.itemsFound).toBe(1);
  });

  it('the company takes all hoard gold and items and leaves the hoard empty', () => {
    const game = homecoming('assault', true, (_scenario, _employer, _asset, target) => {
      target.hoard = { gold: 137, items: [item('Hoard sword'), item('Hoard shield')] };
    });
    game.step();
    expect(game.view().parties[0]).toMatchObject({ gold: 197, earned: 187, stash: ['Hoard sword', 'Hoard shield'] });
    expect(game.view().lairs[0]).toMatchObject({ hoardGold: 0, hoardItems: [] });
    expect(game.view().stats).toMatchObject({ itemsFound: 2, goldPaid: 50 });
  });

  it.each([
    { before: 2, after: 5 }, { before: 9, after: 10 }, { before: 10, after: 10 },
  ])('breaking a Lair changes company renown from $before to $after', ({ before, after }) => {
    const game = homecoming('assault', true, (_scenario, _employer, _asset, _target, party) => { party.renown = before; });
    game.step();
    expect(game.view().parties[0]!.renown).toBe(after);
  });

  it('a broken Lair records the hour it fell and enters the chronicle', () => {
    const game = homecoming('assault', true);
    game.step();
    expect(hidden(game).lairs[0]!.clearedAt).toBe(101);
    expect(game.view().lairs[0]).toMatchObject({ status: 'cleared', bountyPosted: false });
    expect(game.view().stats.lairsCleared).toBe(1);
    expect(game.view().chronicle.some((event) => event.kind === 'reward' && event.text.includes(game.view().lairs[0]!.name))).toBe(true);
  });

  it('breaking a Lair withdraws every open Contract from it and frees those Holdings', () => {
    const game = homecoming('assault', true, (scenario, _guild, _asset, target, _party, _quest, rng) => {
      const employer = scenario.town.employers[1]!;
      for (const status of ['threatened', 'ravaged'] as const) {
        const asset = holding(rng, employer, status);
        const quest = contract(employer, asset, status, { lairId: target.id });
        asset.status = status;
        scenario.quests.push(quest);
      }
    });
    game.step();
    expect(game.view().board.open).toHaveLength(0);
    expect(hidden(game).quests.map((quest) => quest.status)).toEqual(['done', 'failed', 'failed']);
    expect(employerView(game, 1).assets.map((asset) => asset.status)).toEqual(['safe', 'safe']);
    expect(hidden(game).town.employers[1]!.assets.map((asset) => asset.questId)).toEqual([null, null]);
    expect(employerView(game, 1).questsFailed).toBe(0);
    expect(game.view().stats).toMatchObject({ questsFailed: 0, questsExpired: 0 });
  });

  it('breaking a Lair preserves taken Contracts and open work from another origin', () => {
    const game = homecoming('assault', true, (scenario, _guild, _asset, target, _party, _quest, rng) => {
      const employer = scenario.town.employers[1]!;
      const taken = contract(employer, holding(rng, employer, 'Taken'), 'taken', { status: 'taken', lairId: target.id });
      const other = lair(rng, 'bandits');
      scenario.lairs.push(other);
      const open = contract(employer, holding(rng, employer, 'Other origin'), 'other', { lairId: other.id });
      const party = company(rng);
      Object.assign(party, { status: 'traveling', ticksLeft: 100, questId: taken.id });
      taken.partyId = party.id;
      scenario.parties.push(party);
      scenario.quests.push(taken, open);
    });
    game.step();
    expect(game.view().board.open.filter((quest) => quest.kind === 'contract').map((quest) => quest.id)).toEqual(['other']);
    expect(game.view().board.taken.map((quest) => quest.id)).toEqual(['taken']);
    expect(employerView(game, 1).assets.map((asset) => asset.status)).toEqual(['threatened', 'threatened']);
    expect(hidden(game).town.employers[1]!.assets.map((asset) => asset.questId)).toEqual(['taken', 'other']);
  });
});

describe('failed Bounties', () => {
  it('the guild and company count failure without paying the Bounty or taking spoils', () => {
    const game = homecoming('assault', false, (_scenario, _guild, _asset, target, _party, quest) => {
      target.hoard.items = [item('Unclaimed hoard')];
      quest.itemReward = item('Unpaid Bounty');
    });
    game.step();
    expect(hidden(game).quests[0]!.status).toBe('failed');
    expect(game.view().parties[0]).toMatchObject({ gold: 10, earned: 0, questsDone: 0, questsFailed: 1, stash: [] });
    expect(game.view().town.employers.find((employer) => employer.service === 'guild')).toMatchObject({
      treasury: 1000, reputation: 0, spent: 0, questsCompleted: 0, questsFailed: 1,
    });
    expect(game.view().lairs[0]).toMatchObject({ hoardGold: 100, hoardItems: ['Unclaimed hoard'] });
    expect(game.view().stats).toMatchObject({ questsFailed: 1, questsCompleted: 0, goldPaid: 0, itemsFound: 0, lairsCleared: 0 });
  });

  it.each([
    { before: 2, after: 3 }, { before: 10, after: 10 },
  ])('a failed Bounty changes Lair strength $before to $after', ({ before, after }) => {
    const game = homecoming('assault', false, (_scenario, _guild, _asset, target) => { target.strength = before; });
    game.step();
    expect(game.view().lairs[0]).toMatchObject({ status: 'active', strength: after, raidsWon: 0 });
  });

  it.each([
    { before: 2, after: 1 }, { before: 0, after: 0 },
  ])('a failed Bounty changes company renown from $before to $after', ({ before, after }) => {
    const game = homecoming('assault', false, (_scenario, _guild, _asset, _target, party) => { party.renown = before; });
    game.step();
    expect(game.view().parties[0]!.renown).toBe(after);
  });

  it('a failed Bounty releases the Lair so the guild can post a fresh Bounty', () => {
    const game = homecoming('assault', false);
    game.step();
    expect(game.view().lairs[0]!.bountyPosted).toBe(false);
    expect(hidden(game).lairs[0]!.questId).toBeNull();
    game.step();
    expect(game.view().board.open).toHaveLength(1);
    expect(game.view().board.open[0]).toMatchObject({ kind: 'assault', level: 5 });
    expect(game.view().board.open[0]!.id).not.toBe('homecoming');
    expect(game.view().lairs[0]!.bountyPosted).toBe(true);
    expect(game.view().town.employers.find((employer) => employer.service === 'guild')!.questsPosted).toBe(1);
  });
});

describe('employer ruin', () => {
  it('ruin does not release a Holding reference belonging to different work', () => {
    const game = scene((scenario, rng) => {
      scenario.tick = 23;
      const employer = scenario.town.employers[0]!;
      Object.assign(employer, { treasury: 0, upkeepPerDay: 100 });
      const asset = holding(rng, employer);
      const older = contract(employer, asset, 'older');
      const newer = contract(employer, asset, 'newer', { status: 'taken' });
      scenario.quests = [older, newer];
    }, { world: { ruinDays: 1 } });
    game.step();
    expect(hidden(game).quests.map((quest) => quest.status)).toEqual(['failed', 'taken']);
    expect(hidden(game).town.employers[0]!.assets[0]!.questId).toBe('newer');
  });

  it('guild ruin does not release a Lair reference belonging to a different Bounty', () => {
    const game = scene((scenario, rng) => {
      scenario.tick = 23;
      const guild = serviceOf(scenario.town, 'guild');
      Object.assign(guild, { treasury: 0, upkeepPerDay: 100 });
      const target = lair(rng);
      const older = bounty(guild, target, 'older');
      const newer = bounty(guild, target, 'newer', { status: 'taken' });
      scenario.lairs = [target];
      scenario.quests = [older, newer];
    }, { world: { ruinDays: 1 } });
    game.step();
    expect(hidden(game).quests.map((quest) => quest.status)).toEqual(['failed', 'taken']);
    expect(hidden(game).lairs[0]!.questId).toBe('newer');
    expect(game.view().lairs[0]!.bountyPosted).toBe(true);
  });

  it('ruin keeps accepted work and its Holding reference intact', () => {
    const game = scene((scenario, rng) => {
      scenario.tick = 23;
      const employer = scenario.town.employers[0]!;
      Object.assign(employer, { treasury: 0, upkeepPerDay: 100 });
      const asset = holding(rng, employer);
      const party = company(rng);
      const quest = contract(employer, asset, 'taken', { status: 'taken', partyId: party.id, postedAt: 0 });
      Object.assign(party, { status: 'traveling', ticksLeft: 100, questId: quest.id });
      scenario.parties = [party];
      scenario.quests = [quest];
    }, { world: { ruinDays: 1 } });
    game.step();
    expect(employerView(game).ruined).toBe(true);
    expect(game.view().board.taken.map((quest) => quest.id)).toEqual(['taken']);
    expect(hidden(game).town.employers[0]!.assets[0]!.questId).toBe('taken');
    expect(game.view().stats).toMatchObject({ employersRuined: 1, questsFailed: 0, questsExpired: 0 });
    expect(game.view().chronicle.some((event) => event.kind === 'economy' && event.text.includes(employerView(game).name))).toBe(true);
  });

  it('a ruined employer is counted only once across later days', () => {
    const game = scene((scenario) => {
      scenario.tick = 23;
      const employer = scenario.town.employers[0]!;
      Object.assign(employer, { treasury: 0, upkeepPerDay: 100 });
    }, { world: { ruinDays: 1 } });
    game.step();
    expect(game.view().stats.employersRuined).toBe(1);
    for (let hour = 0; hour < 24; hour++) game.step();
    expect(game.view().stats.employersRuined).toBe(1);
    expect(game.view().chronicle.filter((event) => event.kind === 'economy' && event.text.includes(employerView(game).name))).toHaveLength(1);
  });

  it.each([
    { title: 'Faction', fate: 'The organisation dissolves' },
    { title: 'Merchant', fate: 'Their holdings are sold off' },
  ])('the chronicle records the ruin of a $title: $fate', ({ title, fate }) => {
    const game = scene((scenario) => {
      scenario.tick = 23;
      const employer = scenario.town.employers[0]!;
      Object.assign(employer, { treasury: 0, upkeepPerDay: 100, title });
    }, { world: { ruinDays: 1 } });
    game.step();
    expect(game.view().chronicle.some((event) => event.kind === 'economy' && event.text.includes(fate))).toBe(true);
  });
});

describe('Lair respawn', () => {
  it('a cleared Lair stays quiet until twelve days have passed', () => {
    const game = scene((scenario, rng) => {
      scenario.tick = 287;
      const target = lair(rng);
      Object.assign(target, { status: 'cleared', clearedAt: 1 });
      scenario.lairs = [target];
    });
    game.step();
    expect(game.view().lairs).toHaveLength(1);
    expect(game.view().lairs[0]!.status).toBe('cleared');
    expect(hidden(game).lairs[0]!.clearedAt).toBe(1);
  });

  it('after twelve days a new Lair replaces the threat once and leaves the old ruin recorded', () => {
    const game = scene((scenario, rng) => {
      scenario.tick = 287;
      const target = lair(rng);
      Object.assign(target, { status: 'cleared', clearedAt: 0 });
      scenario.lairs = [target];
    });
    game.step();
    expect(game.view().lairs).toHaveLength(2);
    expect(game.view().lairs.map((target) => target.status)).toEqual(['active', 'cleared']);
    expect(hidden(game).lairs[0]!.clearedAt).toBeNull();
    expect(hidden(game).lairs[1]!.spawnedAt).toBe(288);
    expect(game.view().chronicle.some((event) => event.kind === 'town' && event.text.includes(game.view().lairs[0]!.name))).toBe(true);
    for (let hour = 0; hour < 24; hour++) game.step();
    expect(game.view().lairs).toHaveLength(2);
  });

  it('Lair respawn is checked at day’s end rather than every hour', () => {
    const game = scene((scenario, rng) => {
      scenario.tick = 288;
      const target = lair(rng);
      Object.assign(target, { status: 'cleared', clearedAt: 1 });
      scenario.lairs = [target];
    });
    game.step();
    expect(game.view().lairs).toHaveLength(1);
    for (let hour = 0; hour < 23; hour++) game.step();
    expect(game.view().lairs).toHaveLength(2);
    expect(hidden(game).lairs[1]!.spawnedAt).toBe(312);
  });

  it.each([
    { level: 5, minimum: 6, maximum: 7 }, { level: 19, minimum: 20, maximum: 20 },
    { level: 20, minimum: 20, maximum: 20 },
  ])('a respawned level-$level Lair is stronger, up to level twenty', ({ level, minimum, maximum }) => {
    const levels = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const game = scene((scenario, rng) => {
        scenario.tick = 287;
        const target = lair(rng, 'goblins', level);
        Object.assign(target, { status: 'cleared', clearedAt: 0 });
        scenario.lairs = [target];
      }, { seed });
      game.step();
      const spawned = game.view().lairs[0]!;
      expect(spawned.level).toBeGreaterThanOrEqual(minimum);
      expect(spawned.level).toBeLessThanOrEqual(maximum);
      expect(spawned).toMatchObject({ strength: 1, raids: 0, raidsWon: 0, bountyPosted: false });
      levels.add(spawned.level);
    }
    expect(levels.has(minimum)).toBe(true);
    expect(levels.has(maximum)).toBe(true);
  });

  it('a cleared Lair without a fall date does not respawn', () => {
    const game = scene((scenario, rng) => {
      scenario.tick = 287;
      const target = lair(rng);
      Object.assign(target, { status: 'cleared', clearedAt: null });
      scenario.lairs = [target];
    });
    game.step();
    expect(game.view().lairs).toHaveLength(1);
  });

  it('a new Lair may keep the fallen threat’s theme or bring another standing threat', () => {
    const themes = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const game = scene((scenario, rng) => {
        scenario.tick = 287;
        const target = lair(rng);
        Object.assign(target, { status: 'cleared', clearedAt: 0 });
        scenario.lairs = [target];
      }, { seed });
      game.step();
      const theme = hidden(game).lairs[1]!.theme;
      expect(['bandits', 'goblins', 'undead', 'cultists', 'giants', 'dragons', 'fiends', 'sea', 'fey', 'monstrosities']).toContain(theme);
      themes.add(theme);
    }
    expect(themes.has('goblins')).toBe(true);
    expect(themes.size).toBeGreaterThan(1);
  });
});
