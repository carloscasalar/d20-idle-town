import { partyLevel } from '../src/adventurers/party';
import { Game } from '../src/sim/game';

const g = new Game({ seed: Number(process.env.SEED ?? 42) });
const ticks = Number(process.env.TICKS ?? 1200);
const marks: string[] = [];
g.onEvent((e) => {
  if (/bounty on|take the guild|break |beaten|Word spreads|go(es)? to the hoard/.test(e.text)) marks.push(`[${e.tick}] ${e.text.slice(0, 200)}`);
});
for (let i = 0; i < ticks; i++) g.step();
console.log(marks.join('\n'));
console.log('--- lairs:', g.lairs.map((l) => `${l.name} L${l.level} ${l.status} str${l.strength} raids${l.raids}/${l.raidsWon} hoard${l.hoard.gold}`).join(' | '));
console.log('--- parties:', g.activeParties.map((p) => `${p.name} L${partyLevel(p)} ${p.guildMember ? 'guild' : ''} ${p.gold}gp`).join(' | '));
console.log('--- stats', JSON.stringify(g.stats));
