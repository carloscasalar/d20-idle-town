import { describe, expect, it } from 'vitest';
import { createHero } from '../src/adventurers/hero';
import { runCombat } from '../src/combat/battlecast';
import { Rng } from '../src/core/rng';
import type { EncounterSpec } from '../src/quests/encounters';

const goblins: EncounterSpec = { difficulty: 'intermediate', monsters: [{ name: 'Goblin Warrior', count: 4, xpEach: 50 }, { name: 'Goblin Boss', count: 1, xpEach: 200 }], totalXp: 400, tier: 'Moderate' };

describe('how a fight opens', () => {
  it('always says how the two sides met, and ambushes come out both ways over many seeds', () => {
    const rng = new Rng(9);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const party = ['Fighter', 'Cleric', 'Rogue', 'Wizard'].map((c) => createHero(rng, 3, c as 'Fighter'));
      const out = runCombat(party, goblins, seed);
      expect(out.opening.length).toBeGreaterThan(10);
      expect(out.lines[0]).toBe(out.opening);
      seen.add(out.ambush ?? 'none');
    }
    expect(seen.has('none')).toBe(true);
    expect(seen.has('monsters') || seen.has('party')).toBe(true);
  });

  it('deep in a lair the defenders are the ones watching', () => {
    const rng = new Rng(4);
    let monstersFirst = 0;
    const trials = 80;
    for (let seed = 100; seed < 100 + trials; seed++) {
      const party = ['Fighter', 'Cleric', 'Rogue', 'Wizard'].map((c) => createHero(rng, 5, c as 'Fighter'));
      const out = runCombat(party, goblins, seed, { lairDepth: { index: 4, total: 5 } });
      if (/catch the company unawares|try to sneak up/.test(out.opening)) monstersFirst++;
    }
    expect(monstersFirst / trials).toBeGreaterThan(0.6);
  });
});
