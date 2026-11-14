// Referential-integrity checks for a structurally valid CityProject.
// Pure: no DOM/React. Throws ProjectParseError naming the offending field path.
import { ProjectParseError } from './errors';
import type { CityObject, CityProject, ObjectType } from './types';

/** Shortest supported road segment, world units. Matches the road builder. */
export const MIN_ROAD_LENGTH = 8;

const fail = (field: string, message: string): never => {
  throw new ProjectParseError(message, field);
};

function requireRef<T extends ObjectType>(
  project: CityProject,
  id: string,
  type: T,
  field: string,
): asserts id is string {
  const target: CityObject | undefined = project.objects[id];
  if (!target || target.type !== type) {
    fail(field, `${field} references missing ${type} "${id}"`);
  }
}

/** Throws on dangling references, id/key mismatches, bad order, or degenerate roads. */
export function validateReferences(project: CityProject): void {
  for (const [key, object] of Object.entries(project.objects)) {
    if (object.id !== key) {
      fail(`objects.${key}.id`, `objects.${key}.id "${object.id}" does not match its key "${key}"`);
    }
  }

  const seen = new Set<string>();
  project.order.forEach((id, i) => {
    if (seen.has(id)) fail(`order[${i}]`, `order[${i}] duplicates object "${id}"`);
    if (!(id in project.objects)) fail(`order[${i}]`, `order[${i}] references unknown object "${id}"`);
    seen.add(id);
  });
  for (const id of Object.keys(project.objects)) {
    if (!seen.has(id)) fail('order', `order is missing object "${id}"`);
  }

  for (const object of Object.values(project.objects)) {
    const field = `objects.${object.id}`;
    switch (object.type) {
      case 'road': {
        const length = Math.hypot(object.b[0] - object.a[0], object.b[1] - object.a[1]);
        if (length < MIN_ROAD_LENGTH) {
          fail(`${field}.b`, `${field} must be at least ${MIN_ROAD_LENGTH} units long (got ${length.toFixed(2)})`);
        }
        break;
      }
      case 'vehicle':
        requireRef(project, object.spawnRoadId, 'road', `${field}.spawnRoadId`);
        break;
      case 'incident':
        requireRef(project, object.roadId, 'road', `${field}.roadId`);
        break;
      case 'building':
        if (object.zoneId !== undefined) requireRef(project, object.zoneId, 'zone', `${field}.zoneId`);
        break;
    }
  }

  project.scenarios.forEach((scenario, si) => {
    scenario.events.forEach((event, ei) => {
      const field = `scenarios[${si}].events[${ei}]`;
      if (event.type === 'signal_timing_change') {
        requireRef(project, event.signalId, 'signal', `${field}.signalId`);
      } else {
        requireRef(project, event.roadId, 'road', `${field}.roadId`);
      }
    });
  });
}
