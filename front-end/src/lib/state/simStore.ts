import { create } from 'zustand';
import type { MetricsSnapshot } from '../model/types';

export type SimStatus = 'stopped' | 'running' | 'paused';

/** Session-scoped time-series point derived from an engine snapshot. */
export interface MetricSample {
  /** Simulated seconds. */
  t: number;
  vehicleCount: number;
  avgSpeed: number;
  density: number;
  congestion: number;
  throughput: number;
}

export const HISTORY_LIMIT = 120;

interface SimState {
  status: SimStatus;
  /** Simulated seconds elapsed. */
  simTime: number;
  /** Speed multiplier (0.5 | 1 | 2 | 4). */
  speed: number;
  metrics: MetricsSnapshot | null;
  /** True when vehicle spawning is capped by the active quality tier budget. */
  spawnCapped: boolean;
  /** Bounded, session-only sample ring used by the Analyze charts. */
  history: MetricSample[];
  setStatus: (status: SimStatus) => void;
  setSpeed: (speed: number) => void;
  /** Publish a throttled engine snapshot. */
  publish: (simTime: number, metrics: MetricsSnapshot, spawnCapped: boolean) => void;
  /** Append one history point; callers throttle to ≥2 samples per wall second. */
  recordSample: (simTime: number, metrics: MetricsSnapshot) => void;
  resetClock: () => void;
}

export const useSimStore = create<SimState>()((set) => ({
  status: 'stopped',
  simTime: 0,
  speed: 1,
  metrics: null,
  spawnCapped: false,
  history: [],
  setStatus: (status) => set({ status }),
  setSpeed: (speed) => set({ speed }),
  publish: (simTime, metrics, spawnCapped) => set({ simTime, metrics, spawnCapped }),
  recordSample: (simTime, metrics) =>
    set((state) => ({
      history: [
        ...state.history,
        {
          t: simTime,
          vehicleCount: metrics.vehicleCount,
          avgSpeed: metrics.avgSpeed,
          density: metrics.density,
          congestion: metrics.congestion,
          throughput: Object.values(metrics.throughput).reduce((a, b) => a + b, 0),
        },
      ].slice(-HISTORY_LIMIT),
    })),
  resetClock: () => set({ simTime: 0, metrics: null, spawnCapped: false, status: 'stopped', history: [] }),
}));
