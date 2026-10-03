import { describe, expect, it } from 'vitest';
import { DEFAULT_COMPANY_ROSTER_CONFIG } from '../src/adventurers/company-roster';
import { createHero } from '../src/adventurers/hero';
import { createParty, type Party } from '../src/adventurers/party';
import { Rng } from '../src/core/rng';
import type { EncounterSpec } from '../src/quests/encounters';
import { DEFAULT_JOB_INTEL_CONFIG } from '../src/quests/job-intel';
import { openCoin } from '../src/town/coin';
import { difficultyCode, isFullyKnown, type Quest } from '../src/quests/quest';
import { Board, DEFAULT_BOARD_CONFIG } from '../src/sim/board';
import { advanceExpedition, type ExpeditionContext, type ExpeditionEvent } from '../src/sim/expedition';
import { Game, mergeConfig, type DeepPartial, type GameConfig, type GameScenario } from '../src/sim/game';
import { createAsset } from '../src/town/assets';
import { createLair } from '../src/town/lairs';
import { generateTown, serviceOf, type ServiceKind } from '../src/town/town';
import { expeditionRules } from './helpers/expedition-rules';
import { STARTING_GOLD } from './helpers/supplied-config';
import { DEFAULT_LAIR_CONFIG } from '../src/town/lairs';
import { DEFAULT_TOWN_CONFIG } from '../src/town/town';
import { DEFAULT_HOLDING_CONFIG } from '../src/town/assets';

const encounters: EncounterSpec[] = [
  { difficulty: 'easy', monsters: [{ name: 'Goblin Warrior', count: 1, xpEach: 50 }], totalXp: 50, tier: 'Low' },
  { difficulty: 'intermediate', monsters: [{ name: 'Wolf', count: 2, xpEach: 50 }], totalXp: 100, tier: 'Low' },
  { difficulty: 'hard', monsters: [{ name: 'Ogre', count: 1, xpEach: 450 }], totalXp: 450, tier: 'High' },
];

function knowledgeOf(work: Quest) {
  const handle = new Board(DEFAULT_BOARD_CONFIG);
  handle.replaceForScenario([work]);
  return handle.knowledge(work);
}

function job(overrides: Partial<Quest> = {}): Quest {
  return {
    id: 'tower', kind: 'contract', title: 'Recover the tower', place: 'Old Tower', giverId: 'client',
    assetId: null, lairId: null, theme: 'goblins', level: 1,
    encounters: structuredClone(encounters), revealed: 1, countRevealed: false,
    reward: 100, itemReward: null, guildOnly: false, status: 'open', partyId: null, postedAt: 0,
    ...overrides,
  };
}

function company(rng: Rng, level = 1, gold = 300, name = 'Lanterns'): Party {
  const result = createParty(rng, level, 4, 0, STARTING_GOLD);
  result.name = name;
  result.members = Array.from({ length: 4 }, (_, index) => {
    const hero = createHero(rng, level, 'Fighter');
    hero.name = `${name} fighter ${index + 1}`;
    hero.armorTier = 3;
    return hero;
  });
  Object.assign(result, { gold, potions: 4, blessed: true, guildMember: true, duesPaidDay: 1 });
  return result;
}

// Only scenario setup mutates Game state. Provisioning leaves the idle hour
// available for job intelligence, with no arrivals, raids or unrelated work.
function scene(configure: (scenario: GameScenario, rng: Rng) => void = () => {}, config: DeepPartial<GameConfig> = {}): Game {
  return Game.forTesting(mergeConfig({ seed: 31, roster: { maxCompanies: 0 }, world: { maxOpenQuests: 0 } }, config) as DeepPartial<GameConfig>, (scenario) => {
    scenario.parties = [];
    scenario.quests = [];
    scenario.lairs = [];
    scenario.events = [];
    scenario.chronicle = [];
    for (const employer of scenario.town.employers) {
      Object.assign(employer, { assets: [], treasury: 1000, earned: 0, spent: 0, stock: [],
        cooldown: 10_000, restockIn: 10_000, upkeepPerDay: 0 });
    }
    const rng = new Rng(71);
    const p = company(rng);
    scenario.parties = [p];
    scenario.quests = [job({ giverId: scenario.town.employers[0]!.id })];
    configure(scenario, rng);
  });
}

function workView(game: Game, id = 'tower') {
  const view = game.view().board;
  const work = [...view.open, ...view.taken].find((work) => work.id === id);
  expect(work, `job ${id} on the Board`).toBeDefined();
  return work!;
}

