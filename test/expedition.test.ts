import { CompanyRoster } from '../src/adventurers/company-roster';
import { describe, expect, it, vi } from 'vitest';
import { fixedHp, killHero, resurrectionCost } from '../src/adventurers/hero';
import { aliveMembers, createParty, MAX_RENOWN, partyLevel, type Party } from '../src/adventurers/party';
import type { CombatOutcome } from '../src/combat/battlecast';
import { listNames } from '../src/core/names';
import { Rng } from '../src/core/rng';
import type { EncounterSpec } from '../src/quests/encounters';
import { jobInquiry, jobKnowledge } from '../src/quests/job-intel';
import type { Quest } from '../src/quests/quest';
import { advanceExpedition, type CombatResolver, type ExpeditionContext, type ExpeditionEvent } from '../src/sim/expedition';
import { generateTown, serviceOf } from '../src/town/town';

const encounter: EncounterSpec = {
  difficulty: 'easy',
  monsters: [{ name: 'Goblin Warrior', count: 1, xpEach: 50 }],
  totalXp: 50,
  tier: 'Low',
};

function outcome(party: Party, winner: CombatOutcome['winner'], alive = party.members.map(() => true)): CombatOutcome {
  return {
    winner,
    rounds: 3,
    ambush: null,
    opening: '',
    lines: ['A short fight.'],
    heroes: party.members.map((hero, index) => ({ heroId: hero.id, hp: alive[index] ? hero.maxHp : 0, alive: alive[index]!, kills: 0 })),
    xpEarned: winner === 'party' ? 200 : 0,
    potionsDrunk: 0,
  };
}

function setup(level = 1) {
  const party = createParty(new Rng(1), level, 4, 0);
  party.status = 'questing';
  party.questId = 'q1';
  party.gold = 1000;
  const quest: Quest = {
    id: 'q1', kind: 'contract', title: 'Clear the road', place: 'Stonebridge',
    giverId: 'employer', assetId: null, lairId: null, theme: 'goblins', level: 1,
    encounters: [encounter, encounter], revealed: 1, countRevealed: false,
    reward: 100, itemReward: null, guildOnly: false, status: 'taken', partyId: party.id, postedAt: 0,
  };
  const town = generateTown(new Rng(2));
  const rng = new Rng(99);
  const ledger = { heroesDied: 0, partiesWiped: 0 };
  const statistics = { goldPaid: 0, goldSpentByHeroes: 0 };
  const events: ExpeditionEvent[] = [];
  const calls: string[] = [];
  const combat = vi.fn<CombatResolver>(() => outcome(party, 'party'));
  const settleQuest = vi.fn<ExpeditionContext['settleQuest']>((_quest, _party, success) => { calls.push(`settle:${success}`); });
  const leaveLoot = vi.fn<ExpeditionContext['leaveLoot']>((_quest, _party, fallen) => { calls.push(`loot:${fallen.length}`); });
  const roster = new CompanyRoster();
  roster.replaceForScenario([party]);
  const context: ExpeditionContext = {
    quest, town, rng, ledger, statistics, travelTicks: 2, restTicks: 2, shortRestHealFraction: 0.5, skillDc: 15,
    combat,
    disband: (company) => roster.disband(company),
    report: (event) => { events.push(event); calls.push(`event:${event.kind}`); },
    knowledge: () => jobKnowledge(quest),
    settleQuest,
    leaveLoot,
  };
  return { party, quest, town, rng, ledger, statistics, events, calls, context, combat, settleQuest, leaveLoot };
}

function homecoming(success = true, level = 1) {
  const scenario = setup(level);
  scenario.party.status = 'returning';
  scenario.party.progress = success ? scenario.quest.encounters.length : 1;
  scenario.party.ticksLeft = 1;
  scenario.party.blessed = true;
  return scenario;
}

