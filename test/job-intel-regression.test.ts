import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { LONG_SIMULATION_TIMEOUT_MS } from './helpers/simulation';

/**
 * SHA-256 over every tick of a 400-hour run, with each company's investigations
 * removed before hashing. Recorded from the commit before inquiries changed
 * shape, for seeds 7, 42 and 20260907. A match means nothing else in the
 * serialized world moved.
 */
const STRIPPED_WORLD = {
  7: 'fd0bd29beed4c5f2cffe251eb5b8a32480f1c4ccf30ccd67f3d8eab8e24dcfa7',
  42: '7eb12a0ac2695ad2d1885f01c1b216a0ecee4e3bd044554423d83c148d4d6827',
  20260907: 'f1200ba338de87cd00d69a1fca88fc1b6e75ff2a9c91206f962f2b651e91d0bb',
} as const;

function withoutInquiries(serialized: string): string {
  const state = JSON.parse(serialized) as { parties: { investigations?: unknown }[] };
  for (const party of state.parties) delete party.investigations;
  return JSON.stringify(state);
}

it.each([7, 42, 20260907] as const)(
  'matches the pre-change world once investigations are removed for seed %s',
  (seed) => {
    const game = new Game({ seed });
    const history = createHash('sha256');
    for (let tick = 0; tick < 400; tick++) {
      game.step();
      history.update(withoutInquiries(game.regressionState()));
    }
    expect(history.digest('hex')).toBe(STRIPPED_WORLD[seed]);
  },
  LONG_SIMULATION_TIMEOUT_MS,
);
