import { describe, expect, it } from 'vitest';
import {
  ApothecaryTracker, compareMetrics, formatComparison, formatScaleReport, parseTuneArgs,
  summarizeApothecaries, type ScaleReport, type TuneMetrics,
} from '../scripts/tune-report';

describe('tuning arguments', () => {
  it('expands an inclusive seed range', () => {
    const seeds = parseTuneArgs({ SEEDS: '1..80' }).seeds;
    expect(seeds).toHaveLength(80);
    expect(seeds.slice(0, 3)).toEqual([1, 2, 3]);
    expect(seeds.slice(-3)).toEqual([78, 79, 80]);
  });

  it('accepts a comma list of seeds', () => {
    expect(parseTuneArgs({ SEEDS: '1,2,3' }).seeds).toEqual([1, 2, 3]);
  });

  it('rejects an empty seed entry with a clear error', () => {
    expect(() => parseTuneArgs({ SEEDS: '1,2,' })).toThrow('SEEDS must not contain empty entries');
  });

  it('includes the game difficulty in the default scales and keeps the existing run defaults', () => {
    expect(parseTuneArgs({})).toEqual({
      seeds: [1, 2, 3], scales: [1, 1.15, 1.25, 1.5, 1.75], ticks: 600,
    });
  });

  it.each(['', '1,,2', '1, ', 'two', '1.5', '-1', '3..1', '1..', 'Infinity'])('rejects invalid seeds %j', (SEEDS) => {
    expect(() => parseTuneArgs({ SEEDS })).toThrow(/SEEDS/);
  });

  it.each(['', '1,', '0', '-1', 'NaN'])('rejects invalid scales %j', (SCALES) => {
    expect(() => parseTuneArgs({ SCALES })).toThrow(/SCALES/);
  });

  it.each(['', '-1', '1.5', 'NaN'])('rejects invalid tick counts %j', (TICKS) => {
    expect(() => parseTuneArgs({ TICKS })).toThrow(/TICKS/);
  });
});

describe('baseline comparison', () => {
  const baseline: TuneMetrics = { quests: 100, failed: 100, deaths: 100, deathsPerQuest: 1, wiped: 100, arrived: 100, raised: 100 };

  it('prints deviations for the five tuning metrics and passes both inclusive 15% edges', () => {
    const current = { ...baseline, quests: 115, failed: 85, deathsPerQuest: 0.85 };
    expect(compareMetrics(current, baseline, 0.15)).toEqual([
      { metric: 'quests', deviationPercent: 15, passed: true },
      { metric: 'failed', deviationPercent: -15, passed: true },
      { metric: 'deathsPerQuest', deviationPercent: -15.000000000000002, passed: true },
      { metric: 'wiped', deviationPercent: 0, passed: true },
      { metric: 'raised', deviationPercent: 0, passed: true },
    ]);
    expect(formatComparison(compareMetrics(current, baseline, 0.15))).toEqual([
      'baseline quests: deviation 15% PASS',
      'baseline failed: deviation -15% PASS',
      'baseline deathsPerQuest: deviation -15.000000000000002% PASS',
      'baseline wiped: deviation 0% PASS',
      'baseline raised: deviation 0% PASS',
      'baseline comparison: PASS',
    ]);
  });

  it('fails deviations outside either edge, including an easier result', () => {
    const comparison = compareMetrics({ ...baseline, quests: 115.01, raised: 84.99 }, baseline, 0.15);
    expect(comparison.filter((metric) => !metric.passed).map((metric) => metric.metric)).toEqual(['quests', 'raised']);
    expect(formatComparison(comparison).at(-1)).toBe('baseline comparison: FAIL');
  });

  it('passes an unchanged zero baseline and fails a new nonzero value', () => {
    const reference = { ...baseline, wiped: 0, raised: 0 };
    expect(compareMetrics({ ...reference, raised: 1 }, reference, 0.15).slice(-2)).toEqual([
      { metric: 'wiped', deviationPercent: 0, passed: true },
      { metric: 'raised', deviationPercent: Infinity, passed: false },
    ]);
  });
});

describe('tuning report', () => {
  it('prints all metrics without rounding, including deaths and arrived', () => {
    const report: ScaleReport = {
      scale: 1.15,
      metrics: { quests: 3.125, failed: 1.375, deaths: 1.5, deathsPerQuest: 0.48000000000000004, wiped: 0.125, arrived: 4.625, raised: 0.375 },
      apothecary: { ruined: 0, count: 8, lowestTreasuryReached: 20, treasuryAtEnd: 42.125 },
    };
    expect(formatScaleReport(report)).toEqual([
      'scale 1.15: quests 3.125  failed 1.375  deaths 1.5 (0.48000000000000004/quest)  wiped 0.125 of 4.625  raised 0.375',
      'apothecary: ruined 0 of 8  lowest treasury reached 20  treasury at end (mean) 42.125  goldSpentOnProduction unavailable',
    ]);
  });

  it('keeps a treasury dip from an intermediate tick and excludes other services', () => {
    const tracker = new ApothecaryTracker();
    tracker.observe({ town: { employers: [
      { service: 'apothecary', treasury: 40, ruined: false },
      { service: 'temple', treasury: -1000, ruined: true },
    ] }, stats: {} });
    tracker.observe({ town: { employers: [{ service: 'apothecary', treasury: -5, ruined: false }] }, stats: {} });
    tracker.observe({ town: { employers: [{ service: 'apothecary', treasury: 25, ruined: true }] }, stats: {} });
    expect(tracker.report()).toEqual({ ruined: 1, count: 1, lowestTreasuryReached: -5, treasuryAtEnd: 25 });
  });

  it('reports the lifetime production statistic when it appears without counting it twice', () => {
    const tracker = new ApothecaryTracker();
    const town = { employers: [{ service: 'apothecary' as const, treasury: 50, ruined: false }] };
    tracker.observe({ town, stats: { goldSpentOnProduction: 25 } });
    tracker.observe({ town, stats: { goldSpentOnProduction: 100 } });
    const apothecary = tracker.report();
    expect(apothecary.goldSpentOnProduction).toBe(100);
    expect(formatScaleReport({ scale: 1, metrics: { quests: 0, failed: 0, deaths: 0, deathsPerQuest: 0, wiped: 0, arrived: 0, raised: 0 }, apothecary })[1])
      .toContain('goldSpentOnProduction 100');
  });

  it('totals ruined shops across seeds, preserves the global minimum and averages final treasuries and production', () => {
    expect(summarizeApothecaries([
      { ruined: 1, count: 1, lowestTreasuryReached: -5, treasuryAtEnd: 25, goldSpentOnProduction: 100 },
      { ruined: 0, count: 1, lowestTreasuryReached: 40, treasuryAtEnd: 100, goldSpentOnProduction: 50 },
    ])).toEqual({ ruined: 1, count: 2, lowestTreasuryReached: -5, treasuryAtEnd: 62.5, goldSpentOnProduction: 75 });
  });
});
