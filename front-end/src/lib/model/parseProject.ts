// parseProject — strict schema validation for imported project JSON.
// Pure: no DOM/React. Throws ProjectParseError with a field path + human-readable message.
import {
  LAYER_IDS,
  PROJECT_VERSION,
  type Building,
  type CityObject,
  type CityProject,
  type Incident,
  type ProjectSettings,
  type Road,
  type Scenario,
  type ScenarioEvent,
  type Signal,
  type SignalTiming,
  type Vehicle,
  type Zone,
} from './types';

/** Validation failure carrying the offending field path for precise UI feedback. */
export { ProjectParseError } from './errors';
import { ProjectParseError } from './errors';
import { validateReferences } from './integrity';

const fail = (field: string, message: string): never => {
  throw new ProjectParseError(message, field);
};

const OBJECT_TYPES = ['road', 'building', 'vehicle', 'signal', 'incident', 'zone'] as const;
const ROAD_TYPES = ['street', 'avenue', 'highway'] as const;
const BUILDING_TYPES = ['residential', 'commercial', 'office', 'industrial'] as const;
const VEHICLE_TYPES = ['car', 'bus', 'truck', 'van'] as const;
const INCIDENT_TYPES = ['accident', 'hazard'] as const;
const ZONE_TYPES = ['residential', 'commercial', 'industrial', 'park'] as const;
const EVENT_TYPES = ['road_closure', 'accident', 'vehicle_surge', 'signal_timing_change'] as const;
const QUALITY_TIERS = ['low', 'medium', 'high'] as const;

function asObject(v: unknown, field: string): Record<string, unknown> {
  if (v === undefined || v === null) return fail(field, `Missing required field "${field}"`);
  if (typeof v !== 'object' || Array.isArray(v)) return fail(field, `${field} must be an object`);
  return v as Record<string, unknown>;
}

function asArray(v: unknown, field: string): unknown[] {
  if (v === undefined || v === null) return fail(field, `Missing required field "${field}"`);
  if (!Array.isArray(v)) return fail(field, `${field} must be an array`);
  return v;
}

function asString(v: unknown, field: string): string {
  if (v === undefined) return fail(field, `Missing required field "${field}"`);
  if (typeof v !== 'string') return fail(field, `${field} must be a string`);
  return v;
}

function asBoolean(v: unknown, field: string): boolean {
  if (v === undefined) return fail(field, `Missing required field "${field}"`);
  if (typeof v !== 'boolean') return fail(field, `${field} must be a boolean`);
  return v;
}

function asNumber(
  v: unknown,
  field: string,
  opts: { min?: number; max?: number; integer?: boolean } = {},
): number {
  if (v === undefined) return fail(field, `Missing required field "${field}"`);
  if (typeof v !== 'number' || !Number.isFinite(v)) return fail(field, `${field} must be a finite number`);
  if (opts.integer && !Number.isInteger(v)) return fail(field, `${field} must be an integer (got ${v})`);
  if (opts.min !== undefined && opts.max !== undefined && (v < opts.min || v > opts.max)) {
    return fail(field, `${field} must be between ${opts.min} and ${opts.max} (got ${v})`);
  }
  if (opts.min !== undefined && v < opts.min) return fail(field, `${field} must be at least ${opts.min} (got ${v})`);
  if (opts.max !== undefined && v > opts.max) return fail(field, `${field} must be at most ${opts.max} (got ${v})`);
  return v;
}

function asEnum<T extends string>(v: unknown, field: string, values: readonly T[]): T {
  if (v === undefined) return fail(field, `Missing required field "${field}"`);
  if (typeof v !== 'string' || !(values as readonly string[]).includes(v)) {
    return fail(field, `${field} must be one of ${values.join(' | ')} (got ${JSON.stringify(v)})`);
  }
  return v as T;
}

