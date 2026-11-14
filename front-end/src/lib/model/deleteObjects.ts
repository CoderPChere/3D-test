// Pure cascade deletion: one project transform, no store/DOM access.
import { validateReferences } from './integrity';
import type { Building, CityObject, CityProject, ObjectId, ScenarioEvent } from './types';

export type DeleteResult = { ok: true; project: CityProject } | { ok: false; reason: string };

/**
 * Removes an object and everything that cannot outlive it: road-bound vehicles,
 * incidents, and events; signal timing events; zone references on buildings.
 */
export function deleteObjectWithDependents(project: CityProject, id: ObjectId): DeleteResult {
  const target = project.objects[id];
  if (!target) return { ok: false, reason: `Object "${id}" does not exist` };

  const objects: Record<ObjectId, CityObject> = {};
  for (const [key, object] of Object.entries(project.objects)) {
    if (key === id) continue;
    if (target.type === 'road' && object.type === 'vehicle' && object.spawnRoadId === id) continue;
    if (target.type === 'road' && object.type === 'incident' && object.roadId === id) continue;
    if (target.type === 'zone' && object.type === 'building' && object.zoneId === id) {
      const building: Building = { ...object };
      delete building.zoneId;
      objects[key] = building;
      continue;
    }
    objects[key] = object;
  }

  const removedEvent = (event: ScenarioEvent): boolean => {
    if (target.type === 'road') return 'roadId' in event && event.roadId === id;
    if (target.type === 'signal') {
      return event.type === 'signal_timing_change' && event.signalId === id;
    }
    return false;
  };
  const scenarios = project.scenarios.map((scenario) => ({
    ...scenario,
    events: scenario.events.filter((event) => !removedEvent(event)),
  }));

  const next: CityProject = {
    ...project,
    objects,
    order: project.order.filter((oid) => oid in objects),
    scenarios,
  };

  try {
    validateReferences(next);
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'Deletion would make the project invalid' };
  }
  return { ok: true, project: next };
}
