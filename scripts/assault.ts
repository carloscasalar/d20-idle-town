import { DEFAULT_HERO_ECONOMY, healHero, potionHeal } from '../src/adventurers/hero';
import { DEFAULT_COMPANY_ROSTER_CONFIG } from '../src/adventurers/company-roster';
import { aliveMembers, createParty } from '../src/adventurers/party';
import { runCombat } from '../src/combat/battlecast';
import { Rng } from '../src/core/rng';
import { generateAssault } from '../src/quests/quest';
import { DEFAULT_HOLDING_CONFIG } from '../src/town/assets';
import { createLair, DEFAULT_LAIR_CONFIG, LAIR_THEMES } from '../src/town/lairs';
import { DEFAULT_TOWN_CONFIG, generateTown, serviceOf } from '../src/town/town';
import { COMBAT_RULES, QUEST_GENERATION, STARTING_GOLD } from '../test/helpers/supplied-config';

const trials = Number(process.env.TRIALS ?? 40);
const scale = Number(process.env.SCALE ?? 1.25);
const rng = new Rng(Number(process.env.SEED ?? 7));
const town = generateTown(rng, DEFAULT_TOWN_CONFIG, DEFAULT_HOLDING_CONFIG);
const guild = serviceOf(town, 'guild');

for (const level of [5, 6, 8]) {
  for (const partyLevelOffset of [0, 1]) {
    let wins = 0, deaths = 0, reachedBoss = 0;
    for (let t = 0; t < trials; t++) {
      const lair = createLair(rng, rng.pick(LAIR_THEMES), level, 0, DEFAULT_COMPANY_ROSTER_CONFIG.companySize, DEFAULT_LAIR_CONFIG);
      const quest = generateAssault(rng, lair, guild, DEFAULT_COMPANY_ROSTER_CONFIG.companySize, 0, scale, QUEST_GENERATION);
      const party = createParty(rng, level + partyLevelOffset, DEFAULT_COMPANY_ROSTER_CONFIG.companySize, 0, STARTING_GOLD);
      party.potions = 4;
      let ok = true;
      for (let i = 0; i < quest.encounters.length && ok; i++) {
        const fighters = aliveMembers(party);
        const boss = i === quest.encounters.length - 1;
        if (boss) reachedBoss++;
        const out = runCombat(fighters, quest.encounters[i]!, rng.seed(), { ...COMBAT_RULES, noRetreat: boss });
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
          if (party.potions > 0 && h.hp < h.maxHp * 0.5) { party.potions--; healHero(h, potionHeal(h, DEFAULT_HERO_ECONOMY)); }
        }
      }
      if (ok) wins++;
    }
    console.log(`lair L${level} vs party L${level + partyLevelOffset}: cleared ${(100 * wins / trials).toFixed(0)}%  reached boss ${(100 * reachedBoss / trials).toFixed(0)}%  deaths/attempt ${(deaths / trials).toFixed(2)}`);
  }
}
