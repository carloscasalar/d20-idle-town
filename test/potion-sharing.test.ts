import { describe, expect, it } from 'vitest';
import { CompanyRoster, DEFAULT_COMPANY_ROSTER_CONFIG } from '../src/adventurers/company-roster';
import { createHero, DEFAULT_HERO_ECONOMY } from '../src/adventurers/hero';
import { planDrinkingRound, DEFAULT_POLICIES_CONFIG, type DrinkingAdventurer, type PlannedDrink, type PotionSharingPolicy, type PotionSharingWeight } from '../src/adventurers/policies';
import { DEFAULT_POTION_CONFIG, type PotionTier } from '../src/adventurers/potions';
import { createParty, type Party } from '../src/adventurers/party';
import { DEFAULT_COMBAT_CONFIG, runCombat } from '../src/combat/battlecast';
import { Rng } from '../src/core/rng';
import type { EncounterSpec } from '../src/quests/encounters';
import type { Quest } from '../src/quests/quest';
import { Board, DEFAULT_BOARD_CONFIG } from '../src/sim/board';
import { advanceExpedition, type ExpeditionContext } from '../src/sim/expedition';
import { DEFAULT_CONFIG, Game, validateGameConfig } from '../src/sim/game';
import { profilesById } from '../src/sim/work-kinds';
import { DEFAULT_HOLDING_CONFIG } from '../src/town/assets';
import { openCoin } from '../src/town/coin';
import { generateTown, DEFAULT_TOWN_CONFIG } from '../src/town/town';
import { expeditionRules } from './helpers/expedition-rules';
import { COMBAT_RULES, STARTING_GOLD } from './helpers/supplied-config';

/** 3 and 3 make 2d4+2 equal 8. */
const eights = { int: () => 3 };

const companyOrderOnly: readonly PotionSharingWeight[] = [
  { policy: 'company-order', weight: 100 },
  { policy: 'most-hurt', weight: 0 },
];
const mostHurtOnly: readonly PotionSharingWeight[] = [
  { policy: 'company-order', weight: 0 },
  { policy: 'most-hurt', weight: 100 },
];

/**
 * Ann 5/10 (fraction 0.5), Bev 6/40 (fraction 0.15), Cid 0/20 (fallen).
 * Two basic potions, three Bloodied heroes.
 * Company order serves Ann then Bev. Most hurt serves Cid then Bev.
 * Raw hit points would serve Cid then Ann. Leaving Cid in place would serve Bev then Ann.
 */
const roc: EncounterSpec = {
  difficulty: 'hard',
  monsters: [{ name: 'Roc', count: 1, xpEach: 5000 }],
  totalXp: 5000,
  tier: 'High',
};

function wounded(): Party {
  const party = createParty(new Rng(1), 1, 3, 0, STARTING_GOLD, DEFAULT_POLICIES_CONFIG.potionSharing);
  const naming = new Rng(2);
  const heroes = (['Fighter', 'Rogue', 'Barbarian'] as const).map((heroClass) => createHero(naming, 1, heroClass));
  heroes[0]!.name = 'Ann';
  heroes[0]!.hp = 5;
  heroes[0]!.maxHp = 10;
  heroes[1]!.name = 'Bev';
  heroes[1]!.hp = 6;
  heroes[1]!.maxHp = 40;
  heroes[2]!.name = 'Cid';
  heroes[2]!.hp = 0;
  heroes[2]!.maxHp = 20;
  for (const hero of heroes) {
    hero.armorTier = 30;
    hero.hitDiceSpent = hero.level;
  }
  party.members = heroes;
  party.name = 'The Bold Foxes';
  party.potions = { basic: 2 };
  party.status = 'short-resting';
  party.ticksLeft = 1;
  party.shortRestStartedWith = 3;
  party.questId = 'q-share';
  party.progress = 0;
  return party;
}

function fight(policy: PotionSharingPolicy | undefined) {
  const party = wounded();
  const result = runCombat(party.members, roc, 1, {
    ...COMBAT_RULES,
    rules: { ...DEFAULT_COMBAT_CONFIG, maxRounds: 1 },
    potions: party.potions,
    dice: eights,
    noRetreat: true,
    ...(policy ? { potionSharing: policy } : {}),
  });
  return {
    hp: party.members.map((hero) => {
      const row = result.heroes.find((item) => item.heroId === hero.id)!;
      return { name: hero.name, hp: row.hp, alive: row.alive };
    }),
    potionsDrunk: result.potionsDrunk,
    drinks: result.lines.filter((line) => line.includes('healing potion')),
    potions: party.potions,
  };
}

