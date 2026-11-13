import { describe, it, expect } from 'vitest';
import { SimulationEngine } from './engine';
import {
  PROJECT_VERSION,
  defaultProjectSettings,
  type CityObject,
  type CityProject,
  type Road,
  type ScenarioEvent,
  type Signal,
  type SignalTiming,
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

function signal(id: string, timing: SignalTiming): Signal {
  return { type: 'signal', id, name: id, position: [0, 0], timing };
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

/** Run steps until simulated time first reaches `t` (fp-safe). */
function stepTo(eng: SimulationEngine, t: number): void {
  let guard = 0;
  while (eng.getSnapshot().time < t && guard++ < 10_000) eng.step();
}

const closure = (at: number, roadId: string, closed: boolean, id = 'e'): ScenarioEvent => ({
  id,
  type: 'road_closure',
  at,
  roadId,
  closed,
});

describe('scenario events: trigger timing', () => {
  it('a road closure fires at its trigger timestep, not before', () => {
    const p = project([road('a', [-50, 0], [50, 0]), vehicle('v1', [-40, 0], 'a', 1)]);
    const eng = new SimulationEngine(p);
    eng.setScenario([closure(1, 'a', true)]);
    eng.play();

    for (let i = 0; i < 19; i++) eng.step(); // t ≈ 0.95
    expect(eng.isRoadClosed('a')).toBe(false);

    stepTo(eng, 1);
    expect(eng.isRoadClosed('a')).toBe(true);
    expect(eng.getSnapshot().time).toBeLessThan(1.05 + 1e-9); // within one step of trigger
  });

  it('a signal timing change is visible in the snapshot at its trigger timestep', () => {
    const base: SignalTiming = { green: 1, yellow: 1, offset: 2 }; // h red at t ≈ 1
    const after: SignalTiming = { green: 0, yellow: 1000, offset: 0 }; // h yellow
    const p = project([signal('s1', base)]);
    const eng = new SimulationEngine(p);
    eng.setScenario([{ id: 'e1', type: 'signal_timing_change', at: 1, signalId: 's1', timing: after }]);
    eng.play();

    for (let i = 0; i < 19; i++) eng.step(); // t ≈ 0.95
    expect(eng.getSnapshot().signals['s1']).toEqual({ h: 'red', v: 'green' }); // base timing

    stepTo(eng, 1);
    expect(eng.getSnapshot().signals['s1']).toEqual({ h: 'yellow', v: 'red' });
  });

  it('a vehicle surge adds exactly the requested count at its trigger time', () => {
    const p = project([road('a', [-50, 0], [50, 0]), vehicle('v1', [-40, 0], 'a', 1)]);
    const eng = new SimulationEngine(p);
    eng.setScenario([{ id: 'e1', type: 'vehicle_surge', at: 0.5, count: 5, roadId: 'a' }]);
    eng.play();

    for (let i = 0; i < 9; i++) eng.step(); // t = 0.45
    expect(eng.getSnapshot().vehicles).toHaveLength(1);

    stepTo(eng, 0.5);
    expect(eng.getSnapshot().vehicles).toHaveLength(6);
  });

  it('an accident event queues traffic upstream of the incident site', () => {
    const mk = (events: ScenarioEvent[]) => {
      const p = project([road('h', [-50, 0], [50, 0]), vehicle('v1', [-10, 0], 'h', 1)]);
      const eng = new SimulationEngine(p);
      eng.setScenario(events);
      eng.play();
      return eng;
    };

    // Control: no accident → the vehicle drives past the midpoint (s = 50).
    const ctrl = mk([]);
    let maxS = 0;
    for (let i = 0; i < 600; i++) {
      ctrl.step();
      for (const v of ctrl.getSnapshot().vehicles) maxS = Math.max(maxS, v.s);
    }
    expect(maxS).toBeGreaterThan(80);

    const eng = mk([{ id: 'e1', type: 'accident', at: 1, roadId: 'h', severity: 1 }]);
    stepTo(eng, 1);
    for (let i = 0; i < 599; i++) eng.step();
    const v = eng.getSnapshot().vehicles.find((x) => x.id === 'v1');
    expect(v).toBeDefined();
    expect(v!.s).toBeLessThan(50); // never passed the accident site
    expect(v!.speed).toBeLessThan(0.5);
    expect(v!.status).toBe('queued');
  });
});

describe('scenario events: same-time ordering', () => {
  it('same-time closures apply in scenario order (last defined event wins)', () => {
    const mk = (events: ScenarioEvent[]) => {
      const p = project([road('a', [-50, 0], [50, 0]), vehicle('v1', [-40, 0], 'a', 1)]);
      const eng = new SimulationEngine(p);
      eng.setScenario(events);
      eng.play();
      stepTo(eng, 1);
      return eng;
    };

    // close then reopen → road ends up open
    expect(mk([closure(1, 'a', true, 'e1'), closure(1, 'a', false, 'e2')]).isRoadClosed('a')).toBe(false);
    // reopen then close → road ends up closed
    expect(mk([closure(1, 'a', false, 'e1'), closure(1, 'a', true, 'e2')]).isRoadClosed('a')).toBe(true);
  });

  it('same-time signal timing changes apply in scenario order', () => {
    const base: SignalTiming = { green: 1, yellow: 1, offset: 2 };
    const ta: SignalTiming = { green: 0, yellow: 1000, offset: 0 }; // → h yellow
    const tb: SignalTiming = { green: 1000, yellow: 0, offset: 0 }; // → h green
    const mk = (events: ScenarioEvent[]) => {
      const p = project([signal('s1', base)]);
      const eng = new SimulationEngine(p);
      eng.setScenario(events);
      eng.play();
      stepTo(eng, 1);
      return eng.getSnapshot().signals['s1'];
    };

    expect(mk([
      { id: 'e1', type: 'signal_timing_change', at: 1, signalId: 's1', timing: ta },
      { id: 'e2', type: 'signal_timing_change', at: 1, signalId: 's1', timing: tb },
    ])).toEqual({ h: 'green', v: 'red' }); // tb applied last

    expect(mk([
      { id: 'e1', type: 'signal_timing_change', at: 1, signalId: 's1', timing: tb },
      { id: 'e2', type: 'signal_timing_change', at: 1, signalId: 's1', timing: ta },
    ])).toEqual({ h: 'yellow', v: 'red' }); // ta applied last
  });
});

describe('scenario events: run and reset', () => {
  const mkEngine = () => {
    const p = project([road('a', [-50, 0], [50, 0]), vehicle('v1', [-40, 0], 'a', 1)]);
    const eng = new SimulationEngine(p);
    eng.setScenario([
      { id: 'e1', type: 'vehicle_surge', at: 0.5, count: 3, roadId: 'a' },
      closure(1, 'a', true, 'e2'),
    ]);
    eng.play();
    return eng;
  };

  /** Per-step state record: time, fleet poses, closure state. */
  const record = (eng: SimulationEngine) => {
    const steps: Array<[number, unknown[], boolean]> = [];
    for (let i = 0; i < 100; i++) {
      eng.step();
      const snap = eng.getSnapshot();
      steps.push([snap.time, snap.vehicles.map((v) => [v.id, v.x, v.z, v.speed]), eng.isRoadClosed('a')]);
    }
    return steps;
  };

  it('reset reverts event effects and a replay is bit-identical', () => {
    const eng = mkEngine();
    const first = record(eng);
    expect(first[99][2]).toBe(true); // closure fired during the run
    expect(first[99][1]).toHaveLength(4); // surge added 3 vehicles

    eng.reset();
    expect(eng.isRoadClosed('a')).toBe(false); // event effects reverted
    expect(eng.getSnapshot().vehicles).toHaveLength(0); // back to base state
    expect(eng.getSnapshot().time).toBe(0);

    const second = record(eng);
    expect(second).toEqual(first); // same events re-fire → identical sequence
  });
});
