// Client-side simulation clock driver.
// Runs one rAF loop with wall-clock accumulation; the engine (Phase 3) plugs in
// as the `advance` callback. Speed is read via getter so changes apply live.

let rafId: number | null = null;
let lastTs: number | null = null;
let accumulator = 0;

const STEP = 1 / 20; // fixed timestep, seconds of simulated time

export function startDriver(
  advance: (dtSeconds: number) => void,
  getSpeed: () => number,
  onStep?: (simTimeDelta: number) => void,
  onError?: (error: unknown) => void,
): void {
  stopDriver();
  lastTs = null;
  accumulator = 0;
  const frame = (ts: number) => {
    if (rafId === null) return; // stopped (or errored) since scheduling — ignore stale fires
    if (lastTs === null) lastTs = ts;
    const wallDt = Math.min((ts - lastTs) / 1000, 0.25); // clamp after tab stalls
    lastTs = ts;
    accumulator += wallDt * getSpeed();
    while (accumulator >= STEP) {
      try {
        advance(STEP);
        onStep?.(STEP);
      } catch (e) {
        // One bad step must not crash the canvas: halt the loop and surface it.
        stopDriver();
        onError?.(e);
        return;
      }
      accumulator -= STEP;
    }
    rafId = requestAnimationFrame(frame);
  };
  rafId = requestAnimationFrame(frame);
}

export function stopDriver(): void {
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
  lastTs = null;
  accumulator = 0;
}

export function driverRunning(): boolean {
  return rafId !== null;
}
