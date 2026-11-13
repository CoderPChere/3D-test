"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useProjectStore } from "@/lib/state/projectStore";
import { useScenarioStore, type ScenarioResult } from "@/lib/state/scenarioStore";
import { useAppStore } from "@/lib/state/appStore";
import { useModuleStore, enabledMetricIds } from "@/lib/state/moduleStore";
import { buildResultsExport, downloadResults } from "@/lib/persist/resultsIO";
import type { Scenario } from "@/lib/model/types";

const cell = "px-3 py-1.5 text-right text-xs text-slate-700";
const head = "px-3 py-1.5 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-500";

const ROWS: Array<[string, (r: ScenarioResult) => string]> = [
  ["Avg speed", (r) => `${r.metrics.avgSpeed.toFixed(1)} km/h`],
  ["Vehicles", (r) => `${r.metrics.vehicleCount}`],
  ["Density", (r) => `${Math.round(r.metrics.density * 100)}%`],
  ["Congestion", (r) => `${Math.round(r.metrics.congestion * 100)}%`],
  ["Max queue", (r) => `${r.metrics.maxQueue}`],
  ["Throughput", (r) => `${r.metrics.throughput}`],
  ["Total delay", (r) => `${r.metrics.totalDelay.toFixed(1)} veh·s`],
  ["Run length", (r) => `${r.simTime.toFixed(1)} s`],
];

/** Same transform as LiveMetrics: "Max queue" → "max-queue". */
const metricId = (name: string) => name.toLowerCase().replace(/\s+/g, "-");

/** Side-by-side comparison of two scenarios' latest run metrics (Analyze mode). */
export default function CompareResults() {
  const scenarios = useProjectStore((s) => s.project.scenarios);
  const seed = useProjectStore((s) => s.project.seed);
  const results = useScenarioStore((s) => s.results);
  const setMessage = useAppStore((s) => s.setMessage);
  const modules = useModuleStore((s) => s.modules);
  const metricIds = useMemo(() => enabledMetricIds(modules), [modules]);
  const rows = ROWS.filter(([name]) => metricIds.has(metricId(name)));
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");

  const handleExport = () => {
    try {
      const data = buildResultsExport(results, scenarios, seed);
      if (!data) {
        setMessage("No run data to export");
        return;
      }
      downloadResults(data);
      setMessage("Results exported");
    } catch (e) {
      setMessage(`Export failed: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  };

  const exportBtn = (
    <button
      data-testid="export-results"
      onClick={handleExport}
      className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
    >
      <Download size={13} /> Export results
    </button>
  );

  if (scenarios.length === 0) {
    return (
      <section aria-label="Compare results" data-testid="compare-panel" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-700">Compare runs</h2>
          {exportBtn}
        </div>
        <p className="text-xs text-slate-500">No scenarios yet — create one in Simulate mode.</p>
      </section>
    );
  }

  const a = scenarios.find((s) => s.id === aId) ?? scenarios[0];
  const b = scenarios.find((s) => s.id === bId) ?? scenarios[1] ?? null;
  const ra = results[a.id] ?? null;
  const rb = b ? (results[b.id] ?? null) : null;

  const options = (selected: string, onChange: (v: string) => void, exclude?: string, label?: string) => (
    <select
      value={selected}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-accent"
    >
      {scenarios
        .filter((s) => s.id !== exclude)
        .map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
    </select>
  );

  const cols: Array<{ scenario: Scenario; result: ScenarioResult | null }> = [
    { scenario: a, result: ra },
    ...(b ? [{ scenario: b, result: rb }] : []),
  ];

  return (
    <section
      aria-label="Compare results"
      data-testid="compare-panel"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-700">Compare runs</h2>
        {exportBtn}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500">Scenario A</label>
          {options(a.id, setAId, b?.id, "Scenario A")}
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500">Scenario B</label>
          {b ? options(b.id, setBId, a.id, "Scenario B") : <span className="text-xs text-slate-600">—</span>}
        </div>
      </div>

      {cols.every((c) => !c.result) ? (
        <p data-testid="compare-empty" className="text-xs text-slate-500">
          No results yet — run a scenario to compare.
        </p>
      ) : rows.length === 0 ? (
        <p data-testid="compare-no-metrics" className="text-xs text-slate-500">
          No metrics from enabled modules.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className={head}>Metric</th>
              {cols.map((c) => (
                <th key={c.scenario.id} className={head}>
                  {c.scenario.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, fmt]) => (
              <tr key={label} className="border-b border-slate-100">
                <td className="px-3 py-1.5 text-left text-xs text-slate-500">{label}</td>
                {cols.map((c) => (
                  <td key={c.scenario.id} className={cell}>
                    {c.result ? fmt(c.result) : <span data-testid="compare-cell-empty">No results</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {cols.some((c) => !c.result) && cols.some((c) => c.result) && (
        <p data-testid="compare-no-result" className="mt-2 text-xs text-amber-600">
          {cols
            .filter((c) => !c.result)
            .map((c) => `No results for “${c.scenario.name}” — run it to compare.`)
            .join(" ")}
        </p>
      )}
    </section>
  );
}
