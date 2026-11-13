"use client";

import { useMemo } from "react";
import { useSimStore } from "@/lib/state/simStore";
import { useProjectStore } from "@/lib/state/projectStore";
import { useModuleStore, enabledMetricIds } from "@/lib/state/moduleStore";
import type { MetricsSnapshot } from "@/lib/model/types";

const row = "flex items-center justify-between gap-3 py-1 border-b border-slate-100";
const label = "text-[10px] uppercase tracking-widest text-slate-500";
const value = "font-mono text-xs text-slate-800";

const ROWS: Array<[string, (m: MetricsSnapshot) => string]> = [
  ["Vehicles", (m) => `${m.vehicleCount}`],
  ["Avg speed", (m) => `${m.avgSpeed.toFixed(1)} km/h`],
  ["Density", (m) => `${Math.round(m.density * 100)}%`],
  ["Congestion", (m) => `${Math.round(m.congestion * 100)}%`],
  ["Throughput", (m) => `${Object.values(m.throughput).reduce((a, b) => a + b, 0)}`],
];

/** Same transform as the row testids: "Avg speed" → "avg-speed". */
const metricId = (name: string) => name.toLowerCase().replace(/\s+/g, "-");

/** Live engine metrics in Analyze mode, bound to the throttled useSimStore snapshot. */
export default function LiveMetrics() {
  const metrics = useSimStore((s) => s.metrics);
  const project = useProjectStore((s) => s.project);
  const modules = useModuleStore((s) => s.modules);
  const metricIds = useMemo(() => enabledMetricIds(modules), [modules]);
  const rows = ROWS.filter(([name]) => metricIds.has(metricId(name)));
  const showQueues = metricIds.has("queues");
  // Nothing published yet (pre-first-run): the engine at t=0 is genuinely zeros.
  const m: MetricsSnapshot = metrics ?? {
    vehicleCount: 0,
    avgSpeed: 0,
    density: 0,
    congestion: 0,
    totalDelay: 0,
    byType: { car: 0, bus: 0, truck: 0, van: 0 },
    queues: {},
    throughput: {},
  };
  const queues = Object.entries(m.queues)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  // No enabled module contributes metrics → the panel is not shown at all.
  if (rows.length === 0 && !showQueues) return null;

  return (
    <section
      aria-label="Live metrics"
      data-testid="live-metrics"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-700">Live metrics</h2>
      {rows.map(([name, fmt]) => (
        <div key={name} className={row}>
          <span className={label}>{name}</span>
          <span className={value} data-testid={`metric-${metricId(name)}`}>
            {fmt(m)}
          </span>
        </div>
      ))}
      {showQueues && (
        <div className="mt-2">
          <div className={`${label} mb-1`}>Queues</div>
          <div data-testid="metric-queues" className="space-y-0.5">
            {queues.length === 0 ? (
              <span className="text-xs text-slate-500">None</span>
            ) : (
              queues.map(([roadId, n]) => (
                <div key={roadId} className="flex justify-between text-xs text-slate-600">
                  <span className="truncate">{project.objects[roadId]?.name || roadId}</span>
                  <span className="font-mono">{n}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