function rest(policy: PotionSharingPolicy | undefined) {
  const party = wounded();
  if (policy) party.policies = { potionSharing: policy };
  else delete party.policies;
  const quest: Quest = {
    id: 'q-share', kind: 'contract', title: 'Clear the road', place: 'Stonebridge',
    giverId: 'employer', assetId: null, lairId: null, theme: 'goblins', level: 1,
    encounters: [roc, roc], revealed: 1, countRevealed: true,
    reward: 100, itemReward: null, guildOnly: false, status: 'taken', partyId: party.id, postedAt: 0,
  };
  const town = generateTown(new Rng(2), DEFAULT_TOWN_CONFIG, DEFAULT_HOLDING_CONFIG);
  const rules = expeditionRules();
  const events: { text: string }[] = [];
  const context: ExpeditionContext = {
    quest, town, rng: new Rng(3),
    ledger: { heroesDied: 0, partiesWiped: 0 },
    coin: openCoin({ goldPaid: 0, goldSpentByHeroes: 0, goldSpentOnProduction: 0 }),
    kinds: profilesById(),
    ...rules,
    config: { ...rules.config, retreatHpFraction: 0 },
    restDice: () => eights,
    combat: () => { throw new Error('a Short rest does not fight'); },
    disband: () => {},
    report: (event) => { events.push(event); },
    knowledge: (work) => new Board(DEFAULT_BOARD_CONFIG).knowledge(work),
    settleQuest: () => {},
    leaveLoot: () => {},
  };
  advanceExpedition(party, context);
  return {
    hp: party.members.map((hero) => ({ name: hero.name, hp: hero.hp, alive: hero.alive })),
    potions: party.potions,
    breath: events.find((event) => event.text.includes('catch their breath'))?.text,
  };
}

const tiers = DEFAULT_POTION_CONFIG.tiers;

function person(id: string, name: string, hp: number, maxHp: number, conscious: boolean): DrinkingAdventurer {
  return { id, name, hp, maxHp, conscious };
}

function listed(plan: readonly PlannedDrink[]) {
  return plan.map((drink) => ({
    id: drink.id,
    name: drink.name,
    tier: drink.tier.name,
    ...(drink.giver === undefined ? {} : { giver: drink.giver }),
  }));
}

/** Ann 5/10, Bev 6/40, Cid 0/20. Company order is Ann then Bev. Most hurt is Cid then Bev. */
const line = [
  person('ann', 'Ann', 5, 10, true),
  person('bev', 'Bev', 6, 40, true),
  person('cid', 'Cid', 0, 20, false),
];

