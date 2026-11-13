"use client";

import { useRef } from "react";
import { Save, FolderOpen, Download, Upload, Settings, Undo2, Redo2 } from "lucide-react";
import { useAppStore } from "@/lib/state/appStore";
import { useProjectStore } from "@/lib/state/projectStore";
import { exportProject, importProjectFile, loadProject, saveProject } from "@/lib/persist/projectIO";
import { ports } from "@/lib/ports";
import type { WorkspaceMode } from "@/lib/model/types";

const MODES: { id: WorkspaceMode; label: string }[] = [
  { id: "explore", label: "Explore" },
  { id: "build", label: "Build" },
  { id: "simulate", label: "Simulate" },
  { id: "analyze", label: "Analyze" },
];

export default function TopBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const projectName = useAppStore((s) => s.projectName);
  const mode = useAppStore((s) => s.mode);
  const savedAt = useAppStore((s) => s.savedAt);
  const setProjectName = useAppStore((s) => s.setProjectName);
  const setMode = useAppStore((s) => s.setMode);
  const markSaved = useAppStore((s) => s.markSaved);
  const markDirty = useAppStore((s) => s.markDirty);
  const setMessage = useAppStore((s) => s.setMessage);

  const project = useProjectStore((s) => s.project);
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const setProject = useProjectStore((s) => s.setProject);

  const fileInput = useRef<HTMLInputElement>(null);

  // Optional backend port (integration-ports spec): falls back to local storage.
  const handleSave = async () => {
    try {
      if (ports.backend) await ports.backend.saveProject(projectName, project);
      else saveProject(project, projectName);
      markSaved(Date.now());
    } catch (e) {
      setMessage(`Save failed: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  };

  const handleLoad = async () => {
    try {
      const saved = ports.backend ? await ports.backend.loadProject() : loadProject();
      if (!saved) {
        setMessage("No saved project found");
        return;
      }
      setProject(saved.project);
      setProjectName(saved.projectName);
      markSaved(saved.savedAt);
    } catch (e) {
      setMessage(`Load failed: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  };

  const handleExport = () => {
    try {
      exportProject(project, projectName);
      setMessage("Project exported");
    } catch (e) {
      setMessage(`Export failed: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { projectName: importedName, project: imported } = await importProjectFile(file);
      setProject(imported);
      setProjectName(importedName);
      markDirty();
      setMessage(`Imported "${importedName}"`);
    } catch (e) {
      setMessage(`Import failed: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  };

  const btn =
    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] uppercase tracking-wider text-slate-300 border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-35 disabled:pointer-events-none";

  return (
    <header className="z-30 flex h-12 shrink-0 items-center gap-3 border-b border-white/10 bg-black/60 px-3 backdrop-blur-xl">
      <span className="hologram-text text-sm font-black uppercase tracking-widest">CityFluxy</span>

      <div className="h-5 w-px bg-white/10" />

      <input
        aria-label="Project name"
        value={projectName}
        onChange={(e) => {
          setProjectName(e.target.value);
          markDirty();
        }}
        className="w-44 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-200 outline-none hover:border-white/10 focus:border-accent"
      />

      <div
        className="flex items-center rounded-md border border-white/10 bg-white/5 p-0.5"
        role="tablist"
        aria-label="Workspace mode"
      >
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => setMode(m.id)}
            className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider rounded transition-colors ${
              mode === m.id ? "bg-accent text-black" : "text-slate-400 hover:text-white"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <span
        data-testid="save-state"
        className={`text-[10px] uppercase tracking-widest ${savedAt === null ? "text-amber-400" : "text-emerald-400"}`}
      >
        {savedAt === null ? "Unsaved" : `Saved ${new Date(savedAt).toLocaleTimeString()}`}
      </span>

      <div className="ml-auto flex items-center gap-1.5">
        <button className={btn} onClick={handleSave} aria-label="Save project">
          <Save size={13} /> Save
        </button>
        <button className={btn} onClick={handleLoad} aria-label="Load project">
          <FolderOpen size={13} /> Load
        </button>
        <button className={btn} onClick={() => fileInput.current?.click()} aria-label="Import project">
          <Upload size={13} /> Import
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            void handleImportFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button className={btn} onClick={handleExport} aria-label="Export project">
          <Download size={13} /> Export
        </button>
        <button className={btn} onClick={onOpenSettings} aria-label="Settings">
          <Settings size={13} />
        </button>

        <div className="h-5 w-px bg-white/10" />

        <button
          className={btn}
          onClick={undo}
          disabled={!canUndo}
          aria-label="Undo"
          data-testid="undo"
          title={canUndo ? "Undo" : "Nothing to undo"}
        >
          <Undo2 size={13} />
        </button>
        <button
          className={btn}
          onClick={redo}
          disabled={!canRedo}
          aria-label="Redo"
          data-testid="redo"
          title={canRedo ? "Redo" : "Nothing to redo"}
        >
          <Redo2 size={13} />
        </button>
      </div>
    </header>
  );
}
