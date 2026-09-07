import { HERO_CLASS_NAMES } from 'battlecast-engine';
import { createHero } from '../src/adventurers/hero';
import { runCombat } from '../src/combat/battlecast';
import { Rng } from '../src/core/rng';
import { buildEncounter, DIFFICULTIES, xpBand } from '../src/quests/encounters';
import { THEME_IDS } from '../src/quests/themes';

const levels = (process.env.LEVELS ?? '1,2,3,5,8').split(',').map(Number);
const trials = Number(process.env.TRIALS ?? 40);
const rng = new Rng(Number(process.env.SEED ?? 1));

for (const level of levels) {
  for (const difficulty of DIFFICULTIES) {
    let wins = 0, deaths = 0, tpk = 0, rounds = 0;
    for (let t = 0; t < trials; t++) {
      const heroes = Array.from({ length: 4 }, () => createHero(rng, level, rng.pick(HERO_CLASS_NAMES)));
      const spec = buildEncounter(rng, rng.pick(THEME_IDS), 4, level, difficulty);
      const out = runCombat(heroes, spec, rng.seed());
      if (out.winner === 'party') wins++;
      const d = out.heroes.filter((h) => !h.alive).length;
      deaths += d;
      if (d === 4) tpk++;
      rounds += out.rounds;
    }
    const band = xpBand(4, level, difficulty);
    console.log(
      `L${level} ${difficulty.padEnd(12)} band ${band.min}-${band.max}  win ${(100 * wins / trials).toFixed(0)}%  deaths/fight ${(deaths / trials).toFixed(2)}  tpk ${(100 * tpk / trials).toFixed(0)}%  rounds ${(rounds / trials).toFixed(1)}`,
    );
  }
}
