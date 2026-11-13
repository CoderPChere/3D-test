import { describe, it, expect } from 'vitest';
import { roadDensity, hotspotIntensity } from './density';

describe('roadDensity', () => {
  it('is zero with no vehicles and scales with road capacity', () => {
    expect(roadDensity(0, 600)).toBe(0);
    expect(roadDensity(3, 600)).toBeCloseTo(0.5); // capacity/100 = 6-vehicle scale
    expect(roadDensity(6, 600)).toBe(1);
  });

  it('clamps above capacity and guards a zero-capacity road', () => {
    expect(roadDensity(50, 600)).toBe(1);
    expect(roadDensity(3, 0)).toBe(0);
  });
});

describe('hotspotIntensity', () => {
  it('stays hidden at or below the congestion threshold', () => {
    expect(hotspotIntensity(0)).toBe(0);
    expect(hotspotIntensity(0.35)).toBe(0);
  });

  it('appears and intensifies as density rises', () => {
    expect(hotspotIntensity(0.675)).toBeCloseTo(0.5);
    expect(hotspotIntensity(1)).toBe(1);
  });

  it('fades back to zero when traffic clears', () => {
    expect(hotspotIntensity(0.9)).toBeGreaterThan(0);
    expect(hotspotIntensity(0.2)).toBe(0); // cleared segment → hotspot gone
  });
});
