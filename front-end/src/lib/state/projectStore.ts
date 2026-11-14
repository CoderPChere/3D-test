import { create } from 'zustand';
import type { CityProject, CityObject, ObjectId, Scenario } from '../model/types';
import { generateProject } from '../model/generate';
import { deleteObjectWithDependents } from '../model/deleteObjects';
import { useSelectionStore } from './selectionStore';

export const HISTORY_LIMIT = 50;

interface ProjectState {
  project: CityProject;
  past: CityProject[];
  future: CityProject[];
  setProject: (p: CityProject) => void;
  addObject: (o: CityObject) => void;
  updateObject: (id: ObjectId, patch: Partial<CityObject>) => void;
  /** Delete an object and its dependents as one undoable edit. */
  deleteObject: (id: ObjectId) => void;
  /** Transform the scenario list (create/rename/duplicate) as one undoable edit. */
  mutateScenarios: (fn: (scenarios: Scenario[]) => Scenario[]) => void;
  undo: () => void;
  redo: () => void;
}

function clone(p: CityProject): CityProject {
  return {
    ...p,
    objects: { ...p.objects },
    order: [...p.order],
    scenarios: p.scenarios.map((s) => ({ ...s, events: [...s.events] })),
    settings: { ...p.settings, layers: { ...p.settings.layers } },
  };
}

export const useProjectStore = create<ProjectState>()((set, get) => {
  /** Commit a mutated copy of the project, pushing the current state onto undo history. */
  const commit = (next: CityProject) => {
    const { project, past } = get();
    set({
      project: next,
      past: [...past, project].slice(-HISTORY_LIMIT),
      future: [],
    });
  };

  return {
    project: generateProject(1),
    past: [],
    future: [],
    setProject: (p) => set({ project: p, past: [], future: [] }),
    addObject: (o) => {
      const next = clone(get().project);
      next.objects[o.id] = o;
      next.order.push(o.id);
      commit(next);
    },
    updateObject: (id, patch) => {
      const current = get().project.objects[id];
      if (!current) return;
      const next = clone(get().project);
      next.objects[id] = { ...current, ...patch } as CityObject;
      commit(next);
    },
    deleteObject: (id) => {
      const result = deleteObjectWithDependents(get().project, id);
      if (!result.ok) return;
      commit(result.project);
      if (useSelectionStore.getState().selectedId === id) useSelectionStore.getState().select(null);
    },
    mutateScenarios: (fn) => {
      const next = clone(get().project);
      next.scenarios = fn(next.scenarios);
      commit(next);
    },
    undo: () => {
      const { past, future, project } = get();
      if (past.length === 0) return;
      const previous = past[past.length - 1];
      set({
        project: previous,
        past: past.slice(0, -1),
        future: [project, ...future],
      });
    },
    redo: () => {
      const { past, future, project } = get();
      if (future.length === 0) return;
      const next = future[0];
      set({
        project: next,
        past: [...past, project].slice(-HISTORY_LIMIT),
        future: future.slice(1),
      });
    },
  };
});