describe('an expedition hour', () => {
  it('reads the road before arriving and reveals the contract', () => {
    const { party, quest, context, events } = setup();
    party.status = 'traveling';
    party.ticksLeft = 1;

    advanceExpedition(party, context);

    expect(jobInquiry(party, quest.id)?.roadRead).toBe(true);
    expect(party.status).toBe('questing');
    expect(party.progress).toBe(0);
    expect(quest.countRevealed).toBe(true);
    expect(quest.revealed).toBe(quest.encounters.length);
    expect(events.at(-1)?.text).toContain('reach Stonebridge');
  });

  it('uses one world seed per fight, takes a short rest, and returns after clearing the contract', () => {
    const { party, quest, context, events } = setup();
    const expectedRng = new Rng(99);
    const seeds: number[] = [];
    const woundedHp = 1;
    const maxHp = party.members[0]!.maxHp;
    context.combat = (_heroes, _spec, seed) => {
      seeds.push(seed);
      const result = outcome(party, 'party');
      result.heroes[0]!.hp = woundedHp;
      result.heroes[1]!.hp = party.members[1]!.maxHp - 1;
      return result;
    };

    advanceExpedition(party, context);
    expect(party.progress).toBe(1);
    expect(party.status).toBe('questing');
    const healedHp = Math.min(maxHp, woundedHp + Math.ceil(maxHp * 0.5));
    expect(healedHp).toBeLessThan(maxHp);
    expect(party.members[0]!.hp).toBe(healedHp);
    expect(party.members[1]!.hp).toBe(party.members[1]!.maxHp);
    expect(events[0]?.kind).toBe('combat');

    advanceExpedition(party, context);
    expect(party.progress).toBe(quest.encounters.length);
    expect(party.status).toBe('returning');
    expect(party.ticksLeft).toBe(2);
    expect(seeds).toEqual([expectedRng.seed(), expectedRng.seed()]);
  });

  it('leaves all possessions before settlement when the company is wiped out', () => {
    const { party, context, ledger, calls } = setup();
    let deathsAtCombatEvent = -1;
    context.combat = () => outcome(party, 'monsters', party.members.map(() => false));
    context.report = (event) => {
      calls.push(`event:${event.kind}`);
      if (event.kind === 'combat') deathsAtCombatEvent = ledger.heroesDied;
    };

    advanceExpedition(party, context);

    expect(party.status).toBe('disbanded');
    expect(ledger.heroesDied).toBe(party.members.length);
    expect(deathsAtCombatEvent).toBe(party.members.length);
    expect(ledger.partiesWiped).toBe(1);
    expect(calls.slice(-2)).toEqual([`loot:${party.members.length}`, 'settle:false']);
  });

  it.each(['contract', 'assault'] as const)('hands a wiped company’s %s to settlement once and resets progress', (kind) => {
    const { party, quest, context } = setup();
    quest.kind = kind;
    party.progress = 1;
    context.combat = () => outcome(party, 'monsters', party.members.map(() => false));
    const settle = vi.fn<ExpeditionContext['settleQuest']>((work, company, success) => {
      expect(work).toBe(quest);
      expect(company).toBe(party);
      expect(success).toBe(false);
      expect(company.progress).toBe(0);
    });
    context.settleQuest = settle;

    advanceExpedition(party, context);

    expect(settle).toHaveBeenCalledExactlyOnceWith(quest, party, false);
    expect(party).toMatchObject({ status: 'disbanded', progress: 0 });
  });

  it('passes a blessing and the no-retreat rule into the final lair fight', () => {
    const { party, quest, context } = setup();
    quest.kind = 'assault';
    party.progress = 1;
    party.blessed = true;
    let options: Parameters<ExpeditionContext['combat']>[3];
    context.combat = (_heroes, _spec, _seed, received) => {
      options = received;
      return outcome(party, 'party');
    };

    advanceExpedition(party, context);

    expect(options).toEqual({ blessingHp: 3, noRetreat: true, lairDepth: { index: 1, total: 2 }, potions: 0 });
  });

  it('leaves fallen gear on retreat and defers settlement until homecoming', () => {
    const { party, context, ledger, calls } = setup();
    context.combat = () => outcome(party, 'retreat', [true, false, true, true]);

    advanceExpedition(party, context);

    expect(party.status).toBe('returning');
    expect(ledger.heroesDied).toBe(1);
    expect(calls).toContain('loot:1');
    expect(calls.indexOf('event:combat')).toBeLessThan(calls.indexOf('loot:1'));
    expect(calls.some((call) => call.startsWith('settle:'))).toBe(false);
  });

  it('sends survivors home after a defeat with two deaths', () => {
    const { party, context, ledger, calls } = setup();
    context.combat = () => outcome(party, 'monsters', [true, false, true, false]);

    advanceExpedition(party, context);

    expect(party.status).toBe('returning');
    expect(ledger.heroesDied).toBe(2);
    expect(ledger.partiesWiped).toBe(0);
    expect(calls.some((call) => call.startsWith('loot:') || call.startsWith('settle:'))).toBe(false);
  });

  it('abandons an unfinished contract after a costly victory', () => {
    const { party, context, calls } = setup();
    context.combat = () => ({
      ...outcome(party, 'party'),
      heroes: party.members.map((hero) => ({ heroId: hero.id, hp: 1, alive: true, kills: 0 })),
    });

    advanceExpedition(party, context);

    expect(party.progress).toBe(1);
    expect(party.status).toBe('returning');
    expect(party.members.every((hero) => hero.hp === 1)).toBe(true);
    expect(calls.some((call) => call.startsWith('settle:'))).toBe(false);
  });

  it('settles before charging for rooms, then rests back to idle', () => {
    const { party, quest, context, town, statistics, calls, events } = homecoming();
    party.renown = MAX_RENOWN;
    party.members[0]!.hp = 1;
    const tavern = serviceOf(town, 'tavern');
    const startingTreasury = tavern.treasury;
    const startingGold = party.gold;
    const fee = 3 * partyLevel(party) * aliveMembers(party).length;
    context.settleQuest = vi.fn((_quest, company, success) => {
      expect(company.progress).toBe(0);
      calls.push(`settle:${success}`);
    });

    advanceExpedition(party, context);

    expect(context.settleQuest).toHaveBeenCalledExactlyOnceWith(quest, party, true);
    expect(party.progress).toBe(0);
    expect(calls[0]).toBe('settle:true');
    expect(events.some((event) => event.kind === 'shop' && event.text.includes('take rooms'))).toBe(true);
    expect(party.status).toBe('resting');
    expect(statistics.goldSpentByHeroes).toBe(fee);
    expect(party.gold).toBe(startingGold - fee);
    expect(tavern.treasury).toBe(startingTreasury + fee);
    expect(party.blessed).toBe(false);

    context.quest = undefined;
    advanceExpedition(party, context);
    expect(party.status).toBe('resting');
    advanceExpedition(party, context);
    expect(party.status).toBe('idle');
    expect(party.members[0]!.hp).toBe(party.members[0]!.maxHp);
  });
});

