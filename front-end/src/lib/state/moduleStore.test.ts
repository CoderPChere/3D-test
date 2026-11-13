import { describe, it, expect, beforeEach } from 'vitest';
import {
  useModuleStore,
  MODULE_REGISTRY,
  BASE_TOOL_IDS,
  BASE_LAYER_IDS,
  enabledToolIds,
  enabledLayerIds,
  enabledObjectTypes,
  enabledMetricIds,
} from './moduleStore';
import { useAppStore } from './appStore';
import { useProjectStore } from './projectStore';
import { generateProject } from '../model/generate';

const freshRegistry = () => MODULE_REGISTRY.map((m) => ({ ...m }));

beforeEach(() => {
  useModuleStore.setState({ modules: freshRegistry() });
  useAppStore.setState({ activeTool: 'select' });
  useProjectStore.setState({ project: generateProject(5), past: [], future: [] });
});

describe('module registry', () => {
  it('ships the mobility module registered and enabled by default', () => {
    const m = useModuleStore.getState().modules.find((x) => x.id === 'mobility');
    expect(m).toBeDefined();
    expect(m!.name).toBe('Mobility');
    expect(m!.enabled).toBe(true);
  });

  it('first launch has mobility capabilities without configuration', () => {
    const mods = useModuleStore.getState().modules;
    const tools = enabledToolIds(mods);
    expect(tools).toContain('build-road');
    expect(tools).toContain('add-vehicle');
    expect([...BASE_TOOL_IDS].every((t) => tools.has(t))).toBe(true); // workspace chrome always on
    expect(enabledObjectTypes(mods)).toEqual(new Set(['road', 'building', 'vehicle', 'signal', 'incident', 'zone']));
    expect(enabledLayerIds(mods)).toContain('heatmap');
    expect(enabledLayerIds(mods)).toContain('geometry'); // base viewport layer always on
    expect(enabledMetricIds(mods)).toContain('vehicles');
  });
});

describe('disabling a module', () => {
  it('removes its tools, layers, and metrics — re-enabling restores them', () => {
    const mods = () => useModuleStore.getState().modules;
    const toolsBefore = enabledToolIds(mods());

    useModuleStore.getState().toggleModule('mobility');

    const tools = enabledToolIds(mods());
    expect(tools.has('build-road')).toBe(false);
    expect(tools.has('add-vehicle')).toBe(false);
    expect(tools.has('select')).toBe(true); // base tools survive
    expect(enabledLayerIds(mods())).toEqual(new Set(BASE_LAYER_IDS));
    expect(enabledMetricIds(mods()).size).toBe(0);
    expect(enabledObjectTypes(mods()).size).toBe(0);

    useModuleStore.getState().toggleModule('mobility');
    expect(enabledToolIds(mods())).toEqual(toolsBefore);
    expect(enabledMetricIds(mods()).size).toBeGreaterThan(0);
  });

  it('never deletes existing city objects', () => {
    const before = useProjectStore.getState().project;
    useModuleStore.getState().toggleModule('mobility');
    const after = useProjectStore.getState().project;
    expect(after.objects).toEqual(before.objects);
    expect(after.order).toEqual(before.order);
    expect(after.scenarios).toEqual(before.scenarios);
  });

  it('resets an active tool whose module was just disabled', () => {
    useAppStore.getState().setTool('build-road');
    useModuleStore.getState().toggleModule('mobility');
    expect(useAppStore.getState().activeTool).toBe('select');
  });
});
