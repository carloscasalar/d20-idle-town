import { describe, expect, it, vi } from 'vitest';
import { createParty, type Party } from '../src/adventurers/party';
import type { CombatOutcome } from '../src/combat/battlecast';
import { Rng } from '../src/core/rng';
import type { EncounterSpec } from '../src/quests/encounters';
import { knowledgeAtPosting } from '../src/quests/job-intel';
import {
  Board,
  DEFAULT_BOARD_CONFIG,
  WORK_KINDS,
  type BoardContext,
  type BoardLedger,
  type WorkBehavior,
} from '../src/sim/board';
import { advanceExpedition, startExpedition, type CombatResolver, type ExpeditionContext } from '../src/sim/expedition';
import type { WorkProfile } from '../src/sim/work-kinds';
import { openCoin } from '../src/town/coin';
import { generateTown, type Employer, type Town } from '../src/town/town';
import { expeditionRules } from './helpers/expedition-rules';
import { STARTING_GOLD } from './helpers/supplied-config';
import { DEFAULT_HERO_ECONOMY } from '../src/adventurers/hero';
import { DEFAULT_HOLDING_CONFIG } from '../src/town/assets';
import { DEFAULT_TOWN_CONFIG } from '../src/town/town';
import { DEFAULT_JOB_INTEL_CONFIG } from '../src/quests/job-intel';
import { DEFAULT_QUEST_CONFIG } from '../src/quests/quest';
import { DEFAULT_ENCOUNTER_CONFIG } from '../src/quests/encounters';
import { DEFAULT_ITEM_CONFIG } from '../src/items/items';
import { DEFAULT_COMPANY_ROSTER_CONFIG } from '../src/adventurers/company-roster';
import { CompanyRoster } from '../src/adventurers/company-roster';

const encounter: EncounterSpec = {
  difficulty: 'easy',
  monsters: [{ name: 'Goblin Warrior', count: 1, xpEach: 50 }],
  totalXp: 50,
  tier: 'Low',
};

/** A kind the built-in modules have never heard of. Its profile is the whole difference. */
const survey: WorkProfile = Object.freeze({
  id: 'survey',
  renown: 'none',
  badge: '',
  lairRelation: 'walk of',
  lairFigure: 'strength',
  lastFightForbidsRetreat: true,
  lairDepth: true,
  countAtPosting: true,
  offer: 'none',
});

const surveyBehavior: WorkBehavior = {
  profile: survey,
  create: (kind, { employer }, context) => ({
    id: context.rng.id('quest'),
    kind,
    title: 'Survey the marsh',
    place: 'the marsh',
    giverId: employer.id,
    assetId: null,
    lairId: null,
    theme: 'goblins',
    level: 1,
    encounters: [encounter],
    ...knowledgeAtPosting(survey.countAtPosting, context.intel.revealedAtPosting, false),
    reward: 40,
    itemReward: null,
    guildOnly: false,
    status: 'open',
    partyId: null,
    postedAt: context.tick,
  }),
  post: () => {},
  acceptance: (work, company) => ({ kind: 'quest', text: `${company.name} survey "${work.title}".` }),
  success: (_work, company) => { company.questsDone += 1; },
  failure: () => {},
};

function outcome(party: Party): CombatOutcome {
  return {
    winner: 'party',
    rounds: 1,
    ambush: null,
    opening: '',
    lines: ['A short survey.'],
    heroes: party.members.map((hero) => ({ heroId: hero.id, hp: hero.maxHp, alive: true, kills: 0 })),
    xpEarned: 0,
    potionsDrunk: 0,
  };
}

describe('a registered kind of work', () => {
  it('is posted, taken, fought and settled from its kind entry alone', () => {
    const rng = new Rng(4);
    const town: Town = generateTown(rng, DEFAULT_TOWN_CONFIG, DEFAULT_HOLDING_CONFIG);
    const employer: Employer = town.employers[0]!;
    const ledger: BoardLedger = {
      questsCompleted: 0, questsFailed: 0, questsExpired: 0, itemsFound: 0, raids: 0, lairsCleared: 0,
    };
    const boardContext: BoardContext = {
      town,
      lairs: [],
      rng,
      tick: 0,
      ledger,
      coin: openCoin({ goldPaid: 0, goldSpentByHeroes: 0 }),
      report: () => {},
      payHoard: () => '',
      companySize: DEFAULT_COMPANY_ROSTER_CONFIG.companySize,
      renownCap: DEFAULT_COMPANY_ROSTER_CONFIG.renownCap,
      lairStrengthCap: 8,
      quests: DEFAULT_QUEST_CONFIG,
      encounters: DEFAULT_ENCOUNTER_CONFIG,
      intel: DEFAULT_JOB_INTEL_CONFIG,
      items: DEFAULT_ITEM_CONFIG,
    };
    const board = new Board({ ...DEFAULT_BOARD_CONFIG, travelTicks: 1 }, { ...WORK_KINDS, [survey.id]: surveyBehavior });
    const work = board.post(survey.id, { employer }, boardContext);

    expect(work).toMatchObject({ kind: survey.id, status: 'open', countRevealed: true, revealed: 1 });
    expect(work.encounters).toHaveLength(1);

    const company = createParty(new Rng(1), 1, 4, 0, STARTING_GOLD);
    company.gold = 1000;
    const departure = board.take(company, work, boardContext);
    startExpedition(company, departure.travelTicks);
    expect(departure.acceptance.text).toContain('survey');
    expect(work.status).toBe('taken');
    expect(company.questId).toBe(work.id);

    const combat = vi.fn<CombatResolver>(() => outcome(company));
    const roster = new CompanyRoster(DEFAULT_COMPANY_ROSTER_CONFIG, DEFAULT_HERO_ECONOMY, DEFAULT_TOWN_CONFIG, DEFAULT_HOLDING_CONFIG);
    roster.replaceForScenario([company]);
    const expedition: ExpeditionContext = {
      quest: work,
      town,
      rng: new Rng(9),
      ledger: { heroesDied: 0, partiesWiped: 0 },
      coin: openCoin({ goldPaid: 0, goldSpentByHeroes: 0 }),
      ...expeditionRules({ travelTicks: 1, restTicks: 1 }),
      kinds: board.profiles(),
      combat,
      disband: (band) => roster.disband(band),
      report: () => {},
      knowledge: (posted) => board.knowledge(posted),
      settleQuest: (posted, band, success) => board.settle(posted, band, success, boardContext),
      leaveLoot: () => {},
    };

    advanceExpedition(company, expedition);
    expect(company.status).toBe('questing');

    advanceExpedition(company, expedition);
    expect(combat).toHaveBeenCalledOnce();
    expect(combat.mock.calls[0]![3]).toMatchObject({
      noRetreat: true,
      lairDepth: { index: 0, total: 1 },
    });
    expect(company.status).toBe('returning');

    advanceExpedition(company, expedition);
    expect(work.status).toBe('done');
    expect(company.questId).toBeNull();
    expect(company.questsDone).toBe(1);
    expect(company.status).toBe('resting');
  });
});
