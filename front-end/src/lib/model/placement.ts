import type { CityObject } from './types';

export interface Bounds {
  min: number;
  max: number;
}

export type PlacementResult = { ok: true } | { ok: false; reason: string };

interface AABB {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

/** Road corridor half-width (matches the rendered 8-unit slab). */
const ROAD_HALF_WIDTH = 4;

function isHorizontal(road: Extract<CityObject, { type: 'road' }>): boolean {
  return Math.abs(road.b[0] - road.a[0]) >= Math.abs(road.b[1] - road.a[1]);
}

/** Axis-aligned bounds of an object's ground footprint; point-like objects get a 1-unit box. */
function aabb(o: CityObject): AABB {
  switch (o.type) {
    case 'building':
      return {
        x1: o.position[0] - o.footprint[0] / 2,
        z1: o.position[1] - o.footprint[1] / 2,
        x2: o.position[0] + o.footprint[0] / 2,
        z2: o.position[1] + o.footprint[1] / 2,
      };
    case 'zone':
      return {
        x1: o.position[0] - o.size[0] / 2,
        z1: o.position[1] - o.size[1] / 2,
        x2: o.position[0] + o.size[0] / 2,
        z2: o.position[1] + o.size[1] / 2,
      };
    case 'road': {
      const [ax, az] = o.a;
      const [bx, bz] = o.b;
      if (isHorizontal(o)) {
        return {
          x1: Math.min(ax, bx),
          x2: Math.max(ax, bx),
          z1: Math.min(az, bz) - ROAD_HALF_WIDTH,
          z2: Math.max(az, bz) + ROAD_HALF_WIDTH,
        };
      }
      return {
        x1: Math.min(ax, bx) - ROAD_HALF_WIDTH,
        x2: Math.max(ax, bx) + ROAD_HALF_WIDTH,
        z1: Math.min(az, bz),
        z2: Math.max(az, bz),
      };
    }
    default: {
      const [x, z] = o.position;
      return { x1: x - 0.5, z1: z - 0.5, x2: x + 0.5, z2: z + 0.5 };
    }
  }
}

/** Strict overlap — edge-touching footprints do not overlap. */
function overlaps(a: AABB, b: AABB): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.z1 < b.z2 && a.z2 > b.z1;
}

function withinBounds(box: AABB, b: Bounds): boolean {
  return box.x1 >= b.min && box.x2 <= b.max && box.z1 >= b.min && box.z2 <= b.max;
}

/**
 * Pure placement validation shared by ghost preview and actual placement.
 * Rules:
 * - everything must stay within bounds
 * - buildings must not overlap other buildings, zones, or roads
 * - roads must not overlap roads of the same orientation (perpendicular crossing allowed)
 * - point-like objects (vehicle/signal/incident) are bounds-checked only
 * - zones are bounds-checked only (they are areas that may cover terrain)
 */
export function canPlace(
  objects: Record<string, CityObject>,
  candidate: CityObject,
  bounds: Bounds,
): PlacementResult {
  const box = aabb(candidate);
  if (!withinBounds(box, bounds)) {
    return { ok: false, reason: 'Outside buildable bounds' };
  }

  for (const existing of Object.values(objects)) {
    if (existing.id === candidate.id) continue;

    if (candidate.type === 'road' && existing.type === 'road') {
      if (isHorizontal(candidate) === isHorizontal(existing) && overlaps(box, aabb(existing))) {
        return { ok: false, reason: `Overlaps existing road "${existing.name}"` };
      }
      continue;
    }

    if (candidate.type === 'building') {
      if (existing.type === 'building' || existing.type === 'zone' || existing.type === 'road') {
        if (overlaps(box, aabb(existing))) {
          const kind = existing.type === 'road' ? 'road' : 'building';
          return { ok: false, reason: `Overlaps existing ${kind} "${existing.name}"` };
        }
      }
      continue;
    }

    if (candidate.type === 'road' && existing.type === 'building') {
      if (overlaps(box, aabb(existing))) {
        return { ok: false, reason: `Overlaps existing building "${existing.name}"` };
      }
    }
  }

  return { ok: true };
}