describe('scripted combat outcomes', () => {
  it('heads home after a stalemate without leaving loot or settling in the field', () => {
    const { party, context, leaveLoot, settleQuest } = setup();
    context.combat = () => outcome(party, 'stalemate');

    advanceExpedition(party, context);

    expect(party.status).toBe('returning');
    expect(party.ticksLeft).toBe(context.travelTicks);
    expect(party.progress).toBe(0);
    expect(leaveLoot).not.toHaveBeenCalled();
    expect(settleQuest).not.toHaveBeenCalled();
  });

  it.each([1, 2])('retreats after victory with %s of four starting fighters alive at full HP', (survivors) => {
    const { party, context } = setup();
    context.combat = () => outcome(party, 'party', party.members.map((_hero, index) => index < survivors));

    advanceExpedition(party, context);

    expect(aliveMembers(party)).toHaveLength(survivors);
    expect(aliveMembers(party).every((hero) => hero.hp === hero.maxHp)).toBe(true);
    expect(party.progress).toBe(1);
    expect(party.status).toBe('returning');
  });

  it.each([
    { hp: 34, status: 'returning', healedHp: 34 },
    { hp: 35, status: 'questing', healedHp: 85 },
    { hp: 36, status: 'questing', healedHp: 86 },
  ] as const)('at $hp% average HP, ends the victory hour $status', ({ hp, status, healedHp }) => {
    const { party, context } = setup();
    for (const hero of party.members) hero.maxHp = 100;
    context.combat = () => {
      const result = outcome(party, 'party');
      result.xpEarned = 0;
      for (const hero of result.heroes) hero.hp = hp;
      return result;
    };

    advanceExpedition(party, context);

    expect(aliveMembers(party)).toHaveLength(4);
    expect(party.status).toBe(status);
    expect(party.progress).toBe(1);
    expect(party.members.map((hero) => hero.hp)).toEqual([healedHp, healedHp, healedHp, healedHp]);
  });

  it('shares rounded-down XP among survivors and gives the dead none', () => {
    const { party, context } = setup();
    const before = [10, 20, 30, 40];
    party.members.forEach((hero, index) => { hero.xp = before[index]!; });
    context.combat = () => outcome(party, 'party', [true, false, true, true]);

    advanceExpedition(party, context);

    const share = Math.floor(200 / 3);
    expect(party.members.map((hero) => hero.xp)).toEqual([10 + share, 20, 30 + share, 40 + share]);
    expect(party.members[1]!.alive).toBe(false);
  });

  it('reports one company chronicle event when every survivor reaches the same level', () => {
    const { party, context, events } = setup();
    context.combat = () => ({ ...outcome(party, 'party', [true, true, true, false]), xpEarned: 900 });

    advanceExpedition(party, context);

    expect(aliveMembers(party).map((hero) => hero.level)).toEqual([2, 2, 2]);
    expect(events.filter((event) => event.kind === 'levelup')).toEqual([
      { kind: 'levelup', text: `${party.name} reach level 2.`, chronicle: true },
    ]);
  });

  it('names the heroes in the chronicle when only some survivors level up', () => {
    const { party, context, events } = setup();
    party.members[0]!.xp = 250;

    advanceExpedition(party, context);

    expect(party.members.map((hero) => hero.level)).toEqual([2, 1, 1, 1]);
    expect(events.filter((event) => event.kind === 'levelup')).toEqual([
      { kind: 'levelup', text: `${party.members[0]!.name} (2) of ${party.name} level up.`, chronicle: true },
    ]);
  });

  it('names the heroes in the chronicle when all survivors level to different levels', () => {
    const { party, context, events } = setup();
    const senior = party.members[0]!;
    senior.level = 2;
    senior.xp = 850;
    senior.maxHp = fixedHp(senior.heroClass, 2);
    senior.hp = senior.maxHp;
    for (const hero of party.members.slice(1)) hero.xp = 250;

    advanceExpedition(party, context);

    expect(party.members.map((hero) => hero.level)).toEqual([3, 2, 2, 2]);
    const names = listNames(party.members.map((hero) => `${hero.name} (${hero.level})`));
    expect(events.filter((event) => event.kind === 'levelup')).toEqual([
      { kind: 'levelup', text: `${names} of ${party.name} level up.`, chronicle: true },
    ]);
  });

  it.each(['contract', 'assault'] as const)('passes no-retreat false and no blessing into a non-boss %s fight', (kind) => {
    const { party, quest, context } = setup();
    quest.kind = kind;
    party.blessed = false;
    const combat = vi.fn<CombatResolver>(() => outcome(party, 'party'));
    context.combat = combat;

    advanceExpedition(party, context);

    const options = combat.mock.calls[0]![3]!;
    expect(options.noRetreat).toBe(false);
    expect(options).not.toHaveProperty('blessingHp');
    if (kind === 'contract') expect(options).not.toHaveProperty('lairDepth');
    else expect(options.lairDepth).toEqual({ index: 0, total: 2 });
  });
});

