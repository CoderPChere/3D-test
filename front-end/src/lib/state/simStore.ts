import { create } from 'zustand';
import type { MetricsSnapshot } from '../model/types';

export type SimStatus = 'stopped' | 'running' | 'paused';

interface SimState {
  status: SimStatus;
  /** Simulated seconds elapsed. */
  simTime: number;
  /** Speed multiplier (0.5 | 1 | 2 | 4). */
  speed: number;
  metrics: MetricsSnapshot | null;
  /** True when vehicle spawning is capped by the active quality tier budget. */
  spawnCapped: boolean;
  setStatus: (status: SimStatus) => void;
  setSpeed: (speed: number) => void;
  /** Publish a throttled engine snapshot. */
  publish: (simTime: number, metrics: MetricsSnapshot, spawnCapped: boolean) => void;
  resetClock: () => void;
}

export const useSimStore = create<SimState>()((set) => ({
  status: 'stopped',
  simTime: 0,
  speed: 1,
  metrics: null,
  spawnCapped: false,
  setStatus: (status) => set({ status }),
  setSpeed: (speed) => set({ speed }),
  publish: (simTime, metrics, spawnCapped) => set({ simTime, metrics, spawnCapped }),
  resetClock: () => set({ simTime: 0, metrics: null, spawnCapped: false, status: 'stopped' }),
}));
