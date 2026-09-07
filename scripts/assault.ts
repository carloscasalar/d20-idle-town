import { healHero, potionHeal } from '../src/adventurers/hero';
import { aliveMembers, createParty } from '../src/adventurers/party';
import { runCombat } from '../src/combat/battlecast';
import { Rng } from '../src/core/rng';
import { generateAssault } from '../src/quests/quest';
import { createLair, LAIR_THEMES } from '../src/town/lairs';
import { generateTown, serviceOf } from '../src/town/town';

const trials = Number(process.env.TRIALS ?? 40);
const scale = Number(process.env.SCALE ?? 1.25);
const rng = new Rng(Number(process.env.SEED ?? 7));
const town = generateTown(rng);
const guild = serviceOf(town, 'guild');

for (const level of [5, 6, 8]) {
  for (const partyLevelOffset of [0, 1]) {
    let wins = 0, deaths = 0, reachedBoss = 0;
    for (let t = 0; t < trials; t++) {
      const lair = createLair(rng, rng.pick(LAIR_THEMES), level, 0);
      const quest = generateAssault(rng, lair, guild, 4, 0, scale);
      const party = createParty(rng, level + partyLevelOffset, 4, 0);
      party.potions = 4;
      let ok = true;
      for (let i = 0; i < quest.encounters.length && ok; i++) {
        const fighters = aliveMembers(party);
        const boss = i === quest.encounters.length - 1;
        if (boss) reachedBoss++;
        const out = runCombat(fighters, quest.encounters[i]!, rng.seed(), { noRetreat: boss });
        for (const r of out.heroes) {
          const h = party.members.find((m) => m.id === r.heroId)!;
          if (r.alive) h.hp = r.hp;
          else { h.alive = false; h.hp = 0; deaths++; }
        }
        if (out.winner !== 'party') { ok = false; break; }
        const alive = aliveMembers(party);
        if (alive.length <= fighters.length / 2) { ok = false; break; }
        for (const h of alive) {
          healHero(h, Math.ceil(h.maxHp * 0.5));
          if (party.potions > 0 && h.hp < h.maxHp * 0.5) { party.potions--; healHero(h, potionHeal(h)); }
        }
      }
      if (ok) wins++;
    }
    console.log(`lair L${level} vs party L${level + partyLevelOffset}: cleared ${(100 * wins / trials).toFixed(0)}%  reached boss ${(100 * reachedBoss / trials).toFixed(0)}%  deaths/attempt ${(deaths / trials).toFixed(2)}`);
  }
}
