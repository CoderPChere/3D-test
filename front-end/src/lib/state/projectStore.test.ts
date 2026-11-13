import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './projectStore';
import { generateProject } from '../model/generate';
import type { Building, CityProject } from '../model/types';

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
