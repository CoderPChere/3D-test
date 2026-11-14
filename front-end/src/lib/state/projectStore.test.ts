import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './projectStore';
import { useSelectionStore } from './selectionStore';
import { generateProject } from '../model/generate';
import type { Building, CityProject, Road, Vehicle } from '../model/types';

const building = (id: string, x: number, z: number): Building => ({
  type: 'building',
  id,
  name: id,
  position: [x, z],
  footprint: [8, 8],
  height: 20,
  buildingType: 'commercial',
});

const fresh = (): CityProject => generateProject(42);

beforeEach(() => {
  useProjectStore.setState({ project: fresh(), past: [], future: [] });
  useSelectionStore.setState({ selectedId: null, hoverId: null });
});

describe('project store undo/redo', () => {
  it('undo then redo round-trips an edit', () => {
    const store = useProjectStore.getState();
    store.addObject(building('b_new', 80, 80));
    expect(useProjectStore.getState().project.objects['b_new']).toBeDefined();

    useProjectStore.getState().undo();
    expect(useProjectStore.getState().project.objects['b_new']).toBeUndefined();

    useProjectStore.getState().redo();
    expect(useProjectStore.getState().project.objects['b_new']).toBeDefined();
    expect(useProjectStore.getState().project.order).toContain('b_new');
  });

  it('clears the redo stack when a new edit is committed', () => {
    const store = useProjectStore.getState();
    store.addObject(building('b1', 80, 80));
    store.undo();
    expect(useProjectStore.getState().future.length).toBe(1);

    store.addObject(building('b2', 90, 90));
    expect(useProjectStore.getState().future.length).toBe(0);
    expect(useProjectStore.getState().project.objects['b2']).toBeDefined();
  });

  it('enforces the 50-entry history bound', () => {
    for (let i = 0; i < 60; i++) {
      useProjectStore.getState().addObject(building(`b_${i}`, 80 + i, 80));
    }
    expect(useProjectStore.getState().past.length).toBe(50);
    // Oldest snapshot dropped: undoing 50 times lands at entry #10 state.
    for (let i = 0; i < 50; i++) useProjectStore.getState().undo();
    const p = useProjectStore.getState().project;
    expect(p.objects['b_9']).toBeDefined();
    expect(p.objects['b_10']).toBeUndefined();
  });

  it('undo on empty history is a no-op', () => {
    const before = useProjectStore.getState().project;
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().project).toBe(before);
  });

  it('property edits are undoable', () => {
    const id = useProjectStore.getState().project.order.find(
      (oid) => useProjectStore.getState().project.objects[oid].type === 'building',
    )!;
    useProjectStore.getState().updateObject(id, { height: 99 } as Partial<Building>);
    expect((useProjectStore.getState().project.objects[id] as Building).height).toBe(99);
    useProjectStore.getState().undo();
    expect((useProjectStore.getState().project.objects[id] as Building).height).not.toBe(99);
  });

  it('setProject replaces state and clears history', () => {
    const store = useProjectStore.getState();
    store.addObject(building('b1', 80, 80));
    const other = generateProject(7);
    useProjectStore.getState().setProject(other);
    const s = useProjectStore.getState();
    expect(s.project.seed).toBe(7);
    expect(s.past.length).toBe(0);
    expect(s.future.length).toBe(0);
  });
});

describe('deleteObject', () => {
  const road = (p: CityProject): Road => Object.values(p.objects).find((o): o is Road => o.type === 'road')!;
  const vehiclesOn = (p: CityProject, roadId: string): Vehicle[] =>
    Object.values(p.objects).filter((o): o is Vehicle => o.type === 'vehicle' && o.spawnRoadId === roadId);

  it('deletes a road, its dependents, and clears a matching selection as one undo step', () => {
    const target = road(useProjectStore.getState().project);
    const dependentIds = vehiclesOn(useProjectStore.getState().project, target.id).map((v) => v.id);
    expect(dependentIds.length).toBeGreaterThan(0);
    useSelectionStore.getState().select(target.id);

    useProjectStore.getState().deleteObject(target.id);

    const s = useProjectStore.getState();
    expect(s.project.objects[target.id]).toBeUndefined();
    for (const id of dependentIds) expect(s.project.objects[id]).toBeUndefined();
    expect(s.past.length).toBe(1);
    expect(useSelectionStore.getState().selectedId).toBeNull();
  });

  it('undo restores the object and every dependent; redo removes them again', () => {
    const target = road(useProjectStore.getState().project);
    const dependentIds = vehiclesOn(useProjectStore.getState().project, target.id).map((v) => v.id);

    useProjectStore.getState().deleteObject(target.id);
    useProjectStore.getState().undo();

    let s = useProjectStore.getState();
    expect(s.project.objects[target.id]).toBeDefined();
    for (const id of dependentIds) expect(s.project.objects[id]).toBeDefined();
    expect(s.project.order.length).toBe(Object.keys(s.project.objects).length);

    useProjectStore.getState().redo();
    s = useProjectStore.getState();
    expect(s.project.objects[target.id]).toBeUndefined();
    for (const id of dependentIds) expect(s.project.objects[id]).toBeUndefined();
  });

  it('keeps an unrelated selection', () => {
    const target = road(useProjectStore.getState().project);
    const other = Object.values(useProjectStore.getState().project.objects).find((o) => o.type === 'signal')!.id;
    expect(other).not.toBe(target.id);
    useSelectionStore.getState().select(other);

    useProjectStore.getState().deleteObject(target.id);
    expect(useSelectionStore.getState().selectedId).toBe(other);
  });

  it('ignores an unknown id without creating history', () => {
    useProjectStore.getState().deleteObject('nope');
    expect(useProjectStore.getState().past.length).toBe(0);
  });
});
