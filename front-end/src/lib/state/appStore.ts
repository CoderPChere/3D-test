import { create } from 'zustand';
import type { Vec2, WorkspaceMode } from '../model/types';
import { toolAllowedInMode, type ToolId } from './tools';

interface AppState {
  projectName: string;
  mode: WorkspaceMode;
  activeTool: ToolId;
  /** First click of a two-click road draw; null when not drawing. */
  roadDraft: Vec2 | null;
  /** Epoch ms of last successful save; null = unsaved changes since load. */
  savedAt: number | null;
  /** Current user-facing error/status message, null when none. */
  message: string | null;
  /** OrbitControls enabled — disabled while a move-drag is in progress. */
  controlsEnabled: boolean;
  setProjectName: (name: string) => void;
  setMode: (mode: WorkspaceMode) => void;
  setTool: (tool: ToolId) => void;
  beginRoadDraft: (point: Vec2) => void;
  cancelRoadDraft: () => void;
  setControlsEnabled: (enabled: boolean) => void;
  markSaved: (at: number) => void;
  markDirty: () => void;
  setMessage: (message: string | null) => void;
}

export const useAppStore = create<AppState>()((set, get) => ({
  projectName: 'Untitled Project',
  mode: 'explore',
  activeTool: 'select',
  roadDraft: null,
  savedAt: null,
  message: null,
  controlsEnabled: true,
  setProjectName: (projectName) => set({ projectName }),
  setMode: (mode) => {
    const current = get().activeTool;
    const next = toolAllowedInMode(current, mode) ? current : 'select';
    set({ mode, activeTool: next, roadDraft: next === 'build-road' ? get().roadDraft : null });
  },
  setTool: (activeTool) => set({ activeTool, roadDraft: activeTool === 'build-road' ? get().roadDraft : null }),
  beginRoadDraft: (roadDraft) => set({ roadDraft }),
  cancelRoadDraft: () => set({ roadDraft: null }),
  setControlsEnabled: (controlsEnabled) => set({ controlsEnabled }),
  markSaved: (savedAt) => set({ savedAt, message: null }),
  markDirty: () => set({ savedAt: null }),
  setMessage: (message) => set({ message }),
}));