describe('expedition potions and short rests', () => {
  it.each(['party', 'monsters', 'retreat', 'stalemate'] as const)('accounts for combat potions after a %s outcome', (winner) => {
    const { party, context } = setup();
    party.potions = 4;
    context.combat = (_heroes, _spec, _seed, options) => {
      expect(options?.potions).toBe(4);
      return { ...outcome(party, winner), potionsDrunk: 2 };
    };

    advanceExpedition(party, context);

    expect(party.potions).toBe(2);
  });

  it.each([
    { potions: 4, hp: [84, 60, 85, 100], left: 2 },
    { potions: 2, hp: [84, 60, 85, 100], left: 0 },
    { potions: 1, hp: [84, 26, 85, 100], left: 0 },
    { potions: 0, hp: [50, 26, 85, 100], left: 0 },
  ])('heals first, then shares $potions potions among heroes still Bloodied', ({ potions, hp, left }) => {
    const { party, context, events } = setup();
    for (const hero of party.members) hero.maxHp = 100;
    party.potions = potions;
    context.shortRestHealFraction = 0.25;
    context.combat = () => {
      const result = outcome(party, 'party');
      result.xpEarned = 0;
      // The first reaches exactly half after resting; the third is above half.
      result.heroes.forEach((hero, i) => { hero.hp = [25, 1, 60, 100][i]!; });
      return result;
    };

    advanceExpedition(party, context);

    expect(party.status).toBe('questing');
    expect(party.members.map((hero) => hero.hp)).toEqual(hp);
    expect(party.potions).toBe(left);
    expect(events.some((event) => event.text.includes('potion'))).toBe(potions > 0);
  });

  it.each([
    { maxHp: 100, before: [1, 50, 99, 100], after: [51, 100, 100, 100] },
    { maxHp: 101, before: [1, 51, 100, 101], after: [52, 101, 101, 101] },
  ])('uses the default half-HP short rest, rounded up and capped at $maxHp', ({ maxHp, before, after }) => {
    const { party, context } = setup();
    for (const hero of party.members) hero.maxHp = maxHp;
    party.potions = 4;
    context.combat = () => {
      const result = outcome(party, 'party');
      result.xpEarned = 0;
      result.heroes.forEach((hero, i) => { hero.hp = before[i]!; });
      return result;
    };

    advanceExpedition(party, context);

    expect(party.status).toBe('questing');
    expect(party.members.map((hero) => hero.hp)).toEqual(after);
    expect(party.potions).toBe(4);
  });

  it('keeps the supply at zero when a scripted resolver reports excessive consumption', () => {
    const { party, context } = setup();
    party.potions = 2;
    context.combat = () => ({ ...outcome(party, 'party'), potionsDrunk: 7 });

    advanceExpedition(party, context);

    expect(party.potions).toBe(0);
  });
});

