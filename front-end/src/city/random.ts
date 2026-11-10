import { MathUtils } from "three";

export interface SeededRandom {
  /** Next deterministic value in [0, 1) for this instance's sequence */
  next(): number;
}

/**
 * Local seeded RNG wrapper. Keeps its own incrementing seed counter starting
 * from `baseSeed` and passes the incremented seed to the documented
 * THREE.MathUtils.seededRandom(seed) for each value, so every value is
 * addressed explicitly by seed + index (no reliance on the library's hidden
 * internal state). Fresh instance per generation pass.
 */
export function createSeededRandom(baseSeed: number): SeededRandom {
  let seed = Math.floor(baseSeed);
  return {
    next: () => MathUtils.seededRandom(seed++),
  };
}
