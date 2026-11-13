import { create } from 'zustand';
import type { Scenario, VehicleType } from '../model/types';
import { newObjectId } from '../model/types';
import { useProjectStore } from './projectStore';

/** Result of one completed/stopped scenario run (session-scoped, not persisted with the project). */
export interface ScenarioResult {
  scenarioId: string;
  seed: number;
  /** Epoch ms when the run finished. */
  ranAt: number;
  simTime: number;
  metrics: {
    vehicleCount: number;
    avgSpeed: number;
    density: number;
    congestion: number;
    totalDelay: number;
    byType: Record<VehicleType, number>;
    maxQueue: number;
    throughput: number;
  };
}

interface ScenarioState {
  activeId: string | null;
  results: Record<string, ScenarioResult>;
  setActive: (id: string | null) => void;
  recordResult: (result: ScenarioResult) => void;
  /** Create a new empty scenario in the project and activate it. */
  create: () => void;
  /** Rename in place; events are untouched. */
  rename: (id: string, name: string) => void;
  /** Copy a scenario (events deep-copied) under a distinct name; the copy becomes active. */
  duplicate: (id: string) => void;
}

export const useScenarioStore = create<ScenarioState>()((set) => ({
  activeId: null,
  results: {},
  setActive: (activeId) => set({ activeId }),
  recordResult: (result) => set((s) => ({ results: { ...s.results, [result.scenarioId]: result } })),
  create: () => {
    const scenarios = useProjectStore.getState().project.scenarios;
    const scenario: Scenario = {
      id: newObjectId('scn'),
      name: `Scenario ${scenarios.length + 1}`,
      events: [],
    };
    useProjectStore.getState().mutateScenarios((list) => [...list, scenario]);
    set({ activeId: scenario.id });
  },
  rename: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    useProjectStore.getState().mutateScenarios((list) =>
      list.map((s) => (s.id === id ? { ...s, name: trimmed } : s)),
    );
  },
  duplicate: (id) => {
    const source = useProjectStore.getState().project.scenarios.find((s) => s.id === id);
    if (!source) return;
    const copy: Scenario = {
      id: newObjectId('scn'),
      name: `${source.name} (copy)`,
      events: source.events.map((e) => ({ ...e })),
    };
    useProjectStore.getState().mutateScenarios((list) => {
      const idx = list.findIndex((s) => s.id === id);
      const next = [...list];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    set({ activeId: copy.id });
  },
}));
