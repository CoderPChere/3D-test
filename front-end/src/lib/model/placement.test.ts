import { describe, it, expect } from 'vitest';
import { canPlace } from './placement';
import { generateProject } from './generate';
import { type Building, type CityObject, type Road } from './types';

const bounds = { min: -100, max: 100 };

const building = (id: string, x: number, z: number): Building => ({
  type: 'building',
  id,
  name: id,
  position: [x, z],
  footprint: [8, 8],
  height: 20,
  buildingType: 'commercial',
});

const road = (id: string, a: [number, number], b: [number, number]): Road => ({
  type: 'road',
  id,
  name: id,
  position: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
  a,
  b,
  lanes: 2,
  roadType: 'street',
  speedLimit: 50,
  capacity: 600,
  open: true,
});

describe('canPlace', () => {
  it('rejects a building overlapping an existing building', () => {
    const existing = { b1: building('b1', 0, 0) } as Record<string, CityObject>;
    const result = canPlace(existing, building('b2', 4, 0), bounds);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/overlap/i);
  });

  it('rejects a building placed outside buildable bounds', () => {
    const result = canPlace({}, building('b1', 500, 0), bounds);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/bounds|outside/i);
  });

  it('rejects a building overlapping a road', () => {
    const existing = { r1: road('r1', [-60, 0], [60, 0]) } as Record<string, CityObject>;
    const result = canPlace(existing, building('b1', 10, 2), bounds);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/overlap/i);
  });

  it('accepts a building in a free spot within bounds', () => {
    const existing = { b1: building('b1', 0, 0) } as Record<string, CityObject>;
    expect(canPlace(existing, building('b2', 30, 30), bounds)).toEqual({ ok: true });
  });

  it('accepts a road crossing an existing perpendicular road', () => {
    const existing = { r1: road('r1', [-60, 0], [60, 0]) } as Record<string, CityObject>;
    expect(canPlace(existing, road('r2', [0, -60], [0, 60]), bounds)).toEqual({ ok: true });
  });

  it('rejects a road parallel to and overlapping an existing road', () => {
    const existing = { r1: road('r1', [-60, 0], [60, 0]) } as Record<string, CityObject>;
    const result = canPlace(existing, road('r2', [-60, 2], [60, 2]), bounds);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/overlap/i);
  });

  it('uses generated project objects without error', () => {
    const p = generateProject(42);
    const result = canPlace(p.objects, building('new', 80, 80), bounds);
    expect(result.ok).toBe(true);
  });
});
