import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { generateQuest } from '../src/quests/quest';
import { DEFAULT_CONFIG, Game } from '../src/sim/game';
import { createAsset } from '../src/town/assets';
import { createLair } from '../src/town/lairs';
import { serviceOf } from '../src/town/town';

describe('raid posting through the hourly game', () => {
  it.each([
    { treasury: 999, owed: 0, rewards: [], raids: 0, status: 'safe' },
    { treasury: 1000, owed: 0, rewards: [800], raids: 1, status: 'threatened' },
    { treasury: 1000, owed: 980, rewards: [980, 20], raids: 1, status: 'threatened' },
  ] as const)('uses the whole treasury $treasury with $owed owed against a 1,000 gp threshold', ({ treasury, owed, rewards, raids, status }) => {
    const game = Game.forTesting({
      seed: 7,
      world: { postingThreshold: 1000, maxOpenQuests: 2 },
      board: { rewardSetAsideFor: ['apothecary'] },
      roster: { maxCompanies: 0 },
    }, (scenario) => {
      const rng = new Rng(7);
      // Only this employer can be targeted, and ordinary hourly posting is on cooldown.
      for (const employer of scenario.town.employers) {
        Object.assign(employer, { ruined: true, cooldown: 1000, assets: [] });
      }
      const employer = serviceOf(scenario.town, 'apothecary');
      Object.assign(employer, { ruined: false, treasury, generosity: 100 });
      const target = createAsset(rng, 'mine', employer.id, DEFAULT_CONFIG.holdings);
      employer.assets = [target];
      scenario.quests = [];
      if (owed > 0) {
        const holding = createAsset(rng, 'herb-garden', employer.id, DEFAULT_CONFIG.holdings);
        const work = generateQuest(rng, {
          employer, rewardTreasury: treasury, asset: holding, theme: 'beasts',
          level: 1, partySize: 4, tick: 0,
        }, DEFAULT_CONFIG);
        work.reward = owed;
        holding.questId = work.id;
        employer.assets.push(holding);
        scenario.quests = [work];
      }
      const lair = createLair(rng, 'goblins', 1, 0, 4, DEFAULT_CONFIG.lairs);
      lair.raidCooldown = 1;
      scenario.lairs = [lair];
      scenario.parties = [];
    });

    game.step();

    const view = game.view();
    expect(view.board.open.map((work) => work.reward)).toEqual(rewards);
    expect(view.board.open.filter((work) => work.lair !== null).map((work) => ({
      kind: work.kind, level: work.level, reward: work.reward,
    }))).toEqual(raids === 0 ? [] : [{ kind: 'contract', level: 1, reward: rewards[rewards.length - 1] }]);
    expect(view.board.taken).toHaveLength(0);
    expect(view.stats.raids).toBe(raids);
    expect(view.lairs[0]!.raids).toBe(raids);
    const employer = view.town.employers.find((employer) => employer.service === 'apothecary')!;
    expect(employer.treasury).toBe(treasury);
    expect(employer.questsPosted).toBe(raids);
    expect(employer.assets[0]!.status).toBe(status);
  });
});
