import { describe, it, expect } from 'vitest';
import { QUALITY, maxDpr } from './quality';

const tiers = ['low', 'medium', 'high'] as const;

describe('quality tier config', () => {
  it('defines a config for every tier', () => {
    for (const t of tiers) expect(QUALITY[t]).toBeDefined();
  });

  it('caps device pixel ratio progressively higher per tier', () => {
    expect(maxDpr(QUALITY.low)).toBeLessThan(maxDpr(QUALITY.medium));
    expect(maxDpr(QUALITY.medium)).toBeLessThan(maxDpr(QUALITY.high));
  });

  it('Low renders no shadows; Medium and High do', () => {
    expect(QUALITY.low.shadows).toBe(false);
    expect(QUALITY.medium.shadows).toBe(true);
    expect(QUALITY.high.shadows).toBe(true);
  });

  it('reduces decorative detail density on lower tiers (full on High)', () => {
    expect(QUALITY.low.detail).toBe(0);
    expect(QUALITY.medium.detail).toBeGreaterThan(0);
    expect(QUALITY.medium.detail).toBeLessThan(1);
    expect(QUALITY.high.detail).toBe(1);
  });

  it('orders vehicle budgets low < medium < high, all positive', () => {
    expect(QUALITY.low.vehicleBudget).toBeGreaterThan(0);
    expect(QUALITY.low.vehicleBudget).toBeLessThan(QUALITY.medium.vehicleBudget);
    expect(QUALITY.medium.vehicleBudget).toBeLessThan(QUALITY.high.vehicleBudget);
  });
});
