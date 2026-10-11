import { Game } from '../src/sim/game';

/**
 * Long runs through Game, outside the default test suite.
 * FROM=1 TO=150 HOURS=1500 pnpm exec vite-node scripts/combat-sweep.ts
 */
const from = Number(process.env.FROM ?? 1);
const to = Number(process.env.TO ?? 150);
const hours = Number(process.env.HOURS ?? 1500);
if (!Number.isInteger(from) || !Number.isInteger(to) || !Number.isInteger(hours) || from > to || hours < 1) {
  console.error(`Bad range FROM=${process.env.FROM} TO=${process.env.TO} HOURS=${process.env.HOURS}`);
  process.exit(1);
}
const crashes: string[] = [];

for (let seed = from; seed <= to; seed++) {
  const game = new Game({ seed });
  let crashed = false;
  for (let hour = 1; hour <= hours; hour++) {
    try {
      game.step();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const line = `CRASH seed ${seed} hour ${hour} (${game.view().time}): ${message}`;
      crashes.push(line);
      console.log(line);
      crashed = true;
      break;
    }
  }
  if (!crashed) console.log(`ok seed ${seed}`);
}

if (crashes.length === 0) console.log(`no crashes in seeds ${from}-${to} for ${hours} hours`);
