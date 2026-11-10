import { CityProfile } from "../config/city";

/** Class of a road segment — primary > secondary > local in width */
export type RoadClass = "primary" | "secondary" | "local";

/** Axis-aligned road segment between two endpoints ([x, z]) */
export interface RoadSegment {
  from: [number, number];
  to: [number, number];
  class: RoadClass;
  width: number;
}

/** Widths per class — primary must be widest (city-infrastructure spec) */
const WIDTH: Record<RoadClass, number> = { primary: 12, secondary: 7, local: 4 };

/** Mirrors PLOT_SPACING in generate.ts (kept local to avoid a circular import) */
const PLOT = 12;

/**
 * Hierarchical road network, aligned to the plot grid so road corridors and
 * building plots never collide (generate.ts skips plots a corridor covers):
 * - primary: L-shaped spine from the city center (0,0) to each district center
 * - secondary: cross through each district center, spanning ±1 plot
 * - local: a half-offset ring between plot columns (never crosses a plot)
 * Centers sit on the PLOT grid, so all primary/secondary coordinates are grid
 * lines and locals land exactly between building columns.
 */
export function generateRoads(profile: CityProfile): RoadSegment[] {
  const roads: RoadSegment[] = [];

  const push = (from: [number, number], to: [number, number], cls: RoadClass) => {
    // skip degenerate (zero-length) segments
    if (from[0] === to[0] && from[1] === to[1]) return;
    roads.push({ from, to, class: cls, width: WIDTH[cls] });
  };

  for (const d of profile.districts) {
    const [cx, cz] = d.center;
    const h = PLOT / 2;

    // Primary: city center → district center (horizontal then vertical leg)
    push([0, 0], [cx, 0], "primary");
    push([cx, 0], [cx, cz], "primary");

    // Secondary: cross through the district center
    push([cx - PLOT, cz], [cx + PLOT, cz], "secondary");
    push([cx, cz - PLOT], [cx, cz + PLOT], "secondary");

    // Local: ring between plot columns, T-junctions with the secondary cross
    push([cx - h, cz + h], [cx + h, cz + h], "local");
    push([cx - h, cz - h], [cx + h, cz - h], "local");
    push([cx + h, cz - h], [cx + h, cz + h], "local");
    push([cx - h, cz - h], [cx - h, cz + h], "local");
  }

  return roads;
}

/** Sidewalk strip along one road edge ([x,z] endpoints + strip width) */
export interface Sidewalk {
  from: [number, number];
  to: [number, number];
  width: number;
}

/** A point on the network controlled by lights and marked with crosswalks */
export interface Crossing {
  x: number;
  z: number;
}

export interface StreetFurniture {
  sidewalks: Sidewalk[];
  crosswalks: Crossing[];
  lights: Crossing[];
}

/** Sidewalk strip width (world units) */
const SIDEWALK_WIDTH = 2;

/**
 * Sidewalks run along both edges of every road (offset by half the road
 * width plus half the strip width); every H×V road crossing gets a
 * crosswalk record and a traffic-light record at the same point
 * (city-infrastructure spec: controlled intersections).
 */
export function generateStreetFurniture(roads: RoadSegment[]): StreetFurniture {
  const sidewalks: Sidewalk[] = [];
  for (const r of roads) {
    const half = r.width / 2 + SIDEWALK_WIDTH / 2;
    const horizontal = r.from[1] === r.to[1];
    const offset = (sign: number): Sidewalk =>
      horizontal
        ? { from: [r.from[0], r.from[1] + sign * half], to: [r.to[0], r.to[1] + sign * half], width: SIDEWALK_WIDTH }
        : { from: [r.from[0] + sign * half, r.from[1]], to: [r.to[0] + sign * half, r.to[1]], width: SIDEWALK_WIDTH };
    sidewalks.push(offset(1), offset(-1));
  }

  // Every horizontal × vertical segment pair crossing point, deduped
  const seen = new Set<string>();
  const crossings: Crossing[] = [];
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
      if (!inH || !inV) continue;
      const key = `${x},${z}`;
      if (seen.has(key)) continue;
      seen.add(key);
      crossings.push({ x, z });
    }
  }

  return { sidewalks, crosswalks: crossings, lights: crossings.map((c) => ({ ...c })) };
}
