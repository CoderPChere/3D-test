"use client";

import { useSimStore, type MetricSample } from "@/lib/state/simStore";

interface Series {
  key: keyof Pick<MetricSample, "vehicleCount" | "avgSpeed" | "density" | "throughput">;
  label: string;
  unit: string;
  format: (n: number) => string;
}

const SERIES: Series[] = [
  { key: "vehicleCount", label: "Vehicle count", unit: "vehicles", format: (n) => `${Math.round(n)}` },
  { key: "avgSpeed", label: "Average speed", unit: "km/h", format: (n) => n.toFixed(1) },
  { key: "density", label: "Density", unit: "%", format: (n) => `${Math.round(n * 100)}` },
  { key: "throughput", label: "Throughput", unit: "vehicles", format: (n) => `${Math.round(n)}` },
];

const card = "rounded-lg border border-slate-200 bg-white p-3";
const caption = "text-[10px] font-semibold uppercase tracking-widest text-slate-500";

function chartPoints(values: number[]): string {
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? 100 / (values.length - 1) : 0;
  return values.map((v, i) => `${(i * step).toFixed(2)},${(32 - (v / max) * 28).toFixed(2)}`).join(" ");
}

function MetricChart({ series, values }: { series: Series; values: number[] }) {
  const latest = values.length > 0 ? values[values.length - 1] : null;
  return (
    <div className={card} data-testid={`chart-${series.key}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={caption}>{series.label}</span>
        <span className="font-mono text-xs text-slate-800">
          {latest === null ? "—" : `${series.format(latest)} ${series.unit}`}
        </span>
      </div>
      {values.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">No run data yet — start the simulation to record this metric.</p>
      ) : (
        <svg viewBox="0 0 100 34" className="mt-2 h-16 w-full" role="img" aria-label={`${series.label} over time`}>
          <polyline
            points={chartPoints(values)}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </div>
  );
}

/** Session metric trends; subscribes to simStore only, so the 3D canvas never re-renders from it. */
export default function MetricCharts() {
  const history = useSimStore((s) => s.history);
  return (
    <section aria-label="Metric trends" data-testid="metric-charts">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-600">Trends</h2>
      <div className="grid grid-cols-2 gap-2">
        {SERIES.map((series) => (
          <MetricChart key={series.key} series={series} values={history.map((sample) => sample[series.key])} />
        ))}
      </div>
    </section>
  );
}
