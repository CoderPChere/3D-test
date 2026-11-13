import { describe, it, expect } from 'vitest';
import { buildResultsExport } from './resultsIO';
import type { ScenarioResult } from '../state/scenarioStore';
import type { Scenario } from '../model/types';

const scenario = (id: string, name: string): Scenario => ({
  id,
  name,
  events: [],
});

const result = (scenarioId: string): ScenarioResult => ({
  scenarioId,
  seed: 42,
  ranAt: 1700000000000,
  simTime: 12.5,
  metrics: {
    vehicleCount: 24,
    avgSpeed: 15.8,
    density: 0.67,
    congestion: 0.25,
    totalDelay: 33.2,
    byType: { car: 11, bus: 6, truck: 6, van: 1 },
    maxQueue: 3,
    throughput: 5,
  },
});

describe('buildResultsExport', () => {
  it('returns null when no run has happened (empty-run guard)', () => {
    expect(buildResultsExport({}, [], 42)).toBeNull();
  });

  it('produces a JSON-serializable payload with metrics, scenario, and seed', () => {
    const data = buildResultsExport({ s1: result('s1') }, [scenario('s1', 'Rush hour')], 42);
    expect(data).not.toBeNull();
    const parsed = JSON.parse(JSON.stringify(data));
    expect(parsed.seed).toBe(42);
    expect(parsed.runs).toHaveLength(1);
    expect(parsed.runs[0].scenarioId).toBe('s1');
    expect(parsed.runs[0].scenarioName).toBe('Rush hour');
    expect(parsed.runs[0].simTime).toBe(12.5);
    expect(parsed.runs[0].metrics).toEqual(result('s1').metrics);
    expect(parsed.runs[0].metrics.byType.car).toBe(11);
  });

  it('names a removed scenario without dropping its run', () => {
    const data = buildResultsExport({ s1: result('s1') }, [], 42);
    expect(data?.runs[0].scenarioName).toBe('Unknown scenario');
  });
});
