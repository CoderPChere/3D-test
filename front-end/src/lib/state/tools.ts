import type { WorkspaceMode } from '../model/types';

export type ToolId =
  | 'select'
  | 'move'
  | 'build-road'
  | 'add-building'
  | 'add-vehicle'
  | 'add-signal'
  | 'add-incident'
  | 'create-zone'
  | 'layers';

export const TOOL_ORDER: ToolId[] = [
  'select',
  'move',
  'build-road',
  'add-building',
  'add-vehicle',
  'add-signal',
  'add-incident',
  'create-zone',
  'layers',
];

export const TOOL_LABELS: Record<ToolId, string> = {
  select: 'Select',
  move: 'Move',
  'build-road': 'Build Road',
  'add-building': 'Add Building',
  'add-vehicle': 'Add Vehicle',
  'add-signal': 'Add Signal',
  'add-incident': 'Add Incident',
  'create-zone': 'Create Zone',
  layers: 'Layers',
};

/** Which workspace modes expose each tool (mobility module baseline; modules may narrow this later). */
const TOOL_MODES: Record<ToolId, WorkspaceMode[]> = {
  select: ['explore', 'build', 'simulate', 'analyze'],
  layers: ['explore', 'build', 'simulate', 'analyze'],
  move: ['build'],
  'build-road': ['build'],
  'add-building': ['build'],
  'add-signal': ['build'],
  'create-zone': ['build'],
  'add-vehicle': ['build', 'simulate'],
  'add-incident': ['build', 'simulate'],
};

export function toolAllowedInMode(tool: ToolId, mode: WorkspaceMode): boolean {
  return TOOL_MODES[tool].includes(mode);
}

export function toolsForMode(mode: WorkspaceMode): ToolId[] {
  return TOOL_ORDER.filter((t) => toolAllowedInMode(t, mode));
}
