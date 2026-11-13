// Pure signal phase logic — shared by the inspector (display) and the engine (rules).
import type { SignalTiming } from '../model/types';

export type AxisState = 'red' | 'yellow' | 'green';

export interface SignalStates {
  h: AxisState;
  v: AxisState;
  /** Full cycle duration, seconds. */
  cycle: number;
}

/**
 * Signal states are a pure function of timing config + elapsed sim time.
 * Cycle: h-green, h-yellow, v-green, v-yellow (each axis green for `green`, then yellow).
 */
export function signalStates(timing: SignalTiming, simTime: number): SignalStates {
  const { green, yellow, offset } = timing;
  const cycle = 2 * (green + yellow);
  const t = (((simTime + offset) % cycle) + cycle) % cycle;
  if (t < green) return { h: 'green', v: 'red', cycle };
  if (t < green + yellow) return { h: 'yellow', v: 'red', cycle };
  if (t < 2 * green + yellow) return { h: 'red', v: 'green', cycle };
  return { h: 'red', v: 'yellow', cycle };
}
