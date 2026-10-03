import { describe, expect, it } from 'vitest';
import { DEFAULT_COMPANY_ROSTER_CONFIG } from '../src/adventurers/company-roster';
import { createParty } from '../src/adventurers/party';
import { Rng } from '../src/core/rng';
import { instantiate, ITEM_CATALOGUE } from '../src/items/items';
import type { Quest } from '../src/quests/quest';
import { Game } from '../src/sim/game';
import { createLair } from '../src/town/lairs';
import { STARTING_GOLD } from './helpers/supplied-config';
import { DEFAULT_LAIR_CONFIG } from '../src/town/lairs';

describe('Game.view', () => {
  it('gives a renderer an immutable snapshot of the clock and visible town settings', () => {
    let townName = '';
    const game = Game.forTesting({ seed: 11, board: { difficultyScale: 1.4 } }, (scenario) => {
      townName = scenario.town.name;
    });

    const view = game.view();

    expect(view.time).toBe('Day 1, 00:00');
    expect(view.town.name).toBe(townName);
    expect(view.difficultyScale).toBe(1.4);
    expect(() => {
      (view.town as { name: string }).name = 'Changed by a renderer';
    }).toThrow();
    expect(game.view().town.name).toBe(townName);
  });

  it('summarises each active company state without exposing party state to the renderer', () => {
    const rng = new Rng(12);
    const quest: Quest = {
      id: 'quest-1', kind: 'contract', title: 'Clear Stonebridge', place: 'Stonebridge', giverId: 'employer-1', assetId: null, lairId: null,
      theme: 'goblins', level: 1, encounters: [
        { difficulty: 'easy', monsters: [], totalXp: 0, tier: 'Low' },
        { difficulty: 'hard', monsters: [], totalXp: 0, tier: 'High' },
      ],
      revealed: 1, countRevealed: false, reward: 100, itemReward: null, guildOnly: false, status: 'taken', partyId: null, postedAt: 0,
    };
    const incomplete = createParty(rng, 1, 3, 0, STARTING_GOLD);
    incomplete.id = 'incomplete';
    incomplete.idleTicks = 6;
    const traveling = createParty(rng, 2, 4, 0, STARTING_GOLD);
    traveling.id = 'traveling';
    traveling.status = 'traveling';
    traveling.questId = quest.id;
    traveling.ticksLeft = 2;
    const questing = createParty(rng, 2, 4, 0, STARTING_GOLD);
    questing.id = 'questing';
    questing.status = 'questing';
    questing.questId = quest.id;
    questing.progress = 1;
    const returning = createParty(rng, 2, 4, 0, STARTING_GOLD);
    returning.id = 'returning';
    returning.status = 'returning';
    returning.ticksLeft = 3;
    const resting = createParty(rng, 2, 4, 0, STARTING_GOLD);
    resting.id = 'resting';
    resting.status = 'resting';
    resting.ticksLeft = 4;
    const disbanded = createParty(rng, 2, 4, 0, STARTING_GOLD);
    disbanded.status = 'disbanded';
    const game = Game.forTesting({ seed: 12 }, (scenario) => {
      scenario.quests = [quest];
      scenario.parties = [incomplete, traveling, questing, returning, resting, disbanded];
    });

    expect(game.view().parties.map((party) => [party.id, party.statusText, party.level])).toEqual([
      ['incomplete', 'waiting for recruits (6h)', 1],
      ['traveling', 'on the road to Stonebridge (2h)', 2],
      ['questing', 'fighting at Stonebridge (1/2)', 2],
      ['returning', 'returning (3h)', 2],
      ['resting', 'resting at the inn (4h)', 2],
    ]);
  });

  it('resolves the board’s employers, companies, lairs and hidden encounters', () => {
    const rng = new Rng(13);
    const party = createParty(rng, 2, 4, 0, STARTING_GOLD);
    party.id = 'party-1';
    party.name = 'The Lanterns';
    const lair = createLair(rng, 'goblins', 4, 0, DEFAULT_COMPANY_ROSTER_CONFIG.companySize, DEFAULT_LAIR_CONFIG);
    lair.id = 'lair-1';
    lair.name = 'Cragmaw warcamp';
    lair.strength = 3;
    lair.hoard.gold = 250;
    const reward = instantiate(rng, ITEM_CATALOGUE[0]!);
    let employerName = '';
    const game = Game.forTesting({ seed: 13 }, (scenario) => {
      const employer = scenario.town.employers[0]!;
      employerName = employer.name;
      const open: Quest = {
        id: 'open', kind: 'contract', title: 'Clear Stonebridge', place: 'Stonebridge', giverId: employer.id, assetId: null, lairId: lair.id,
        theme: 'goblins', level: 2, encounters: [
          { difficulty: 'easy', monsters: [{ name: 'Goblin Warrior', count: 2, xpEach: 50 }], totalXp: 100, tier: 'Low' },
          { difficulty: 'hard', monsters: [{ name: 'Goblin Boss', count: 1, xpEach: 200 }], totalXp: 200, tier: 'High' },
        ],
        revealed: 1, countRevealed: true, reward: 300, itemReward: reward, guildOnly: true, status: 'open', partyId: null, postedAt: 0,
      };
      const taken: Quest = { ...open, id: 'taken', title: 'Break the warcamp', kind: 'assault', status: 'taken', partyId: party.id, revealed: 2, guildOnly: false };
      scenario.parties = [party];
      scenario.lairs = [lair];
      scenario.quests = [open, taken];
    });

    const board = game.view().board;

    expect(board.open).toMatchObject([
      {
        id: 'open', title: 'Clear Stonebridge', difficultyCode: 'E/?', giverName: employerName, themeLabel: 'Goblinoids', partyName: null,
        lair: { name: 'Cragmaw warcamp', strength: 3, hoardGold: 250 },
        encounters: [
          { number: 1, difficulty: 'easy', description: '2x Goblin Warrior' },
          { number: 2, difficulty: null, description: null },
        ],
      },
    ]);
    expect(board.taken[0]).toMatchObject({ id: 'taken', partyName: 'The Lanterns', kind: 'assault', encounters: [
      { number: 1, difficulty: 'easy', description: '2x Goblin Warrior' },
      { number: 2, difficulty: 'hard', description: 'Goblin Boss' },
    ] });
  });

  it('summarises the town economy, holdings, lairs, counters and chronicle as immutable read data', () => {
    const rng = new Rng(14);
    const lair = createLair(rng, 'goblins', 4, 0, DEFAULT_COMPANY_ROSTER_CONFIG.companySize, DEFAULT_LAIR_CONFIG);
    lair.name = 'The Broken Fang';
    lair.strength = 3;
    lair.raidCooldown = 47;
    lair.hoard.gold = 250;
    let employerName = '';
    let assetStatus: 'safe' | 'threatened' | 'ravaged' = 'safe';
    const game = Game.forTesting({ seed: 14 }, (scenario) => {
      const employer = scenario.town.employers[0]!;
      const asset = employer.assets[0]!;
      employerName = employer.name;
      employer.assets = [asset];
      employer.upkeepPerDay = 12;
      employer.treasury = 700;
      employer.stock = [instantiate(new Rng(15), ITEM_CATALOGUE[0]!)];
      asset.name = 'The Salt Mine';
      asset.incomePerDay = 50;
      asset.status = 'ravaged';
      asset.loot.gold = 35;
      assetStatus = asset.status;
      scenario.lairs = [lair];
      scenario.stats.itemsFound = 2;
      scenario.stats.itemsSold = 1;
      scenario.stats.raids = 4;
      scenario.chronicle = [{ tick: 3, kind: 'town', text: 'A remembered event.' }];
    });

    const view = game.view();

    expect(view.town.employers.find((candidate) => candidate.name === employerName)).toMatchObject({
      treasury: 700,
      dailyNet: -12,
      assets: [{ name: 'The Salt Mine', kindLabel: 'hunting lodge', status: 'ravaged', statusLabel: 'overrun', hasLoot: true }],
      stock: [{ name: 'Longsword +1', effect: '+1 to hit and damage' }],
    });
    expect(view.lairs).toMatchObject([{ name: 'The Broken Fang', strength: 3, nextRaidIn: 47, raidInterval: 78, hoardGold: 250 }]);
    expect(view.stats).toMatchObject({ itemsFound: 2, itemsSold: 1, raids: 4 });
    expect(view.chronicle).toEqual([{ tick: 3, kind: 'town', text: 'A remembered event.' }]);
    expect(() => {
      (view.town.employers[0]!.assets[0]! as { status: string }).status = 'safe';
    }).toThrow();
    expect(game.view().town.employers.find((candidate) => candidate.name === employerName)?.assets[0]?.status).toBe(assetStatus);
  });
});
