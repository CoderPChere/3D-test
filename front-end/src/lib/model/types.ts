// Core domain types for the CityFluxy simulation sandbox.
// Pure types + tiny pure helpers only — no React/Three/DOM imports.

export const PROJECT_VERSION = 1;

export type ObjectId = string;
export type ObjectType =
  | 'road'
  | 'building'
  | 'vehicle'
  | 'signal'
  | 'incident'
  | 'zone';

export type WorkspaceMode = 'explore' | 'build' | 'simulate' | 'analyze';
export type QualityTier = 'low' | 'medium' | 'high';

export type Vec2 = [number, number];

interface BaseCityObject {
  id: ObjectId;
  name: string;
  /** Ground-plane position as [x, z]. */
  position: Vec2;
}

export type RoadType = 'street' | 'avenue' | 'highway';

export interface Road extends BaseCityObject {
  type: 'road';
  /** Start point [x, z]. */
  a: Vec2;
  /** End point [x, z]. */
  b: Vec2;
  lanes: number;
  roadType: RoadType;
  /** km/h. */
  speedLimit: number;
  /** vehicles/hour. */
  capacity: number;
  open: boolean;
}

export type BuildingType = 'residential' | 'commercial' | 'office' | 'industrial';

export interface Building extends BaseCityObject {
  type: 'building';
  /** Footprint size [width, depth] in world units. */
  footprint: Vec2;
  height: number;
  buildingType: BuildingType;
  zoneId?: ObjectId;
}

export type VehicleType = 'car' | 'bus' | 'truck' | 'van';

export interface Vehicle extends BaseCityObject {
  type: 'vehicle';
  vehicleType: VehicleType;
  /** Road the vehicle spawns and travels on. */
  spawnRoadId: ObjectId;
  /** Unit direction of travel on the road: 1 = a→b, -1 = b→a. */
  heading: 1 | -1;
}

export interface SignalTiming {
  /** Green phase duration in seconds. */
  green: number;
  /** Yellow phase duration in seconds. */
  yellow: number;
  /** Phase offset within the cycle, seconds. */
  offset: number;
}

export interface Signal extends BaseCityObject {
  type: 'signal';
  /** Intersection controller: cycles h-approach and v-approach green/yellow phases. */
  timing: SignalTiming;
}

export type IncidentType = 'accident' | 'hazard';

export interface Incident extends BaseCityObject {
  type: 'incident';
  roadId: ObjectId;
  incidentType: IncidentType;
  /** 0..1 — fraction of road capacity removed. */
  severity: number;
  active: boolean;
}

export type ZoneType = 'residential' | 'commercial' | 'industrial' | 'park';

export interface Zone extends BaseCityObject {
  type: 'zone';
  /** Zone extent [width, depth] in world units. */
  size: Vec2;
  zoneType: ZoneType;
}

export type CityObject = Road | Building | Vehicle | Signal | Incident | Zone;

// --- Scenarios -------------------------------------------------------------

export type ScenarioEventType =
  | 'road_closure'
  | 'accident'
  | 'vehicle_surge'
  | 'signal_timing_change';

export type ScenarioEvent =
  | { id: string; type: 'road_closure'; at: number; roadId: ObjectId; closed: boolean }
  | { id: string; type: 'accident'; at: number; roadId: ObjectId; severity: number }
  | { id: string; type: 'vehicle_surge'; at: number; count: number; roadId: ObjectId }
  | { id: string; type: 'signal_timing_change'; at: number; signalId: ObjectId; timing: SignalTiming };

export interface Scenario {
  id: string;
  name: string;
  events: ScenarioEvent[];
}

// --- Project ---------------------------------------------------------------

export const LAYER_IDS = ['geometry', 'vehicles', 'signals', 'heatmap', 'congestion', 'distribution'] as const;
export type LayerId = (typeof LAYER_IDS)[number];

export interface ProjectSettings {
  quality: QualityTier;
  /** Default simulation speed multiplier. */
  speed: number;
  layers: Record<LayerId, boolean>;
}

export interface CityProject {
  version: number;
  /** Deterministic generation seed. */
  seed: number;
  objects: Record<ObjectId, CityObject>;
  /** Stable render/iteration order. */
  order: ObjectId[];
  scenarios: Scenario[];
  settings: ProjectSettings;
}

// --- Simulation metrics (computed, never hardcoded) -------------------------

export interface MetricsSnapshot {
  vehicleCount: number;
  /** Average speed of active vehicles, km/h. */
  avgSpeed: number;
  /** Average vehicles per road, 0..1 of per-road capacity-based scale. */
  density: number;
  /** Global congestion level 0..1. */
  congestion: number;
  /** Cumulative vehicle-seconds of delay vs free flow over the current run. */
  totalDelay: number;
  /** Active vehicles per body type (engine state). */
  byType: Record<VehicleType, number>;
  /** Queued (near-stopped) vehicles per road id. */
  queues: Record<ObjectId, number>;
  /** Vehicles completed per road id during the current run. */
  throughput: Record<ObjectId, number>;
}

// --- Modules ---------------------------------------------------------------

export interface SandboxModule {
  id: string;
  name: string;
  enabled: boolean;
  tools: string[];
  objectTypes: ObjectType[];
  visualizationLayers: string[];
  metrics: string[];
}

// --- Helpers ---------------------------------------------------------------

let idCounter = 0;
/** Collision-resistant enough for a single-user local project; deterministic in tests via injected counter is unnecessary. */
export function newObjectId(prefix: string): ObjectId {
  idCounter = (idCounter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Road length is derived from geometry, never stored. */
export function roadLength(road: Road): number {
  return Math.hypot(road.b[0] - road.a[0], road.b[1] - road.a[1]);
}

export function defaultProjectSettings(): ProjectSettings {
  return {
    quality: 'medium',
    speed: 1,
    layers: {
      geometry: true,
      vehicles: true,
      signals: true,
      heatmap: false,
      congestion: false,
      distribution: false,
    },
  };
}