function asVec2(v: unknown, field: string): [number, number] {
  if (v === undefined) return fail(field, `Missing required field "${field}"`);
  if (!Array.isArray(v) || v.length !== 2 || v.some((n) => typeof n !== 'number' || !Number.isFinite(n))) {
    return fail(field, `${field} must be [number, number]`);
  }
  return v as [number, number];
}

function parseTiming(v: unknown, field: string): SignalTiming {
  const raw = asObject(v, field);
  return {
    green: asNumber(raw.green, `${field}.green`, { min: 0 }),
    yellow: asNumber(raw.yellow, `${field}.yellow`, { min: 0 }),
    offset: asNumber(raw.offset, `${field}.offset`),
  };
}

function parseObject(id: string, v: unknown): CityObject {
  const field = `objects.${id}`;
  const raw = asObject(v, field);
  if (raw.type === undefined) return fail(`${field}.type`, `Missing required field "${field}.type"`);
  if (typeof raw.type !== 'string' || !(OBJECT_TYPES as readonly string[]).includes(raw.type)) {
    return fail(field, `Unknown object type ${JSON.stringify(raw.type)} (object "${id}")`);
  }
  const common = {
    id: asString(raw.id, `${field}.id`),
    name: asString(raw.name, `${field}.name`),
    position: asVec2(raw.position, `${field}.position`),
  };

  switch (raw.type) {
    case 'road': {
      const o: Road = {
        ...common,
        type: 'road',
        a: asVec2(raw.a, `${field}.a`),
        b: asVec2(raw.b, `${field}.b`),
        lanes: asNumber(raw.lanes, `${field}.lanes`, { min: 1, integer: true }),
        roadType: asEnum(raw.roadType, `${field}.roadType`, ROAD_TYPES),
        speedLimit: asNumber(raw.speedLimit, `${field}.speedLimit`, { min: 0 }),
        capacity: asNumber(raw.capacity, `${field}.capacity`, { min: 0 }),
        open: asBoolean(raw.open, `${field}.open`),
      };
      return o;
    }
    case 'building': {
      const o: Building = {
        ...common,
        type: 'building',
        footprint: asVec2(raw.footprint, `${field}.footprint`),
        height: asNumber(raw.height, `${field}.height`, { min: 0 }),
        buildingType: asEnum(raw.buildingType, `${field}.buildingType`, BUILDING_TYPES),
      };
      if (raw.zoneId !== undefined) o.zoneId = asString(raw.zoneId, `${field}.zoneId`);
      return o;
    }
    case 'vehicle': {
      const heading = asNumber(raw.heading, `${field}.heading`);
      if (heading !== 1 && heading !== -1) {
        return fail(`${field}.heading`, `${field}.heading must be 1 or -1 (got ${heading})`);
      }
      const o: Vehicle = {
        ...common,
        type: 'vehicle',
        vehicleType: asEnum(raw.vehicleType, `${field}.vehicleType`, VEHICLE_TYPES),
        spawnRoadId: asString(raw.spawnRoadId, `${field}.spawnRoadId`),
        heading,
      };
      return o;
    }
    case 'signal': {
      const o: Signal = {
        ...common,
        type: 'signal',
        timing: parseTiming(raw.timing, `${field}.timing`),
      };
      return o;
    }
    case 'incident': {
      const o: Incident = {
        ...common,
        type: 'incident',
        roadId: asString(raw.roadId, `${field}.roadId`),
        incidentType: asEnum(raw.incidentType, `${field}.incidentType`, INCIDENT_TYPES),
        severity: asNumber(raw.severity, `${field}.severity`, { min: 0, max: 1 }),
        active: asBoolean(raw.active, `${field}.active`),
      };
      return o;
    }
    case 'zone': {
      const o: Zone = {
        ...common,
        type: 'zone',
        size: asVec2(raw.size, `${field}.size`),
        zoneType: asEnum(raw.zoneType, `${field}.zoneType`, ZONE_TYPES),
      };
      return o;
    }
    default:
      return fail(field, `Unknown object type ${JSON.stringify(raw.type)} (object "${id}")`);
  }
}