function serviceView(game: Game, service: ServiceKind) {
  return game.view().town.employers.find((employer) => employer.service === service)!;
}

function hour(game: Game) {
  const before = game.view().events.length;
  game.step();
  return game.view().events.slice(before);
}

function knowledge(game: Game, id = 'tower') {
  const work = workView(game, id);
  return { count: work.encounterCountKnown, encounters: work.encounters.map((encounter) => encounter.description) };
}

function isFullyKnownFromView(game: Game) {
  const known = knowledge(game);
  return known.count && known.encounters.every((encounter) => encounter !== null);
}

function knownFacts(game: Game, id = 'tower') {
  const known = knowledge(game, id);
  return Number(known.count) + known.encounters.filter((encounter) => encounter !== null).length;
}

function longJob(overrides: Partial<Quest> = {}): Quest {
  return job({ encounters: structuredClone([...encounters, ...encounters]), ...overrides });
}

function road(work = job(), skillDc = DEFAULT_JOB_INTEL_CONFIG.skillDc, seed = 1) {
  const rng = new Rng(71);
  const p = company(rng);
  Object.assign(p, { status: 'traveling', questId: work.id, ticksLeft: 4 });
  Object.assign(work, { status: 'taken', partyId: p.id });
  const board = new Board(DEFAULT_BOARD_CONFIG);
  board.replaceForScenario([work]);
  const events: ExpeditionEvent[] = [];
  const context: ExpeditionContext = {
    quest: board.byId(work.id), town: generateTown(rng, DEFAULT_TOWN_CONFIG, DEFAULT_HOLDING_CONFIG), rng: new Rng(seed),
    ledger: { heroesDied: 0, partiesWiped: 0 }, coin: openCoin({ goldPaid: 0, goldSpentByHeroes: 0 }),
    ...expeditionRules({ travelTicks: 4, skillDc }),
    combat: () => { throw new Error('Travel does not fight'); },
    disband: () => { throw new Error('Travel does not disband'); },
    settleQuest: () => { throw new Error('Travel does not settle work'); },
    leaveLoot: () => { throw new Error('Travel does not leave loot'); },
    knowledge: (work) => board.knowledge(work),
    report: (event) => { events.push(event); },
  };
  return { p, board, context, events };
}

describe('intelligence on newly posted work', () => {
  // Mutation: publish every Contract encounter on posting.
  it('posts a Contract with only its first encounter public and its count unknown', () => {
    const game = scene((scenario, rng) => {
      scenario.parties = [];
      scenario.quests = [];
      const employer = scenario.town.employers[0]!;
      employer.cooldown = 0;
      employer.assets.push(createAsset(rng, 'watchtower', employer.id, DEFAULT_HOLDING_CONFIG));
    }, { world: { maxOpenQuests: 1 } });

    game.step();

    const work = game.view().board.open[0]!;
    expect(work.kind).toBe('contract');
    expect(work.encounters.length).toBeGreaterThan(1);
    expect(work.encounterCountKnown).toBe(false);
    expect(work.encounters[0]!.description).not.toBeNull();
    expect(work.encounters[0]!.difficulty).not.toBeNull();
    expect(work.encounters.slice(1).every((encounter) => encounter.description === null && encounter.difficulty === null)).toBe(true);
    expect(work.difficultyCode).toMatch(/^[EIH]\/…$/);
  });

  it('posts a Bounty with its count public but only its first encounter described', () => {
    const game = scene((scenario, rng) => {
      scenario.quests = [];
      const lair = createLair(rng, 'goblins', 1, 0, DEFAULT_COMPANY_ROSTER_CONFIG.companySize, DEFAULT_LAIR_CONFIG);
      lair.raidCooldown = 10_000;
      scenario.lairs = [lair];
      scenario.parties[0]!.status = 'resting';
      scenario.parties[0]!.ticksLeft = 10;
    });

    game.step();

    const work = game.view().board.open[0]!;
    expect(work.kind).toBe('assault');
    expect(work.encounters.length).toBeGreaterThanOrEqual(3);
    expect(work.encounterCountKnown).toBe(true);
    expect(work.encounters[0]!.description).not.toBeNull();
    expect(work.encounters[0]!.difficulty).not.toBeNull();
    expect(work.encounters.slice(1).every((encounter) => encounter.description === null && encounter.difficulty === null)).toBe(true);
  });
});

