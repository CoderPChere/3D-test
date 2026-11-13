import { describe, it, expect } from 'vitest';
import { buildCandidate, movedObject, nearestRoad, snapToGrid } from './placeTools';
import { generateProject } from './generate';
import type { Building, Incident, Road, Signal, Vehicle, Zone } from './types';

const project = () => generateProject(42);
const roads = (p = project()): Record<string, Road> =>
  Object.fromEntries(Object.values(p.objects).filter((o): o is Road => o.type === 'road').map((r) => [r.id, r]));

describe('snapToGrid', () => {
  it('rounds to the grid', () => {
    expect(snapToGrid([7, 13], 4)).toEqual([8, 12]);
    expect(snapToGrid([-5, -5], 4)).toEqual([-4, -4]);
  });
});

describe('nearestRoad', () => {
  it('finds the closest road to a point (perpendicular projection)', () => {
    // Point near the horizontal road at z=0
    const near = nearestRoad(roads(), [10, 3]);
    expect(near?.road.id.startsWith('rh_')).toBe(true);
    expect(near?.projection[1]).toBe(0); // projected onto the road line

    // Point near a vertical road at x=-36
    const nearV = nearestRoad(roads(), [-34, 20]);
    expect(nearV?.road.id.startsWith('rv_')).toBe(true);
    expect(nearV?.projection[0]).toBe(-36);
  });

  it('returns null for an empty road set', () => {
    expect(nearestRoad({}, [0, 0])).toBeNull();
  });
});

describe('buildCandidate', () => {
  it('builds a horizontal road centered on the cursor', () => {
    const c = buildCandidate('build-road', [8, 12], roads())!;
    expect(c.type).toBe('road');
    const r = c as Road;
    expect(r.a).toEqual([-12, 12]);
    expect(r.b).toEqual([28, 12]);
    expect(r.open).toBe(true);
    expect(r.lanes).toBe(2);
  });

  it('builds a building at the cursor with default footprint', () => {
    const c = buildCandidate('add-building', [8, 12], roads()) as Building;
    expect(c.type).toBe('building');
    expect(c.position).toEqual([8, 12]);
    expect(c.footprint).toEqual([8, 8]);
    expect(c.height).toBeGreaterThan(0);
  });

  it('attaches a vehicle to the nearest road with a projection position', () => {
    const p = project();
    const c = buildCandidate('add-vehicle', [10, 3], roads(p)) as Vehicle;
    expect(c.type).toBe('vehicle');
    expect(c.spawnRoadId.startsWith('rh_')).toBe(true);
    expect(c.position[1]).toBe(0); // on the road line
    expect(p.objects[c.spawnRoadId]).toBeDefined();
  });

  it('attaches an incident to the nearest road and starts active', () => {
    const c = buildCandidate('add-incident', [-34, 20], roads()) as Incident;
    expect(c.type).toBe('incident');
    expect(c.roadId.startsWith('rv_')).toBe(true);
    expect(c.active).toBe(true);
    expect(c.severity).toBeGreaterThan(0);
  });

  it('builds a signal at the cursor', () => {
    const c = buildCandidate('add-signal', [8, 12], roads()) as Signal;
    expect(c.type).toBe('signal');
    expect(c.position).toEqual([8, 12]);
    expect(c.timing.green).toBeGreaterThan(0);
  });

  it('builds a zone at the cursor', () => {
    const c = buildCandidate('create-zone', [8, 12], roads()) as Zone;
    expect(c.type).toBe('zone');
    expect(c.position).toEqual([8, 12]);
    expect(c.size).toEqual([24, 24]);
  });

  it('returns null for tools that do not place objects', () => {
    expect(buildCandidate('select', [0, 0], roads())).toBeNull();
    expect(buildCandidate('move', [0, 0], roads())).toBeNull();
    expect(buildCandidate('layers', [0, 0], roads())).toBeNull();
  });
});

describe('movedObject', () => {
  it('translates a road keeping its geometry (a/b shift with position)', () => {
    const r = roads()['rh_1'];
    const moved = movedObject(r, [10, 5]) as typeof r;
    expect(moved.position).toEqual([10, 5]);
    expect(moved.a).toEqual([r.a[0] + 10, r.a[1] + 5]);
    expect(moved.b).toEqual([r.b[0] + 10, r.b[1] + 5]);
    // length preserved
    expect(Math.hypot(moved.b[0] - moved.a[0], moved.b[1] - moved.a[1])).toBeCloseTo(
      Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]),
    );
  });

  it('moves a building position without touching its footprint', () => {
    const b = project().order.map((id) => project().objects[id]).find((o): o is Building => o.type === 'building')!;
    const moved = movedObject(b, [40, 40]) as Building;
    expect(moved.position).toEqual([40, 40]);
    expect(moved.footprint).toEqual(b.footprint);
    expect(moved.id).toBe(b.id);
  });
});
