import { describe, expect, it } from 'vitest';
import { createParty } from '../src/adventurers/party';
import { Rng } from '../src/core/rng';
import type { Quest } from '../src/quests/quest';
import { Game, type GameEventView, type GameScenario } from '../src/sim/game';
import { STARTING_GOLD } from './helpers/supplied-config';

function assertStateIsNotPublic(game: Game): void {
  if (false) {
    // @ts-expect-error Simulation collections are private outside Game.
    game.parties;
  }
}

describe('Game access boundaries', () => {
  it('builds a controlled scenario without exposing mutable state from a running game', () => {
    const party = createParty(new Rng(9), 1, 4, 0, STARTING_GOLD);
    let capturedScenario: GameScenario | undefined;
    const game = Game.forTesting({ seed: 9, roster: { maxCompanies: 1 }, world: { maxOpenQuests: 0 } }, (scenario) => {
      capturedScenario = scenario;
      scenario.lairs = [];
      scenario.parties = [party];
      for (const employer of scenario.town.employers) {
        employer.stock = [];
        employer.restockIn = 1000;
      }
    });

    game.step();

    expect(game.view().parties).toHaveLength(1);
    assertStateIsNotPublic(game);
    expect(game.regressionState()).toContain('"tick":1');
    expect(() => capturedScenario!.lairs).toThrow('only available while its setup callback runs');
  });

  it('delivers immutable events to subscribers', () => {
    let event: GameEventView | undefined;
    const game = Game.forTesting({ seed: 10, roster: { maxCompanies: 1 }, world: { maxOpenQuests: 0 } }, (scenario) => {
      scenario.lairs = [];
      scenario.parties = [];
    });
    game.onEvent((received) => { event = received; });

    game.step();

    expect(event).toBeDefined();
    expect(() => {
      (event as { text: string }).text = 'Changed by a subscriber';
    }).toThrow();
  });

  it('returns immutable encounter compositions for calibration', () => {
    const quest: Quest = {
      id: 'quest-1', kind: 'contract', title: 'A contract', place: 'Somewhere', giverId: 'employer-1', assetId: null, lairId: null,
      theme: 'goblins', level: 1, encounters: [{ difficulty: 'easy', monsters: [{ name: 'Goblin Warrior', count: 2, xpEach: 50 }], totalXp: 100, tier: 'Low' }],
      revealed: 0, countRevealed: false, reward: 100, itemReward: null, guildOnly: false, status: 'open', partyId: null, postedAt: 0,
    };
    const game = Game.forTesting({ seed: 11 }, (scenario) => { scenario.quests = [quest]; });

    const samples = game.encounterSamples();

    expect(samples).toEqual([{ monsters: [{ name: 'Goblin Warrior', count: 2 }] }]);
    expect(() => {
      (samples[0]!.monsters[0]! as { count: number }).count = 99;
    }).toThrow();
  });
});