describe('learning the next fact about a job', () => {
  // Mutation: reveal an encounter before revealing an unknown count.
  it('learns the three-fight count before another encounter and reports its wording', () => {
    const work = job();

    expect(knowledgeOf(work).learnNext()).toBe('it means 3 fights');

    expect(work.countRevealed).toBe(true);
    expect(work.revealed).toBe(1);
    expect(difficultyCode(work)).toBe('E/?/?');
  });

  it.each([
    { known: 1, after: 2, wording: 'the next fight will be 2x Wolf (intermediate)', code: 'E/I/?' },
    { known: 2, after: 3, wording: 'the next fight will be Ogre (hard)', code: 'E/I/H' },
  ])('learns encounter after $known known encounter(s) and reports its wording', ({ known, after, wording, code }) => {
    const work = job({ countRevealed: true, revealed: known });

    expect(knowledgeOf(work).learnNext()).toBe(wording);

    expect(work.revealed).toBe(after);
    expect(difficultyCode(work)).toBe(code);
  });

  it('has no next fact once all three encounters and their count are known', () => {
    const work = job({ countRevealed: true, revealed: 3 });

    const knowledge = knowledgeOf(work);
    expect(() => knowledge.learnNext()).toThrow(/already fully known/);
    expect(() => knowledge.learnNext()).toThrow(/already fully known/);

    expect(work.revealed).toBe(3);
    expect(work.countRevealed).toBe(true);
    expect(isFullyKnown(work)).toBe(true);
  });

  it.each([
    { countRevealed: false, revealed: 3, known: false },
    { countRevealed: true, revealed: 2, known: false },
    { countRevealed: true, revealed: 3, known: true },
  ])('recognises complete intelligence with count=$countRevealed and $revealed encounters', ({ countRevealed, revealed, known }) => {
    expect(isFullyKnown(job({ countRevealed, revealed }))).toBe(known);
  });

  it.each(['contract', 'assault'])('can reveal every fact about a %s at once', (kind) => {
    const work = job({ kind });

    knowledgeOf(work).revealAll();

    expect(work.countRevealed).toBe(true);
    expect(work.revealed).toBe(3);
    expect(isFullyKnown(work)).toBe(true);
    expect(difficultyCode(work)).toBe('E/I/H');
  });

  it.each([
    {
      kind: 'contract', countRevealed: false,
      reports: ['it means 3 fights', 'the next fight will be 2x Wolf (intermediate)', 'the next fight will be Ogre (hard)'],
    },
    {
      kind: 'assault', countRevealed: true,
      reports: ['the next fight will be 2x Wolf (intermediate)', 'the next fight will be Ogre (hard)'],
    },
  ])('learns the remaining $kind facts in order through the Board', ({ kind, countRevealed, reports }) => {
    const board = new Board(DEFAULT_BOARD_CONFIG);
    board.replaceForScenario([job({ kind, countRevealed })]);
    const work = board.byId('tower')!;
    const learned = reports.map(() => board.knowledge(work).learnNext());

    expect(learned).toEqual(reports);

    expect(isFullyKnown(board.byId('tower')!)).toBe(true);
    expect(difficultyCode(board.byId('tower')!)).toBe('E/I/H');
  });
});