describe('the company plans a round of drinking', () => {
  it('drinks the smallest tier whose assured healing covers the hit points missing', () => {
    const pack = { basic: 1, greater: 1, superior: 1, supreme: 1 };
    const wound = (hp: number, maxHp: number) => listed(planDrinkingRound(
      [person('ann', 'Ann', hp, maxHp, true)], pack, tiers, { potionSharing: 'company-order' },
    ));

    // Missing 8, 9, 17 and 50. Each adventurer is Bloodied, so the plan is the tier.
    expect(wound(8, 16)).toEqual([{ id: 'ann', name: 'Ann', tier: 'basic' }]);
    expect(wound(9, 18)).toEqual([{ id: 'ann', name: 'Ann', tier: 'greater' }]);
    expect(wound(3, 20)).toEqual([{ id: 'ann', name: 'Ann', tier: 'superior' }]);
    expect(wound(0, 50)).toEqual([{ id: 'ann', name: 'Ann', tier: 'supreme' }]);
  });

  it('drinks the strongest tier in the pack when none covers the wound', () => {
    expect(listed(planDrinkingRound(
      [person('ann', 'Ann', 0, 51, true)],
      { basic: 2, greater: 1 },
      tiers,
      { potionSharing: 'company-order' },
    ))).toEqual([{ id: 'ann', name: 'Ann', tier: 'greater' }]);
  });

  it('counts a fallen adventurer as missing their whole maximum, even when hit points are below zero', () => {
    const catalogue: readonly PotionTier[] = [
      { name: 'mend', formula: '4d4+4', price: 200, productionCost: 100, productionTicks: 0 },
      { name: 'close', formula: '2d4+16', price: 400, productionCost: 200, productionTicks: 0 },
      { name: 'flood', formula: '8d4+8', price: 2000, productionCost: 1000, productionTicks: 0 },
    ];
    const pack = { mend: 1, close: 1, flood: 1 };
    const ann = person('ann', 'Ann', 40, 40, true);
    const plan = (fallen: DrinkingAdventurer) => listed(planDrinkingRound(
      [ann, fallen], pack, catalogue, { potionSharing: 'company-order' },
    ));

    expect(plan(person('cid', 'Cid', -8, 20, false))).toEqual([
      { id: 'cid', name: 'Cid', tier: 'close', giver: 'Ann' },
    ]);
    expect(plan(person('dee', 'Dee', 0, 20, false))).toEqual([
      { id: 'dee', name: 'Dee', tier: 'close', giver: 'Ann' },
    ]);
  });

  it('ignores an empty count and a tier the pack does not hold', () => {
    expect(listed(planDrinkingRound(
      [person('ann', 'Ann', 8, 16, true)],
      { basic: 0, supreme: 1 },
      tiers,
      { potionSharing: 'company-order' },
    ))).toEqual([{ id: 'ann', name: 'Ann', tier: 'supreme' }]);
    expect(planDrinkingRound(
      [person('ann', 'Ann', 1, 20, true)],
      {},
      tiers,
      { potionSharing: 'company-order' },
    )).toEqual([]);
  });

  it('ranks tiers by assured healing when the catalogue lists a stronger tier first', () => {
    expect(listed(planDrinkingRound(
      [person('ann', 'Ann', 8, 16, true)],
      { basic: 1, supreme: 1 },
      [...tiers].reverse(),
      { potionSharing: 'company-order' },
    ))).toEqual([{ id: 'ann', name: 'Ann', tier: 'basic' }]);
  });

  it('leaves the pack and the adventurers it was given unchanged', () => {
    const adventurers = [
      person('ann', 'Ann', 5, 10, true),
      person('bev', 'Bev', 1, 40, true),
    ];
    const pack = { basic: 1, greater: 2 };
    const before = adventurers.map((adventurer) => ({ ...adventurer }));

    planDrinkingRound(adventurers, pack, tiers, { potionSharing: 'most-hurt' });

    expect(pack).toEqual({ basic: 1, greater: 2 });
    expect(adventurers).toEqual(before);
  });

  it('with one potion, only the first Bloodied adventurer in policy order drinks', () => {
    expect(listed(planDrinkingRound(
      [person('ann', 'Ann', 5, 10, true), person('bev', 'Bev', 6, 40, true)],
      { basic: 1 },
      tiers,
      { potionSharing: 'most-hurt' },
    ))).toEqual([{ id: 'bev', name: 'Bev', tier: 'basic' }]);
  });

  it('serves Bloodied adventurers in company order when that is the policy', () => {
    expect(listed(planDrinkingRound(line, { basic: 2 }, tiers, { potionSharing: 'company-order' }))).toEqual([
      { id: 'ann', name: 'Ann', tier: 'basic' },
      { id: 'bev', name: 'Bev', tier: 'basic' },
    ]);
  });

  it('serves fallen adventurers first, then the lowest hit point fraction', () => {
    expect(listed(planDrinkingRound(line, { basic: 2 }, tiers, { potionSharing: 'most-hurt' }))).toEqual([
      { id: 'cid', name: 'Cid', tier: 'basic', giver: 'Ann' },
      { id: 'bev', name: 'Bev', tier: 'basic' },
    ]);
  });

  it('serves a company with no recorded policy in company order', () => {
    expect(listed(planDrinkingRound(line, { basic: 2 }, tiers, undefined))).toEqual([
      { id: 'ann', name: 'Ann', tier: 'basic' },
      { id: 'bev', name: 'Bev', tier: 'basic' },
    ]);
  });

  it('the first conscious companion gives every potion in the round', () => {
    expect(listed(planDrinkingRound(
      [
        person('ann', 'Ann', 30, 30, true),
        person('bev', 'Bev', 30, 30, true),
        person('cid', 'Cid', 0, 20, false),
        person('dee', 'Dee', -3, 18, false),
      ],
      { basic: 2 },
      tiers,
      { potionSharing: 'company-order' },
    ))).toEqual([
      { id: 'cid', name: 'Cid', tier: 'basic', giver: 'Ann' },
      { id: 'dee', name: 'Dee', tier: 'basic', giver: 'Ann' },
    ]);
  });

  it('nobody drinks when nobody is conscious', () => {
    expect(planDrinkingRound(
      [person('cid', 'Cid', 0, 20, false), person('dee', 'Dee', -4, 18, false)],
      { basic: 4 },
      tiers,
      { potionSharing: 'most-hurt' },
    )).toEqual([]);
  });

  it('an unconscious adventurer above 0 hit points does not drink and is not given a potion', () => {
    expect(planDrinkingRound(
      [person('ann', 'Ann', 20, 20, true), person('bev', 'Bev', 5, 10, false)],
      { basic: 2 },
      tiers,
      { potionSharing: 'company-order' },
    )).toEqual([]);
  });

  it('a conscious adventurer at 0 hit points drinks', () => {
    expect(listed(planDrinkingRound(
      [person('ann', 'Ann', 20, 20, true), person('cid', 'Cid', 0, 20, true)],
      { basic: 1 },
      tiers,
      { potionSharing: 'most-hurt' },
    ))).toEqual([{ id: 'cid', name: 'Cid', tier: 'basic' }]);
  });
});

