import { expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { readSimulationState } from './helpers/simulation';

it('reads every domain fact without retaining event history', () => {
  const game = Game.forTesting({ seed: 42 }, (scenario) => {
    // A boundary-looking string in a domain value must not truncate the JSON.
    scenario.town.name = 'A town with ,"events": in its name';
    scenario.events.push({ tick: 0, kind: 'town', text: 'A long history', detail: ['history detail'] });
  });
  game.step();
  const { tick, town, parties, quests, lairs, stats } = JSON.parse(game.regressionState());
  expect(readSimulationState(game)).toEqual({ tick, town, parties, quests, lairs, stats });
});