describe('the free tavern attempt', () => {
  // Mutation: charge for a round before allowing the free Persuasion attempt.
  it('uses the best living talker, the bard, with advantage against DC 15', () => {
    const game = scene((scenario, rng) => {
      const p = scenario.parties[0]!;
      p.members[1] = createHero(rng, 1, 'Bard');
      p.members[1].name = 'Mira';
      p.members[1].armorTier = 3;
      p.members[2] = createHero(rng, 20, 'Bard');
      p.members[2].name = 'Fallen talker';
      p.members[2].alive = false;
      p.members[2].hp = 0;
      // No resurrection purchase; three members are enough in this scenario.
      serviceOf(scenario.town, 'temple').ruined = true;
    }, { roster: { companySize: 3 } });

    const events = hour(game);

    expect(events).toHaveLength(1);
    expect(events[0]!.text).toMatch(/^Mira .*\(Persuasion \d+\+5 = \d+, with advantage vs DC 15\)/);
  });

  // This company on these seeds: Persuasion 16-1 = 15, and 15-1 = 14. The tavern's difficulty is 15.
  it.each([
    { seed: 21, total: 15, learned: true },
    { seed: 9, total: 14, learned: false },
  ])('a free attempt totalling $total learns the count=$learned', ({ seed, learned }) => {
    const game = scene(() => {}, { seed });

    const events = hour(game);

    expect(events).toHaveLength(1);
    expect(knowledge(game)).toEqual({ count: learned, encounters: ['Goblin Warrior', null, null] });
    expect(game.view().parties[0]).toMatchObject({ gold: 300, spent: 0, statusText: 'looking at the board' });
    expect(game.view().board.taken).toHaveLength(0);
  });

  it.each(['success', 'failure'])('a free attempt on %s learns exactly the appropriate facts', (outcome) => {
    let observed = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const game = scene(() => {}, { seed });
      const events = hour(game);
      expect(events).toHaveLength(1);
      const learned = knowledge(game);
      const success = learned.count;
      if (success !== (outcome === 'success')) continue;
      observed++;
      expect(learned).toEqual({ count: success, encounters: ['Goblin Warrior', null, null] });
      expect(game.view().parties[0]).toMatchObject({ gold: 300, spent: 0, statusText: 'looking at the board' });
      expect(game.view().board.taken).toHaveLength(0);
    }
    expect(observed).toBeGreaterThan(0);
  });

  it('a successful free attempt learns one encounter when the count is already known', () => {
    const outcomes = new Set<boolean>();
    for (let seed = 1; seed <= 40; seed++) {
      const game = scene((scenario) => { scenario.quests[0]!.countRevealed = true; }, { seed });

      const events = hour(game);

      expect(events).toHaveLength(1);
      const known = knowledge(game);
      const success = known.encounters[1] === '2x Wolf';
      expect(known).toEqual({ count: true, encounters: ['Goblin Warrior', success ? '2x Wolf' : null, null] });
      expect(game.view().parties[0]).toMatchObject({ gold: 300, spent: 0, statusText: 'looking at the board' });
      expect(game.view().board.taken).toHaveLength(0);
      outcomes.add(success);
    }
    expect(outcomes).toEqual(new Set([false, true]));
  });

  it('uses up the free attempt whether it succeeds or fails', () => {
    const outcomes = new Set<boolean>();
    for (let seed = 1; seed <= 40; seed++) {
      const game = scene((scenario) => { scenario.parties[0]!.gold = 0; }, { seed });
      const free = hour(game);
      expect(free).toHaveLength(1);
      outcomes.add(knowledge(game).count);
      const before = knowledge(game);

      hour(game);

      expect(knowledge(game)).toEqual(before);
      expect(game.view().board.taken.map((work) => work.id)).toEqual(['tower']);
      expect(game.view().parties[0]).toMatchObject({ gold: 0, spent: 0 });
    }
    expect(outcomes).toEqual(new Set([false, true]));
  });

  it('spends the free-attempt hour before an affordable divination', () => {
    const game = scene((scenario) => { scenario.parties[0]!.gold = 1000; });

    const events = hour(game);

    expect(events).toHaveLength(1);
    expect(game.view().parties[0]).toMatchObject({ gold: 1000, spent: 0 });
    expect(serviceView(game, 'temple').treasury).toBe(1000);
    expect(serviceView(game, 'tavern').treasury).toBe(1000);
    expect(game.view().board.taken).toHaveLength(0);
  });

  it('takes fully known work without a free attempt or payment', () => {
    const game = scene((scenario) => {
      scenario.parties[0]!.gold = 1000;
      knowledgeOf(scenario.quests[0]!).revealAll();
    });

    const events = hour(game);

    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe('quest');
    expect(game.view().board.taken.map((work) => work.id)).toEqual(['tower']);
    expect(game.view().parties[0]).toMatchObject({ gold: 1000, spent: 0 });
  });
});

