import { describe, it, expect, beforeEach } from 'vitest';
import { HISTORY_LIMIT, useSimStore } from './simStore';
import type { MetricsSnapshot } from '../model/types';

const metrics = (overrides: Partial<MetricsSnapshot> = {}): MetricsSnapshot => ({
  vehicleCount: 12,
  avgSpeed: 31.5,
  density: 0.4,
  congestion: 0.25,
  totalDelay: 10,
  byType: { car: 9, bus: 1, truck: 1, van: 1 },
  queues: { rh_0: 3 },
  throughput: { rh_0: 5, rv_0: 2 },
  ...overrides,
});

beforeEach(() => {
  useSimStore.setState({ history: [], simTime: 0, metrics: null, status: 'stopped' });
});

describe('metric history', () => {
  it('appends one sample with the snapshot fields and summed throughput', () => {
    useSimStore.getState().recordSample(4.5, metrics());
    const [sample] = useSimStore.getState().history;
    expect(sample).toEqual({
      t: 4.5,
      vehicleCount: 12,
      avgSpeed: 31.5,
      density: 0.4,
      congestion: 0.25,
      throughput: 7,
    });
  });

  it('keeps samples in time order', () => {
    useSimStore.getState().recordSample(1, metrics());
    useSimStore.getState().recordSample(2, metrics());
    useSimStore.getState().recordSample(3, metrics());
    expect(useSimStore.getState().history.map((s) => s.t)).toEqual([1, 2, 3]);
  });

  it('drops the oldest samples beyond the fixed capacity', () => {
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) useSimStore.getState().recordSample(i, metrics());
    const history = useSimStore.getState().history;
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0].t).toBe(10);
    expect(history[history.length - 1].t).toBe(HISTORY_LIMIT + 9);
  });

  it('clears the history on reset', () => {
    useSimStore.getState().recordSample(1, metrics());
    useSimStore.getState().resetClock();
    expect(useSimStore.getState().history).toEqual([]);
  });

  it('does not grow from publishes while paused', () => {
    useSimStore.getState().recordSample(1, metrics());
    useSimStore.getState().setStatus('paused');
    useSimStore.getState().publish(2, metrics(), false);
    expect(useSimStore.getState().history).toHaveLength(1);
  });
});
