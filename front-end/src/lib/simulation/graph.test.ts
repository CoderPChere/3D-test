import { describe, it, expect } from 'vitest';
import { buildGraph, planRoute } from './graph';
import {
  PROJECT_VERSION,
  defaultProjectSettings,
  type CityProject,
  type Road,
  type Vec2,
} from '../model/types';

function road(id: string, a: Vec2, b: Vec2, open = true): Road {
  return {
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
    open,
  };
}

function project(roads: Road[]): CityProject {
  const objects: CityProject['objects'] = {};
  const order: string[] = [];
  for (const r of roads) {
    objects[r.id] = r;
    order.push(r.id);
  }
  return {
    version: PROJECT_VERSION,
    seed: 1,
    objects,
    order,
    scenarios: [],
    settings: defaultProjectSettings(),
  };
}

/** Two roads crossing at the origin — the minimal fixture. */
const crossing = () => project([road('h', [-50, 0], [50, 0]), road('v', [0, -50], [0, 50])]);

describe('buildGraph', () => {
  it('matches a hand-built fixture (crossing roads)', () => {
    const g = buildGraph(crossing());
    // 4 endpoints + 1 crossing = 5 nodes
    expect(Object.keys(g.nodes).sort()).toEqual([
      'n:-50,0',
      'n:0,-50',
      'n:0,0',
      'n:0,50',
      'n:50,0',
    ]);
    // each road splits into 2 pieces → 4 undirected pieces → 8 directed segments
    expect(Object.keys(g.segments)).toHaveLength(8);
    // the crossing departs in 4 directions; endpoints in 1
    expect(g.departures['n:0,0']).toHaveLength(4);
    expect(g.departures['n:-50,0']).toHaveLength(1);
    expect(g.departures['n:50,0']).toHaveLength(1);
    expect(g.departures['n:0,-50']).toHaveLength(1);
    expect(g.departures['n:0,50']).toHaveLength(1);

    // segment geometry: piece of h from origin to (50,0) travels a→b
    const fromOrigin = g.departures['n:0,0']
      .map((id) => g.segments[id])
      .find((s) => s.roadId === 'h' && s.to === 'n:50,0')!;
    expect(fromOrigin).toBeDefined();
    expect(fromOrigin.sFrom).toBe(50);
    expect(fromOrigin.sign).toBe(1);
    expect(fromOrigin.length).toBe(50);

    // reverse direction on the same piece travels b→a, starting at s=100 (b end)
    const back = g.departures['n:50,0'].map((id) => g.segments[id]).find((s) => s.roadId === 'h')!;
    expect(back.sign).toBe(-1);
    expect(back.sFrom).toBe(100);
    expect(back.length).toBe(50);
    expect(back.to).toBe('n:0,0');
  });

  it('rebuild after adding a road updates adjacency', () => {
    const base = buildGraph(crossing());
    const withExtra = buildGraph(
      project([
        road('h', [-50, 0], [50, 0]),
        road('v', [0, -50], [0, 50]),
        road('h2', [-50, 20], [50, 20]),
      ]),
    );
    expect(Object.keys(base.nodes)).toHaveLength(5);
    // +3 nodes: h2 endpoints and its crossing with v
    expect(Object.keys(withExtra.nodes)).toHaveLength(8);
    expect(Object.keys(withExtra.segments)).toHaveLength(14); // 7 pieces × 2
    // new crossing at (0,20) has 4 departures
    expect(withExtra.departures['n:0,20']).toHaveLength(4);
    // v is now split into 3 pieces → crossing (0,0) still has 4 departures
    expect(withExtra.departures['n:0,0']).toHaveLength(4);
    expect(withExtra.departures['n:0,50']).toHaveLength(1);
  });

  it('rebuild after removing a road updates adjacency', () => {
    const g = buildGraph(project([road('h', [-50, 0], [50, 0])]));
    expect(Object.keys(g.nodes)).toHaveLength(2);
    expect(Object.keys(g.segments)).toHaveLength(2);
    expect(g.departures['n:0,0']).toBeUndefined();
    expect(g.departures['n:-50,0']).toHaveLength(1);
  });
});

describe('planRoute', () => {
  /** Two parallel routes between (-50,0) and (-50,20): direct v2, or via h1/v/h2. */
  const twoRoutes = () =>
    project([
      road('h1', [-50, 0], [50, 0]),
      road('h2', [-50, 20], [50, 20]),
      road('v', [0, -50], [0, 50]),
      road('v2', [-50, 0], [-50, 20]),
    ]);

  it('finds the direct path when nothing is blocked', () => {
    const g = buildGraph(twoRoutes());
    const route = planRoute(g, 'n:-50,0', 'n:-50,20');
    expect(route).not.toBeNull();
    expect(route!).toHaveLength(1);
    expect(g.segments[route![0]].roadId).toBe('v2');
  });

  it('avoids a blocked road when an alternative exists', () => {
    const g = buildGraph(twoRoutes());
    const route = planRoute(g, 'n:-50,0', 'n:-50,20', { avoid: ['v2'] });
    expect(route).not.toBeNull();
    const roadIds = route!.map((sid) => g.segments[sid].roadId);
    expect(roadIds).not.toContain('v2');
    expect(roadIds.length).toBeGreaterThanOrEqual(3); // h1 → v → h2
  });

  it('returns null when no path exists', () => {
    const g = buildGraph(twoRoutes());
    const route = planRoute(g, 'n:-50,0', 'n:-50,20', { avoid: ['v2', 'h1', 'v'] });
    expect(route).toBeNull();
  });
});
