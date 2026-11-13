import { describe, it, expect } from 'vitest';
import { SimulationEngine } from './engine';
import { generateProject } from '../model/generate';
import {
  PROJECT_VERSION,
  defaultProjectSettings,
  type CityObject,
  type CityProject,
  type Incident,
  type Road,
  type Vec2,
  type Vehicle,
} from '../model/types';

function road(id: string, a: Vec2, b: Vec2, open = true): Road {
  return {
    type: 'road',
    id,
    name: id,
    position: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
    a,
    b,
    lanes: 2,
    roadType: 'street',
    speedLimit: 50,
    capacity: 600,
    open,
  };
}

function vehicle(id: string, position: Vec2, spawnRoadId: string, heading: 1 | -1): Vehicle {
  return { type: 'vehicle', id, name: id, position, vehicleType: 'car', spawnRoadId, heading };
}

function incident(id: string, position: Vec2, roadId: string, severity = 1): Incident {
  return { type: 'incident', id, name: id, position, roadId, incidentType: 'accident', severity, active: true };
}

function project(objects: CityObject[]): CityProject {
  const map: CityProject['objects'] = {};
  const order: string[] = [];
  for (const o of objects) {
    map[o.id] = o;
    order.push(o.id);
  }
  return {
    version: PROJECT_VERSION,
    seed: 1,
    objects: map,
    order,
    scenarios: [],
    settings: defaultProjectSettings(),
  };
}

describe('road closures', () => {
  it('a closed road receives no new vehicles during the run', () => {
    const p = generateProject(42);
    (p.objects['rv_1'] as Road).open = false;
    const eng = new SimulationEngine(p);
    eng.play();
    for (let i = 0; i < 600; i++) {
      eng.step();
      for (const v of eng.getSnapshot().vehicles) {
        expect(v.roadId, `step ${i}: ${v.id} on closed rv_1`).not.toBe('rv_1');
      }
    }
    // the rest of the fleet keeps running
    expect(eng.getSnapshot().vehicles.length).toBeGreaterThan(0);
  });

  it('marks a vehicle stranded when a closure leaves no route', () => {
    const p = project([road('a', [-50, 0], [50, 0]), vehicle('v1', [-40, 0], 'a', 1)]);
    const eng = new SimulationEngine(p);
    eng.play();
    eng.step();
    expect(eng.getSnapshot().vehicles[0].status).not.toBe('stranded');

    (p.objects['a'] as Road).open = false;
    for (let i = 0; i < 50; i++) eng.step();
    const v = eng.getSnapshot().vehicles[0];
    expect(v.status).toBe('stranded');
    expect(v.speed).toBe(0);
  });
});

describe('rerouting on blockage', () => {
  /** Rectangle loop: the only exit from h1's end node goes through vR. */
  const loop = () =>
    project([
      road('h1', [-50, 0], [50, 0]),
      road('h2', [-50, 20], [50, 20]),
      road('vL', [-50, 0], [-50, 20]),
      road('vR', [50, 0], [50, 20]),
      vehicle('v1', [-40, 0], 'h1', 1),
    ]);

  it('reroutes around a closed road when a path exists', () => {
    const p = loop();
    const eng = new SimulationEngine(p);
    eng.play();
    for (let i = 0; i < 20; i++) eng.step(); // t = 1s, still approaching the junction
    (p.objects['vR'] as Road).open = false;

    let sawVL = false;
    let stranded = false;
    let onVR = false;
    for (let i = 0; i < 800; i++) {
      eng.step();
      for (const v of eng.getSnapshot().vehicles) {
        if (v.id !== 'v1') continue;
        if (v.status === 'stranded') stranded = true;
        if (v.roadId === 'vR') onVR = true;
        if (v.roadId === 'vL') sawVL = true;
      }
    }
    expect(onVR, 'never entered the closed road').toBe(false);
    expect(sawVL, 'took the alternative route via vL').toBe(true);
    expect(stranded, 'never stranded — a path existed').toBe(false);
  });
});

describe('incidents', () => {
  const mk = (withIncident: boolean) =>
    project([
      road('h', [-50, 0], [50, 0]),
      vehicle('v1', [-10, 0], 'h', 1),
      vehicle('v2', [-30, 0], 'h', 1),
      ...(withIncident ? [incident('inc', [30, 0], 'h', 1)] : []),
    ]);

  it('an active incident queues traffic upstream of its position', () => {
    // control: without the incident, traffic flows past s=80 (the incident site)
    const ctrl = new SimulationEngine(mk(false));
    ctrl.play();
    let maxS = 0;
    for (let i = 0; i < 600; i++) {
      ctrl.step();
      for (const v of ctrl.getSnapshot().vehicles) maxS = Math.max(maxS, v.s);
    }
    expect(maxS).toBeGreaterThan(80);

    const eng = new SimulationEngine(mk(true));
    eng.play();
    for (let i = 0; i < 600; i++) eng.step();
    const snap = eng.getSnapshot();
    const v1 = snap.vehicles.find((v) => v.id === 'v1')!;
    const v2 = snap.vehicles.find((v) => v.id === 'v2')!;
    expect(v1, 'v1 present').toBeDefined();
    expect(v2, 'v2 present').toBeDefined();
    expect(v1.speed).toBeLessThan(0.5);
    expect(v2.speed).toBeLessThan(0.5);
    expect(v1.s).toBeLessThan(80); // never passed the incident
    expect(v2.s).toBeLessThan(80);
    expect(v1.s).toBeGreaterThan(v2.s); // ordered queue behind the incident
    expect(v1.s - v2.s).toBeGreaterThanOrEqual(4);
    expect(v1.status).toBe('queued');
  });
});
