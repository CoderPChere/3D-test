"use client";

import { useEffect, useState } from "react";
import TopBar from "./TopBar";
import Toolbar from "./Toolbar";
import Inspector from "./Inspector";
import Timeline from "./Timeline";
import SettingsPanel from "./SettingsPanel";
import ScenarioEvents from "./ScenarioEvents";
import CompareResults from "./CompareResults";
import LiveMetrics from "./LiveMetrics";
import DistributionLegend from "./DistributionLegend";
import { useAppStore } from "@/lib/state/appStore";
import { useSettingsStore } from "@/lib/state/settingsStore";

export default function Workspace({ children }: { children: React.ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const message = useAppStore((s) => s.message);
  const setMessage = useAppStore((s) => s.setMessage);
  const mode = useAppStore((s) => s.mode);
  const distribution = useSettingsStore((s) => s.layers.distribution);

  // Auto-dismiss transient messages after 4s.
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message, setMessage]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <TopBar onOpenSettings={() => setSettingsOpen((v) => !v)} />

      <div className="relative flex min-h-0 flex-1">
        <Toolbar />

        <main className="relative min-w-0 flex-1" aria-label="3D viewport">
          {children}

          {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

          {mode === "simulate" && <ScenarioEvents />}

          {distribution && <DistributionLegend />}

          {message && (
            <div
              role="status"
              data-testid="workspace-message"
              className="absolute bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-lg border border-white/15 bg-black/85 px-4 py-2 text-xs text-slate-200 backdrop-blur-xl"
            >
              {message}
            </div>
          )}
        </main>

        <Inspector />

        {mode === "analyze" && (
          <aside
            aria-label="Analytics"
            className="absolute right-0 top-0 z-40 h-full w-[85%] overflow-y-auto border-l border-slate-200 bg-slate-50 p-4 shadow-2xl"
          >
            <LiveMetrics />
            <div className="mt-3">
              <CompareResults />
            </div>
          </aside>
        )}
      </div>

      <Timeline />
    </div>
  );
}
