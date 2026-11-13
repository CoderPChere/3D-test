import { beforeEach, describe, expect, it } from 'vitest';
import { useScenarioStore } from './scenarioStore';
import { useProjectStore } from './projectStore';
import type { Scenario, ScenarioEvent } from '../model/types';

function makeEvents(n: number): ScenarioEvent[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `evt_${i}`,
    type: 'road_closure' as const,
    at: 10 + i * 5,
    roadId: 'road_1',
    closed: true,
  }));
}

function seedScenarios(scenarios: Scenario[]) {
  const s = useProjectStore.getState();
  useProjectStore.setState({
    project: { ...s.project, scenarios },
    past: [],
    future: [],
  });
}

beforeEach(() => {
  seedScenarios([]);
  useScenarioStore.setState({ activeId: null, results: {} });
});

describe('scenario CRUD', () => {
  it('creates a scenario in the project and activates it', () => {
    useScenarioStore.getState().create();
    const { project } = useProjectStore.getState();
    expect(project.scenarios).toHaveLength(1);
    expect(project.scenarios[0].name).toBe('Scenario 1');
    expect(project.scenarios[0].events).toEqual([]);
    expect(useScenarioStore.getState().activeId).toBe(project.scenarios[0].id);
  });

  it('renames a scenario and preserves its events', () => {
    seedScenarios([{ id: 'scn_a', name: 'Rush Hour', events: makeEvents(3) }]);
    useScenarioStore.getState().rename('scn_a', 'Morning Peak');
    const { project } = useProjectStore.getState();
    expect(project.scenarios[0].name).toBe('Morning Peak');
    expect(project.scenarios[0].events).toEqual(makeEvents(3));
  });

  it('duplicates a scenario with a distinct name and an identical copy of events', () => {
    seedScenarios([{ id: 'scn_a', name: 'Rush Hour', events: makeEvents(4) }]);
    useScenarioStore.getState().duplicate('scn_a');
    const { project } = useProjectStore.getState();
    expect(project.scenarios).toHaveLength(2);
    const [orig, copy] = project.scenarios;
    expect(copy.id).not.toBe(orig.id);
    expect(copy.name).not.toBe(orig.name);
    expect(copy.events).toEqual(orig.events);
    expect(copy.events).not.toBe(orig.events); // deep copy, not shared reference
    expect(useScenarioStore.getState().activeId).toBe(copy.id);
  });

  it('scenario edits go through undo history', () => {
    seedScenarios([{ id: 'scn_a', name: 'Rush Hour', events: makeEvents(1) }]);
    const before = useProjectStore.getState().project;
    useScenarioStore.getState().rename('scn_a', 'Renamed');
    expect(useProjectStore.getState().project).not.toBe(before);
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().project).toEqual(before);
  });
});
