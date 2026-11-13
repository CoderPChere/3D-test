import { describe, it, expect } from 'vitest';
import { mulberry32 } from './rng';
import { generateProject } from './generate';
import { PROJECT_VERSION, type Building, type CityProject } from './types';

const buildingHeights = (p: CityProject): number[] =>
  p.order
    .map((id) => p.objects[id])
    .filter((o): o is Building => o.type === 'building')
    .map((b) => b.height);

const countByType = (p: CityProject, type: string): number =>
  Object.values(p.objects).filter((o) => o.type === type).length;

describe('mulberry32', () => {
  it('produces an identical sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it('produces different sequences for different seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('generateProject', () => {
  it('produces a deep-equal project for the same seed', () => {
    expect(JSON.stringify(generateProject(42))).toBe(JSON.stringify(generateProject(42)));
  });

  it('produces differing building heights for different seeds', () => {
    expect(buildingHeights(generateProject(1))).not.toEqual(buildingHeights(generateProject(2)));
  });

  it('produces a well-formed project (version, roads, signals, vehicles, consistent order)', () => {
    const p = generateProject(42);
    expect(p.version).toBe(PROJECT_VERSION);
    expect(p.seed).toBe(42);
    expect(countByType(p, 'road')).toBe(6);
    expect(countByType(p, 'signal')).toBe(9);
    expect(countByType(p, 'building')).toBeGreaterThan(0);
    expect(countByType(p, 'vehicle')).toBeGreaterThan(0);
    expect(p.order.length).toBe(Object.keys(p.objects).length);
    for (const id of p.order) expect(p.objects[id]).toBeDefined();
    expect(p.settings.layers.geometry).toBe(true);
  });

  // First-run demo (task 7.6): every fresh project ships an active-by-playback
  // "Rush Hour" scenario whose events reference real objects and stay importable.
  it('ships a default Rush Hour demo scenario covering every event type', () => {
    const p = generateProject(1);
    expect(p.scenarios).toHaveLength(1);
    const demo = p.scenarios[0];
    expect(demo.name).toBe('Rush Hour');

    const types = demo.events.map((e) => e.type).sort();
    expect(types).toEqual(['accident', 'road_closure', 'signal_timing_change', 'vehicle_surge']);

    // Scheduled in time order, every event targets an object that exists.
    const times = demo.events.map((e) => e.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    const ids = new Set(p.order);
    for (const e of demo.events) {
      const target = 'roadId' in e ? e.roadId : e.signalId;
      expect(ids.has(target), `${e.type} target ${target}`).toBe(true);
      expect(e.at).toBeGreaterThan(0);
    }

    // Importable ranges: severity 0..1, count positive integer (parseProject rules).
    for (const e of demo.events) {
      if (e.type === 'accident') {
        expect(e.severity).toBeGreaterThanOrEqual(0);
        expect(e.severity).toBeLessThanOrEqual(1);
      }
      if (e.type === 'vehicle_surge') {
        expect(Number.isInteger(e.count)).toBe(true);
        expect(e.count).toBeGreaterThan(0);
      }
    }
  });
});
