/** Per-road vehicle density 0..1 — count vs the road's capacity-based scale (capacity/100). */
export function roadDensity(count: number, capacity: number): number {
  const scale = capacity / 100;
  return scale > 0 ? Math.min(1, count / scale) : 0;
}

/**
 * Congestion-hotspot intensity: 0 at/below the threshold (hidden),
 * ramps linearly to 1 at full density. Callers fade out as density falls.
 */
export function hotspotIntensity(density: number, threshold = 0.35): number {
  if (density <= threshold) return 0;
  return Math.min(1, (density - threshold) / (1 - threshold));
}
