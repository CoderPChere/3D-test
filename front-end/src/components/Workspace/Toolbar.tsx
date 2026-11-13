"use client";

import { useMemo } from "react";
import {
  MousePointer2,
  Move,
  Route,
  Building2,
  Car,
  TrafficCone,
  AlertTriangle,
  SquareDashedMousePointer,
  Layers,
} from "lucide-react";
import { useAppStore } from "@/lib/state/appStore";
import { useModuleStore, enabledToolIds } from "@/lib/state/moduleStore";
import { TOOL_LABELS, TOOL_ORDER, toolAllowedInMode, type ToolId } from "@/lib/state/tools";

const ICONS: Record<ToolId, typeof MousePointer2> = {
  select: MousePointer2,
  move: Move,
  "build-road": Route,
  "add-building": Building2,
  "add-vehicle": Car,
  "add-signal": TrafficCone,
  "add-incident": AlertTriangle,
  "create-zone": SquareDashedMousePointer,
  layers: Layers,
};

export default function Toolbar() {
  const mode = useAppStore((s) => s.mode);
  const activeTool = useAppStore((s) => s.activeTool);
  const setTool = useAppStore((s) => s.setTool);
  const modules = useModuleStore((s) => s.modules);
  // Tools derive from enabled modules (base chrome always available).
  const tools = useMemo(() => enabledToolIds(modules), [modules]);

  return (
    <nav
      aria-label="Tools"
      className="z-20 flex w-14 shrink-0 flex-col items-center gap-1 border-r border-white/10 bg-black/60 py-2 backdrop-blur-xl"
    >
      {TOOL_ORDER.filter((id) => tools.has(id)).map((id) => {
        const Icon = ICONS[id];
        const allowed = toolAllowedInMode(id, mode);
        const active = allowed && activeTool === id;
        return (
          <button
            key={id}
            aria-label={TOOL_LABELS[id]}
            aria-pressed={active}
            disabled={!allowed}
            title={allowed ? TOOL_LABELS[id] : `${TOOL_LABELS[id]} — not available in ${mode} mode`}
            onClick={() => setTool(id)}
            className={`flex h-10 w-10 items-center justify-center rounded-md border transition-colors disabled:opacity-30 disabled:pointer-events-none ${
              active
                ? "border-accent bg-accent/20 text-neon-cyan"
                : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon size={17} />
          </button>
        );
      })}
    </nav>
  );
}
