import type { GameEmployerView } from '../src/sim/game';

export interface TuneArgs {
  seeds: number[];
  scales: number[];
  ticks: number;
}

interface ApothecaryObservation {
  readonly town: { readonly employers: readonly Pick<GameEmployerView, 'service' | 'treasury' | 'ruined'>[] };
  readonly stats: object;
}

export class ApothecaryTracker {
  private latest: ApothecaryReport = { ruined: 0, count: 0, lowestTreasuryReached: null, treasuryAtEnd: 0 };

  observe(view: ApothecaryObservation): void {
    const shops = view.town.employers.filter((employer) => employer.service === 'apothecary');
    const treasuries = shops.map((shop) => shop.treasury);
    this.latest = {
      ruined: shops.filter((shop) => shop.ruined).length,
      count: shops.length,
      lowestTreasuryReached: treasuries.length === 0 ? this.latest.lowestTreasuryReached
        : Math.min(this.latest.lowestTreasuryReached ?? Infinity, ...treasuries),
      treasuryAtEnd: treasuries.reduce((sum, treasury) => sum + treasury, 0),
      ...('goldSpentOnProduction' in view.stats && typeof view.stats.goldSpentOnProduction === 'number'
        ? { goldSpentOnProduction: view.stats.goldSpentOnProduction } : {}),
    };
  }

  report(): ApothecaryReport {
    return { ...this.latest };
  }
}

export interface TuneMetrics {
  quests: number;
  failed: number;
  deaths: number;
  deathsPerQuest: number;
  wiped: number;
  arrived: number;
  raised: number;
}

export interface ApothecaryReport {
  ruined: number;
  count: number;
  lowestTreasuryReached: number | null;
  treasuryAtEnd: number;
  goldSpentOnProduction?: number;
}

export interface ScaleReport {
  scale: number;
  metrics: TuneMetrics;
  apothecary: ApothecaryReport;
}

export const TUNE_CONFIG = {
  defaults: { seeds: '1,2,3', scales: '1,1.15,1.25,1.5,1.75', ticks: '600' },
  tolerance: 0.15,
};

export function parseTuneArgs(env: Record<string, string | undefined>): TuneArgs {
  const seedInput = env.SEEDS ?? TUNE_CONFIG.defaults.seeds;
  if (seedInput.split(',').some((entry) => entry.trim() === '')) {
    throw new Error('SEEDS must not contain empty entries');
  }
  const range = /^(\d+)\.\.(\d+)$/.exec(seedInput.trim());
  if (range && (!Number.isSafeInteger(Number(range[1])) || !Number.isSafeInteger(Number(range[2])) || Number(range[2]) < Number(range[1]))) {
    throw new Error('SEEDS range must have safe whole-number bounds in ascending order');
  }
  const seeds = range
    ? Array.from({ length: Number(range[2]) - Number(range[1]) + 1 }, (_, i) => Number(range[1]) + i)
    : seedInput.split(',').map(Number);
  if (!seeds.every((seed) => Number.isSafeInteger(seed) && seed >= 0)) {
    throw new Error('SEEDS must be non-negative whole numbers or an inclusive range such as 1..80');
  }
  const scales = (env.SCALES ?? TUNE_CONFIG.defaults.scales).split(',').map(Number);
  if (!scales.every((scale) => Number.isFinite(scale) && scale > 0)) {
    throw new Error('SCALES must be a comma list of positive finite numbers');
  }
  const tickInput = env.TICKS ?? TUNE_CONFIG.defaults.ticks;
  const ticks = Number(tickInput);
  if (tickInput.trim() === '' || !Number.isSafeInteger(ticks) || ticks < 0) {
    throw new Error('TICKS must be a non-negative whole number');
  }
  return { seeds, scales, ticks };
}

