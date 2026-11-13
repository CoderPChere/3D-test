"use client";

import { useEffect } from "react";
import { Copy, Pencil, Play, Pause, Plus, RotateCcw } from "lucide-react";
import { useSimStore } from "@/lib/state/simStore";
import { useProjectStore } from "@/lib/state/projectStore";
import { useScenarioStore } from "@/lib/state/scenarioStore";
import { useSettingsStore } from "@/lib/state/settingsStore";
import { useAppStore } from "@/lib/state/appStore";
import { QUALITY } from "@/lib/render/quality";
import { startDriver, stopDriver } from "@/lib/simulation/driver";
import { getEngine } from "@/lib/simulation/engineHost";

const SPEEDS = [0.5, 1, 2, 4];

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${sec.toFixed(1).padStart(4, "0")}`;
}

export default function Timeline() {
  const status = useSimStore((s) => s.status);
  const simTime = useSimStore((s) => s.simTime);
  const speed = useSimStore((s) => s.speed);
  const spawnCapped = useSimStore((s) => s.spawnCapped);
  const setStatus = useSimStore((s) => s.setStatus);
  const setSpeed = useSimStore((s) => s.setSpeed);
  const resetClock = useSimStore((s) => s.resetClock);
  const project = useProjectStore((s) => s.project);
  const scenarios = project.scenarios;

  const activeId = useScenarioStore((s) => s.activeId);
  const setActive = useScenarioStore((s) => s.setActive);
  const createScenario = useScenarioStore((s) => s.create);
  const renameScenario = useScenarioStore((s) => s.rename);
  const duplicateScenario = useScenarioStore((s) => s.duplicate);
  const quality = useSettingsStore((s) => s.quality);

  // Keep an active scenario selected: activates the first-run demo on mount and
  // re-selects after load/import or an undo that removed the active scenario.
  useEffect(() => {
    if (activeId && scenarios.some((s) => s.id === activeId)) return;
    setActive(scenarios[0]?.id ?? null);
  }, [scenarios, activeId, setActive]);

  // Tier vehicle budget — declared before the driver so every step (including
  // the first spawn) runs with the active budget. Mid-run downgrades take
  // effect at the next spawn/surge or after reset.
  useEffect(() => {
    getEngine(project).setVehicleBudget(QUALITY[quality].vehicleBudget);
  }, [quality, project]);

  // Load the selected scenario's events into the engine. Depends on scenario
  // identity only — status changes must NOT reload, or pause/resume would
  // re-fire already-applied events.
  useEffect(() => {
    const sc = project.scenarios.find((s) => s.id === activeId);
    getEngine(project).setScenario(sc ? [...sc.events] : []);
  }, [project, activeId]);

  // Single rAF accumulator driver: steps the engine at its fixed timestep and
  // publishes a throttled snapshot (≤10 Hz wall) — only the timeline/inspector
  // re-render per tick; the 3D scene reads the engine directly in useFrame.
  useEffect(() => {
    if (status === "running") {
      const engine = getEngine(project);
      engine.play();
      let lastPublish = 0;
      startDriver(
        (dt) => getEngine(useProjectStore.getState().project).step(dt),
        () => useSimStore.getState().speed,
        () => {
          const now = performance.now();
          if (now - lastPublish < 100) return;
          lastPublish = now;
          const snap = getEngine(useProjectStore.getState().project).getSnapshot();
          useSimStore.getState().publish(snap.time, snap.metrics, snap.spawnCapped);
        },
        (e) => {
          // Step failure: pause the run and tell the user — canvas keeps rendering.
          useSimStore.getState().setStatus("paused");
          useAppStore
            .getState()
            .setMessage(`Simulation error: ${e instanceof Error ? e.message : "unknown error"}`);
        },
      );
    } else {
      getEngine(project).pause();
      stopDriver();
    }
    return stopDriver;
  }, [status, project]);

  const play = () => setStatus("running");
  const pause = () => {
    recordRun();
    setStatus("paused");
  };
  const reset = () => {
    recordRun(); // capture the finished run before state is wiped
    const engine = getEngine(useProjectStore.getState().project);
    engine.pause(); // no stray step may land between reset and the driver stopping
    engine.reset();
    resetClock();
    const snap = engine.getSnapshot();
    useSimStore.getState().publish(snap.time, snap.metrics, snap.spawnCapped);
  };

  /** Store the active scenario's latest run metrics for comparison (last run wins). */
  const recordRun = () => {
    const sid = useScenarioStore.getState().activeId;
    if (!sid) return;
    const snap = getEngine(useProjectStore.getState().project).getSnapshot();
    if (snap.time <= 0) return; // nothing ran → never-run scenarios keep "no results"
    const m = snap.metrics;
    useScenarioStore.getState().recordResult({
      scenarioId: sid,
      seed: project.seed,
      ranAt: Date.now(),
      simTime: snap.time,
      metrics: {
        vehicleCount: m.vehicleCount,
        avgSpeed: m.avgSpeed,
        density: m.density,
        congestion: m.congestion,
        totalDelay: m.totalDelay,
        byType: m.byType,
        maxQueue: Math.max(0, ...Object.values(m.queues)),
        throughput: Object.values(m.throughput).reduce((a, b) => a + b, 0),
      },
    });
  };

  const chip =
    "rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wider border transition-colors disabled:opacity-35 disabled:pointer-events-none";

  return (
    <footer className="z-30 flex h-14 shrink-0 items-center gap-4 border-t border-white/10 bg-black/60 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-1.5">
        <button
          onClick={status === "running" ? pause : play}
          aria-label={status === "running" ? "Pause simulation" : "Play simulation"}
          data-testid="sim-play"
          className={`${chip} w-10 border-accent bg-accent/20 text-neon-cyan hover:bg-accent/30`}
          title={status === "running" ? "Pause" : "Play"}
        >
          {status === "running" ? <Pause size={15} className="mx-auto" /> : <Play size={15} className="mx-auto" />}
        </button>
        <button
          onClick={reset}
          aria-label="Reset simulation"
          data-testid="sim-reset"
          className={`${chip} border-white/10 bg-white/5 text-slate-300 hover:text-white`}
          title="Reset"
        >
          <RotateCcw size={15} className="mx-auto" />
        </button>
      </div>

      <div className="flex items-center gap-1" role="group" aria-label="Simulation speed">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            aria-pressed={speed === s}
            className={`${chip} ${
              speed === s ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan" : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-white" data-testid="sim-time">
          T+{formatTime(simTime)}
        </span>
        <span
          data-testid="sim-status"
          className={`${chip} ${
            status === "running"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : status === "paused"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                : "border-white/10 bg-white/5 text-slate-400"
          }`}
        >
          {status}
        </span>
        {spawnCapped && (
          <span
            data-testid="spawn-cap"
            className={`${chip} border-amber-500/40 bg-amber-500/10 text-amber-400`}
            title="Vehicle count capped by quality tier budget"
          >
            spawn cap
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <label className="text-[10px] uppercase tracking-widest text-slate-500" htmlFor="scenario-select">
          Scenario
        </label>
        <select
          id="scenario-select"
          data-testid="scenario-select"
          value={activeId ?? ""}
          onChange={(e) => setActive(e.target.value || null)}
          className="rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-accent"
        >
          {scenarios.length === 0 && <option value="">No scenarios</option>}
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          onClick={createScenario}
          aria-label="New scenario"
          data-testid="scenario-new"
          title="New scenario"
          className={`${chip} border-white/10 bg-white/5 text-slate-300 hover:text-white`}
        >
          <Plus size={13} className="mx-auto" />
        </button>
        <button
          onClick={() => activeId && duplicateScenario(activeId)}
          aria-label="Duplicate scenario"
          data-testid="scenario-duplicate"
          title="Duplicate scenario"
          disabled={!activeId}
          className={`${chip} border-white/10 bg-white/5 text-slate-300 hover:text-white`}
        >
          <Copy size={13} className="mx-auto" />
        </button>
        <button
          onClick={() => {
            if (!activeId) return;
            const current = scenarios.find((s) => s.id === activeId);
            const name = window.prompt("Rename scenario", current?.name ?? "");
            if (name !== null) renameScenario(activeId, name);
          }}
          aria-label="Rename scenario"
          data-testid="scenario-rename"
          title="Rename scenario"
          disabled={!activeId}
          className={`${chip} border-white/10 bg-white/5 text-slate-300 hover:text-white`}
        >
          <Pencil size={13} className="mx-auto" />
        </button>
      </div>
    </footer>
  );
}