describe('homecoming', () => {
  it('settles an incomplete contract as failed and does not carouse', () => {
    const { party, quest, context, settleQuest, events, statistics } = homecoming(false);
    const gold = party.gold;
    const fee = 3 * partyLevel(party) * aliveMembers(party).length;

    advanceExpedition(party, context);

    expect(settleQuest).toHaveBeenCalledExactlyOnceWith(quest, party, false);
    expect(party.gold).toBe(gold - fee);
    expect(statistics.goldSpentByHeroes).toBe(fee);
    expect(party.renown).toBe(0);
    expect(events.some((event) => event.text.includes('They drink'))).toBe(false);
    expect(party.blessed).toBe(false);
  });

  it('charges exactly three gold per company level and living member for rooms', () => {
    const { party, context, town, statistics } = homecoming(false, 2);
    killHero(party.members[0]!);
    const tavern = serviceOf(town, 'tavern');
    const gold = party.gold;
    const treasury = tavern.treasury;
    const earned = tavern.earned;
    const fee = 3 * 2 * 3;

    advanceExpedition(party, context);

    expect(partyLevel(party)).toBe(2);
    expect(party.gold).toBe(gold - fee);
    expect(party.spent).toBe(fee);
    expect(tavern.treasury).toBe(treasury + fee);
    expect(tavern.earned).toBe(earned + fee);
    expect(statistics.goldSpentByHeroes).toBe(fee);
    expect(party.blessed).toBe(false);
  });

  it.each(['ruined tavern', 'insufficient gold'])('beds down in the stables with a %s and makes no payment', (reason) => {
    const { party, context, town, statistics, events } = homecoming();
    const tavern = serviceOf(town, 'tavern');
    if (reason === 'ruined tavern') tavern.ruined = true;
    else party.gold = 3 * partyLevel(party) * aliveMembers(party).length - 1;
    const gold = party.gold;
    const treasury = tavern.treasury;

    advanceExpedition(party, context);

    expect(party.gold).toBe(gold);
    expect(party.spent).toBe(0);
    expect(tavern.treasury).toBe(treasury);
    expect(statistics.goldSpentByHeroes).toBe(0);
    expect(events).toContainEqual({ kind: 'party', text: `${party.name} cannot afford rooms and bed down in the stables.` });
    expect(party.status).toBe('resting');
    expect(party.blessed).toBe(false);
  });

  it.each([
    { afterRooms: 200, spree: 10 },
    { afterRooms: 1000, spree: 50 },
  ])('spends $spree gold on carousing from $afterRooms gold after rooms', ({ afterRooms, spree }) => {
    const { party, context, town, statistics, events } = homecoming();
    const tavern = serviceOf(town, 'tavern');
    const treasury = tavern.treasury;
    const fee = 3 * partyLevel(party) * aliveMembers(party).length;
    party.gold = afterRooms + fee;
    party.renown = 3;

    advanceExpedition(party, context);

    expect(party.gold).toBe(afterRooms - spree);
    expect(party.spent).toBe(fee + spree);
    expect(tavern.treasury).toBe(treasury + fee + spree);
    expect(statistics.goldSpentByHeroes).toBe(fee + spree);
    expect(party.renown).toBe(4);
    expect(events.some((event) => event.text.includes(`They drink ${spree} gp away telling the tale (renown 4).`))).toBe(true);
    expect(party.blessed).toBe(false);
  });

  it.each(['dead member', 'maximum renown', 'resurrection reserve'])('does not carouse because of a %s', (reason) => {
    const { party, context, town, statistics, events } = homecoming();
    if (reason === 'dead member') killHero(party.members[0]!);
    if (reason === 'maximum renown') party.renown = MAX_RENOWN;
    const fee = 3 * partyLevel(party) * aliveMembers(party).length;
    if (reason === 'resurrection reserve') party.gold = fee + resurrectionCost(partyLevel(party)) + 9;
    const gold = party.gold;
    const renown = party.renown;
    const tavern = serviceOf(town, 'tavern');
    const treasury = tavern.treasury;

    advanceExpedition(party, context);

    expect(party.gold).toBe(gold - fee);
    expect(statistics.goldSpentByHeroes).toBe(fee);
    expect(tavern.treasury).toBe(treasury + fee);
    expect(party.renown).toBe(renown);
    expect(events.some((event) => event.text.includes('They drink'))).toBe(false);
    expect(party.blessed).toBe(false);
  });

  it('reports each resurrection cost at the temple and clears the blessing', () => {
    const { party, context, town, events } = homecoming();
    const dead = party.members.slice(0, 2);
    dead[0]!.level = 2;
    dead[1]!.level = 3;
    for (const hero of dead) killHero(hero);
    const temple = serviceOf(town, 'temple');
    const bill = dead.map((hero) => `${hero.name}: ${resurrectionCost(hero.level)} gp`).join(', ');

    advanceExpedition(party, context);

    expect(events).toContainEqual({
      kind: 'temple',
      text: `${party.name} carry their dead to the ${temple.name}. The priests ask ${bill}. Purse: 1000 gp.`,
    });
    expect(party.blessed).toBe(false);
  });
});

