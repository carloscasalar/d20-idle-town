import { Game } from '../src/sim/game';

const scales = (process.env.SCALES ?? '1,1.25,1.5,1.75').split(',').map(Number);
const ticks = Number(process.env.TICKS ?? 600);
const seeds = (process.env.SEEDS ?? '1,2,3').split(',').map(Number);

for (const difficultyScale of scales) {
  const totals = { quests: 0, deaths: 0, wiped: 0, arrived: 0, failed: 0, res: 0 };
  for (const seed of seeds) {
    const g = new Game({ seed, board: { difficultyScale } });
    for (let i = 0; i < ticks; i++) g.step();
    const { stats } = g.view();
    totals.quests += stats.questsCompleted;
    totals.deaths += stats.heroesDied;
    totals.wiped += stats.partiesWiped;
    totals.arrived += stats.partiesArrived;
    totals.failed += stats.questsFailed;
    totals.res += stats.resurrections;
  }
  const n = seeds.length;
  console.log(
    `scale ${difficultyScale}: quests ${(totals.quests / n).toFixed(0)}  failed ${(totals.failed / n).toFixed(0)}  deaths ${(totals.deaths / n).toFixed(0)} (${(totals.deaths / totals.quests).toFixed(2)}/quest)  wiped ${(totals.wiped / n).toFixed(1)} of ${(totals.arrived / n).toFixed(0)}  raised ${(totals.res / n).toFixed(0)}`,
  );
}