describe('the plan is applied in a fight and at a Short rest', () => {
  it('applies the plan between rounds of a fight', () => {
    expect(fight('most-hurt')).toEqual({
      hp: [
        { name: 'Ann', hp: 5, alive: true },
        { name: 'Bev', hp: 14, alive: true },
        { name: 'Cid', hp: 8, alive: true },
      ],
      potionsDrunk: { basic: 2 },
      drinks: [
        'Ann gives Cid a basic healing potion (2d4+2: 8).',
        'Bev drinks a basic healing potion (2d4+2: 8).',
      ],
      potions: { basic: 2 },
    });
  });

  it('applies the plan at a Short rest', () => {
    const rested = rest('most-hurt');

    expect(rested.hp).toEqual([
      { name: 'Ann', hp: 5, alive: true },
      { name: 'Bev', hp: 14, alive: true },
      { name: 'Cid', hp: 8, alive: true },
    ]);
    expect(rested.potions).toEqual({});
    expect(rested.breath).toBe('The Bold Foxes catch their breath. Cid drinks a basic healing potion (2d4+2: 8). Bev drinks a basic healing potion (2d4+2: 8). 0 potions left.');
  });
});

function admit(seed: number, weights: readonly PotionSharingWeight[], ticks: number[]) {
  const rng = new Rng(seed);
  const town = generateTown(new Rng(0), DEFAULT_TOWN_CONFIG, DEFAULT_HOLDING_CONFIG);
  const roster = new CompanyRoster(
    { ...DEFAULT_COMPANY_ROSTER_CONFIG, firstArrivalTick: 0 },
    DEFAULT_HERO_ECONOMY, DEFAULT_TOWN_CONFIG, DEFAULT_HOLDING_CONFIG,
    { potionSharing: weights },
  );
  const ledger = { partiesArrived: 0, resurrections: 0, retirements: 0 };
  for (const tick of ticks) {
    roster.arrivals({ town, rng, tick, ledger, board: { open: () => [] }, report: () => {} });
  }
  return {
    policies: roster.active().map((party) => party.policies?.potionSharing),
    next: rng.int(0, 1_000_000_000),
  };
}