describe('reading the road', () => {
  it.each(['count', 'encounter'])('reveals exactly one %s piece on success and tries only once per contract', (piece) => {
    const { party, quest, context, events, combat } = setup();
    party.status = 'traveling';
    party.ticksLeft = 3;
    quest.encounters.push(encounter);
    quest.countRevealed = piece === 'encounter';
    context.skillDc = 0;

    advanceExpedition(party, context);

    expect(quest.countRevealed).toBe(true);
    expect(quest.revealed).toBe(piece === 'count' ? 1 : 2);
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe('party');
    expect(events[0]!.text).toContain('reads the tracks');
    const intel = { count: quest.countRevealed, revealed: quest.revealed };

    advanceExpedition(party, context);

    expect({ count: quest.countRevealed, revealed: quest.revealed }).toEqual(intel);
    expect(events).toHaveLength(1);
    expect(jobInquiry(party, quest.id)?.roadRead).toBe(true);
    expect(combat).not.toHaveBeenCalled();
  });

  it('reveals nothing on failure and does not retry', () => {
    const { party, quest, context, events } = setup();
    party.status = 'traveling';
    party.ticksLeft = 3;
    context.skillDc = 100;

    advanceExpedition(party, context);

    expect(quest.countRevealed).toBe(false);
    expect(quest.revealed).toBe(1);
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe('party');
    expect(events[0]!.text).toContain('learns nothing');
    const intel = { count: quest.countRevealed, revealed: quest.revealed };

    advanceExpedition(party, context);

    expect({ count: quest.countRevealed, revealed: quest.revealed }).toEqual(intel);
    expect(events).toHaveLength(1);
    expect(jobInquiry(party, quest.id)?.roadRead).toBe(true);
  });

  it('allows a fresh road check for a different contract', () => {
    const { party, quest, context, events } = setup();
    party.status = 'traveling';
    party.ticksLeft = 3;
    context.skillDc = 100;
    advanceExpedition(party, context);
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe('party');
    expect(events[0]!.text).toContain('learns nothing');

    const nextQuest = { ...quest, id: 'q2' };
    party.questId = nextQuest.id;
    party.ticksLeft = 3;
    context.quest = nextQuest;
    context.knowledge = () => jobKnowledge(nextQuest);
    context.skillDc = 0;
    advanceExpedition(party, context);

    expect(events).toHaveLength(2);
    expect(events[1]!.kind).toBe('party');
    expect(events[1]!.text).toContain('reads the tracks');
    expect(jobInquiry(party, quest.id)?.roadRead).toBe(true);
    expect(jobInquiry(party, nextQuest.id)?.roadRead).toBe(true);
    expect(quest.countRevealed).toBe(false);
    expect(nextQuest.countRevealed).toBe(true);
  });

  it('makes no check for a fully known contract', () => {
    const { party, quest, context, events } = setup();
    party.status = 'traveling';
    party.ticksLeft = 2;
    quest.countRevealed = true;
    quest.revealed = quest.encounters.length;

    advanceExpedition(party, context);

    expect(events).toEqual([]);
    expect(jobInquiry(party, quest.id)?.roadRead).toBeUndefined();
  });
});

describe('expedition guards', () => {
  it('rejects an idle company', () => {
    const { party, context, combat } = setup();
    party.status = 'idle';

    expect(() => advanceExpedition(party, context)).toThrow('Cannot advance idle company');
    expect(combat).not.toHaveBeenCalled();
  });

  it.each([
    ['traveling', 'missing'], ['traveling', 'mismatch'],
    ['questing', 'missing'], ['questing', 'mismatch'],
    ['returning', 'missing'], ['returning', 'mismatch'],
  ] as const)('rejects a %s company with a %s quest', (status, problem) => {
    const { party, quest, context, combat } = setup();
    party.status = status;
    if (problem === 'missing') context.quest = undefined;
    else context.quest = { ...quest, id: 'other-quest' };

    expect(() => advanceExpedition(party, context)).toThrow(`Missing contract for ${party.name} while ${status}.`);
    expect(combat).not.toHaveBeenCalled();
  });
});
