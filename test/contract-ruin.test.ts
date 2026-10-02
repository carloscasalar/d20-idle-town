import { describe, expect, it } from 'vitest';
import { createParty } from '../src/adventurers/party';
import { Rng } from '../src/core/rng';
import { generateAssault, generateQuest, type Quest } from '../src/quests/quest';
import { Game, TICKS_PER_DAY } from '../src/sim/game';
import { createLair } from '../src/town/lairs';
import { serviceOf, type Town } from '../src/town/town';

describe('employer ruin', () => {
  it.each(['threatened', 'ravaged'] as const)('releases all open contracts from %s holdings without changing their status', (status) => {
    let employerId = '';
    const game = Game.forTesting({ seed: 21, ruinDays: 1, maxOpenQuests: 0, maxParties: 0 }, (scenario) => {
      const rng = new Rng(21);
      const employer = scenario.town.employers[0]!;
      employerId = employer.id;
      employer.treasury = 0;
      employer.upkeepPerDay = 10_000;
      scenario.tick = TICKS_PER_DAY - 1;
      scenario.parties = [];
      const lair = createLair(rng, 'goblins', 5, scenario.tick);
      lair.raidCooldown = 100;
      const bounty = generateAssault(rng, lair, serviceOf(scenario.town, 'guild'), 4, scenario.tick);
      lair.questId = bounty.id;
      scenario.lairs = [lair];
      scenario.quests = [bounty, ...employer.assets.map((asset) => {
        asset.status = status;
        const quest = generateQuest(rng, { employer, asset, theme: lair.theme, lair, level: 1, partySize: 4, tick: scenario.tick });
        asset.questId = quest.id;
        return quest;
      })];
    });

    expect(game.view().board.open.filter((quest) => quest.kind === 'contract').length).toBeGreaterThan(0);
    game.step();

    // The renderer view omits holding quest IDs and completed/failed contracts.
    const state = JSON.parse(game.regressionState()) as { town: Town; quests: Quest[] };
    const employer = state.town.employers.find((candidate) => candidate.id === employerId)!;
    expect(employer.ruined).toBe(true);
    expect(state.quests.filter((quest) => quest.giverId === employerId).every((quest) => quest.status === 'failed')).toBe(true);
    expect(employer.assets.map((asset) => asset.questId)).toEqual(employer.assets.map(() => null));
    expect(employer.assets.every((asset) => asset.status === status)).toBe(true);
    expect(employer.questsFailed).toBe(0);
    expect(game.view().stats).toMatchObject({ employersRuined: 1, questsFailed: 0, questsExpired: 0 });
    // These contracts came from a lair whose guild bounty is still open.
    expect(game.view().board.open).toHaveLength(1);
    expect(game.view().lairs[0]!.bountyPosted).toBe(true);
  });

  it('releases a ruined guild’s open bounty while keeping its taken bounty', () => {
    const game = Game.forTesting({ seed: 22, ruinDays: 1, maxOpenQuests: 0, maxParties: 0 }, (scenario) => {
      const rng = new Rng(22);
      const guild = serviceOf(scenario.town, 'guild');
      guild.treasury = 0;
      guild.upkeepPerDay = 10_000;
      scenario.tick = TICKS_PER_DAY - 1;
      const lairs = [createLair(rng, 'goblins', 5, scenario.tick), createLair(rng, 'undead', 5, scenario.tick)];
      const bounties = lairs.map((lair) => {
        lair.raidCooldown = 100;
        const bounty = generateAssault(rng, lair, guild, 4, scenario.tick);
        lair.questId = bounty.id;
        return bounty;
      });
      const company = createParty(rng, 5, 4, scenario.tick);
      const taken = bounties[1]!;
      taken.status = 'taken';
      taken.partyId = company.id;
      company.questId = taken.id;
      company.status = 'traveling';
      company.ticksLeft = 10;
      scenario.parties = [company];
      scenario.lairs = lairs;
      scenario.quests = bounties;
    });

    expect(game.view().board.open).toHaveLength(1);
    expect(game.view().lairs.every((lair) => lair.bountyPosted)).toBe(true);
    game.step();

    const view = game.view();
    expect(view.town.employers.find((employer) => employer.service === 'guild')!.ruined).toBe(true);
    expect(view.board.open).toHaveLength(0);
    expect(view.board.taken).toHaveLength(1);
    expect(view.lairs.map((lair) => lair.bountyPosted)).toEqual([false, true]);
    expect(view.lairs.every((lair) => lair.status === 'active')).toBe(true);
    expect(view.stats).toMatchObject({ employersRuined: 1, questsFailed: 0, questsExpired: 0 });
  });
});
