import { readFileSync } from 'node:fs';
import { Game } from '../src/sim/game';
import {
  ApothecaryTracker, compareMetrics, formatComparison, formatScaleReport, parseTuneArgs,
  summarizeApothecaries, TUNE_CONFIG, type ApothecaryReport, type ScaleReport,
} from './tune-report';

interface Baseline {
  commit: string;
  tuning: { ticks: number; results: ScaleReport[] };
}

function readBaseline(): Baseline | undefined {
  try {
    return JSON.parse(readFileSync(new URL('./tune-baseline.json', import.meta.url), 'utf8')) as Baseline;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

function main(): void {
  const { seeds, scales, ticks } = parseTuneArgs(process.env);
  const baseline = readBaseline();
  console.log(`tuning: seeds ${seeds.join(',')}  ticks ${ticks}  tolerance +/-${TUNE_CONFIG.tolerance * 100}%`);
  for (const difficultyScale of scales) {
    const totals = { quests: 0, deaths: 0, wiped: 0, arrived: 0, failed: 0, raised: 0 };
    const apothecaries: ApothecaryReport[] = [];
    for (const seed of seeds) {
      const game = new Game({ seed, board: { difficultyScale } });
      const tracker = new ApothecaryTracker();
      tracker.observe(game.view());
      for (let i = 0; i < ticks; i++) {
        game.step();
        tracker.observe(game.view());
      }
      const { stats } = game.view();
      totals.quests += stats.questsCompleted;
      totals.deaths += stats.heroesDied;
      totals.wiped += stats.partiesWiped;
      totals.arrived += stats.partiesArrived;
      totals.failed += stats.questsFailed;
      totals.raised += stats.resurrections;
      apothecaries.push(tracker.report());
    }
    const n = seeds.length;
    const report: ScaleReport = {
      scale: difficultyScale,
      metrics: {
        quests: totals.quests / n, failed: totals.failed / n, deaths: totals.deaths / n,
        deathsPerQuest: totals.quests === 0 ? (totals.deaths === 0 ? 0 : Infinity) : totals.deaths / totals.quests,
        wiped: totals.wiped / n, arrived: totals.arrived / n, raised: totals.raised / n,
      },
      apothecary: summarizeApothecaries(apothecaries),
    };
    for (const line of formatScaleReport(report)) console.log(line);
    const reference = baseline?.tuning.results.find((result) => result.scale === difficultyScale);
    if (!baseline) {
      console.log('baseline comparison: unavailable (scripts/tune-baseline.json not recorded yet)');
    } else if (ticks !== baseline.tuning.ticks) {
      console.log(`baseline comparison: unavailable (TICKS=${ticks}; baseline has ${baseline.tuning.ticks} ticks)`);
    } else if (!reference) {
      console.log(`baseline comparison: unavailable (scale ${difficultyScale} not recorded)`);
      process.exitCode = 1;
    } else {
      const comparison = compareMetrics(report.metrics, reference.metrics, TUNE_CONFIG.tolerance);
      for (const line of formatComparison(comparison)) console.log(line);
      if (comparison.some((metric) => !metric.passed)) process.exitCode = 1;
    }
  }
}

try {
  main();
} catch (error) {
  console.error(`tune: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
