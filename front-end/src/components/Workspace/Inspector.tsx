"use client";

import { Trash2 } from "lucide-react";
import { useSelectionStore } from "@/lib/state/selectionStore";
import { useProjectStore } from "@/lib/state/projectStore";
import { useSimStore } from "@/lib/state/simStore";
import { roadLength, type Building, type CityObject, type Incident, type Road, type Signal, type Vehicle, type Zone } from "@/lib/model/types";
import { signalStates } from "@/lib/simulation/signals";
import { getEngine } from "@/lib/simulation/engineHost";
import { flipRoadDirection } from "@/lib/model/roadBuilder";

const label = "block text-[10px] uppercase tracking-widest text-slate-500";
const value = "text-sm text-slate-200";
const input =
  "w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-accent";
const row = "flex items-center justify-between gap-3 py-1.5 border-b border-white/5";

function formatPos(p: [number, number]): string {
  return `(${p[0].toFixed(1)}, ${p[1].toFixed(1)})`;
}

export default function Inspector() {
  const selectedId = useSelectionStore((s) => s.selectedId);
  const object = useProjectStore((s) => (selectedId ? s.project.objects[selectedId] : undefined));
  const project = useProjectStore((s) => s.project);
  const updateObject = useProjectStore((s) => s.updateObject);
  const deleteObject = useProjectStore((s) => s.deleteObject);
  const simTime = useSimStore((s) => s.simTime);
  const simStatus = useSimStore((s) => s.status);

  if (!object) {
    return (
      <aside aria-label="Inspector" className="z-20 flex w-72 shrink-0 flex-col border-l border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="border-b border-white/10 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Inspector
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <div className="text-2xl text-slate-600">◇</div>
          <p className="text-xs text-slate-500">
            Nothing selected. Use the <span className="text-slate-300">Select</span> tool and click an object in the
            viewport to inspect and edit its properties.
          </p>
        </div>
      </aside>
    );
  }

  const patch = (p: Partial<CityObject>) => updateObject(object.id, p);

  return (
    <aside aria-label="Inspector" className="z-20 flex w-72 shrink-0 flex-col border-l border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="text-[10px] uppercase tracking-widest text-neon-cyan">{object.type}</div>
        <input
          aria-label="Object name"
          value={object.name}
          onChange={(e) => patch({ name: e.target.value })}
          className="w-full bg-transparent text-sm font-semibold text-white outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {object.type === "road" && <RoadFields road={object} patch={patch} />}
        {object.type === "building" && <BuildingFields building={object} zoneName={object.zoneId ? project.objects[object.zoneId]?.name : undefined} patch={patch} />}
        {object.type === "vehicle" && <VehicleFields vehicle={object} roadName={project.objects[object.spawnRoadId]?.name} simStatus={simStatus} />}
        {object.type === "signal" && <SignalFields signal={object} simTime={simTime} patch={patch} />}
        {object.type === "incident" && <IncidentFields incident={object} roadName={project.objects[object.roadId]?.name} patch={patch} />}
        {object.type === "zone" && <ZoneFields zone={object} patch={patch} />}
      </div>

      <div className="border-t border-white/10 px-4 py-3">
        <button
          onClick={() => deleteObject(object.id)}
          data-testid="delete-object"
          aria-label="Delete object"
          className="flex w-full items-center justify-center gap-1.5 rounded border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-red-400 transition-colors hover:bg-red-500/20"
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </aside>
  );
}

function RoadFields({ road, patch }: { road: Road; patch: (p: Partial<Road>) => void }) {
  return (
    <>
      <div className={row}>
        <span className={label}>Length</span>
        <span className={value} data-testid="road-length">{roadLength(road).toFixed(1)} u</span>
      </div>
      <div className={row}>
        <span className={label}>Lanes</span>
        <input type="number" min={1} max={6} value={road.lanes} onChange={(e) => patch({ lanes: Number(e.target.value) })} className={`${input} w-20 text-right`} />
      </div>
      <div className={row}>
        <span className={label}>Type</span>
        <select value={road.roadType} onChange={(e) => patch({ roadType: e.target.value as Road["roadType"] })} className={`${input} w-28`}>
          <option value="street">Street</option>
          <option value="avenue">Avenue</option>
          <option value="highway">Highway</option>
        </select>
      </div>
      <div className={row}>
        <span className={label}>Speed limit</span>
        <div className="flex items-center gap-1">
          <input type="number" min={5} max={130} step={5} value={road.speedLimit} onChange={(e) => patch({ speedLimit: Number(e.target.value) })} className={`${input} w-20 text-right`} data-testid="road-speed" />
          <span className="text-xs text-slate-500">km/h</span>
        </div>
      </div>
      <div className={row}>
        <span className={label}>Capacity</span>
        <div className="flex items-center gap-1">
          <input type="number" min={50} step={50} value={road.capacity} onChange={(e) => patch({ capacity: Number(e.target.value) })} className={`${input} w-24 text-right`} />
          <span className="text-xs text-slate-500">/h</span>
        </div>
      </div>
      <div className={row}>
        <span className={label}>Status</span>
        <button
          onClick={() => patch({ open: !road.open })}
          data-testid="road-status"
          className={`rounded px-2 py-0.5 text-xs font-semibold ${road.open ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-red-500/15 text-red-400 border border-red-500/30"}`}
        >
          {road.open ? "Open" : "Closed"}
        </button>
      </div>
      <div className={row}>
        <span className={label}>Direction</span>
        <button
          onClick={() => patch(flipRoadDirection(road))}
          data-testid="flip-direction"
          title="Reverse the a→b direction"
          className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
        >
          Flip
        </button>
      </div>
    </>
  );
}

