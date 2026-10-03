import { getMonsterByName } from 'battlecast-engine';
import { describe, expect, it } from 'vitest';
import { createHero } from '../src/adventurers/hero';
import { runCombat } from '../src/combat/battlecast';
import { Rng } from '../src/core/rng';
import type { EncounterSpec } from '../src/quests/encounters';
import { Game } from '../src/sim/game';
import { LONG_SIMULATION_TIMEOUT_MS } from './helpers/simulation';

const roc = getMonsterByName('Roc')!;

/** One fighter against six Rocs: the smallest party whose Gargantuan foe does not fit. */
function sixRocs(): EncounterSpec {
  return {
    difficulty: 'hard',
    monsters: [{ name: roc.name, count: 6, xpEach: roc.xp }],
    totalXp: roc.xp * 6,
    tier: 'High',
  };
}

describe('a Gargantuan creature\'s space', () => {
  it('still fights when six Rocs face a single hero', () => {
    const hero = createHero(new Rng(1), 1, 'Fighter');
    const out = runCombat([hero], sixRocs(), 7);
    expect(out.opening).toContain('6x Roc');
    expect(out.rounds).toBeGreaterThan(0);
    expect(out.lines.join('\n')).toContain('Roc 6');
  });

  it('plays seed 75 for 1,500 hours', () => {
    const game = new Game({ seed: 75 });
    for (let hour = 0; hour < 1500; hour++) game.step();
    expect(game.view().time).toBe('Day 63, 12:00');
  }, LONG_SIMULATION_TIMEOUT_MS);
});
