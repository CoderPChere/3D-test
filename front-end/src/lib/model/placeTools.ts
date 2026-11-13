// Candidate-object builders for placement tools (pure).
import { newObjectId, type Building, type CityObject, type Incident, type Road, type Signal, type Vec2, type Vehicle, type Zone } from './types';
import type { ToolId } from '../state/tools';

export function snapToGrid(p: Vec2, grid = 4): Vec2 {
  return [Math.round(p[0] / grid) * grid, Math.round(p[1] / grid) * grid];
}

/** Squared distance point→segment, plus the closest point on the segment. */
function pointSegment(p: Vec2, a: Vec2, b: Vec2): { dist2: number; projection: Vec2; t: number } {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len2 = dx * dx + dz * dz || 1;
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  const projection: Vec2 = [a[0] + t * dx, a[1] + t * dz];
  const ex = p[0] - projection[0];
  const ez = p[1] - projection[1];
  return { dist2: ex * ex + ez * ez, projection, t };
}

export function nearestRoad(roads: Record<string, Road>, p: Vec2): { road: Road; projection: Vec2; t: number } | null {
  let best: { road: Road; projection: Vec2; t: number } | null = null;
  let bestD = Infinity;
  for (const road of Object.values(roads)) {
    const { dist2, projection, t } = pointSegment(p, road.a, road.b);
    if (dist2 < bestD) {
      bestD = dist2;
      best = { road, projection, t };
    }
  }
  return best;
}

const ROAD_SPAN = 40;

/** Builds the object a placement tool would create at the cursor; null for non-placement tools. */
export function buildCandidate(tool: ToolId, pos: Vec2, roads: Record<string, Road>): CityObject | null {
  switch (tool) {
    case 'build-road': {
      const [x, z] = snapToGrid(pos);
      const half = ROAD_SPAN / 2;
      return {
        type: 'road',
        id: newObjectId('road'),
        name: 'New Road',
        position: [x, z],
        a: [x - half, z],
        b: [x + half, z],
        lanes: 2,
        roadType: 'street',
        speedLimit: 50,
        capacity: 600,
        open: true,
      } satisfies Road;
    }
    case 'add-building': {
      const [x, z] = snapToGrid(pos);
      return {
        type: 'building',
        id: newObjectId('bld'),
        name: 'New Building',
        position: [x, z],
        footprint: [8, 8],
        height: 20,
        buildingType: 'commercial',
      } satisfies Building;
    }
    case 'add-vehicle': {
      const near = nearestRoad(roads, pos);
      if (!near) return null;
      return {
        type: 'vehicle',
        id: newObjectId('veh'),
        name: 'New Vehicle',
        position: [Math.round(near.projection[0] * 10) / 10, Math.round(near.projection[1] * 10) / 10],
        vehicleType: 'car',
        spawnRoadId: near.road.id,
        heading: 1,
      } satisfies Vehicle;
    }
    case 'add-signal': {
      const [x, z] = snapToGrid(pos);
      return {
        type: 'signal',
        id: newObjectId('sig'),
        name: 'New Signal',
        position: [x, z],
        timing: { green: 6, yellow: 2, offset: 0 },
      } satisfies Signal;
    }
    case 'add-incident': {
      const near = nearestRoad(roads, pos);
      if (!near) return null;
      return {
        type: 'incident',
        id: newObjectId('inc'),
        name: 'New Incident',
        position: near.projection,
        roadId: near.road.id,
        incidentType: 'accident',
        severity: 0.5,
        active: true,
      } satisfies Incident;
    }
    case 'create-zone': {
      const [x, z] = snapToGrid(pos);
      return {
        type: 'zone',
        id: newObjectId('zone'),
        name: 'New Zone',
        position: [x, z],
        size: [24, 24],
        zoneType: 'commercial',
      } satisfies Zone;
    }
    default:
      return null;
  }
}

/** Object translated to a new ground position (roads keep a/b in sync). */
export function movedObject(o: CityObject, p: Vec2): CityObject {
  if (o.type === 'road') {
    const dx = p[0] - o.position[0];
    const dz = p[1] - o.position[1];
    return {
      ...o,
      position: p,
      a: [o.a[0] + dx, o.a[1] + dz],
      b: [o.b[0] + dx, o.b[1] + dz],
    };
  }
  return { ...o, position: p };
}
