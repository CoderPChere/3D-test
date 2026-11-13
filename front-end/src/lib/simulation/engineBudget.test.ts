import { describe, it, expect } from 'vitest';
import { SimulationEngine } from './engine';
import { generateProject } from '../model/generate';

const project = () => generateProject(1);
const defs = (p: ReturnType<typeof project>) =>
  p.order.filter((id) => p.objects[id].type === 'vehicle').length;
const firstRoad = (p: ReturnType<typeof project>) =>
  p.order.find((id) => p.objects[id].type === 'road')!;

describe('vehicle budget (quality tier entity cap)', () => {
  it('caps the spawned fleet at the budget and flags the cap', () => {
    const p = project();
    expect(defs(p)).toBeGreaterThan(2);
    const e = new SimulationEngine(p, 1);
    e.setVehicleBudget(1);
    e.play();
    e.step();

    const snap = e.getSnapshot();
    expect(snap.vehicles.length).toBe(1); // first def always places on an empty fleet
    expect(snap.spawnCapped).toBe(true);
  });

  it('never caps when the fleet fits the budget', () => {
    const p = project();
    const e = new SimulationEngine(p, 1);
    e.play();
    e.step();

    const snap = e.getSnapshot();
    expect(snap.spawnCapped).toBe(false);
    expect(snap.vehicles.length).toBeGreaterThan(0);
    expect(snap.vehicles.length).toBeLessThanOrEqual(defs(p));
  });

  it('keeps the budget across reset and re-applies the cap on replay', () => {
    const p = project();
    const e = new SimulationEngine(p, 1);
    e.setVehicleBudget(1);
    e.play();
    e.step();
    expect(e.getSnapshot().spawnCapped).toBe(true);

    e.reset();
    expect(e.getSnapshot().spawnCapped).toBe(false); // flag cleared with the run
    expect(e.getSnapshot().vehicles.length).toBe(0);

    e.step();
    expect(e.getSnapshot().vehicles.length).toBe(1);
    expect(e.getSnapshot().spawnCapped).toBe(true);
  });

  it('caps a surge that would push the fleet past the budget', () => {
    const p = project();
    const e = new SimulationEngine(p, 1);
    e.setVehicleBudget(1000);
    e.setScenario([{ id: 'ev', type: 'vehicle_surge', at: 0.1, count: 10, roadId: firstRoad(p) }]);
    e.play();
    e.step(); // spawn the fleet
    const n = e.getSnapshot().vehicles.length;
    e.setVehicleBudget(n); // fleet now sits exactly at the budget

    for (let i = 0; i < 5; i++) e.step(); // t = 0.3 > 0.1 → surge fires
    const snap = e.getSnapshot();
    expect(snap.spawnCapped).toBe(true);
    expect(snap.vehicles.length).toBe(n); // no surge vehicle joined
  });
});