describe('temple divination', () => {
  // Mutation: allow divination while leaving less than two resurrection reserves.
  it.each([
    { level: 3, gold: 1200, divined: true, left: 1020, temple: 1180, tavern: 1000 },
    { level: 3, gold: 1199, divined: false, left: 1154, temple: 1000, tavern: 1045 },
    { level: 2, gold: 740, divined: true, left: 620, temple: 1120, tavern: 1000 },
    { level: 2, gold: 739, divined: false, left: 709, temple: 1000, tavern: 1030 },
  ])('a level-$level company with $gold gp can buy divination=$divined', ({ level, gold, divined, left, temple, tavern }) => {
    const game = scene((scenario, rng) => {
      scenario.parties = [company(rng, level, gold)];
      scenario.quests[0]!.level = level;
    });
    hour(game); // The company's free attempt always comes first.
    const before = knownFacts(game);

    const events = hour(game);

    expect(events).toHaveLength(1);
    expect(game.view().parties[0]!.gold).toBe(left);
    expect(serviceView(game, 'temple').treasury).toBe(temple);
    expect(serviceView(game, 'tavern').treasury).toBe(tavern);
    expect(game.view().board.taken).toHaveLength(0);
    if (divined) {
      expect(knowledge(game)).toEqual({ count: true, encounters: ['Goblin Warrior', '2x Wolf', 'Ogre'] });
    } else {
      expect(knownFacts(game) - before).toBe(1);
      expect(isFullyKnownFromView(game)).toBe(false);
    }
  });

  it('a ruined temple offers no divination even to a rich company', () => {
    const game = scene((scenario, rng) => {
      scenario.parties = [company(rng, 3, 2000)];
      scenario.quests[0]!.level = 3;
      serviceOf(scenario.town, 'temple').ruined = true;
    });
    hour(game);
    const before = knownFacts(game);

    const events = hour(game);

    expect(events).toHaveLength(1);
    expect(game.view().parties[0]!.gold).toBe(1955);
    expect(serviceView(game, 'temple').treasury).toBe(1000);
    expect(serviceView(game, 'tavern').treasury).toBe(1045);
    expect(knownFacts(game) - before).toBe(1);
    expect(isFullyKnownFromView(game)).toBe(false);
    expect(game.view().board.taken).toHaveLength(0);
  });

  it('prices divination for the company level rather than its strongest adventurer', () => {
    const game = scene((scenario, rng) => {
      const p = company(rng, 3, 1200);
      p.members.forEach((hero, index) => { hero.level = index < 2 ? 2 : 4; });
      scenario.parties = [p];
      scenario.quests[0]!.level = 3;
    });
    hour(game);

    const events = hour(game);

    expect(game.view().parties[0]!.level).toBe(3);
    expect(events).toHaveLength(1);
    expect(game.view().parties[0]!.gold).toBe(1020);
    expect(serviceView(game, 'temple').treasury).toBe(1180);
    expect(serviceView(game, 'tavern').treasury).toBe(1000);
    expect(knowledge(game)).toEqual({ count: true, encounters: ['Goblin Warrior', '2x Wolf', 'Ogre'] });
    expect(game.view().board.taken).toHaveLength(0);
  });

  it('takes the job in the hour after divination, without buying a round', () => {
    const game = scene((scenario) => { scenario.parties[0]!.gold = 1000; });
    const free = hour(game);

    expect(free).toHaveLength(1);
    expect(game.view().parties[0]).toMatchObject({ gold: 1000, spent: 0 });
    expect(serviceView(game, 'temple').treasury).toBe(1000);
    expect(serviceView(game, 'tavern').treasury).toBe(1000);
    expect(game.view().board.taken).toHaveLength(0);

    const divined = hour(game);

    expect(divined).toHaveLength(1);
    expect(game.view().parties[0]).toMatchObject({ gold: 940, spent: 60 });
    expect(serviceView(game, 'temple').treasury).toBe(1060);
    expect(isFullyKnownFromView(game)).toBe(true);
    expect(game.view().board.taken).toHaveLength(0);
    expect(serviceView(game, 'tavern').treasury).toBe(1000);

    const events = hour(game);

    expect(events).toHaveLength(1);
    expect(game.view().board.taken.map((work) => work.id)).toEqual(['tower']);
    expect(game.view().parties[0]).toMatchObject({ gold: 940, spent: 60 });
    expect(serviceView(game, 'tavern').treasury).toBe(1000);
  });
});

