import { Game } from '../src/sim/game';

const g = new Game({ seed: Number(process.env.SEED ?? 42) });
const ticks = Number(process.env.TICKS ?? 1200);
const marks: string[] = [];
g.onEvent((e) => {
  if (/bounty on|take the guild|break |beaten|Word spreads|go(es)? to the hoard/.test(e.text)) marks.push(`[${e.tick}] ${e.text.slice(0, 200)}`);
});
for (let i = 0; i < ticks; i++) g.step();
const view = g.view();
console.log(marks.join('\n'));
console.log('--- lairs:', view.lairs.map((lair) => `${lair.name} L${lair.level} ${lair.status} str${lair.strength} raids${lair.raids}/${lair.raidsWon} hoard${lair.hoardGold}`).join(' | '));
console.log('--- parties:', view.parties.map((party) => `${party.name} L${party.level} ${party.guildMember ? 'guild' : ''} ${party.gold}gp`).join(' | '));
console.log('--- stats', JSON.stringify(view.stats));
