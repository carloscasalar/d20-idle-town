import { describe, expect, it } from 'vitest';
import { resurrectionCost } from '../src/adventurers/hero';
import { createParty, partyLevel, type Party } from '../src/adventurers/party';
import { Rng } from '../src/core/rng';
import type { EncounterSpec } from '../src/quests/encounters';
import {
  DEFAULT_JOB_INTEL_CONFIG,
  defaultJobIntelSteps,
  divination,
  freeAttempt,
  isFullyKnown,
  jobInquiry,
  jobKnowledge,
  learnOnArrival,
  paidRound,
  readTheRoad,
  seekJobIntelligence,
  type JobIntelContext,
  type JobIntelEvent,
  type JobIntelStep,
} from '../src/quests/job-intel';
import { emptyGoldStatistics } from '../src/town/coin';
import { generateTown, serviceOf, type ServiceKind } from '../src/town/town';

const encounters: EncounterSpec[] = [
  { difficulty: 'easy', monsters: [{ name: 'Goblin Warrior', count: 1, xpEach: 50 }], totalXp: 50, tier: 'Low' },
  { difficulty: 'intermediate', monsters: [{ name: 'Wolf', count: 2, xpEach: 50 }], totalXp: 100, tier: 'Low' },
  { difficulty: 'hard', monsters: [{ name: 'Ogre', count: 1, xpEach: 450 }], totalXp: 450, tier: 'High' },
];

function contract() {
  return {
    id: 'tower', title: 'Recover the tower', place: 'Old Tower',
    countRevealed: false, revealed: 1, encounters: structuredClone(encounters),
  };
}

function scene(options: { gold?: number; level?: number; skillDc?: number; ruined?: ServiceKind } = {}) {
  const company = createParty(new Rng(1), options.level ?? 1, 4, 0);
  company.name = 'Lanterns';
  company.gold = options.gold ?? 1000;
  const town = generateTown(new Rng(2));
  if (options.ruined) serviceOf(town, options.ruined).ruined = true;
  const work = contract();
  const statistics = emptyGoldStatistics();
  const events: JobIntelEvent[] = [];
  const context: JobIntelContext = {
    work,
    knowledge: jobKnowledge(work),
    town,
    rng: new Rng(3),
    statistics,
    config: { ...DEFAULT_JOB_INTEL_CONFIG, skillDc: options.skillDc ?? DEFAULT_JOB_INTEL_CONFIG.skillDc },
    report: (event) => events.push(event),
  };
  return { company, work, town, context, events, statistics };
}

function afford(company: Party, kind: 'divination' | 'round', extra = 0) {
  const level = partyLevel(company);
  const price = kind === 'divination' ? DEFAULT_JOB_INTEL_CONFIG.divinationCostPerLevel : DEFAULT_JOB_INTEL_CONFIG.roundCostPerLevel;
  const factor = kind === 'divination' ? DEFAULT_JOB_INTEL_CONFIG.divinationReserveFactor : DEFAULT_JOB_INTEL_CONFIG.roundReserveFactor;
  company.gold = resurrectionCost(level) * factor + price * level + extra;
}