describe('paid tavern rounds', () => {
  // Mutation: allow a third paid round for the same company and job.
  it.each([
    { level: 3, gold: 555, bought: true, left: 510, tavern: 1045 },
    { level: 3, gold: 554, bought: false, left: 554, tavern: 1000 },
    { level: 2, gold: 340, bought: true, left: 310, tavern: 1030 },
    { level: 2, gold: 339, bought: false, left: 339, tavern: 1000 },
  ])('a level-$level company with $gold gp buys a round=$bought only when the price still leaves the resurrection reserve', ({ level, gold, bought, left, tavern }) => {
    const game = scene((scenario, rng) => {
      scenario.parties = [company(rng, level, gold)];
      scenario.quests[0]!.level = level;
    });
    hour(game);
    const before = knowledge(game);

    const events = hour(game);

    expect(events).toHaveLength(1);
    expect(game.view().parties[0]!.gold).toBe(left);
    expect(serviceView(game, 'tavern').treasury).toBe(tavern);
    expect(serviceView(game, 'temple').treasury).toBe(1000);
    if (bought) {
      const beforeFacts = Number(before.count) + before.encounters.filter((encounter) => encounter !== null).length;
      expect(knownFacts(game) - beforeFacts).toBe(1);
      expect(game.view().board.taken).toHaveLength(0);
    } else {
      expect(knowledge(game)).toEqual(before);
      expect(game.view().board.taken.map((work) => work.id)).toEqual(['tower']);
    }
  });

  it('buys exactly two rounds after one free attempt, then takes the still-unknown job', () => {
    const game = scene((scenario) => {
      scenario.quests = [longJob({ giverId: scenario.town.employers[0]!.id })];
    });
    const free = hour(game);
    expect(free).toHaveLength(1);
    expect(game.view().parties[0]).toMatchObject({ gold: 300, spent: 0 });
    expect(serviceView(game, 'tavern').treasury).toBe(1000);
    expect(game.view().board.taken).toHaveLength(0);
    for (const [gold, tavern] of [[285, 1015], [270, 1030]] as const) {
      const before = knownFacts(game);
      const events = hour(game);
      expect(events).toHaveLength(1);
      expect(knownFacts(game) - before).toBe(1);
      expect(game.view().parties[0]!.gold).toBe(gold);
      expect(serviceView(game, 'tavern').treasury).toBe(tavern);
      expect(game.view().board.taken).toHaveLength(0);
    }
    expect(isFullyKnownFromView(game)).toBe(false);

    const taking = hour(game);

    expect(taking).toHaveLength(1);
    expect(game.view().parties[0]!.gold).toBe(270);
    expect(serviceView(game, 'tavern').treasury).toBe(1030);
    expect(game.view().board.taken.map((work) => work.id)).toEqual(['tower']);
  });

  it.each([
    { gold: 300, divined: false, left: 300, spent: 0, temple: 1000 },
    { gold: 1000, divined: true, left: 940, spent: 60, temple: 1060 },
  ])('a ruined tavern with $gold gp offers no talk or round; divination=$divined', ({ gold, divined, left, spent, temple }) => {
    const game = scene((scenario) => {
      scenario.parties[0]!.gold = gold;
      serviceOf(scenario.town, 'tavern').ruined = true;
    });
    const before = knowledge(game);

    const events = hour(game);

    expect(events).toHaveLength(1);
    expect(game.view().parties[0]).toMatchObject({ gold: left, spent });
    expect(serviceView(game, 'tavern').treasury).toBe(1000);
    expect(serviceView(game, 'temple').treasury).toBe(temple);
    if (divined) {
      expect(knowledge(game)).toEqual({ count: true, encounters: ['Goblin Warrior', '2x Wolf', 'Ogre'] });
      expect(game.view().board.taken).toHaveLength(0);
    } else {
      expect(knowledge(game)).toEqual(before);
      expect(game.view().board.taken.map((work) => work.id)).toEqual(['tower']);
    }
  });
});