describe('drawing a potion sharing policy', () => {
  it('draws once per company from the seeded generator, and the stream advances the same whatever the weights', () => {
    const weights = [companyOrderOnly, mostHurtOnly, DEFAULT_POLICIES_CONFIG.potionSharing];
    for (let seed = 1; seed <= 20; seed++) {
      const runs = weights.map((list) => admit(seed, list, [0]));
      expect(runs[0]!.policies, `seed ${seed}`).toEqual(['company-order']);
      expect(runs[1]!.policies, `seed ${seed}`).toEqual(['most-hurt']);
      expect(runs.map((run) => run.next), `seed ${seed}`).toEqual([runs[0]!.next, runs[0]!.next, runs[0]!.next]);
      expect(admit(seed, DEFAULT_POLICIES_CONFIG.potionSharing, [0]).policies).toEqual(
        admit(seed, DEFAULT_POLICIES_CONFIG.potionSharing, [0]).policies,
      );
    }

    const two = weights.map((list) => admit(5, list, [0, 10_000]));
    expect(two[0]!.policies).toEqual(['company-order', 'company-order']);
    expect(two[1]!.policies).toEqual(['most-hurt', 'most-hurt']);
    expect(two.map((run) => run.next)).toEqual([two[0]!.next, two[0]!.next, two[0]!.next]);
  });

  it('gives a stranded band the policy the roster weights dictate', () => {
    const arrive = (weights: readonly PotionSharingWeight[]) => {
      const rng = new Rng(4);
      const town = generateTown(new Rng(0), DEFAULT_TOWN_CONFIG, DEFAULT_HOLDING_CONFIG);
      const roster = new CompanyRoster(
        { ...DEFAULT_COMPANY_ROSTER_CONFIG, patienceTicks: 7, firstArrivalTick: 0 },
        DEFAULT_HERO_ECONOMY, DEFAULT_TOWN_CONFIG, DEFAULT_HOLDING_CONFIG,
        { potionSharing: weights },
      );
      const stranded = createParty(new Rng(8), 2, 2, 0, STARTING_GOLD, DEFAULT_POLICIES_CONFIG.potionSharing);
      stranded.idleTicks = 7;
      roster.replaceForScenario([stranded]);
      roster.arrivals({
        town, rng, tick: 0,
        ledger: { partiesArrived: 0 },
        board: { open: () => [] },
        report: () => {},
      });
      const band = roster.active().find((party) => party !== stranded);
      return band?.policies?.potionSharing;
    };

    expect(arrive(companyOrderOnly)).toBe('company-order');
    expect(arrive(mostHurtOnly)).toBe('most-hurt');
  });

  it('advances the world stream the same whatever the weights, and a seed repeats its policy', () => {
    const world = (weights: readonly PotionSharingWeight[]) => {
      const game = new Game({ seed: 4, policies: { potionSharing: [...weights] }, world: { maxOpenQuests: 0 } });
      game.step();
      const state = JSON.parse(game.regressionState()) as {
        rng: { s: number };
        parties: { policies?: { potionSharing: string } }[];
      };
      return { rng: state.rng, policy: state.parties[0]?.policies?.potionSharing };
    };
    const ordered = world(companyOrderOnly);
    const hurt = world(mostHurtOnly);
    const either = world(DEFAULT_POLICIES_CONFIG.potionSharing);
    expect(ordered.policy).toBe('company-order');
    expect(hurt.policy).toBe('most-hurt');
    expect(ordered.rng).toEqual(hurt.rng);
    expect(ordered.rng).toEqual(either.rng);
    expect(world(DEFAULT_POLICIES_CONFIG.potionSharing)).toEqual(either);
  });

  it('keeps the host\'s policies when two companies merge', () => {
    const rng = new Rng(6);
    const host = createParty(rng, 2, 4, 0, STARTING_GOLD, DEFAULT_POLICIES_CONFIG.potionSharing);
    const donor = createParty(rng, 2, 2, 0, STARTING_GOLD, DEFAULT_POLICIES_CONFIG.potionSharing);
    host.policies = { potionSharing: 'most-hurt' };
    donor.policies = { potionSharing: 'company-order' };
    const roster = new CompanyRoster(
      DEFAULT_COMPANY_ROSTER_CONFIG, DEFAULT_HERO_ECONOMY, DEFAULT_TOWN_CONFIG, DEFAULT_HOLDING_CONFIG, DEFAULT_POLICIES_CONFIG,
    );
    roster.replaceForScenario([host, donor]);
    roster.merge(host, donor, { coin: openCoin({ goldPaid: 0, goldSpentByHeroes: 0, goldSpentOnProduction: 0 }) });
    expect(host.policies).toEqual({ potionSharing: 'most-hurt' });
  });
});

describe('potion sharing weights', () => {
  it('defaults to 50 / 50 and rejects an empty list or a list of zeroes', () => {
    expect(DEFAULT_CONFIG.policies.potionSharing).toEqual([
      { policy: 'company-order', weight: 50 },
      { policy: 'most-hurt', weight: 50 },
    ]);
    const document = () => JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as { policies: { potionSharing: unknown } };
    const empty = document();
    empty.policies.potionSharing = [];
    const emptied = validateGameConfig(empty);
    expect(emptied.ok).toBe(false);
    if (!emptied.ok) expect(emptied.errors).toContain('policies.potionSharing: empty weight list');
    const zeroes = document();
    zeroes.policies.potionSharing = [
      { policy: 'company-order', weight: 0 },
      { policy: 'most-hurt', weight: 0 },
    ];
    const zeroed = validateGameConfig(zeroes);
    expect(zeroed.ok).toBe(false);
    if (!zeroed.ok) expect(zeroed.errors).toContain('policies.potionSharing: every weight is zero');
  });
});
