"use client";

import { useMemo } from "react";
import { useSimStore } from "@/lib/state/simStore";
import { useProjectStore } from "@/lib/state/projectStore";

/** Top queued roads from the current engine snapshot, named from the project. */
export default function CongestionDistribution() {
  const metrics = useSimStore((s) => s.metrics);
  const project = useProjectStore((s) => s.project);

  const rows = useMemo(() => {
    const queues = metrics?.queues ?? {};
    return Object.entries(queues)
      .filter(([, queued]) => queued > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([roadId, queued]) => ({
        roadId,
        name: project.objects[roadId]?.name ?? roadId,
        queued,
      }));
  }, [metrics, project]);

  const max = rows[0]?.queued ?? 1;

  return (
    <section aria-label="Congestion distribution" data-testid="congestion-distribution">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-600">Congestion by road</h2>
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        {rows.length === 0 ? (
          <p className="text-xs text-slate-500" data-testid="congestion-empty">
            No congestion — no queued vehicles reported on any road.
          </p>
        ) : (
          <ul className="space-y-1.5" data-testid="congestion-list">
            {rows.map((row) => (
              <li key={row.roadId} className="grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-2" data-testid="congestion-row">
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs text-slate-700">{row.name}</span>
                    <span className="font-mono text-[10px] text-slate-500">{row.queued} queued</span>
                  </div>
                  <div className="mt-0.5 h-1.5 rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full bg-amber-500"
                      style={{ width: `${Math.max(4, (row.queued / max) * 100)}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
