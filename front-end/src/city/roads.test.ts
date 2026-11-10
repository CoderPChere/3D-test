import { describe, it, expect } from "vitest";
import { generateRoads, generateStreetFurniture, RoadSegment } from "./roads";
import { defaultProfile } from "../config/city";

/** Axis-aligned segment intersection, including collinear overlap and T-junctions */
function intersects(a: RoadSegment, b: RoadSegment): boolean {
  const aH = a.from[1] === a.to[1];
  const bH = b.from[1] === b.to[1];
  const overlap = (a0: number, a1: number, b0: number, b1: number) =>
    Math.max(Math.min(a0, a1), Math.min(b0, b1)) <= Math.min(Math.max(a0, a1), Math.max(b0, b1));
  if (aH && bH) {
    return a.from[1] === b.from[1] && overlap(a.from[0], a.to[0], b.from[0], b.to[0]);
  }
  if (!aH && !bH) {
    return a.from[0] === b.from[0] && overlap(a.from[1], a.to[1], b.from[1], b.to[1]);
  }
  const h = aH ? a : b;
  const v = aH ? b : a;
  const inSpan = (v: number, p: number, q: number) =>
    v >= Math.min(p, q) - 1e-9 && v <= Math.max(p, q) + 1e-9;
  return inSpan(v.from[0], h.from[0], h.to[0]) && inSpan(h.from[1], v.from[1], v.to[1]);
}

function onSegment(x: number, z: number, s: RoadSegment): boolean {
  const horiz = s.from[1] === s.to[1];
  if (horiz) {
    return Math.abs(z - s.from[1]) < 1e-9 && x >= Math.min(s.from[0], s.to[0]) - 1e-9 && x <= Math.max(s.from[0], s.to[0]) + 1e-9;
  }
  return Math.abs(x - s.from[0]) < 1e-9 && z >= Math.min(s.from[1], s.to[1]) - 1e-9 && z <= Math.max(s.from[1], s.to[1]) + 1e-9;
}

describe("generateRoads", () => {
  it("generates all three road classes with primary widest", () => {
    const roads = generateRoads(defaultProfile);
    const classes = new Set(roads.map((r) => r.class));
    expect(classes).toEqual(new Set(["primary", "secondary", "local"]));
    const width = (c: string) => roads.find((r) => r.class === c)!.width;
    expect(width("primary")).toBeGreaterThan(width("secondary"));
    expect(width("secondary")).toBeGreaterThan(width("local"));
    expect(roads.length).toBeGreaterThan(0);
  });

  it("forms one connected network that reaches every district", () => {
    const roads = generateRoads(defaultProfile);
    // BFS over intersecting segments — the whole network must be one piece
    const visited = new Set<number>([0]);
    const queue = [0];
    while (queue.length > 0) {
      const i = queue.shift()!;
      roads.forEach((r, j) => {
        if (!visited.has(j) && intersects(roads[i], r)) {
          visited.add(j);
          queue.push(j);
        }
      });
    }
    expect(visited.size).toBe(roads.length);

    // Every district center lies on some road segment
    for (const d of defaultProfile.districts) {
      const [cx, cz] = d.center;
      expect(roads.some((r) => onSegment(cx, cz, r))).toBe(true);
    }
  });
});

describe("generateStreetFurniture", () => {
  /** Every H×V crossing point in the network (independent of the implementation) */
  function expectedCrossings(roads: RoadSegment[]): Set<string> {
    const keys = new Set<string>();
    for (const a of roads) {
      for (const b of roads) {
        if (a === b) continue;
        const aH = a.from[1] === a.to[1];
        const bH = b.from[1] === b.to[1];
        if (aH === bH) continue;
        const h = aH ? a : b;
        const v = aH ? b : a;
        const x = v.from[0];
        const z = h.from[1];
        const inH = x >= Math.min(h.from[0], h.to[0]) - 1e-9 && x <= Math.max(h.from[0], h.to[0]) + 1e-9;
        const inV = z >= Math.min(v.from[1], v.to[1]) - 1e-9 && z <= Math.max(v.from[1], v.to[1]) + 1e-9;
        if (inH && inV) keys.add(`${x},${z}`);
      }
    }
    return keys;
  }

  it("gives every road crossing a light and crosswalk record", () => {
    const roads = generateRoads(defaultProfile);
    const { crosswalks, lights } = generateStreetFurniture(roads);
    const expected = expectedCrossings(roads);
    expect(expected.size).toBeGreaterThan(0);

    const cw = new Set(crosswalks.map((c) => `${c.x},${c.z}`));
    const lt = new Set(lights.map((l) => `${l.x},${l.z}`));
    for (const key of expected) {
      expect(cw.has(key)).toBe(true);
      expect(lt.has(key)).toBe(true);
    }
    // no stray records off the road network
    expect(cw.size).toBe(expected.size);
    expect(lt.size).toBe(expected.size);
  });

  it("generates sidewalks along both edges of every road", () => {
    const roads = generateRoads(defaultProfile);
    const { sidewalks } = generateStreetFurniture(roads);
    expect(sidewalks).toHaveLength(roads.length * 2);
    for (const s of sidewalks) {
      expect(Number.isFinite(s.from[0])).toBe(true);
      expect(Number.isFinite(s.to[1])).toBe(true);
    }
  });
});