function BuildingFields({ building, zoneName, patch }: { building: Building; zoneName?: string; patch: (p: Partial<Building>) => void }) {
  return (
    <>
      <div className={row}>
        <span className={label}>Type</span>
        <select value={building.buildingType} onChange={(e) => patch({ buildingType: e.target.value as Building["buildingType"] })} className={`${input} w-32`}>
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
          <option value="office">Office</option>
          <option value="industrial">Industrial</option>
        </select>
      </div>
      <div className={row}>
        <span className={label}>Height</span>
        <div className="flex items-center gap-1">
          <input type="number" min={2} max={200} value={building.height} onChange={(e) => patch({ height: Number(e.target.value) })} className={`${input} w-20 text-right`} data-testid="building-height" />
          <span className="text-xs text-slate-500">u</span>
        </div>
      </div>
      <div className={row}>
        <span className={label}>Position</span>
        <span className={value}>{formatPos(building.position)}</span>
      </div>
      <div className={row}>
        <span className={label}>Zone</span>
        <span className={value}>{zoneName ?? "None"}</span>
      </div>
    </>
  );
}

function VehicleFields({ vehicle, roadName, simStatus }: { vehicle: Vehicle; roadName?: string; simStatus: string }) {
  // Live values from the engine snapshot (Inspector re-renders on the throttled tick).
  const live = getEngine(useProjectStore.getState().project)
    .getSnapshot()
    .vehicles.find((v) => v.id === vehicle.id);
  const status = live
    ? live.status.charAt(0).toUpperCase() + live.status.slice(1)
    : simStatus === "stopped"
      ? "Idle (simulation stopped)"
      : "Not in simulation";
  const speed = live ? `${(live.speed * 3.6).toFixed(1)} km/h` : "0.0 km/h";
  return (
    <>
      <div className={row}>
        <span className={label}>Vehicle type</span>
        <span className={value} data-testid="vehicle-type">{vehicle.vehicleType}</span>
      </div>
      <div className={row}>
        <span className={label}>Speed</span>
        <span className={value} data-testid="vehicle-speed">{speed}</span>
      </div>
      <div className={row}>
        <span className={label}>Route</span>
        <span className={value}>{roadName ?? "—"}</span>
      </div>
      <div className={row}>
        <span className={label}>Status</span>
        <span className={value}>{status}</span>
      </div>
    </>
  );
}

function SignalFields({ signal, simTime, patch }: { signal: Signal; simTime: number; patch: (p: Partial<Signal>) => void }) {
  const states = signalStates(signal.timing, simTime);
  return (
    <>
      <div className={row}>
        <span className={label}>State (H / V)</span>
        <span className={value} data-testid="signal-state">
          <span className={states.h === "green" ? "text-emerald-400" : states.h === "yellow" ? "text-amber-400" : "text-red-400"}>{states.h}</span>
          {" / "}
          <span className={states.v === "green" ? "text-emerald-400" : states.v === "yellow" ? "text-amber-400" : "text-red-400"}>{states.v}</span>
        </span>
      </div>
      <div className={row}>
        <span className={label}>Cycle duration</span>
        <span className={value}>{states.cycle.toFixed(1)} s</span>
      </div>
      <div className={row}>
        <span className={label}>Green (s)</span>
        <input type="number" min={1} max={120} value={signal.timing.green} data-testid="signal-green" onChange={(e) => patch({ timing: { ...signal.timing, green: Number(e.target.value) } })} className={`${input} w-20 text-right`} />
      </div>
      <div className={row}>
        <span className={label}>Yellow (s)</span>
        <input type="number" min={1} max={30} value={signal.timing.yellow} onChange={(e) => patch({ timing: { ...signal.timing, yellow: Number(e.target.value) } })} className={`${input} w-20 text-right`} />
      </div>
      <div className={row}>
        <span className={label}>Offset (s)</span>
        <input type="number" min={0} step={0.5} value={signal.timing.offset} onChange={(e) => patch({ timing: { ...signal.timing, offset: Number(e.target.value) } })} className={`${input} w-20 text-right`} />
      </div>
    </>
  );
}

function IncidentFields({ incident, roadName, patch }: { incident: Incident; roadName?: string; patch: (p: Partial<Incident>) => void }) {
  return (
    <>
      <div className={row}>
        <span className={label}>Type</span>
        <span className={value}>{incident.incidentType}</span>
      </div>
      <div className={row}>
        <span className={label}>Road</span>
        <span className={value}>{roadName ?? "—"}</span>
      </div>
      <div className={row}>
        <span className={label}>Severity</span>
        <span className={value}>{Math.round(incident.severity * 100)}%</span>
      </div>
      <div className={row}>
        <span className={label}>Active</span>
        <button
          onClick={() => patch({ active: !incident.active })}
          className={`rounded px-2 py-0.5 text-xs font-semibold ${incident.active ? "bg-red-500/15 text-red-400 border border-red-500/30" : "bg-slate-500/15 text-slate-400 border border-slate-500/30"}`}
        >
          {incident.active ? "Active" : "Inactive"}
        </button>
      </div>
    </>
  );
}

function ZoneFields({ zone, patch }: { zone: Zone; patch: (p: Partial<Zone>) => void }) {
  return (
    <>
      <div className={row}>
        <span className={label}>Zone type</span>
        <select value={zone.zoneType} onChange={(e) => patch({ zoneType: e.target.value as Zone["zoneType"] })} className={`${input} w-32`}>
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
          <option value="industrial">Industrial</option>
          <option value="park">Park</option>
        </select>
      </div>
      <div className={row}>
        <span className={label}>Size</span>
        <span className={value}>{zone.size[0]} × {zone.size[1]} u</span>
      </div>
      <div className={row}>
        <span className={label}>Position</span>
        <span className={value}>{formatPos(zone.position)}</span>
      </div>
    </>
  );
}