describe('job intelligence', () => {
  it('a free attempt learns the encounter count and spends no gold', () => {
    const { company, work, context, events } = scene({ skillDc: 0, gold: 5000 });

    expect(freeAttempt(company, context)).toBe(true);

    expect(events[0]?.text).toContain('it means 3 fights');
    expect(work).toMatchObject({ countRevealed: true, revealed: 1 });
    expect(jobInquiry(company, work.id)).toMatchObject({ freeAttempt: true, roundsBought: 0, roadRead: false });
    expect(company).toMatchObject({ gold: 5000, spent: 0 });
  });

  it('a failed free attempt spends the hour and learns nothing', () => {
    const { company, work, context, events } = scene({ skillDc: 100 });

    expect(freeAttempt(company, context)).toBe(true);

    expect(events[0]?.text).toContain('gets nowhere');
    expect(work.countRevealed).toBe(false);
    expect(jobInquiry(company, work.id)?.freeAttempt).toBe(true);
  });

  it('refuses a second free attempt on the same job', () => {
    const { company, work, context } = scene({ skillDc: 100 });
    freeAttempt(company, context);
    context.config = { ...context.config, skillDc: 0 };

    expect(freeAttempt(company, context)).toBe(false);

    expect(work.countRevealed).toBe(false);
    expect(jobInquiry(company, work.id)?.freeAttempt).toBe(true);
  });

  it('a divination reveals the whole job and moves gold as intelligence', () => {
    const { company, work, town, context, events, statistics } = scene({ gold: 0 });
    afford(company, 'divination');
    const cost = company.gold - resurrectionCost(partyLevel(company)) * DEFAULT_JOB_INTEL_CONFIG.divinationReserveFactor;
    const temple = serviceOf(town, 'temple');
    const treasury = temple.treasury;
    const earned = temple.earned;
    const spent = company.spent;

    expect(divination(company, context)).toBe(true);

    expect(isFullyKnown(work)).toBe(true);
    expect(events[0]?.text).toContain('fights [E/I/H]');
    expect(company.gold).toBe(resurrectionCost(partyLevel(company)) * DEFAULT_JOB_INTEL_CONFIG.divinationReserveFactor);
    expect(company.spent).toBe(spent + cost);
    expect(temple).toMatchObject({ treasury: treasury + cost, earned: earned + cost });
    expect(statistics).toEqual({ goldPaid: 0, goldSpentByHeroes: cost });
    expect(company.members.every((hero) => hero.goldSpent === 0)).toBe(true);
  });

  it('refuses divination that would leave less than the divination reserve', () => {
    const { company, work, context, statistics } = scene({ gold: 0 });
    afford(company, 'divination', -1);
    const gold = company.gold;

    expect(divination(company, context)).toBe(false);

    expect(isFullyKnown(work)).toBe(false);
    expect(company.gold).toBe(gold);
    expect(statistics.goldSpentByHeroes).toBe(0);
  });

  it('a ruined temple offers no divination', () => {
    const { company, work, context } = scene({ gold: 5000, ruined: 'temple' });

    expect(divination(company, context)).toBe(false);

    expect(isFullyKnown(work)).toBe(false);
    expect(company.gold).toBe(5000);
  });

  it('a paid round learns one fact and moves gold as intelligence', () => {
    const { company, work, town, context, events, statistics } = scene({ gold: 0 });
    afford(company, 'round');
    const cost = company.gold - resurrectionCost(partyLevel(company)) * DEFAULT_JOB_INTEL_CONFIG.roundReserveFactor;
    const tavern = serviceOf(town, 'tavern');
    const treasury = tavern.treasury;

    expect(paidRound(company, context)).toBe(true);

    expect(events[0]?.text).toContain('it means 3 fights');
    expect(work.countRevealed).toBe(true);
    expect(jobInquiry(company, work.id)?.roundsBought).toBe(1);
    expect(company.gold).toBe(resurrectionCost(partyLevel(company)) * DEFAULT_JOB_INTEL_CONFIG.roundReserveFactor);
    expect(tavern.treasury).toBe(treasury + cost);
    expect(statistics).toEqual({ goldPaid: 0, goldSpentByHeroes: cost });
    expect(company.members.every((hero) => hero.goldSpent === 0)).toBe(true);
  });

  it('refuses a round that would leave less than the resurrection reserve', () => {
    const { company, work, context } = scene({ gold: 0 });
    afford(company, 'round', -1);
    const gold = company.gold;

    expect(paidRound(company, context)).toBe(false);

    expect(work.countRevealed).toBe(false);
    expect(jobInquiry(company, work.id)).toBeUndefined();
    expect(company.gold).toBe(gold);
  });

  it('a ruined tavern offers neither a free attempt nor a round', () => {
    const { company, work, context } = scene({ gold: 5000, ruined: 'tavern' });

    expect(freeAttempt(company, context)).toBe(false);
    expect(paidRound(company, context)).toBe(false);

    expect(jobInquiry(company, work.id)).toBeUndefined();
    expect(work.countRevealed).toBe(false);
    expect(company.gold).toBe(5000);
  });

  it('refuses a paid round past the configured limit', () => {
    const { company, work, context } = scene({ gold: 5000 });
    work.encounters = structuredClone([...encounters, ...encounters]);
    for (let round = 0; round < DEFAULT_JOB_INTEL_CONFIG.maxRounds; round++) expect(paidRound(company, context)).toBe(true);
    const gold = company.gold;
    const known = work.revealed;

    expect(paidRound(company, context)).toBe(false);

    expect(jobInquiry(company, work.id)?.roundsBought).toBe(DEFAULT_JOB_INTEL_CONFIG.maxRounds);
    expect(company.gold).toBe(gold);
    expect(work.revealed).toBe(known);
    expect(isFullyKnown(work)).toBe(false);
  });

  it('reads the road once, and a failed reading is not repeated', () => {
    const { company, work } = scene();
    const lines: string[] = [];
    const road = (skillDc: number) => readTheRoad(company, work, {
      rng: new Rng(4),
      skillDc,
      knowledge: jobKnowledge(work),
      report: (text) => lines.push(text),
    });

    road(100);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('learns nothing');
    expect(work.countRevealed).toBe(false);
    expect(jobInquiry(company, work.id)?.roadRead).toBe(true);

    road(0);
    expect(lines).toHaveLength(1);
    expect(work.countRevealed).toBe(false);
  });

  it('a successful reading of the road learns one fact and is not repeated', () => {
    const { company, work } = scene();
    const lines: string[] = [];
    const road = () => readTheRoad(company, work, {
      rng: new Rng(4),
      skillDc: 0,
      knowledge: jobKnowledge(work),
      report: (text) => lines.push(text),
    });

    road();
    expect(lines[0]).toContain('it means 3 fights');
    expect(work.countRevealed).toBe(true);
    road();
    expect(lines).toHaveLength(1);
  });

  it('does not read a road when the job is already fully known', () => {
    const { company, work } = scene();
    jobKnowledge(work).revealAll();
    const lines: string[] = [];

    readTheRoad(company, work, {
      rng: new Rng(4),
      skillDc: 0,
      knowledge: jobKnowledge(work),
      report: (text) => lines.push(text),
    });

    expect(lines).toEqual([]);
    expect(jobInquiry(company, work.id)).toBeUndefined();
  });

  it('taking stock on arrival reveals a surprise, and a known destination is familiar', () => {
    const { work } = scene();
    const knowledge = jobKnowledge(work);

    expect(learnOnArrival(work, knowledge)).toBe(true);
    expect(isFullyKnown(work)).toBe(true);

    expect(learnOnArrival(work, knowledge)).toBe(false);
    expect(isFullyKnown(work)).toBe(true);
  });

  it('refuses to learn a fact about a job that is already fully known', () => {
    const { work } = scene();
    const knowledge = jobKnowledge(work);
    knowledge.revealAll();

    expect(() => knowledge.learnNext()).toThrow(/already fully known/);
    expect(work.revealed).toBe(work.encounters.length);
  });

  it('tries the free attempt before divination, and divination before a round', () => {
    const talking = scene({ skillDc: 0, gold: 5000 });
    expect(seekJobIntelligence(talking.company, talking.context, defaultJobIntelSteps())).toBe(true);
    expect(talking.events.map((event) => event.kind)).toEqual(['shop']);
    expect(talking.company.spent).toBe(0);
    expect(isFullyKnown(talking.work)).toBe(false);

    const praying = scene({ skillDc: 0, gold: 5000, ruined: 'tavern' });
    expect(seekJobIntelligence(praying.company, praying.context, defaultJobIntelSteps())).toBe(true);
    expect(praying.events.map((event) => event.kind)).toEqual(['temple']);
    expect(isFullyKnown(praying.work)).toBe(true);
  });

  it('divines when the free attempt is already spent and both a divination and a round can be paid', () => {
    const { company, work, town, context, events } = scene({ skillDc: 100, gold: 5000 });
    const tavernBefore = serviceOf(town, 'tavern').treasury;
    expect(freeAttempt(company, context)).toBe(true);
    events.length = 0;

    expect(seekJobIntelligence(company, context, defaultJobIntelSteps())).toBe(true);

    expect(events.map((event) => event.kind)).toEqual(['temple']);
    expect(isFullyKnown(work)).toBe(true);
    expect(company.spent).toBe(DEFAULT_JOB_INTEL_CONFIG.divinationCostPerLevel * partyLevel(company));
    expect(serviceOf(town, 'tavern').treasury).toBe(tavernBefore);
    expect(jobInquiry(company, work.id)?.roundsBought).toBe(0);
  });

  it('runs a made-up way of learning in the place the list gives it', () => {
    const { company, work, context } = scene({ skillDc: 0, gold: 5000 });
    const seen: string[] = [];
    const invented: JobIntelStep = () => {
      seen.push('invented');
      return true;
    };
    const noteFree: JobIntelStep = (p, ctx) => {
      seen.push('free');
      return freeAttempt(p, ctx);
    };

    expect(seekJobIntelligence(company, context, [invented, noteFree])).toBe(true);

    expect(seen).toEqual(['invented']);
    expect(jobInquiry(company, work.id)).toBeUndefined();
    expect(company.gold).toBe(5000);

    const decline: JobIntelStep = () => {
      seen.push('decline');
      return false;
    };
    expect(seekJobIntelligence(company, context, [decline, freeAttempt])).toBe(true);
    expect(seen).toEqual(['invented', 'decline']);
    expect(jobInquiry(company, work.id)?.freeAttempt).toBe(true);
    expect(work.countRevealed).toBe(true);
  });
});
