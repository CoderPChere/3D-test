"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { useSettingsStore } from "@/lib/state/settingsStore";
import { useModuleStore, enabledLayerIds } from "@/lib/state/moduleStore";
import { LAYER_LABELS } from "@/lib/state/layerLabels";
import { LAYER_IDS } from "@/lib/model/types";
import type { QualityTier } from "@/lib/model/types";

const TIERS: { id: QualityTier; label: string; hint: string }[] = [
  { id: "low", label: "Low", hint: "75% DPR, no shadows" },
  { id: "medium", label: "Medium", hint: "capped DPR, basic shadows" },
  { id: "high", label: "High", hint: "full DPR, shadows" },
];

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const quality = useSettingsStore((s) => s.quality);
  const setQuality = useSettingsStore((s) => s.setQuality);
  const layers = useSettingsStore((s) => s.layers);
  const toggleLayer = useSettingsStore((s) => s.toggleLayer);
  const modules = useModuleStore((s) => s.modules);
  const toggleModule = useModuleStore((s) => s.toggleModule);
  const moduleLayers = useMemo(() => enabledLayerIds(modules), [modules]);

  return (
    <section
      aria-label="Settings"
      className="absolute right-3 top-3 z-40 w-72 rounded-xl border border-white/10 bg-black/80 p-4 backdrop-blur-xl"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Settings</h2>
        <button onClick={onClose} aria-label="Close settings" className="text-slate-500 hover:text-white">
          <X size={15} />
        </button>
      </div>

      <div className="mb-4">
        <div className="label mb-1.5 text-[10px] uppercase tracking-widest text-slate-500">Quality tier</div>
        <div className="flex gap-1.5">
          {TIERS.map((t) => (
            <button
              key={t.id}
              onClick={() => setQuality(t.id)}
              aria-pressed={quality === t.id}
              data-testid={`quality-${t.id}`}
              title={t.hint}
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
                quality === t.id
                  ? "border-accent bg-accent/15 text-neon-cyan"
                  : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="label mb-1.5 text-[10px] uppercase tracking-widest text-slate-500">Modules</div>
        <ul className="space-y-1">
          {modules.map((m) => (
            <li key={m.id}>
              <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs text-slate-300 hover:bg-white/5">
                <span>
                  {m.name}
                  {/* Capabilities listed straight from the module's declaration. */}
                  <span className="ml-2 text-[10px] text-slate-500">
                    {m.tools.length} tools · {m.visualizationLayers.length} layers · {m.metrics.length} metrics
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={m.enabled}
                  onChange={() => toggleModule(m.id)}
                  data-testid={`module-${m.id}`}
                  aria-label={`${m.name} module`}
                  className="h-3.5 w-3.5 accent-sky-500"
                />
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-1.5 text-[10px] uppercase tracking-widest text-slate-500">Visualization layers</div>
        <ul className="space-y-1">
          {LAYER_IDS.filter((id) => moduleLayers.has(id)).map((id) => (
            <li key={id}>
              <label className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs text-slate-300 hover:bg-white/5">
                {LAYER_LABELS[id]}
                <input
                  type="checkbox"
                  checked={layers[id]}
                  onChange={() => toggleLayer(id)}
                  data-testid={`layer-${id}`}
                  className="h-3.5 w-3.5 accent-sky-500"
                />
              </label>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