describe('reading the road with a ranger', () => {
  // Mutation: use Persuasion instead of Survival while travelling.
  it.each(['contract', 'assault'])('the ranger reads the %s road with advantage and reports success or failure', (kind) => {
    const outcomes = new Set<boolean>();
    for (let seed = 1; seed <= 40; seed++) {
      const { p, board, context, events } = road(job({ kind, countRevealed: kind === 'assault' }), 15, seed);
      p.members[1] = createHero(new Rng(9), 1, 'Ranger');
      p.members[1].name = 'Rowan';

      advanceExpedition(p, context);

      expect(events).toHaveLength(1);
      expect(events[0]!.text).toMatch(/Rowan .*\(Survival \d+\+4 = \d+, with advantage vs DC 15\)/);
      const hidden = kind === 'assault' ? 'E/?/?' : 'E/…';
      const opened = kind === 'assault' ? 'E/I/?' : 'E/?/?';
      const success = difficultyCode(board.byId('tower')!) === opened;
      const learned = kind === 'assault' ? ': the next fight will be 2x Wolf (intermediate).' : ': it means 3 fights.';
      expect(events[0]!.text).toContain(success ? learned : 'and learns nothing.');
      expect(difficultyCode(board.byId('tower')!)).toBe(success ? opened : hidden);
      expect(p.status).toBe('traveling');
      expect(p.ticksLeft).toBe(3);
      outcomes.add(success);
    }
    expect(outcomes).toEqual(new Set([false, true]));
  });

  // Seed 1 with this company: Survival 13+3 = 16.
  it('reads the road at a difficulty of 16 and learns nothing at 17', () => {
    for (const [difficulty, code] of [[16, 'E/?/?'], [17, 'E/…']] as const) {
      const { p, board, context, events } = road(job(), difficulty, 1);
      advanceExpedition(p, context);

      expect(events).toHaveLength(1);
      expect(difficultyCode(board.byId('tower')!)).toBe(code);
      expect(p).toMatchObject({ status: 'traveling', ticksLeft: 3 });
    }
  });

  it('does not read the same road again on the next hour', () => {
    const { p, board, context, events } = road(job(), 100);
    advanceExpedition(p, context);
    const first = events.map((event) => event.text);

    advanceExpedition(p, context);

    expect(first).toHaveLength(1);
    expect(events.map((event) => event.text)).toEqual(first);
    expect(difficultyCode(board.byId('tower')!)).toBe('E/…');
    expect(p).toMatchObject({ status: 'traveling', ticksLeft: 2 });
  });

  it('does not read the road when the job is already fully known', () => {
    const work = job();
    knowledgeOf(work).revealAll();
    const { p, context, events } = road(work);

    advanceExpedition(p, context);

    expect(events).toEqual([]);
    expect(p).toMatchObject({ status: 'traveling', ticksLeft: 3 });
  });
});

describe('intelligence on arrival', () => {
  // Mutation: decide surprise before the final road check rather than after it.
  it.each(['contract', 'assault'])('reports the unexpected %s fights and reveals their complete composition', (kind) => {
    const { p, board, context, events } = road(job({ kind, countRevealed: kind === 'assault' }), 100);
    p.ticksLeft = 1;

    advanceExpedition(p, context);

    expect(events.at(-1)).toEqual({ kind: 'party', text: 'Lanterns reach Old Tower and take stock: 3 fights ahead [E/I/H].' });
    expect(isFullyKnown(board.byId('tower')!)).toBe(true);
    expect(difficultyCode(board.byId('tower')!)).toBe('E/I/H');
    expect(p.status).toBe('questing');
  });

  it('reports a familiar destination without a surprise inventory', () => {
    const work = job();
    knowledgeOf(work).revealAll();
    const { p, context, events } = road(work);
    p.ticksLeft = 1;

    advanceExpedition(p, context);

    expect(events).toEqual([{ kind: 'party', text: 'Lanterns reach Old Tower.' }]);
  });

  it('has no surprise if the final road check reveals the last unknown encounter', () => {
    const { p, context, events } = road(job({ countRevealed: true, revealed: 2 }), 0);
    p.ticksLeft = 1;

    advanceExpedition(p, context);

    expect(events).toHaveLength(2);
    expect(events[0]!.text).toContain('the next fight will be Ogre (hard).');
    expect(events[1]).toEqual({ kind: 'party', text: 'Lanterns reach Old Tower.' });
  });
});

