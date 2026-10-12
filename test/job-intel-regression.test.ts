import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { LONG_SIMULATION_TIMEOUT_MS } from './helpers/simulation';

/**
 * SHA-256 over every tick of a 400-hour run, with each company's investigations
 * removed before hashing, for seeds 7, 42 and 20260907. A match means nothing
 * but investigations moved against this baseline.
 */
const STRIPPED_WORLD = {
  7: '562d2560dc64c52c9223dcd3ce4bfce9d93e3ca1b6883223f314ebc88b8de4ed',
  42: '2136fb35070c4bc551b368ac2f4f1a66a0e6ab33d7cf044a70cc6906a614967d',
  20260907: 'f6820bd5ad9bea78b4a1ffca84d08da448ab44fb02ac0fb84379945cea3f83dd',
} as const;

function withoutInquiries(serialized: string): string {
  const state = JSON.parse(serialized) as { parties: { investigations?: unknown }[] };
  for (const party of state.parties) delete party.investigations;
  return JSON.stringify(state);
}

it.each([7, 42, 20260907] as const)(
  'matches the baseline world once investigations are removed for seed %s',
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
