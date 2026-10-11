import { THEME_IDS, themeMonsters } from '../src/quests/themes';
import { Game } from '../src/sim/game';

console.log(THEME_IDS.map((id) => `${id}:${themeMonsters(id).length}`).join(' '));
const g = new Game({ seed: Number(process.env.SEED ?? 42) });
for (let i = 0; i < Number(process.env.TICKS ?? 600); i++) g.step();
const kinds = new Map<string, number>();
let fights = 0;
for (const encounter of g.encounterSamples()) {
  fights++;
  for (const monster of encounter.monsters) {
    kinds.set(monster.name, (kinds.get(monster.name) ?? 0) + monster.count);
  }
}
const sorted = [...kinds.entries()].sort((a, b) => b[1] - a[1]);
console.log(`encounters ${fights}, distinct kinds ${kinds.size}, top: ${sorted.slice(0, 8).map(([n, c]) => `${n} ${c}`).join(', ')}`);
