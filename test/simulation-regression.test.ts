import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { Game } from '../src/sim/game';

it.each([7, 42, 20260907])('preserves state and event history at every tick for seed %s', (seed) => {
  const game = new Game({ seed });
  const history = createHash('sha256');
  for (let tick = 0; tick < 400; tick++) {
    game.step();
    history.update(game.regressionState());
  }
  expect(history.digest('hex')).toMatchSnapshot();
}, 20_000);
