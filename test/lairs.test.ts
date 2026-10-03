import { describe, expect, it } from 'vitest';
import { createHero, rollSkill, skillBonus } from '../src/adventurers/hero';
import { createParty, rollClasses } from '../src/adventurers/party';
import { Rng } from '../src/core/rng';
import { generateAssault } from '../src/quests/quest';
import { DEFAULT_COMPANY_ROSTER_CONFIG } from '../src/adventurers/company-roster';
import { createLair, pickBoss } from '../src/town/lairs';
import { generateTown, serviceOf } from '../src/town/town';
import { DEFAULT_CONFIG, Game } from '../src/sim/game';
import { LONG_SIMULATION_TIMEOUT_MS } from './helpers/simulation';
import { STARTING_GOLD, QUEST_GENERATION } from './helpers/supplied-config';
import { DEFAULT_HERO_ECONOMY } from '../src/adventurers/hero';
import { DEFAULT_LAIR_CONFIG } from '../src/town/lairs';
import { DEFAULT_TOWN_CONFIG } from '../src/town/town';
import { DEFAULT_HOLDING_CONFIG } from '../src/town/assets';

describe('lairs', () => {
  it('have a boss the theme can field and an assault that ends with it', () => {
    const rng = new Rng(11);
    const lair = createLair(rng, 'goblins', 6, 0, DEFAULT_COMPANY_ROSTER_CONFIG.companySize, DEFAULT_LAIR_CONFIG);
    expect(pickBoss('goblins', 6, DEFAULT_COMPANY_ROSTER_CONFIG.companySize).name).toBe(lair.boss);
    const town = generateTown(rng, DEFAULT_TOWN_CONFIG, DEFAULT_HOLDING_CONFIG);
    const q = generateAssault(rng, lair, serviceOf(town, 'guild'), 4, 0, 1, QUEST_GENERATION);
    expect(q.kind).toBe('assault');
    expect(q.encounters.length).toBeGreaterThanOrEqual(4);
    expect(q.encounters.length).toBeLessThanOrEqual(7);
    expect(q.encounters[q.encounters.length - 1]!.monsters[0]!.name).toBe(lair.boss);
    expect(q.itemReward).not.toBeNull();
    expect(q.guildOnly).toBe(false);
  });

  it('every town starts with lairs and their raids reach the board', () => {
    const g = new Game({ seed: 5 });
    expect(g.view().lairs.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < 600; i++) g.step();
    const view = g.view();
    expect(view.stats.raids).toBeGreaterThan(0);
    expect(view.board.open.some((quest) => quest.lair !== null)).toBe(true);
  }, LONG_SIMULATION_TIMEOUT_MS);

  it('removes the posted bounty when a successful company returns and clears the lair', () => {
    const game = Game.forTesting({ seed: 23, world: { maxOpenQuests: 0 }, roster: { maxCompanies: 1 } }, (scenario) => {
      const rng = new Rng(23);
      const lair = createLair(rng, 'goblins', 5, 0, DEFAULT_COMPANY_ROSTER_CONFIG.companySize, DEFAULT_LAIR_CONFIG);
      lair.raidCooldown = 100;
      const bounty = generateAssault(rng, lair, serviceOf(scenario.town, 'guild'), 4, 0, 1, QUEST_GENERATION);
      const company = createParty(rng, 5, 4, 0, STARTING_GOLD);
      bounty.status = 'taken';
      bounty.partyId = company.id;
      lair.questId = bounty.id;
      company.questId = bounty.id;
      company.status = 'returning';
      company.progress = bounty.encounters.length;
      company.ticksLeft = 1;
      scenario.lairs = [lair];
      scenario.quests = [bounty];
      scenario.parties = [company];
    });

    expect(game.view().lairs[0]).toMatchObject({ status: 'active', bountyPosted: true });
    expect(game.view().board.taken).toHaveLength(1);

    game.step();

    const view = game.view();
    expect(view.lairs[0]).toMatchObject({ status: 'cleared', bountyPosted: false });
    expect(view.board.taken).toHaveLength(0);
    expect(view.stats).toMatchObject({ questsCompleted: 1, lairsCleared: 1 });
  });
});

function bountyScene(treasury: number) {
  return Game.forTesting({ seed: 14, roster: { maxCompanies: 1 }, world: { maxOpenQuests: 0 } }, (scenario) => {
    const rng = new Rng(14);
    const guild = serviceOf(scenario.town, 'guild');
    guild.ruined = false;
    guild.treasury = treasury;
    guild.upkeepPerDay = 0;
    const lair = createLair(rng, 'goblins', 4, 0, DEFAULT_COMPANY_ROSTER_CONFIG.companySize, DEFAULT_LAIR_CONFIG);
    lair.raidCooldown = 10_000;
    const company = createParty(rng, 4, 4, 0, STARTING_GOLD);
    scenario.tick = 100;
    scenario.lairs = [lair];
    scenario.parties = [company];
    scenario.quests = [];
  });
}

function bounties(game: Game) {
  const board = game.view().board;
  return [...board.open, ...board.taken].filter((quest) => quest.kind === 'assault');
}

describe('posting a Bounty', () => {
  it('waits until the guild’s treasury meets the posting threshold', () => {
    for (const treasury of [-40, DEFAULT_CONFIG.world.postingThreshold - 1]) {
      const game = bountyScene(treasury);
      game.step();
      expect(bounties(game)).toEqual([]);
      expect(game.view().lairs[0]).toMatchObject({ bountyPosted: false });
    }

    const game = bountyScene(DEFAULT_CONFIG.world.postingThreshold);
    game.step();
    const posted = bounties(game);
    expect(posted).toHaveLength(1);
    expect(posted[0]!.reward).toBeGreaterThanOrEqual(0);
    expect(game.view().lairs[0]).toMatchObject({ bountyPosted: true });
  });

  it('runs 1,500 hours of seed 14', () => {
    const game = new Game({ seed: 14 });
    for (let hour = 0; hour < 1_500; hour++) game.step();
  }, LONG_SIMULATION_TIMEOUT_MS);
});

describe('skill checks', () => {
  it('bards persuade with advantage and rangers read the land', () => {
    const rng = new Rng(2);
    const bard = createHero(rng, 3, 'Bard');
    const fighter = createHero(rng, 3, 'Fighter');
    const ranger = createHero(rng, 3, 'Ranger');
    expect(skillBonus(bard, 'Persuasion')).toBeGreaterThan(skillBonus(fighter, 'Persuasion'));
    const talk = rollSkill(rng, [fighter, bard, ranger], 'Persuasion', 15, DEFAULT_HERO_ECONOMY)!;
    expect(talk.hero).toBe(bard);
    expect(talk.advantage).toBe(true);
    const tracks = rollSkill(rng, [fighter, bard, ranger], 'Survival', 15, DEFAULT_HERO_ECONOMY)!;
    expect(tracks.hero).toBe(ranger);
  });

  it('full companies cover the four roles', () => {
    const rng = new Rng(3);
    for (let i = 0; i < 20; i++) {
      const classes = rollClasses(rng, 4);
      expect(new Set(classes).size).toBe(4);
      expect(classes.some((c) => ['Cleric', 'Druid', 'Bard'].includes(c))).toBe(true);
    }
  });
});