export function formatScaleReport({ scale, metrics: m, apothecary: a }: ScaleReport): string[] {
  return [
    `scale ${scale}: quests ${m.quests}  failed ${m.failed}  deaths ${m.deaths} (${m.deathsPerQuest}/quest)  wiped ${m.wiped} of ${m.arrived}  raised ${m.raised}`,
    `apothecary: ruined ${a.ruined} of ${a.count}  lowest treasury reached ${a.lowestTreasuryReached ?? 'unavailable'}  treasury at end (mean) ${a.treasuryAtEnd}  goldSpentOnProduction ${a.goldSpentOnProduction ?? 'unavailable'}`,
  ];
}

export function summarizeApothecaries(reports: readonly ApothecaryReport[]): ApothecaryReport {
  const minima = reports.flatMap((report) => report.lowestTreasuryReached === null ? [] : [report.lowestTreasuryReached]);
  return {
    ruined: reports.reduce((sum, report) => sum + report.ruined, 0),
    count: reports.reduce((sum, report) => sum + report.count, 0),
    lowestTreasuryReached: minima.length ? Math.min(...minima) : null,
    treasuryAtEnd: reports.reduce((sum, report) => sum + report.treasuryAtEnd, 0) / reports.length,
    ...(reports.every((report) => report.goldSpentOnProduction !== undefined)
      ? { goldSpentOnProduction: reports.reduce((sum, report) => sum + report.goldSpentOnProduction!, 0) / reports.length } : {}),
  };
}

const COMPARISON_METRICS = ['quests', 'failed', 'deathsPerQuest', 'wiped', 'raised'] as const;

export interface MetricComparison {
  metric: typeof COMPARISON_METRICS[number];
  deviationPercent: number;
  passed: boolean;
}

export function compareMetrics(current: TuneMetrics, baseline: TuneMetrics, tolerance: number): MetricComparison[] {
  return COMPARISON_METRICS.map((metric) => {
    const reference = baseline[metric];
    const deviation = reference === 0 ? (current[metric] === 0 ? 0 : Infinity)
      : (current[metric] - reference) / reference;
    return { metric, deviationPercent: deviation * 100, passed: Math.abs(deviation) <= tolerance + Number.EPSILON };
  });
}

export function formatComparison(comparison: readonly MetricComparison[]): string[] {
  return [
    ...comparison.map(({ metric, deviationPercent, passed }) => `baseline ${metric}: deviation ${deviationPercent}% ${passed ? 'PASS' : 'FAIL'}`),
    `baseline comparison: ${comparison.every((metric) => metric.passed) ? 'PASS' : 'FAIL'}`,
  ];
}

export interface TuneBaseline {
  tuning: { seeds: { from: number; to: number }; ticks: number; results: ScaleReport[] };
}

export function compareScaleToBaseline(
  run: Pick<TuneArgs, 'seeds' | 'ticks'>,
  report: ScaleReport,
  baseline: TuneBaseline | undefined,
  tolerance: number,
): { lines: string[]; exitCode: 0 | 1 } {
  if (!baseline) {
    return { lines: ['baseline comparison: unavailable (scripts/tune-baseline.json not recorded yet)'], exitCode: 0 };
  }
  if (run.ticks !== baseline.tuning.ticks) {
    return { lines: [`baseline comparison: unavailable (TICKS=${run.ticks}; baseline has ${baseline.tuning.ticks} ticks)`], exitCode: 0 };
  }
  const { from, to } = baseline.tuning.seeds;
  const sortedSeeds = [...run.seeds].sort((a, b) => a - b);
  if (sortedSeeds.length !== to - from + 1 || !sortedSeeds.every((seed, index) => seed === from + index)) {
    return { lines: [`baseline comparison: unavailable (seeds differ from baseline's ${from}..${to})`], exitCode: 0 };
  }
  const reference = baseline.tuning.results.find((result) => result.scale === report.scale);
  if (!reference) {
    return { lines: [`baseline comparison: unavailable (scale ${report.scale} not recorded)`], exitCode: 1 };
  }
  const comparison = compareMetrics(report.metrics, reference.metrics, tolerance);
  return { lines: formatComparison(comparison), exitCode: comparison.some((metric) => !metric.passed) ? 1 : 0 };
}
