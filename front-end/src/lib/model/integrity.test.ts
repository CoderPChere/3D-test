import { describe, it, expect } from 'vitest';
import { generateProject } from './generate';
import { MIN_ROAD_LENGTH, validateReferences } from './integrity';
import { ProjectParseError } from './errors';
import type { Building, CityProject, Incident, Road, Vehicle } from './types';

const valid = (): CityProject => generateProject(42);

function expectRejection(p: CityProject, field: RegExp, message: RegExp): void {
  try {
    validateReferences(p);
    expect.unreachable('should have thrown');
  } catch (e) {
    expect(e).toBeInstanceOf(ProjectParseError);
    expect((e as ProjectParseError).field).toMatch(field);
    expect((e as Error).message).toMatch(message);
  }
}

const firstRoad = (p: CityProject): Road =>
  Object.values(p.objects).find((o): o is Road => o.type === 'road')!;
const firstBuilding = (p: CityProject): Building =>
  Object.values(p.objects).find((o): o is Building => o.type === 'building')!;
const firstVehicle = (p: CityProject): Vehicle =>
  Object.values(p.objects).find((o): o is Vehicle => o.type === 'vehicle')!;

describe('validateReferences', () => {
  it('accepts a generated project unchanged', () => {
    expect(() => validateReferences(valid())).not.toThrow();
  });

  it('rejects an object whose id differs from its map key', () => {
    const p = valid();
    p.objects['rh_0'].id = 'not_rh_0';
    expectRejection(p, /^objects\.rh_0\.id$/, /does not match/i);
  });

  it('rejects a duplicated order entry', () => {
    const p = valid();
    p.order.push(p.order[0]);
    expectRejection(p, /^order\[\d+\]$/, /duplicate/i);
  });

  it('rejects an order entry with an unknown id', () => {
    const p = valid();
    p.order.push('ghost');
    expectRejection(p, /^order\[\d+\]$/, /unknown object "ghost"/);
  });

  it('rejects an object missing from order', () => {
    const p = valid();
    p.order.splice(p.order.indexOf('rh_0'), 1);
    expectRejection(p, /^order$/, /missing object "rh_0"/);
  });

  it('rejects a vehicle spawning on a missing road', () => {
    const p = valid();
    const v = firstVehicle(p);
    v.spawnRoadId = 'nope';
    expectRejection(p, new RegExp(`^objects\\.${v.id}\\.spawnRoadId$`), /road "nope"/);
  });

  it('rejects a vehicle spawning on a non-road object', () => {
    const p = valid();
    const v = firstVehicle(p);
    const b = firstBuilding(p);
    v.spawnRoadId = b.id;
    expectRejection(p, new RegExp(`^objects\\.${v.id}\\.spawnRoadId$`), /road/);
  });

  it('rejects an incident bound to a missing road', () => {
    const p = valid();
    const inc: Incident = {
      type: 'incident', id: 'inc1', name: 'i', position: [0, 0],
      roadId: 'nope', incidentType: 'accident', severity: 0.5, active: true,
    };
    p.objects.inc1 = inc;
    p.order.push('inc1');
    expectRejection(p, /^objects\.inc1\.roadId$/, /road "nope"/);
  });

  it('rejects a building referencing a missing zone', () => {
    const p = valid();
    const b = firstBuilding(p);
    b.zoneId = 'nope';
    expectRejection(p, new RegExp(`^objects\\.${b.id}\\.zoneId$`), /zone "nope"/);
  });

  it('rejects a building referencing a non-zone object', () => {
    const p = valid();
    const b = firstBuilding(p);
    b.zoneId = 'rh_0';
    expectRejection(p, new RegExp(`^objects\\.${b.id}\\.zoneId$`), /zone/);
  });

  it('rejects a scenario event targeting a missing road', () => {
    const p = valid();
    p.scenarios[0].events[0] = { id: 'e1', type: 'road_closure', at: 1, roadId: 'nope', closed: true };
    expectRejection(p, /^scenarios\[0\]\.events\[0\]\.roadId$/, /road "nope"/);
  });

  it('rejects a signal-timing event targeting a missing signal', () => {
    const p = valid();
    p.scenarios[0].events[0] = {
      id: 'e1', type: 'signal_timing_change', at: 1, signalId: 'nope',
      timing: { green: 6, yellow: 2, offset: 0 },
    };
    expectRejection(p, /^scenarios\[0\]\.events\[0\]\.signalId$/, /signal "nope"/);
  });

  it('rejects a signal-timing event targeting a non-signal object', () => {
    const p = valid();
    p.scenarios[0].events[0] = {
      id: 'e1', type: 'signal_timing_change', at: 1, signalId: 'rh_0',
      timing: { green: 6, yellow: 2, offset: 0 },
    };
    expectRejection(p, /^scenarios\[0\]\.events\[0\]\.signalId$/, /signal/);
  });

  it('rejects a road with identical endpoints', () => {
    const p = valid();
    const road = p.objects.rh_0 as Road;
    road.a = [0, 0];
    road.b = [0, 0];
    expectRejection(p, /^objects\.rh_0\.b$/, /at least 8/);
  });

  it('rejects a road shorter than the minimum segment length', () => {
    const p = valid();
    p.objects.rh_0 = { ...firstRoad(p), a: [0, 0], b: [MIN_ROAD_LENGTH - 1, 0] };
    expectRejection(p, /^objects\.rh_0\.b$/, new RegExp(`at least ${MIN_ROAD_LENGTH}`));
  });
});
