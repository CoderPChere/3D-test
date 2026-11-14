import { describe, it, expect } from 'vitest';
import { buildRoadSegment, flipRoadDirection, snapRoadPoint, validateRoadSegment } from './roadBuilder';
import { generateProject } from './generate';
import { buildGraph } from '../simulation/graph';
import type { Building, CityObject, Road, Vec2 } from './types';

const BOUNDS = { min: -120, max: 120 };

const road = (id: string, a: Vec2, b: Vec2): Road => ({
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

const objectsOf = (...objs: CityObject[]): Record<string, CityObject> =>
  Object.fromEntries(objs.map((o) => [o.id, o]));

const building = (id: string, x: number, z: number): Building => ({
  type: 'building', id, name: id, position: [x, z], footprint: [8, 8], height: 20, buildingType: 'commercial',
});

describe('snapRoadPoint', () => {
  const base = road('r1', [-40, 0], [40, 0]);

  it('falls back to the grid when no road is near', () => {
    expect(snapRoadPoint([7, 9], [base])).toEqual([8, 8]);
  });

  it('snaps to a nearby road endpoint exactly', () => {
    expect(snapRoadPoint([39.5, 1.2], [base])).toEqual([40, 0]);
  });

  it('snaps to the nearest point on a road interior', () => {
    expect(snapRoadPoint([10.4, 2.1], [base])).toEqual([10.4, 0]);
  });

  it('ignores roads beyond the snap distance', () => {
    expect(snapRoadPoint([10, 10], [base])).toEqual([12, 12]);
  });

  it('snaps to the grid with no roads at all', () => {
    expect(snapRoadPoint([-3, 5], [])).toEqual([-4, 4]);
  });
});

describe('buildRoadSegment', () => {
  it('builds a default street at the segment midpoint', () => {
    const segment = buildRoadSegment([0, 0], [24, 0]);
    expect(segment).toMatchObject({
      type: 'road',
      position: [12, 0],
      a: [0, 0],
      b: [24, 0],
      lanes: 2,
      roadType: 'street',
      speedLimit: 50,
      capacity: 600,
      open: true,
    });
    expect(segment.id).toBeTypeOf('string');
  });
});

describe('validateRoadSegment', () => {
  const existing = road('r1', [0, 0], [40, 0]);

  it('accepts a valid parallel segment', () => {
    const segment = buildRoadSegment([0, 10], [40, 10]);
    expect(validateRoadSegment(objectsOf(existing), segment, BOUNDS)).toEqual({ ok: true });
  });

  it('rejects a segment shorter than the minimum length', () => {
    const segment = buildRoadSegment([0, 0], [4, 0]);
    const res = validateRoadSegment(objectsOf(existing), segment, BOUNDS);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/at least 8/);
  });

  it('rejects a duplicate segment in either direction', () => {
    const forward = buildRoadSegment([0, 0], [40, 0]);
    const reverse = buildRoadSegment([40, 0], [0, 0]);
    for (const segment of [forward, reverse]) {
      const res = validateRoadSegment(objectsOf(existing), segment, BOUNDS);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toMatch(/Duplicate/);
    }
  });

  it('rejects a collinear overlapping segment', () => {
    const segment = buildRoadSegment([10, 0], [50, 0]);
    const res = validateRoadSegment(objectsOf(existing), segment, BOUNDS);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/Overlaps existing road/);
  });

  it('accepts a perpendicular crossing', () => {
    const segment = buildRoadSegment([10, -20], [10, 20]);
    expect(validateRoadSegment(objectsOf(existing), segment, BOUNDS).ok).toBe(true);
  });

  it('rejects a segment outside the buildable bounds', () => {
    const segment = buildRoadSegment([118, 0], [140, 0]);
    const res = validateRoadSegment(objectsOf(existing), segment, BOUNDS);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/bounds/i);
  });

  it('rejects a segment through a building', () => {
    const segment = buildRoadSegment([0, 0], [40, 0]);
    const res = validateRoadSegment(objectsOf(building('b1', 20, 0)), segment, BOUNDS);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/Overlaps existing building/);
  });
});

describe('flipRoadDirection', () => {
  it('swaps endpoints without moving the road', () => {
    const original = road('r1', [-10, 4], [30, 12]);
    const flipped = flipRoadDirection(original);
    expect(flipped.a).toEqual([30, 12]);
    expect(flipped.b).toEqual([-10, 4]);
    expect(flipped.position).toEqual(original.position);
    expect(flipped.id).toBe(original.id);
  });
});

describe('committed roads in the road graph', () => {
  it('a segment ending on an existing endpoint shares that graph node', () => {
    const p = generateProject(42);
    const roads = Object.values(p.objects).filter((o): o is Road => o.type === 'road');
    const start = snapRoadPoint([60, -36], roads);
    expect(start).toEqual([60, -36]);

    const segment = buildRoadSegment(start, [60, -12]);
    p.objects[segment.id] = segment;
    p.order.push(segment.id);

    const graph = buildGraph(p);
    const node = Object.values(graph.nodes).find((n) => n.x === 60 && n.z === -36);
    expect(node).toBeDefined();
    const roadIds = (graph.departures[node!.id] ?? []).map((id) => graph.segments[id].roadId);
    expect(roadIds).toContain(segment.id);
    expect(roadIds.some((id) => id !== segment.id)).toBe(true);
    expect(Object.values(graph.segments).filter((s) => s.roadId === segment.id).length).toBeGreaterThan(0);
  });

  it('a perpendicular crossing splits both roads at the intersection node', () => {
    const p = generateProject(42);
    const before = buildGraph(p);
    const beforeRh0 = Object.values(before.segments).filter((s) => s.roadId === 'rh_0').length;

    const segment = buildRoadSegment([48, -48], [48, -24]);
    p.objects[segment.id] = segment;
    p.order.push(segment.id);

    const graph = buildGraph(p);
    const node = Object.values(graph.nodes).find((n) => n.x === 48 && n.z === -36);
    expect(node).toBeDefined();
    const roadIds = new Set((graph.departures[node!.id] ?? []).map((id) => graph.segments[id].roadId));
    expect(roadIds.has(segment.id)).toBe(true);
    expect(roadIds.has('rh_0')).toBe(true);
    // One extra piece on rh_0, each piece stored in both directions.
    expect(Object.values(graph.segments).filter((s) => s.roadId === 'rh_0')).toHaveLength(beforeRh0 + 2);
    expect(Object.values(graph.segments).filter((s) => s.roadId === segment.id)).toHaveLength(4);
  });
});
