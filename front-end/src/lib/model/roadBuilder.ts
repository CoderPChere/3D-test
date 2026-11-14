// Pure road-construction helpers: snapping, segment building, validation.
import { canPlace, type Bounds, type PlacementResult } from './placement';
import { nearestRoad, snapToGrid } from './placeTools';
import { MIN_ROAD_LENGTH } from './integrity';
import { newObjectId, roadLength, type CityObject, type Road, type Vec2 } from './types';

const SNAP_DISTANCE = 4;

/** Grid snap, or the nearest existing road endpoint / point within 4 units. */
export function snapRoadPoint(p: Vec2, roads: Road[], snapDistance = SNAP_DISTANCE): Vec2 {
  let endpoint: Vec2 | null = null;
  let bestD2 = snapDistance * snapDistance;
  for (const road of roads) {
    for (const point of [road.a, road.b]) {
      const d2 = (point[0] - p[0]) ** 2 + (point[1] - p[1]) ** 2;
      if (d2 <= bestD2) {
        endpoint = point;
        bestD2 = d2;
      }
    }
  }
  if (endpoint) return endpoint;

  const near = nearestRoad(Object.fromEntries(roads.map((r) => [r.id, r])), p);
  if (near) {
    const dx = near.projection[0] - p[0];
    const dz = near.projection[1] - p[1];
    if (dx * dx + dz * dz <= snapDistance * snapDistance) {
      // 6 decimals kills float noise while staying far inside the graph's 1e-3 tolerance.
      return [Math.round(near.projection[0] * 1e6) / 1e6, Math.round(near.projection[1] * 1e6) / 1e6];
    }
  }
  return snapToGrid(p);
}

export function buildRoadSegment(a: Vec2, b: Vec2): Road {
  return {
    type: 'road',
    id: newObjectId('road'),
    name: 'New Road',
    position: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
    a,
    b,
    lanes: 2,
    roadType: 'street',
    speedLimit: 50,
    capacity: 600,
    open: true,
  };
}

const samePoint = (a: Vec2, b: Vec2): boolean => a[0] === b[0] && a[1] === b[1];

/** Direction is the a→b order; flipping swaps endpoints and keeps the footprint. */
export function flipRoadDirection(road: Road): Road {
  return { ...road, a: road.b, b: road.a };
}

/** Rejects short, duplicate, overlapping, out-of-bounds, or building-colliding segments. */
export function validateRoadSegment(
  objects: Record<string, CityObject>,
  segment: Road,
  bounds: Bounds,
): PlacementResult {
  const length = roadLength(segment);
  if (length < MIN_ROAD_LENGTH) {
    return { ok: false, reason: `Road must be at least ${MIN_ROAD_LENGTH} units long (got ${length.toFixed(1)})` };
  }
  for (const existing of Object.values(objects)) {
    if (existing.type !== 'road' || existing.id === segment.id) continue;
    const duplicate =
      (samePoint(segment.a, existing.a) && samePoint(segment.b, existing.b)) ||
      (samePoint(segment.a, existing.b) && samePoint(segment.b, existing.a));
    if (duplicate) return { ok: false, reason: `Duplicate of existing road "${existing.name}"` };
  }
  return canPlace(objects, segment, bounds);
}
