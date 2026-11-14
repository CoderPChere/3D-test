import { mulberry32 } from './rng';
import {
  PROJECT_VERSION,
  defaultProjectSettings,
  type Building,
  type BuildingType,
  type CityObject,
  type CityProject,
  type Road,
  type Scenario,
  type Signal,
  type Vehicle,
  type VehicleType,
} from './types';

const GRID_SIZE = 10;
const SPACING = 12;
const ROAD_POSITIONS = [-36, 0, 36];
const ROAD_HALF = (GRID_SIZE * SPACING) / 2; // 60
const VEHICLES_PER_ROAD = 4;

const BUILDING_TYPES: BuildingType[] = ['residential', 'commercial', 'office', 'industrial'];
const VEHICLE_TYPES: VehicleType[] = ['car', 'car', 'car', 'van', 'bus', 'truck'];

/** Type-driven footprint ranges: [minWidth, widthSpan, minDepth, depthSpan], rounded to 0.5. */
const FOOTPRINTS: Record<BuildingType, [number, number, number, number]> = {
  residential: [6.5, 1.5, 6.5, 1.5],
  commercial: [8, 2, 8, 2],
  office: [7.5, 1.5, 7.5, 1.5],
  industrial: [10, 1.5, 6.5, 1],
};
const half = (v: number) => Math.round(v * 2) / 2;

/** Stable 0..1 jitter from the object id; keeps footprint variety without new RNG draws. */
function idJitter(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 997) / 997;
}

/**
 * Deterministic city + fleet generation from a seed.
 * Same seed → byte-identical project (stable ids, no Date.now/Math.random).
 */
export function generateProject(seed: number): CityProject {
  const rand = mulberry32(seed);
  const objects: Record<string, CityObject> = {};
  const order: string[] = [];
  const push = (o: CityObject) => {
    objects[o.id] = o;
    order.push(o.id);
  };

  // Buildings: 7×7 cells of the 10×10 grid minus road rows (|x|%3===0 or |z|%3===0).
  for (let x = -GRID_SIZE / 2; x < GRID_SIZE / 2; x++) {
    for (let z = -GRID_SIZE / 2; z < GRID_SIZE / 2; z++) {
      if (Math.abs(x) % 3 === 0 || Math.abs(z) % 3 === 0) continue;
      const id = `b_${x}_${z}`;
      const height = Math.round((10 + rand() * 30) * 10) / 10;
      const buildingType = BUILDING_TYPES[Math.floor(rand() * BUILDING_TYPES.length)];
      const [minW, spanW, minD, spanD] = FOOTPRINTS[buildingType];
      const j = idJitter(id);
      const building: Building = {
        type: 'building',
        id,
        name: `Building ${x},${z}`,
        position: [x * SPACING, z * SPACING],
        footprint: [half(minW + j * spanW), half(minD + (1 - j) * spanD)],
        height,
        buildingType,
      };
      push(building);
    }
  }

  // Roads: 3 horizontal + 3 vertical, length 120 along each axis.
  ROAD_POSITIONS.forEach((pos, i) => {
    const horizontal: Road = {
      type: 'road',
      id: `rh_${i}`,
      name: i === 1 ? 'Central Avenue' : `Road H${i + 1}`,
      position: [0, pos],
      a: [-ROAD_HALF, pos],
      b: [ROAD_HALF, pos],
      lanes: 2,
      roadType: i === 1 ? 'avenue' : 'street',
      speedLimit: 50,
      capacity: 600,
      open: true,
    };
    const vertical: Road = {
      type: 'road',
      id: `rv_${i}`,
      name: i === 1 ? 'Meridian Street' : `Road V${i + 1}`,
      position: [pos, 0],
      a: [pos, -ROAD_HALF],
      b: [pos, ROAD_HALF],
      lanes: 2,
      roadType: i === 1 ? 'avenue' : 'street',
      speedLimit: 50,
      capacity: 600,
      open: true,
    };
    push(horizontal);
    push(vertical);
  });

  // Signals: one controller per intersection (3×3), staggered offsets.
  ROAD_POSITIONS.forEach((x, xi) => {
    ROAD_POSITIONS.forEach((z, zi) => {
      const signal: Signal = {
        type: 'signal',
        id: `sig_${xi}_${zi}`,
        name: `Signal ${xi + 1}-${zi + 1}`,
        position: [x, z],
        timing: { green: 6, yellow: 2, offset: ((xi * 3 + zi) % 4) * 2 },
      };
      push(signal);
    });
  });

  // Fleet: spread deterministically along each road, alternating heading.
  const roads = order.map((id) => objects[id]).filter((o): o is Road => o.type === 'road');
  roads.forEach((road, ri) => {
    for (let k = 0; k < VEHICLES_PER_ROAD; k++) {
      const t = (k + 0.5 + rand() * 0.4) / VEHICLES_PER_ROAD;
      const heading: 1 | -1 = k % 2 === 0 ? 1 : -1;
      const px = road.a[0] + (road.b[0] - road.a[0]) * t;
      const pz = road.a[1] + (road.b[1] - road.a[1]) * t;
      const vehicle: Vehicle = {
        type: 'vehicle',
        id: `veh_${ri}_${k}`,
        name: `Vehicle ${ri + 1}.${k + 1}`,
        position: [Math.round(px * 10) / 10, Math.round(pz * 10) / 10],
        vehicleType: VEHICLE_TYPES[Math.floor(rand() * VEHICLE_TYPES.length)],
        spawnRoadId: road.id,
        heading,
      };
      push(vehicle);
    }
  });

  // First-run demo scenario (task 7.6): a scripted "Rush Hour" escalation that
  // exercises every event type against objects this seed always generates.
  // Literal ids keep the project byte-identical for a given seed.
  const rushHour: Scenario = {
    id: 'scn_rush_hour',
    name: 'Rush Hour',
    events: [
      { id: 'ev_rush_surge', type: 'vehicle_surge', at: 4, count: 8, roadId: 'rh_1' },
      {
        id: 'ev_rush_timing',
        type: 'signal_timing_change',
        at: 8,
        signalId: 'sig_1_1',
        timing: { green: 10, yellow: 2, offset: 0 },
      },
      { id: 'ev_rush_closure', type: 'road_closure', at: 12, roadId: 'rv_2', closed: true },
      { id: 'ev_rush_accident', type: 'accident', at: 16, roadId: 'rh_1', severity: 0.8 },
    ],
  };

  return {
    version: PROJECT_VERSION,
    seed,
    objects,
    order,
    scenarios: [rushHour],
    settings: defaultProjectSettings(),
  };
}
