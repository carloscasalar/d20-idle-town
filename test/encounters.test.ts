import { calculateDifficulty } from 'battlecast-engine';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { buildEncounter, DIFFICULTIES, xpBand } from '../src/quests/encounters';
import { THEME_IDS, themeMonsters } from '../src/quests/themes';

describe('themes', () => {
  it('every theme resolves to real SRD monsters', () => {
    for (const id of THEME_IDS) expect(themeMonsters(id).length, id).toBeGreaterThan(3);
  });
});

describe('buildEncounter', () => {
  it('keeps total XP inside the difficulty band for the levels adventurers actually reach', () => {
    const rng = new Rng(3);
    let outside = 0;
    let total = 0;
    for (const level of [1, 2, 3, 4, 5, 6, 8, 10]) {
      for (const difficulty of DIFFICULTIES) {
        for (const theme of THEME_IDS) {
          const spec = buildEncounter(rng, theme, 4, level, difficulty);
          const band = xpBand(4, level, difficulty);
          total++;
          if (spec.totalXp < band.min || spec.totalXp > band.max) outside++;
          expect(spec.monsters.length).toBeGreaterThan(0);
          expect(spec.monsters.reduce((s, g) => s + g.count, 0)).toBeLessThanOrEqual(6);
        }
      }
    }
    // Some theme/level combos have no monster that fits (a level 1 dragon hunt); the builder then
    // falls back to the closest it can do. That must stay rare.
    expect(outside / total).toBeLessThan(0.1);
  });

  it('bands are ordered and sit at or below the DMG "High" line', () => {
    for (const level of [1, 5, 10]) {
      const t = calculateDifficulty(4, level, 0).thresholds;
      const easy = xpBand(4, level, 'easy');
      const mid = xpBand(4, level, 'intermediate');
      const hard = xpBand(4, level, 'hard');
      expect(easy.max).toBeLessThan(mid.min);
      expect(mid.max).toBeLessThan(hard.min);
      expect(hard.max).toBeLessThan(t.high);
    }
  });
});
