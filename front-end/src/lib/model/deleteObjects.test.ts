import { describe, it, expect } from 'vitest';
import { generateProject } from './generate';
import { deleteObjectWithDependents } from './deleteObjects';
import type { Building, CityProject, Incident, Road, Signal, Zone } from './types';

/** Generated city plus one zone, one zoned building, one incident, and road/signal events. */
function fixture(): CityProject {
  const p = generateProject(42);
  const building = Object.values(p.objects).find((o): o is Building => o.type === 'building')!;
  const road = Object.values(p.objects).find((o): o is Road => o.type === 'road')!;
  const signal = Object.values(p.objects).find((o): o is Signal => o.type === 'signal')!;

  const zone: Zone = {
    type: 'zone', id: 'zone_a', name: 'Zone A', position: [0, 0], size: [20, 20], zoneType: 'park',
  };
  p.objects[zone.id] = zone;
  p.order.push(zone.id);
  building.zoneId = zone.id;

  const incident: Incident = {
    type: 'incident', id: 'inc_a', name: 'Incident A', position: [0, 0],
    roadId: road.id, incidentType: 'accident', severity: 0.5, active: true,
  };
  p.objects[incident.id] = incident;
  p.order.push(incident.id);

  p.scenarios = [
    {
      id: 'scn_a',
      name: 'Scenario A',
      events: [
        { id: 'ev_road', type: 'road_closure', at: 1, roadId: road.id, closed: true },
        { id: 'ev_sig', type: 'signal_timing_change', at: 2, signalId: signal.id, timing: { green: 9, yellow: 2, offset: 0 } },
      ],
    },
  ];
  return p;
}

const byType = <T extends CityProject['objects'][string]['type']>(
  p: CityProject,
  type: T,
) => Object.values(p.objects).filter((o) => o.type === type) as Extract<CityProject['objects'][string], { type: T }>[];

describe('deleteObjectWithDependents', () => {
  it('fails for an unknown object without touching the project', () => {
    const p = fixture();
    const result = deleteObjectWithDependents(p, 'nope');
    expect(result.ok).toBe(false);
    expect(p).toEqual(fixture());
  });

  it('deletes a road with its vehicles, incidents, and scenario events in one project', () => {
    const p = fixture();
    const road = byType(p, 'road').find((r) => (p.objects['inc_a'] as Incident).roadId === r.id)!;
    const boundVehicles = byType(p, 'vehicle').filter((v) => v.spawnRoadId === road.id);
    expect(boundVehicles.length).toBeGreaterThan(0);

    const result = deleteObjectWithDependents(p, road.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.project;

    expect(next.objects[road.id]).toBeUndefined();
    expect(next.objects['inc_a']).toBeUndefined();
    for (const v of boundVehicles) expect(next.objects[v.id]).toBeUndefined();
    // Other vehicles survive.
    expect(byType(next, 'vehicle')).toHaveLength(byType(p, 'vehicle').length - boundVehicles.length);
    // Events targeting the road are removed; the signal event survives.
    expect(next.scenarios[0].events.map((e) => e.id)).toEqual(['ev_sig']);
    expect(next.order).not.toContain(road.id);
    expect(next.order).not.toContain('inc_a');
    expect(next.order).toHaveLength(Object.keys(next.objects).length);
  });

  it('deletes a signal and its timing events', () => {
    const p = fixture();
    const signalEvent = p.scenarios[0].events.find((e) => e.type === 'signal_timing_change')!;
    const signalId = signalEvent.type === 'signal_timing_change' ? signalEvent.signalId : '';

    const result = deleteObjectWithDependents(p, signalId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.project.objects[signalId]).toBeUndefined();
    expect(result.project.scenarios[0].events.map((e) => e.id)).toEqual(['ev_road']);
  });

  it('deletes a zone and unsets zone references on buildings', () => {
    const p = fixture();
    const zoned = byType(p, 'building').filter((b) => b.zoneId === 'zone_a');
    expect(zoned.length).toBe(1);

    const result = deleteObjectWithDependents(p, 'zone_a');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.project.objects['zone_a']).toBeUndefined();
    const building = result.project.objects[zoned[0].id] as Building;
    expect(building).toBeDefined();
    expect('zoneId' in building).toBe(false);
  });

  it('deletes a vehicle without touching other objects', () => {
    const p = fixture();
    const vehicle = byType(p, 'vehicle')[0];

    const result = deleteObjectWithDependents(p, vehicle.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.project.objects[vehicle.id]).toBeUndefined();
    expect(Object.keys(result.project.objects)).toHaveLength(Object.keys(p.objects).length - 1);
    expect(result.project.scenarios).toEqual(p.scenarios);
  });

  it('does not mutate the input project', () => {
    const p = fixture();
    const snapshot = JSON.parse(JSON.stringify(p)) as CityProject;
    deleteObjectWithDependents(p, byType(p, 'road')[0].id);
    expect(p).toEqual(snapshot);
  });
});
