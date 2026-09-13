import { createHash } from 'node:crypto';
import { expect, it, vi } from 'vitest';

// Capture the pre-refactor trajectory, not just two runs of the same implementation.
// Reset module-local ID counters before each world so snapshots do not depend on test order.
it.each([7, 42, 20260907])('preserves state and event history at every tick for seed %s', async (seed) => {
  vi.resetModules();
  const { Game } = await import('../src/sim/game');
  const game = new Game({ seed });
  const history = createHash('sha256');
  for (let tick = 0; tick < 400; tick++) {
    game.step();
    history.update(JSON.stringify({
      tick: game.tick,
      town: game.town,
      parties: game.parties,
      quests: game.quests,
      lairs: game.lairs,
      stats: game.stats,
      events: game.events,
      chronicle: game.chronicle,
      rng: game.rng,
    }));
  }
  expect(history.digest('hex')).toMatchSnapshot();
}, 20_000);
