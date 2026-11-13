import { create } from 'zustand';
import type { LayerId, ObjectType, SandboxModule } from '../model/types';
import type { ToolId } from './tools';
import { useAppStore } from './appStore';

/**
 * Compile-time module registry — toggled at runtime, never fetched
 * (spec: module system stays minimal, no dynamic code loading).
 */
export const MODULE_REGISTRY: SandboxModule[] = [
  {
    id: 'mobility',
    name: 'Mobility',
    enabled: true,
    tools: ['build-road', 'add-building', 'add-vehicle', 'add-signal', 'add-incident', 'create-zone'],
    objectTypes: ['road', 'building', 'vehicle', 'signal', 'incident', 'zone'],
    visualizationLayers: ['vehicles', 'signals', 'heatmap', 'congestion', 'distribution'],
    metrics: [
      // Live metrics panel
      'vehicles', 'avg-speed', 'density', 'congestion', 'throughput', 'queues',
      // Comparison table
      'max-queue', 'total-delay', 'run-length',
    ],
  },
];

/** Workspace chrome available regardless of enabled modules. */
export const BASE_TOOL_IDS: ToolId[] = ['select', 'move', 'layers'];
/** Base viewport layer — not a domain capability. */
export const BASE_LAYER_IDS: LayerId[] = ['geometry'];

export function enabledToolIds(modules: SandboxModule[]): Set<ToolId> {
  const out = new Set<ToolId>(BASE_TOOL_IDS);
  for (const m of modules) if (m.enabled) for (const t of m.tools) out.add(t as ToolId);
  return out;
}

export function enabledLayerIds(modules: SandboxModule[]): Set<LayerId> {
  const out = new Set<LayerId>(BASE_LAYER_IDS);
  for (const m of modules) if (m.enabled) for (const l of m.visualizationLayers) out.add(l as LayerId);
  return out;
}

export function enabledObjectTypes(modules: SandboxModule[]): Set<ObjectType> {
  const out = new Set<ObjectType>();
  for (const m of modules) if (m.enabled) for (const t of m.objectTypes) out.add(t);
  return out;
}

export function enabledMetricIds(modules: SandboxModule[]): Set<string> {
  const out = new Set<string>();
  for (const m of modules) if (m.enabled) for (const k of m.metrics) out.add(k);
  return out;
}

interface ModuleState {
  modules: SandboxModule[];
  toggleModule: (id: string) => void;
}

export const useModuleStore = create<ModuleState>()((set) => ({
  modules: MODULE_REGISTRY.map((m) => ({ ...m })),
  toggleModule: (id) =>
    set((s) => {
      const modules = s.modules.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m));
      // Active tool whose module just went away falls back to select (never a stale place tool).
      if (!enabledToolIds(modules).has(useAppStore.getState().activeTool)) {
        useAppStore.getState().setTool('select');
      }
      return { modules };
    }),
}));
