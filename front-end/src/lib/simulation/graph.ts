// Pure road-graph derivation: nodes at road crossings and endpoints, directed
// segments per road piece, BFS route planning. Rebuilt from scratch on mutation
// (callers just re-invoke buildGraph after any project change).
import type { CityProject, Road, Vec2 } from '../model/types';

const EPS = 1e-6;
/** Distance tolerance (world units) for an endpoint lying on another road. */
const ON_ROAD_TOL = 1e-3;

export interface GraphNode {
  id: string;
  x: number;
  z: number;
}

export interface Segment {
  id: string;
  roadId: string;
  from: string;
  to: string;
  /** s coordinate (along road a→b) at the `from` node. */
  sFrom: number;
  /** Travel direction relative to road a→b: 1 = a→b, -1 = b→a. */
  sign: 1 | -1;
  length: number;
}

export interface RoadGraph {
  nodes: Record<string, GraphNode>;
  segments: Record<string, Segment>;
  /** nodeId → ids of segments departing that node. */
  departures: Record<string, string[]>;
}

function nodeKey(x: number, z: number): string {
  return `n:${Math.round(x * 100) / 100},${Math.round(z * 100) / 100}`;
}

/** Parametric t on r1 where the two centerlines strictly cross, or null. */
function crossingT(r1: Road, r2: Road): number | null {
  const d1x = r1.b[0] - r1.a[0];
  const d1z = r1.b[1] - r1.a[1];
  const d2x = r2.b[0] - r2.a[0];
  const d2z = r2.b[1] - r2.a[1];
  const denom = d1x * d2z - d1z * d2x;
  if (Math.abs(denom) < EPS) return null;
  const ox = r2.a[0] - r1.a[0];
  const oz = r2.a[1] - r1.a[1];
  const t = (ox * d2z - oz * d2x) / denom;
  const u = (ox * d1z - oz * d1x) / denom;
  if (t <= 0 || t >= 1 || u <= 0 || u >= 1) return null;
  return t;
}

/** True when point p lies within ON_ROAD_TOL of road r's interior. */
function pointOnRoadInterior(r: Road, p: Vec2): number | null {
  const dx = r.b[0] - r.a[0];
  const dz = r.b[1] - r.a[1];
  const len = Math.hypot(dx, dz);
  if (len < EPS) return null;
  const dist = Math.abs((p[0] - r.a[0]) * dz - (p[1] - r.a[1]) * dx) / len;
  if (dist > ON_ROAD_TOL) return null;
  const t = ((p[0] - r.a[0]) * dx + (p[1] - r.a[1]) * dz) / (len * len);
  if (t <= 0 || t >= 1) return null;
  return t;
}

export function buildGraph(project: CityProject): RoadGraph {
  const roads: Road[] = [];
  for (const id of project.order) {
    const o = project.objects[id];
    if (o?.type === 'road') roads.push(o);
  }

  const nodes: Record<string, GraphNode> = {};
  const segments: Record<string, Segment> = {};
  const departures: Record<string, string[]> = {};

  const nodeAt = (x: number, z: number): string => {
    const rx = Math.round(x * 100) / 100;
    const rz = Math.round(z * 100) / 100;
    const id = nodeKey(rx, rz);
    if (!nodes[id]) nodes[id] = { id, x: rx, z: rz };
    return id;
  };

  for (const r of roads) {
    const dx = r.b[0] - r.a[0];
    const dz = r.b[1] - r.a[1];
    const len = Math.hypot(dx, dz);
    if (len < EPS) continue;

    // Split points: endpoints + crossings with other roads + other endpoints on this road.
    const ts = new Set<number>([0, 1]);
    for (const o of roads) {
      if (o === r) continue;
      const t = crossingT(r, o);
      if (t !== null) ts.add(t);
      for (const e of [o.a, o.b]) {
        const te = pointOnRoadInterior(r, e);
        if (te !== null) ts.add(te);
      }
    }

    const sorted = [...ts].sort((a, b) => a - b);
    for (let i = 0; i + 1 < sorted.length; i++) {
      const t0 = sorted[i];
      const t1 = sorted[i + 1];
      const s0 = t0 * len;
      const s1 = t1 * len;
      if (s1 - s0 < EPS) continue;
      const p0: Vec2 = [r.a[0] + dx * t0, r.a[1] + dz * t0];
      const p1: Vec2 = [r.a[0] + dx * t1, r.a[1] + dz * t1];
      const from = nodeAt(p0[0], p0[1]);
      const to = nodeAt(p1[0], p1[1]);
      if (from === to) continue;
      const length = s1 - s0;
      const fwd = `${r.id}|${from}>${to}`;
      segments[fwd] = { id: fwd, roadId: r.id, from, to, sFrom: s0, sign: 1, length };
      (departures[from] ??= []).push(fwd);
      const rev = `${r.id}|${to}>${from}`;
      segments[rev] = { id: rev, roadId: r.id, from: to, to: from, sFrom: s1, sign: -1, length };
      (departures[to] ??= []).push(rev);
    }
  }

  return { nodes, segments, departures };
}

/**
 * Shortest path (fewest segments) from `from` to `to` as segment ids,
 * skipping roads in `opts.avoid`. Null when unreachable.
 */
export function planRoute(
  graph: RoadGraph,
  from: string,
  to: string,
  opts?: { avoid?: string[] },
): string[] | null {
  if (from === to) return [];
  const avoid = new Set(opts?.avoid ?? []);
  const prev = new Map<string, { seg: string; via: string }>();
  const seen = new Set([from]);
  const queue: string[] = [from];
  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const segId of graph.departures[node] ?? []) {
      const seg = graph.segments[segId];
      if (avoid.has(seg.roadId) || seen.has(seg.to)) continue;
      seen.add(seg.to);
      prev.set(seg.to, { seg: segId, via: node });
      if (seg.to === to) {
        const path: string[] = [];
        let cur = to;
        while (cur !== from) {
          const p = prev.get(cur)!;
          path.push(p.seg);
          cur = p.via;
        }
        return path.reverse();
      }
      queue.push(seg.to);
    }
  }
  return null;
}
