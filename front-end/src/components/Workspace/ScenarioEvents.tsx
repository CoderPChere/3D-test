"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useProjectStore } from "@/lib/state/projectStore";
import { useScenarioStore } from "@/lib/state/scenarioStore";
import {
  newObjectId,
  type Road,
  type ScenarioEvent,
  type ScenarioEventType,
  type Signal,
} from "@/lib/model/types";

const TYPE_LABELS: Record<ScenarioEventType, string> = {
  road_closure: "Road closure",
  accident: "Accident",
  vehicle_surge: "Vehicle surge",
  signal_timing_change: "Signal timing",
};

const input =
  "rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-accent";
const label = "block text-[10px] uppercase tracking-widest text-slate-500";

/** Add/remove scheduled events for the active scenario (events live in the project). */
export default function ScenarioEvents() {
  const project = useProjectStore((s) => s.project);
  const mutateScenarios = useProjectStore((s) => s.mutateScenarios);
  const activeId = useScenarioStore((s) => s.activeId);
  const scenario = project.scenarios.find((s) => s.id === activeId) ?? null;

  const [type, setType] = useState<ScenarioEventType>("road_closure");
  const [targetId, setTargetId] = useState("");
  const [at, setAt] = useState("10");
  const [count, setCount] = useState("5");
  const [severity, setSeverity] = useState("1");
  const [green, setGreen] = useState("30");
  const [yellow, setYellow] = useState("3");
  const [offset, setOffset] = useState("0");

  const roads = project.order
    .map((id) => project.objects[id])
    .filter((o): o is Road => o?.type === "road");
  const signals = project.order
    .map((id) => project.objects[id])
    .filter((o): o is Signal => o?.type === "signal");
  const targets = type === "signal_timing_change" ? signals : roads;
  // Type switches can strand the target (roads ↔ signals): fall back to the first valid one.
  const effTarget = targets.some((t) => t.id === targetId) ? targetId : (targets[0]?.id ?? "");

  const targetName = (id: string): string => {
    const o = project.objects[id];
    return o ? o.name || id : "deleted target";
  };

  const add = () => {
    if (!scenario || !effTarget) return;
    const t = Math.max(0, Number(at) || 0);
    const id = () => newObjectId("evt");
    let event: ScenarioEvent;
    switch (type) {
      case "road_closure":
        event = { id: id(), type, at: t, roadId: effTarget, closed: true };
        break;
      case "accident":
        event = { id: id(), type, at: t, roadId: effTarget, severity: Math.min(1, Math.max(0, Number(severity) || 0)) };
        break;
      case "vehicle_surge":
        event = { id: id(), type, at: t, roadId: effTarget, count: Math.max(1, Math.floor(Number(count) || 1)) };
        break;
      case "signal_timing_change":
        event = {
          id: id(),
          type,
          at: t,
          signalId: effTarget,
          timing: {
            green: Math.max(1, Number(green) || 1),
            yellow: Math.max(0, Number(yellow) || 0),
            offset: Math.max(0, Number(offset) || 0),
          },
        };
        break;
    }
    mutateScenarios((list) =>
      list.map((s) => (s.id === scenario.id ? { ...s, events: [...s.events, event] } : s)),
    );
  };

  const remove = (eventId: string) => {
    if (!scenario) return;
    mutateScenarios((list) =>
      list.map((s) => (s.id === scenario.id ? { ...s, events: s.events.filter((e) => e.id !== eventId) } : s)),
    );
  };

  return (
    <section
      aria-label="Scenario events"
      data-testid="scenario-events"
      className="absolute left-3 top-3 z-40 w-72 rounded-xl border border-white/10 bg-black/80 p-4 backdrop-blur-xl"
    >
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-300">Scenario events</h2>

      {!scenario ? (
        <p className="text-xs text-slate-500">Select or create a scenario in the timeline to schedule events.</p>
      ) : (
        <>
          <ul className="mb-3 max-h-40 space-y-1 overflow-y-auto" data-testid="event-list">
            {scenario.events.length === 0 && (
              <li className="text-xs text-slate-500">No events yet.</li>
            )}
            {scenario.events.map((e) => (
              <li
                key={e.id}
                data-testid="event-item"
                className="flex items-center justify-between gap-2 rounded border border-white/5 bg-white/5 px-2 py-1 text-xs text-slate-300"
              >
                <span className="truncate">
                  {TYPE_LABELS[e.type]} · {targetName(e.type === "signal_timing_change" ? e.signalId : e.roadId)} ·
                  T+{e.at}s
                </span>
                <button
                  onClick={() => remove(e.id)}
                  aria-label={`Remove ${TYPE_LABELS[e.type]} event`}
                  data-testid="event-remove"
                  className="shrink-0 text-slate-500 hover:text-white"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={label} htmlFor="event-type">Type</label>
              <select
                id="event-type"
                data-testid="event-type"
                value={type}
                onChange={(e) => setType(e.target.value as ScenarioEventType)}
                className={`${input} w-full`}
              >
                {(Object.keys(TYPE_LABELS) as ScenarioEventType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="event-target">Target</label>
              <select
                id="event-target"
                data-testid="event-target"
                value={effTarget}
                onChange={(e) => setTargetId(e.target.value)}
                className={`${input} w-full`}
              >
                {targets.length === 0 && <option value="">None available</option>}
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>{t.name || t.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="event-at">Trigger time (s)</label>
              <input
                id="event-at"
                data-testid="event-at"
                type="number"
                min={0}
                step={1}
                value={at}
                onChange={(e) => setAt(e.target.value)}
                className={`${input} w-full`}
              />
            </div>
            {type === "vehicle_surge" && (
              <div>
                <label className={label} htmlFor="event-count">Vehicle count</label>
                <input
                  id="event-count"
                  data-testid="event-count"
                  type="number"
                  min={1}
                  step={1}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  className={`${input} w-full`}
                />
              </div>
            )}
            {type === "accident" && (
              <div>
                <label className={label} htmlFor="event-severity">Severity (0–1)</label>
                <input
                  id="event-severity"
                  data-testid="event-severity"
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className={`${input} w-full`}
                />
              </div>
            )}
            {type === "signal_timing_change" && (
              <>
                <div>
                  <label className={label} htmlFor="event-green">Green (s)</label>
                  <input
                    id="event-green"
                    data-testid="event-green"
                    type="number"
                    min={1}
                    step={1}
                    value={green}
                    onChange={(e) => setGreen(e.target.value)}
                    className={`${input} w-full`}
                  />
                </div>
                <div>
                  <label className={label} htmlFor="event-yellow">Yellow (s)</label>
                  <input
                    id="event-yellow"
                    data-testid="event-yellow"
                    type="number"
                    min={0}
                    step={1}
                    value={yellow}
                    onChange={(e) => setYellow(e.target.value)}
                    className={`${input} w-full`}
                  />
                </div>
                <div>
                  <label className={label} htmlFor="event-offset">Offset (s)</label>
                  <input
                    id="event-offset"
                    data-testid="event-offset"
                    type="number"
                    min={0}
                    step={1}
                    value={offset}
                    onChange={(e) => setOffset(e.target.value)}
                    className={`${input} w-full`}
                  />
                </div>
              </>
            )}
          </div>

          <button
            onClick={add}
            disabled={!effTarget}
            data-testid="event-add"
            className="mt-3 flex w-full items-center justify-center gap-1 rounded border border-accent bg-accent/20 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neon-cyan hover:bg-accent/30 disabled:opacity-35"
          >
            <Plus size={12} /> Add event
          </button>
        </>
      )}
    </section>
  );
}
