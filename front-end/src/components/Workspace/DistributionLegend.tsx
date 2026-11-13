"use client";

import { useSimStore } from "@/lib/state/simStore";
import { VEHICLE_TYPE_COLORS } from "@/lib/state/layerLabels";
import type { VehicleType } from "@/lib/model/types";

const TYPES: VehicleType[] = ["car", "bus", "truck", "van"];

/**
 * Per-type vehicle counts from engine metrics — bounded by the sim store's
 * 10 Hz publish (never per render frame). Zeros until the first run, which
 * matches the engine's real empty fleet.
 */
export default function DistributionLegend() {
  const byType = useSimStore((s) => s.metrics)?.byType;
  return (
    <div
      data-testid="distribution-legend"
      className="absolute bottom-3 left-3 z-30 rounded-lg border border-white/15 bg-black/85 px-3 py-2 backdrop-blur-xl"
    >
      <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Distribution</div>
      <div className="flex gap-3">
        {TYPES.map((t) => (
          <span key={t} className="flex items-center gap-1.5 text-xs text-slate-200">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: VEHICLE_TYPE_COLORS[t] }} />
            {t}
            <span data-testid={`dist-count-${t}`} className="font-mono text-neon-cyan">
              {byType?.[t] ?? 0}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