describe('separate companies and jobs', () => {
  // Mutation: keep a single tavern-attempt/round allowance on the job.
  it('allows each company its own free attempt and two paid rounds on the same job', () => {
    const game = scene((scenario, rng) => {
      scenario.parties.push(company(rng, 1, 300, 'Foxes'));
      // Nine fights cannot be finished by two companies' free attempts and two rounds each.
      scenario.quests = [job({
        giverId: scenario.town.employers[0]!.id,
        encounters: structuredClone([...encounters, ...encounters, ...encounters]),
      })];
    });

    const free = hour(game);

    expect(free).toHaveLength(2);
    expect(game.view().parties.map((company) => company.gold)).toEqual([300, 300]);
    expect(serviceView(game, 'tavern').treasury).toBe(1000);
    expect(game.view().board.taken).toHaveLength(0);
    for (const [gold, tavern] of [[285, 1030], [270, 1060]] as const) {
      const before = knownFacts(game);
      const events = hour(game);
      expect(events).toHaveLength(2);
      expect(knownFacts(game) - before).toBe(2);
      expect(game.view().parties.map((company) => company.gold)).toEqual([gold, gold]);
      expect(serviceView(game, 'tavern').treasury).toBe(tavern);
      expect(game.view().board.taken).toHaveLength(0);
    }
    expect(isFullyKnownFromView(game)).toBe(false);

    const taking = hour(game);

    expect(taking).toHaveLength(1);
    expect(game.view().parties.map((company) => company.gold)).toEqual([270, 270]);
    expect(serviceView(game, 'tavern').treasury).toBe(1060);
    expect(game.view().board.taken.map((work) => work.id)).toEqual(['tower']);
  });

  it('allows fresh tavern attempts and two fresh rounds when the company considers another job', () => {
    const game = scene((scenario, rng) => {
      const employer = scenario.town.employers[0]!;
      const holding = createAsset(rng, 'watchtower', employer.id, DEFAULT_HOLDING_CONFIG);
      holding.status = 'threatened';
      holding.questId = 'tower';
      employer.assets.push(holding);
      // The preferred old Contract expires after its second paid round.
      scenario.quests = [
        longJob({ giverId: employer.id, assetId: holding.id, reward: 200, postedAt: -70 }),
        longJob({ id: 'bridge', title: 'Recover the bridge', giverId: employer.id }),
      ];
      scenario.parties[0]!.gold = 350;
    });
    hour(game);
    hour(game);
    hour(game);
    expect(game.view().board.open.map((work) => work.id)).toEqual(['bridge']);

    const free = hour(game);

    expect(free).toHaveLength(1);
    expect(game.view().parties[0]).toMatchObject({ gold: 320, spent: 30 });
    expect(serviceView(game, 'tavern').treasury).toBe(1030);
    expect(game.view().board.taken).toHaveLength(0);
    for (const [gold, tavern] of [[305, 1045], [290, 1060]] as const) {
      const before = knownFacts(game, 'bridge');
      const events = hour(game);
      expect(events).toHaveLength(1);
      expect(knownFacts(game, 'bridge') - before).toBe(1);
      expect(game.view().parties[0]!.gold).toBe(gold);
      expect(serviceView(game, 'tavern').treasury).toBe(tavern);
      expect(game.view().board.taken).toHaveLength(0);
    }
    const taking = hour(game);
    expect(taking).toHaveLength(1);
    expect(game.view().parties[0]).toMatchObject({ gold: 290, spent: 60 });
    expect(serviceView(game, 'tavern').treasury).toBe(1060);
    expect(game.view().board.taken.map((work) => work.id)).toEqual(['bridge']);
  });

  it('another company can read the same road after the first company failed its check', () => {
    const { p, board, context, events } = road(job(), 100);
    advanceExpedition(p, context);
    expect(difficultyCode(board.byId('tower')!)).toBe('E/…');
    const next = company(new Rng(72), 1, 300, 'Foxes');
    Object.assign(next, { status: 'traveling', questId: 'tower', ticksLeft: 4 });
    context.intel = { ...context.intel, skillDc: 0 };

    advanceExpedition(next, context);

    expect(events).toHaveLength(2);
    expect(difficultyCode(board.byId('tower')!)).toBe('E/?/?');
    advanceExpedition(next, context);
    expect(events).toHaveLength(2);
    expect(difficultyCode(board.byId('tower')!)).toBe('E/?/?');
  });

  it('a company that has read one road can read the road of another job', () => {
    const { p, board, context, events } = road(job(), 100);
    advanceExpedition(p, context);
    const tower = board.recordsForScenario()[0]!;
    const bridge = job({ id: 'bridge', title: 'Recover the bridge', place: 'Stone Bridge' });
    board.replaceForScenario([tower, bridge]);
    Object.assign(p, { questId: bridge.id, ticksLeft: 4 });
    context.quest = board.byId('bridge');
    context.intel = { ...context.intel, skillDc: 0 };

    advanceExpedition(p, context);

    expect(events).toHaveLength(2);
    expect(difficultyCode(tower)).toBe('E/…');
    expect(difficultyCode(board.byId('bridge')!)).toBe('E/?/?');
    expect(p).toMatchObject({ status: 'traveling', ticksLeft: 3 });
  });

  it('the tavern attempt leaves the company a separate road check on that job', () => {
    const game = scene((scenario) => { scenario.parties[0]!.gold = 0; }, { board: { travelTicks: 4 } });
    hour(game);
    hour(game); // No paid option: take the Contract.

    const events = hour(game);

    expect(events).toHaveLength(1);
    expect(game.view().parties[0]!.statusText).toBe('on the road to Old Tower (3h)');
    expect(game.view().board.taken.map((work) => work.id)).toEqual(['tower']);
  });
});
