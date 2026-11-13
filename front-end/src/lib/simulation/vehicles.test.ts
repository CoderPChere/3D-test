import { describe, it, expect } from 'vitest';
import { SimulationEngine } from './engine';
import { generateProject } from '../model/generate';
import {
  PROJECT_VERSION,
  defaultProjectSettings,
  type CityObject,
  type CityProject,
  type Road,
  type Signal,
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

function signal(id: string, position: Vec2, timing: Signal['timing']): Signal {
  return { type: 'signal', id, name: id, position, timing };
}

function vehicle(id: string, position: Vec2, spawnRoadId: string, heading: 1 | -1): Vehicle {
  return { type: 'vehicle', id, name: id, position, vehicleType: 'car', spawnRoadId, heading };
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

describe('vehicle spawning', () => {
  it('spawns each project vehicle on its spawn road with the configured heading', () => {
    const p = generateProject(42);
    const eng = new SimulationEngine(p);
    eng.play();
    eng.step();
    const snap = eng.getSnapshot();
    const byId = new Map(snap.vehicles.map((v) => [v.id, v]));
    const projVehicles = p.order.map((id) => p.objects[id]).filter((o): o is Vehicle => o.type === 'vehicle');
    expect(snap.vehicles).toHaveLength(projVehicles.length);
    for (const pv of projVehicles) {
      const sv = byId.get(pv.id);
      expect(sv, `spawned ${pv.id}`).toBeDefined();
      expect(sv!.roadId).toBe(pv.spawnRoadId);
      expect(sv!.heading).toBe(pv.heading);
      // within the lane offset (1.75) of the project's centerline position
      expect(Math.hypot(sv!.x - pv.position[0], sv!.z - pv.position[1])).toBeLessThan(2.5);
    }
  });

  it('does not spawn vehicles whose spawn road is closed', () => {
    const p = project([
      road('open', [-50, 0], [50, 0]),
      road('closed', [0, -50], [0, 50], false),
      vehicle('ok', [0, 0], 'open', 1),
      vehicle('bad', [0, 10], 'closed', 1),
    ]);
    const eng = new SimulationEngine(p);
    eng.play();
    eng.step();
    expect(eng.getSnapshot().vehicles.map((v) => v.id)).toEqual(['ok']);
  });
});

describe('car-following', () => {
  it('a follower never overlaps its leader', () => {
    const eng = new SimulationEngine(generateProject(42));
    eng.play();
    for (let i = 0; i < 600; i++) {
      eng.step();
      const snap = eng.getSnapshot();
      // Same road + heading = same travel direction; s is the along-road coordinate,
      // so separation in s is the true bumper-to-bumper distance across road pieces.
      const groups = new Map<string, typeof snap.vehicles>();
      for (const v of snap.vehicles) {
        const key = `${v.roadId}|${v.heading}`;
        (groups.get(key) ?? groups.set(key, []).get(key)!).push(v);
      }
      for (const list of groups.values()) {
        list.sort((a, b) => a.s - b.s);
        for (let j = 1; j < list.length; j++) {
          expect(
            list[j].s - list[j - 1].s,
            `step ${i}: ${list[j - 1].id}→${list[j].id} on ${list[j].roadId}`,
          ).toBeGreaterThanOrEqual(4);
        }
      }
    }
  });
});

describe('signal stop lines', () => {
  it('vehicles stop ordered behind a red stop line and resume on green', () => {
    // offset=8 puts the horizontal approach red for the first 8 simulated seconds.
    const p = project([
      road('h', [-50, 0], [50, 0]),
      signal('sig', [50, 0], { green: 6, yellow: 2, offset: 8 }),
      vehicle('va', [40, 0], 'h', 1),
      vehicle('vb', [30, 0], 'h', 1),
    ]);
    const eng = new SimulationEngine(p);
    eng.play();

    // t = 5.0s — still red for the h approach
    for (let i = 0; i < 100; i++) eng.step();
    const red = eng.getSnapshot();
    expect(red.time).toBeCloseTo(5, 6);
    const va = red.vehicles.find((v) => v.id === 'va')!;
    const vb = red.vehicles.find((v) => v.id === 'vb')!;
    expect(va, 'va present during red').toBeDefined();
    expect(vb, 'vb present during red').toBeDefined();
    expect(va.speed).toBeLessThan(0.5);
    expect(vb.speed).toBeLessThan(0.5);
    expect(va.s).toBeLessThan(98); // stop line = length - 2
    expect(vb.s).toBeLessThan(98);
    expect(va.s).toBeGreaterThan(vb.s); // ordered behind the line
    expect(va.s - vb.s).toBeGreaterThanOrEqual(4);
    expect(va.s).toBeGreaterThan(85); // settled at the line, not stalled far back
    expect(va.status).toBe('queued');

    // advance past green start (t ∈ [8,14) is h green) → traffic resumes
    for (let i = 0; i < 140; i++) eng.step(); // t = 12.0
    const green = eng.getSnapshot();
    const va2 = green.vehicles.find((v) => v.id === 'va');
    expect(va2, 'va still in fleet after respawn').toBeDefined();
    expect(va2!.speed).toBeGreaterThan(3);
  });
});
