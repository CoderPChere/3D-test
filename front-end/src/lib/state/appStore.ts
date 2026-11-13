import { create } from 'zustand';
import type { WorkspaceMode } from '../model/types';
import { toolAllowedInMode, type ToolId } from './tools';

interface AppState {
  projectName: string;
  mode: WorkspaceMode;
  activeTool: ToolId;
  /** Epoch ms of last successful save; null = unsaved changes since load. */
  savedAt: number | null;
  /** Current user-facing error/status message, null when none. */
  message: string | null;
  /** OrbitControls enabled — disabled while a move-drag is in progress. */
  controlsEnabled: boolean;
  setProjectName: (name: string) => void;
  setMode: (mode: WorkspaceMode) => void;
  setTool: (tool: ToolId) => void;
  setControlsEnabled: (enabled: boolean) => void;
  markSaved: (at: number) => void;
  markDirty: () => void;
  setMessage: (message: string | null) => void;
}

export const useAppStore = create<AppState>()((set, get) => ({
  projectName: 'Untitled Project',
  mode: 'explore',
  activeTool: 'select',
  savedAt: null,
  message: null,
  controlsEnabled: true,
  setProjectName: (projectName) => set({ projectName }),
  setMode: (mode) => {
    const current = get().activeTool;
    set({ mode, activeTool: toolAllowedInMode(current, mode) ? current : 'select' });
  },
  setTool: (activeTool) => set({ activeTool }),
  setControlsEnabled: (controlsEnabled) => set({ controlsEnabled }),
  markSaved: (savedAt) => set({ savedAt, message: null }),
  markDirty: () => set({ savedAt: null }),
  setMessage: (message) => set({ message }),
}));