function parseEvent(v: unknown, field: string): ScenarioEvent {
  const raw = asObject(v, field);
  if (raw.type === undefined) return fail(`${field}.type`, `Missing required field "${field}.type"`);
  if (typeof raw.type !== 'string' || !(EVENT_TYPES as readonly string[]).includes(raw.type)) {
    return fail(`${field}.type`, `Unknown scenario event type ${JSON.stringify(raw.type)}`);
  }
  const id = asString(raw.id, `${field}.id`);
  const at = asNumber(raw.at, `${field}.at`, { min: 0 });

  switch (raw.type) {
    case 'road_closure':
      return {
        id,
        type: 'road_closure',
        at,
        roadId: asString(raw.roadId, `${field}.roadId`),
        closed: asBoolean(raw.closed, `${field}.closed`),
      };
    case 'accident':
      return {
        id,
        type: 'accident',
        at,
        roadId: asString(raw.roadId, `${field}.roadId`),
        severity: asNumber(raw.severity, `${field}.severity`, { min: 0, max: 1 }),
      };
    case 'vehicle_surge':
      return {
        id,
        type: 'vehicle_surge',
        at,
        roadId: asString(raw.roadId, `${field}.roadId`),
        count: asNumber(raw.count, `${field}.count`, { min: 1, integer: true }),
      };
    case 'signal_timing_change':
      return {
        id,
        type: 'signal_timing_change',
        at,
        signalId: asString(raw.signalId, `${field}.signalId`),
        timing: parseTiming(raw.timing, `${field}.timing`),
      };
    default:
      return fail(`${field}.type`, `Unknown scenario event type ${JSON.stringify(raw.type)}`);
  }
}

function parseScenario(v: unknown, index: number): Scenario {
  const field = `scenarios[${index}]`;
  const raw = asObject(v, field);
  const events = asArray(raw.events, `${field}.events`);
  return {
    id: asString(raw.id, `${field}.id`),
    name: asString(raw.name, `${field}.name`),
    events: events.map((e, j) => parseEvent(e, `${field}.events[${j}]`)),
  };
}

function parseSettings(v: unknown): ProjectSettings {
  const raw = asObject(v, 'settings');
  const layersRaw = asObject(raw.layers, 'settings.layers');
  const layers = {} as ProjectSettings['layers'];
  for (const id of LAYER_IDS) layers[id] = asBoolean(layersRaw[id], `settings.layers.${id}`);
  return {
    quality: asEnum(raw.quality, 'settings.quality', QUALITY_TIERS),
    speed: asNumber(raw.speed, 'settings.speed', { min: 0.1 }),
    layers,
  };
}

/**
 * Validate unknown JSON as a CityProject. Throws ProjectParseError with a
 * specific, human-readable message naming the offending field.
 */
export function parseProject(data: unknown): CityProject {
  const raw = asObject(data, 'project');
  const version = asNumber(raw.version, 'version', { integer: true });
  if (version !== PROJECT_VERSION) {
    fail('version', `Unsupported project version ${version} (expected ${PROJECT_VERSION})`);
  }
  const seed = asNumber(raw.seed, 'seed');

  const objectsRaw = asObject(raw.objects, 'objects');
  const objects: Record<string, CityObject> = {};
  for (const [id, v] of Object.entries(objectsRaw)) objects[id] = parseObject(id, v);

  const order = asArray(raw.order, 'order').map((entry, i) => {
    const oid = asString(entry, `order[${i}]`);
    if (!(oid in objects)) fail(`order[${i}]`, `order[${i}] references unknown object "${oid}"`);
    return oid;
  });

  const scenarios = asArray(raw.scenarios, 'scenarios').map((s, i) => parseScenario(s, i));
  const settings = parseSettings(raw.settings);

  const project: CityProject = { version, seed, objects, order, scenarios, settings };
  validateReferences(project);
  return project;
}
