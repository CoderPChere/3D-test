import { describe, it, expect } from 'vitest';
import { SimulationEngine, FIXED_STEP } from './engine';
import { generateProject } from '../model/generate';
import { signalStates } from './signals';

const project = () => generateProject(42);

describe('SimulationEngine core', () => {
  it('advances a fixed 1/20s timestep, headless (no DOM/React)', () => {
    const eng = new SimulationEngine(project());
    expect(FIXED_STEP).toBeCloseTo(0.05, 12);
    eng.play();
    for (let i = 0; i < 100; i++) eng.step();
    expect(eng.getSnapshot().time).toBeCloseTo(5, 10);
  });

  it('same seed + inputs → identical state sequence', () => {
    const a = new SimulationEngine(project(), 7);
    const b = new SimulationEngine(project(), 7);
    a.play();
    b.play();
    for (let i = 0; i < 400; i++) {
      a.step();
      b.step();
      if (i % 97 === 0) expect(a.getSnapshot()).toEqual(b.getSnapshot());
    }
    expect(a.getSnapshot()).toEqual(b.getSnapshot());
  });

  it('reset → bit-identical replay', () => {
    const eng = new SimulationEngine(project(), 7);
    eng.play();
    for (let i = 0; i < 250; i++) eng.step();
    const first = JSON.stringify(eng.getSnapshot());
    eng.reset();
    for (let i = 0; i < 250; i++) eng.step();
    expect(JSON.stringify(eng.getSnapshot())).toBe(first);
  });

  it('pause freezes state; play resumes from where it stopped', () => {
    const eng = new SimulationEngine(project());
    eng.play();
    for (let i = 0; i < 10; i++) eng.step();
    const t1 = eng.getSnapshot().time;
    eng.pause();
    expect(eng.getSnapshot().running).toBe(false);
    for (let i = 0; i < 50; i++) eng.step();
    expect(eng.getSnapshot().time).toBe(t1);
    eng.play();
    for (let i = 0; i < 10; i++) eng.step();
    expect(eng.getSnapshot().time).toBeCloseTo(t1 + 10 * FIXED_STEP, 10);
  });

  it('onTick fires once per step with the engine time and unsubscribes', () => {
    const eng = new SimulationEngine(project());
    const times: number[] = [];
    const off = eng.onTick((t) => times.push(t));
    eng.play();
    for (let i = 0; i < 5; i++) eng.step();
    expect(times).toHaveLength(5);
    expect(times[4]).toBeCloseTo(5 * FIXED_STEP, 10);
    off();
    eng.step();
    expect(times).toHaveLength(5);
  });

  it('snapshot exposes a signal state for every project signal', () => {
    const p = project();
    const eng = new SimulationEngine(p);
    const snap = eng.getSnapshot();
    const signalIds = p.order.filter((id) => p.objects[id].type === 'signal');
    expect(Object.keys(snap.signals).sort()).toEqual([...signalIds].sort());
    for (const id of signalIds) {
      expect(['red', 'yellow', 'green']).toContain(snap.signals[id].h);
      expect(['red', 'yellow', 'green']).toContain(snap.signals[id].v);
    }
  });

  it('starts paused with zeroed metrics and an empty fleet', () => {
    const eng = new SimulationEngine(project());
    const snap = eng.getSnapshot();
    expect(snap.running).toBe(false);
    expect(snap.time).toBe(0);
    expect(snap.vehicles).toEqual([]);
    expect(snap.metrics.vehicleCount).toBe(0);
    expect(snap.metrics.avgSpeed).toBe(0);
    expect(snap.metrics.density).toBe(0);
    expect(snap.metrics.congestion).toBe(0);
    expect(snap.positions).toHaveLength(0);
  });

  it('signal phases cycle per timing config and match the inspector\'s pure signalStates', () => {
    const p = project();
    const eng = new SimulationEngine(p);
    eng.play();
    const seen = new Map<string, Set<string>>();
    const check = () => {
      const snap = eng.getSnapshot();
      for (const id of p.order) {
        const o = p.objects[id];
        if (o.type !== 'signal') continue;
        // engine snapshot === what the inspector renders (same pure function)
        const pure = signalStates(o.timing, snap.time);
        expect(snap.signals[id]).toEqual({ h: pure.h, v: pure.v });
        for (const axis of ['h', 'v'] as const) {
          const key = `${id}:${axis}`;
          if (!seen.has(key)) seen.set(key, new Set());
          seen.get(key)!.add(snap.signals[id][axis]);
        }
      }
    };
    check();
    for (let i = 0; i < 600; i++) {
      eng.step(); // 30 simulated seconds ≈ 2 cycles of the 16s cycle
      if (i % 60 === 0) check();
    }
    check();
    // every axis must have visited all three phases during the run
    for (const phases of seen.values()) {
      expect([...phases].sort()).toEqual(['green', 'red', 'yellow']);
    }
  });
});
