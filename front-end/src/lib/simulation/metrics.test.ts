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

const queueFixture = (incidentOn: boolean) =>
  project([
    road('h', [-50, 0], [50, 0]),
    vehicle('v1', [-10, 0], 'h', 1),
    vehicle('v2', [-30, 0], 'h', 1),
    ...(incidentOn ? [incident('inc', [30, 0], 'h', 1)] : []),
  ]);

describe('metrics', () => {
  it('zero-vehicle reset → all metrics zero', () => {
    const eng = new SimulationEngine(generateProject(42));
    eng.play();
    for (let i = 0; i < 200; i++) eng.step();
    const mid = eng.getSnapshot().metrics;
    expect(mid.vehicleCount).toBeGreaterThan(0); // computed from live state
    expect(mid.avgSpeed).toBeGreaterThan(0);
    expect(mid.totalDelay).toBeGreaterThan(0); // starting from rest ≠ free flow

    eng.reset();
    const m = eng.getSnapshot().metrics;
    expect(m.vehicleCount).toBe(0);
    expect(m.avgSpeed).toBe(0);
    expect(m.density).toBe(0);
    expect(m.congestion).toBe(0);
    expect(m.totalDelay).toBe(0);
    expect(m.queues).toEqual({});
    expect(m.throughput).toEqual({});
  });

  it('queue buildup raises segment metrics; clearing them lowers them', () => {
    // flowing control
    const ctrl = new SimulationEngine(queueFixture(false));
    ctrl.play();
    for (let i = 0; i < 600; i++) ctrl.step();
    const c = ctrl.getSnapshot().metrics;
    expect(c.congestion).toBeLessThan(0.5);
    expect(c.queues.h ?? 0).toBe(0);
    expect(c.avgSpeed).toBeGreaterThan(5);
    const completed = Object.values(c.throughput).reduce((a, b) => a + b, 0);
    expect(completed).toBeGreaterThanOrEqual(1); // throughput is counted, not hardcoded

    // blocked: queue builds
    const p = queueFixture(true);
    const eng = new SimulationEngine(p);
    eng.play();
    for (let i = 0; i < 600; i++) eng.step();
    const m = eng.getSnapshot().metrics;
    expect(m.vehicleCount).toBe(2);
    expect(m.congestion).toBe(1); // both vehicles queued
    expect(m.queues.h).toBe(2);
    expect(m.avgSpeed).toBeLessThan(1); // km/h — crawling
    expect(m.density).toBeGreaterThan(0);
    expect(m.totalDelay).toBeGreaterThan(c.totalDelay); // stopped traffic accumulates delay

    // clearing the incident → metrics recover
    (p.objects['inc'] as Incident).active = false;
    for (let i = 0; i < 200; i++) eng.step();
    const after = eng.getSnapshot().metrics;
    expect(after.congestion).toBeLessThan(0.5);
    expect(after.queues.h ?? 0).toBe(0);
    expect(after.avgSpeed).toBeGreaterThan(5);
  });

  it('byType counts match the fleet composition and reset to zero', () => {
    const p = project([
      road('h', [-50, 0], [50, 0]),
      { ...vehicle('v1', [-10, 0], 'h', 1), vehicleType: 'car' },
      { ...vehicle('v2', [-30, 0], 'h', 1), vehicleType: 'bus' },
      { ...vehicle('v3', [10, 0], 'h', -1), vehicleType: 'truck' },
    ]);
    const eng = new SimulationEngine(p);
    eng.play();
    for (let i = 0; i < 60; i++) eng.step();
    expect(eng.getSnapshot().metrics.byType).toEqual({ car: 1, bus: 1, truck: 1, van: 0 });

    eng.reset();
    expect(eng.getSnapshot().metrics.byType).toEqual({ car: 0, bus: 0, truck: 0, van: 0 });
  });

  it('surge vehicles count as cars in byType', () => {
    const p = project([road('h', [-50, 0], [50, 0])]);
    const eng = new SimulationEngine(p);
    eng.setScenario([{ id: 'e1', type: 'vehicle_surge', at: 0.5, count: 3, roadId: 'h' }]);
    eng.play();
    for (let i = 0; i < 30; i++) eng.step(); // 1.5 s > trigger
    const m = eng.getSnapshot().metrics;
    expect(m.vehicleCount).toBeGreaterThan(0);
    expect(m.byType.car).toBe(m.vehicleCount);
    expect(m.byType.bus + m.byType.truck + m.byType.van).toBe(0);
  });
});
