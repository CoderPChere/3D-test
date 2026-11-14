"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Instance, Instances } from "@react-three/drei";
import * as THREE from "three";
import { useProjectStore } from "@/lib/state/projectStore";
import { useSelectionStore } from "@/lib/state/selectionStore";
import { useSettingsStore } from "@/lib/state/settingsStore";
import { useAppStore } from "@/lib/state/appStore";
import { canPlace, type Bounds } from "@/lib/model/placement";
import { buildCandidate, movedObject, snapToGrid } from "@/lib/model/placeTools";
import { buildRoadSegment, snapRoadPoint, validateRoadSegment } from "@/lib/model/roadBuilder";
import { roadLength } from "@/lib/model/types";
import { QUALITY } from "@/lib/render/quality";
import type {
  Building,
  BuildingType,
  CityObject,
  Incident,
  Road,
  Signal,
  Vec2,
  Vehicle,
  Zone,
} from "@/lib/model/types";
import type { ToolId } from "@/lib/state/tools";
import { signalStates } from "@/lib/simulation/signals";
import { getEngine } from "@/lib/simulation/engineHost";
import type { ObjHandlers } from "./handlers";
import CityTraffic from "./CityTraffic";
import DensityLayers from "./DensityLayers";

const BOUNDS: Bounds = { min: -120, max: 120 };

const PLACE_TOOLS = new Set<ToolId>([
  "build-road",
  "add-building",
  "add-vehicle",
  "add-signal",
  "add-incident",
  "create-zone",
]);
const SNAP_TOOLS = new Set<ToolId>(["build-road", "add-building", "add-signal", "create-zone"]);
const SNAP_TYPES = new Set<CityObject["type"]>(["road", "building", "signal", "zone"]);

const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const tmpVec = new THREE.Vector3();

function groundPoint(ray: THREE.Ray): Vec2 | null {
  return ray.intersectPlane(GROUND_PLANE, tmpVec) ? [tmpVec.x, tmpVec.z] : null;
}

interface Drag {
  id: string;
  originObj: CityObject;
  grab: Vec2;
  px: number;
  py: number;
  snap: boolean;
  candidate: CityObject | null;
}

const BUILDING_COLORS: Record<BuildingType, string> = {
  residential: "#24406b",
  commercial: "#155e75",
  office: "#312e81",
  industrial: "#44403c",
};

const TREE_COLORS = ["#166534", "#15803d", "#4d7c0f"];

const ZONE_COLORS: Record<Zone["zoneType"], string> = {
  residential: "#3b82f6",
  commercial: "#22d3ee",
  industrial: "#a855f7",
  park: "#22c55e",
};

const LAMP_COLORS = { green: "#22c55e", yellow: "#eab308", red: "#ef4444" } as const;

const WINDOW_COLORS = ["#fcd34d", "#fbbf24", "#f59e0b"];

function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Centerline crossing point of two segments, including endpoint touches; null when parallel. */
function segmentCross(a: Vec2, b: Vec2, c: Vec2, d: Vec2): Vec2 | null {
  const d1x = b[0] - a[0];
  const d1z = b[1] - a[1];
  const d2x = d[0] - c[0];
  const d2z = d[1] - c[1];
  const den = d1x * d2z - d1z * d2x;
  if (Math.abs(den) < 1e-6) return null;
  const ox = c[0] - a[0];
  const oz = c[1] - a[1];
  const t = (ox * d2z - oz * d2x) / den;
  const u = (ox * d1z - oz * d1x) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [a[0] + d1x * t, a[1] + d1z * t];
}

// --- Static sub-scenes (memoized so pointer-move re-renders skip them) ------

const Roads = memo(function Roads({ roads, handlers }: { roads: Road[]; handlers: ObjHandlers }) {
  return (
    <Instances limit={400} receiveShadow>
      <boxGeometry args={[1, 0.24, 8]} />
      <meshStandardMaterial color="#1f2937" roughness={0.9} />
      {roads.map((r) => {
        const len = roadLength(r);
        const dx = (r.b[0] - r.a[0]) / len;
        const dz = (r.b[1] - r.a[1]) / len;
        return (
          <Instance
            key={r.id}
            name={r.id}
            {...handlers}
            position={[(r.a[0] + r.b[0]) / 2, 0.12, (r.a[1] + r.b[1]) / 2]}
            rotation={[0, Math.atan2(-dz, dx), 0]}
            scale={[len, 1, 1]}
          />
        );
      })}
    </Instances>
  );
});

/** Lane dashes, streetlights, intersection pads, and stop lines derived from road geometry. */
const RoadDetails = memo(function RoadDetails({ roads }: { roads: Road[] }) {
  const { dashes, poles, lamps, pads, stops } = useMemo(() => {
    const dashes: { p: [number, number, number]; ry: number }[] = [];
    const poles: { p: [number, number, number] }[] = [];
    const lamps: { p: [number, number, number] }[] = [];
    const pads: { p: [number, number, number] }[] = [];
    const stops: { p: [number, number, number]; ry: number }[] = [];
    for (const r of roads) {
      const len = roadLength(r);
      const dx = (r.b[0] - r.a[0]) / len;
      const dz = (r.b[1] - r.a[1]) / len;
      const ry = Math.atan2(-dz, dx);
      for (let t = 3; t < len - 2; t += 6) {
        dashes.push({ p: [r.a[0] + dx * t, 0.26, r.a[1] + dz * t], ry });
      }
      const n = Math.max(1, Math.floor(len / 24));
      for (let i = 0; i < n; i++) {
        const t = ((i + 0.5) / n) * len;
        const side = i % 2 === 0 ? 1 : -1;
        const lx = r.a[0] + dx * t - dz * side * 5.5;
        const lz = r.a[1] + dz * t + dx * side * 5.5;
        poles.push({ p: [lx, 2.75, lz] });
        lamps.push({ p: [lx, 5.6, lz] });
      }
    }

    // Intersections come straight from road geometry; pads and approach stop
    // lines are instanced, so adding a road adds detailing with no new draw calls.
    const seen = new Set<string>();
    for (let i = 0; i < roads.length; i++) {
      for (let j = i + 1; j < roads.length; j++) {
        const pt = segmentCross(roads[i].a, roads[i].b, roads[j].a, roads[j].b);
        if (!pt) continue;
        const key = `${Math.round(pt[0] * 10)},${Math.round(pt[1] * 10)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pads.push({ p: [pt[0], 0.245, pt[1]] });
        for (const r of [roads[i], roads[j]]) {
          // No approach bars past a road end (T junctions only get them on the through road).
          if (
            Math.hypot(pt[0] - r.a[0], pt[1] - r.a[1]) < 6 ||
            Math.hypot(pt[0] - r.b[0], pt[1] - r.b[1]) < 6
          ) {
            continue;
          }
          const len = roadLength(r);
          const dx = (r.b[0] - r.a[0]) / len;
          const dz = (r.b[1] - r.a[1]) / len;
          const ry = Math.atan2(-dz, dx);
          for (const side of [-1, 1]) {
            stops.push({ p: [pt[0] + dx * 5.4 * side, 0.255, pt[1] + dz * 5.4 * side], ry });
          }
        }
      }
    }
    return { dashes, poles, lamps, pads, stops };
  }, [roads]);

  return (
    <>
      <Instances limit={2000}>
        <boxGeometry args={[1, 0.08, 0.18]} />
        <meshBasicMaterial color="#94a3b8" />
        {dashes.map((d, i) => (
          <Instance key={i} position={d.p} rotation={[0, d.ry, 0]} scale={[3, 1, 1]} />
        ))}
      </Instances>
      <Instances limit={600}>
        <boxGeometry args={[0.22, 5.5, 0.22]} />
        <meshStandardMaterial color="#334155" />
        {poles.map((p, i) => (
          <Instance key={i} position={p.p} />
        ))}
      </Instances>
      <Instances limit={600}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color="#fde68a" toneMapped={false} />
        {lamps.map((p, i) => (
          <Instance key={i} position={p.p} />
        ))}
      </Instances>
      <Instances limit={400}>
        <boxGeometry args={[9, 0.06, 9]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
        {pads.map((p, i) => (
          <Instance key={i} position={p.p} />
        ))}
      </Instances>
      <Instances limit={1200}>
        <boxGeometry args={[0.55, 0.03, 6.4]} />
        <meshBasicMaterial color="#e2e8f0" />
        {stops.map((s, i) => (
          <Instance key={i} position={s.p} rotation={[0, s.ry, 0]} />
        ))}
      </Instances>
    </>
  );
});

/** Deterministic roadside trees; density follows the quality tier's `detail` budget. */
const RoadsideTrees = memo(function RoadsideTrees({
  buildings,
  detail,
}: {
  buildings: Building[];
  detail: number;
}) {
  const trees = useMemo(() => {
    if (detail <= 0) return [];
    const out: { x: number; z: number; s: number; c: string }[] = [];
    const corners: [number, number][] = [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
    for (const b of buildings) {
      const [fw, fd] = b.footprint;
      corners.forEach(([sx, sz], i) => {
        const key = `${b.id}t${i}`;
        // Same seed → same tree set; tier detail keeps a deterministic fraction.
        if ((strHash(key) % 1000) / 1000 >= detail) return;
        out.push({
          x: b.position[0] + sx * (fw / 2 + 1.4),
          z: b.position[1] + sz * (fd / 2 + 1.4),
          s: 0.85 + (strHash(key) % 30) / 100,
          c: TREE_COLORS[strHash(key) % TREE_COLORS.length],
        });
      });
    }
    return out;
  }, [buildings, detail]);

  return (
    <>
      <Instances limit={600}>
        <cylinderGeometry args={[0.2, 0.28, 2.4, 5]} />
        <meshStandardMaterial color="#78350f" roughness={1} />
        {trees.map((t, i) => (
          <Instance key={i} position={[t.x, 1.2 * t.s, t.z]} scale={t.s} />
        ))}
      </Instances>
      <Instances limit={600} castShadow>
        <icosahedronGeometry args={[1.25, 0]} />
        <meshStandardMaterial roughness={0.95} />
        {trees.map((t, i) => (
          <Instance key={i} position={[t.x, 3.2 * t.s, t.z]} scale={t.s} color={t.c} />
        ))}
      </Instances>
    </>
  );
});

const Buildings = memo(function Buildings({
  buildings,
  handlers,
  detail,
}: {
  buildings: Building[];
  handlers: ObjHandlers;
  detail: number;
}) {
  const windows = useMemo(() => {
    const out: { p: [number, number, number]; ry: number; c: string }[] = [];
    if (detail <= 0) return out; // Low tier: no decorative lights
    for (const b of buildings) {
      const [fw, fd] = b.footprint;
      const colsZ = Math.max(1, Math.floor(fw / 3));
      const colsX = Math.max(1, Math.floor(fd / 3));
      for (let r = 0; ; r++) {
        const y = 2.5 + r * 4;
        if (y > b.height - 1.5) break;
        for (let c = 0; c < colsZ; c++) {
          const key = `${b.id}z${r}${c}`;
          if (strHash(key) % 10 < 3) continue;
          // Tier detail density: keep a deterministic `detail` fraction of the lights.
          if (((strHash(key) + 397) % 1000) / 1000 >= detail) continue;
          const x = b.position[0] - fw / 2 + ((c + 0.5) * fw) / colsZ;
          out.push({ p: [x, y, b.position[1] + fd / 2 + 0.05], ry: 0, c: WINDOW_COLORS[strHash(key) % 3] });
        }
        for (let c = 0; c < colsX; c++) {
          const key = `${b.id}x${r}${c}`;
          if (strHash(key) % 10 < 3) continue;
          if (((strHash(key) + 397) % 1000) / 1000 >= detail) continue;
          const z = b.position[1] - fd / 2 + ((c + 0.5) * fd) / colsX;
          out.push({
            p: [b.position[0] + fw / 2 + 0.05, y, z],
            ry: Math.PI / 2,
            c: WINDOW_COLORS[strHash(key) % 3],
          });
        }
      }
    }
    return out;
  }, [buildings, detail]);

  // Type-driven rooftop silhouettes: pitched roofs for houses, cap slabs for
  // commercial/office, skylight strip for industrial. All instanced (2 draw calls).
  const roofs = useMemo(() => {
    const caps: { p: [number, number, number]; s: [number, number, number]; c: string }[] = [];
    const pitches: { p: [number, number, number]; s: [number, number, number] }[] = [];
    for (const b of buildings) {
      const [fw, fd] = b.footprint;
      const max = Math.max(fw, fd);
      switch (b.buildingType) {
        case 'residential':
          pitches.push({ p: [b.position[0], b.height + 1.1, b.position[1]], s: [max * 0.71, 2.2, max * 0.71] });
          break;
        case 'office':
          caps.push({ p: [b.position[0], b.height + 0.5, b.position[1]], s: [fw * 0.6, 1, fd * 0.6], c: '#1e293b' });
          break;
        case 'commercial':
          caps.push({ p: [b.position[0], b.height + 0.3, b.position[1]], s: [fw * 0.92, 0.6, fd * 0.92], c: '#0c4a6e' });
          break;
        case 'industrial':
          caps.push({ p: [b.position[0], b.height + 0.3, b.position[1]], s: [fw * 0.7, 0.6, fd * 0.28], c: '#57534e' });
          break;
      }
    }
    return { caps, pitches };
  }, [buildings]);

  return (
    <>
      <Instances limit={500} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.85} />
        {buildings.map((b) => (
          <Instance
            key={b.id}
            name={b.id}
            {...handlers}
            position={[b.position[0], b.height / 2, b.position[1]]}
            scale={[b.footprint[0], b.height, b.footprint[1]]}
            color={BUILDING_COLORS[b.buildingType]}
          />
        ))}
      </Instances>
      <Instances limit={4000}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial side={THREE.DoubleSide} toneMapped={false} />
        {windows.map((w, i) => (
          <Instance key={i} position={w.p} rotation={[0, w.ry, 0]} scale={[1.3, 1.7, 1]} color={w.c} />
        ))}
      </Instances>
      <Instances limit={500} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.9} />
        {roofs.caps.map((r, i) => (
          <Instance key={i} position={r.p} scale={r.s} color={r.c} />
        ))}
      </Instances>
      <Instances limit={500} castShadow>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial color="#243b5c" roughness={0.95} />
        {roofs.pitches.map((r, i) => (
          <Instance key={i} position={r.p} rotation={[0, Math.PI / 4, 0]} scale={r.s} />
        ))}
      </Instances>
    </>
  );
});

/** A drei instance node — carries the per-instance color drei copies each frame. */
type LampRef = THREE.Group & { color?: THREE.Color };

/** Intersection controllers: lamp colors follow the engine via useFrame (no React re-render). */
const Signals = memo(function Signals({ signals, handlers }: { signals: Signal[]; handlers: ObjHandlers }) {
  const lampHRefs = useRef<(LampRef | null)[]>([]);
  const lampVRefs = useRef<(LampRef | null)[]>([]);
  const { poles, lampsH, lampsV } = useMemo(() => {
    const poles = signals.map((s) => ({ id: s.id, p: [s.position[0], 2.5, s.position[1]] as [number, number, number] }));
    const lampsH: { id: string; p: [number, number, number]; c: string }[] = [];
    const lampsV: { id: string; p: [number, number, number]; c: string }[] = [];
    for (const s of signals) {
      const st = signalStates(s.timing, 0);
      lampsH.push({ id: s.id, p: [s.position[0] + 0.8, 4.6, s.position[1]], c: LAMP_COLORS[st.h] });
      lampsV.push({ id: s.id, p: [s.position[0], 4.6, s.position[1] + 0.8], c: LAMP_COLORS[st.v] });
    }
    return { poles, lampsH, lampsV };
  }, [signals]);

  // Snapshot signals come from the same pure signalStates the inspector shows;
  // written into the instance colors imperatively so ticks never re-render.
  useFrame(() => {
    const snap = getEngine(useProjectStore.getState().project).getSnapshot();
    signals.forEach((s, i) => {
      const st = snap.signals[s.id];
      if (!st) return;
      lampHRefs.current[i]?.color?.set(LAMP_COLORS[st.h]);
      lampVRefs.current[i]?.color?.set(LAMP_COLORS[st.v]);
    });
  });

  return (
    <>
      <Instances limit={300} castShadow>
        <boxGeometry args={[0.35, 5, 0.35]} />
        <meshStandardMaterial color="#475569" />
        {poles.map((p) => (
          <Instance key={p.id} name={p.id} {...handlers} position={p.p} />
        ))}
      </Instances>
      <Instances limit={300}>
        <sphereGeometry args={[0.38, 10, 10]} />
        <meshBasicMaterial toneMapped={false} />
        {lampsH.map((l, i) => (
          <Instance
            key={l.id}
            name={l.id}
            {...handlers}
            ref={(m: LampRef | null) => {
              lampHRefs.current[i] = m;
            }}
            position={l.p}
            color={l.c}
          />
        ))}
      </Instances>
      <Instances limit={300}>
        <sphereGeometry args={[0.38, 10, 10]} />
        <meshBasicMaterial toneMapped={false} />
        {lampsV.map((l, i) => (
          <Instance
            key={l.id}
            name={l.id}
            {...handlers}
            ref={(m: LampRef | null) => {
              lampVRefs.current[i] = m;
            }}
            position={l.p}
            color={l.c}
          />
        ))}
      </Instances>
    </>
  );
});

const Zones = memo(function Zones({ zones, handlers }: { zones: Zone[]; handlers: ObjHandlers }) {
  return (
    <Instances limit={200}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
      {zones.map((z) => (
        <Instance
          key={z.id}
          name={z.id}
          {...handlers}
          position={[z.position[0], 0.05, z.position[1]]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[z.size[0], z.size[1], 1]}
          color={ZONE_COLORS[z.zoneType]}
        />
      ))}
    </Instances>
  );
});

const Incidents = memo(function Incidents({ incidents, handlers }: { incidents: Incident[]; handlers: ObjHandlers }) {
  return (
    <Instances limit={300} castShadow>
      <coneGeometry args={[0.8, 2, 4]} />
      <meshStandardMaterial />
      {incidents.map((i2) => (
        <Instance
          key={i2.id}
          name={i2.id}
          {...handlers}
          position={[i2.position[0], 1.1, i2.position[1]]}
          color={i2.active ? "#f43f5e" : "#64748b"}
        />
      ))}
    </Instances>
  );
});

// --- Selection / hover highlight -------------------------------------------

const RING_R: Record<CityObject["type"], number> = {
  road: 7,
  building: 7,
  vehicle: 3,
  signal: 3,
  incident: 4,
  zone: 14,
};

function Ring({ obj, color, width }: { obj: CityObject; color: string; width: number }) {
  const r = RING_R[obj.type];
  return (
    <mesh position={[obj.position[0], 0.14, obj.position[1]]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[r, r + width, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} side={THREE.DoubleSide} />
    </mesh>
  );
}

const SelectionRing = memo(function SelectionRing() {
  const selectedId = useSelectionStore((s) => s.selectedId);
  const hoverId = useSelectionStore((s) => s.hoverId);
  const selected = useProjectStore((s) => (selectedId ? s.project.objects[selectedId] : undefined));
  const hovered = useProjectStore((s) => (hoverId ? s.project.objects[hoverId] : undefined));
  return (
    <>
      {hovered && hoverId !== selectedId && <Ring obj={hovered} color="#22d3ee" width={0.25} />}
      {selected && <Ring obj={selected} color="#38bdf8" width={0.5} />}
    </>
  );
});

// --- Placement ghost --------------------------------------------------------

function Ghost({ obj, ok }: { obj: CityObject | null; ok: boolean }) {
  if (!obj) return null;
  const color = ok ? "#22d3ee" : "#f43f5e";
  const mat = <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} toneMapped={false} />;
  switch (obj.type) {
    case "road": {
      const len = roadLength(obj);
      const dx = (obj.b[0] - obj.a[0]) / (len || 1);
      const dz = (obj.b[1] - obj.a[1]) / (len || 1);
      return (
        <mesh position={[obj.position[0], 0.3, obj.position[1]]} rotation={[0, Math.atan2(-dz, dx), 0]}>
          <boxGeometry args={[len, 0.3, 8]} />
          {mat}
        </mesh>
      );
    }
    case "building":
      return (
        <mesh position={[obj.position[0], obj.height / 2 + 0.05, obj.position[1]]}>
          <boxGeometry args={[obj.footprint[0], obj.height, obj.footprint[1]]} />
          {mat}
        </mesh>
      );
    case "zone":
      return (
        <mesh position={[obj.position[0], 0.08, obj.position[1]]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[obj.size[0], obj.size[1]]} />
          {mat}
        </mesh>
      );
    case "vehicle":
      return (
        <mesh position={[obj.position[0], 0.7, obj.position[1]]}>
          <boxGeometry args={[2, 1.3, 4.2]} />
          {mat}
        </mesh>
      );
    case "signal":
      return (
        <mesh position={[obj.position[0], 2.5, obj.position[1]]}>
          <boxGeometry args={[0.35, 5, 0.35]} />
          {mat}
        </mesh>
      );
    case "incident":
      return (
        <mesh position={[obj.position[0], 1.1, obj.position[1]]}>
          <coneGeometry args={[0.8, 2, 4]} />
          {mat}
        </mesh>
      );
  }
}

// --- Main scene -------------------------------------------------------------

export default function City() {
  const project = useProjectStore((s) => s.project);
  const layers = useSettingsStore((s) => s.layers);
  const quality = useSettingsStore((s) => s.quality);
  const tool = useAppStore((s) => s.activeTool);
  const roadDraft = useAppStore((s) => s.roadDraft);

  const { roads, roadsMap, buildings, vehicles, signals, zones, incidents } = useMemo(() => {
    const roads: Road[] = [];
    const roadsMap: Record<string, Road> = {};
    const buildings: Building[] = [];
    const vehicles: Vehicle[] = [];
    const signals: Signal[] = [];
    const zones: Zone[] = [];
    const incidents: Incident[] = [];
    for (const id of project.order) {
      const o = project.objects[id];
      if (!o) continue;
      switch (o.type) {
        case "road":
          roads.push(o);
          roadsMap[o.id] = o;
          break;
        case "building":
          buildings.push(o);
          break;
        case "vehicle":
          vehicles.push(o);
          break;
        case "signal":
          signals.push(o);
          break;
        case "zone":
          zones.push(o);
          break;
        case "incident":
          incidents.push(o);
          break;
      }
    }
    return { roads, roadsMap, buildings, vehicles, signals, zones, incidents };
  }, [project]);

  const [cursor, setCursor] = useState<Vec2 | null>(null);
  const [drag, setDragState] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const downRef = useRef<{ x: number; y: number; onObject: boolean } | null>(null);
  const upHandlerRef = useRef<((ev: PointerEvent) => void) | null>(null);

  const setDrag = useCallback((d: Drag | null) => {
    dragRef.current = d;
    setDragState(d);
  }, []);

  // Track the ground-plane point under the pointer (placement ghost + move drag).
  const trackRay = useCallback(
    (ray: THREE.Ray) => {
      const p = groundPoint(ray);
      if (!p) return;
      const d = dragRef.current;
      if (d) {
        const raw: Vec2 = [d.originObj.position[0] + (p[0] - d.grab[0]), d.originObj.position[1] + (p[1] - d.grab[1])];
        const pos: Vec2 = d.snap
          ? snapToGrid(raw)
          : [Math.round(raw[0] * 10) / 10, Math.round(raw[1] * 10) / 10];
        const next: Drag = { ...d, candidate: movedObject(d.originObj, pos) };
        dragRef.current = next;
        setDragState(next);
        return;
      }
      const t = useAppStore.getState().activeTool;
      if (!PLACE_TOOLS.has(t)) return;
      const key: Vec2 =
        t === "build-road"
          ? snapRoadPoint(p, roads)
          : SNAP_TOOLS.has(t)
            ? snapToGrid(p)
            : [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
      setCursor((prev) => (prev && prev[0] === key[0] && prev[1] === key[1] ? prev : key));
    },
    [setDragState, roads],
  );

  // Move drag: orbit disabled for its duration; commit validated on pointer-up.
  const beginDrag = useCallback(
    (d: Drag) => {
      setDrag(d);
      useAppStore.getState().setControlsEnabled(false);
      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointerup", onUp);
        upHandlerRef.current = null;
        const cur = dragRef.current;
        setDrag(null);
        useAppStore.getState().setControlsEnabled(true);
        if (!cur?.candidate) return;
        if (Math.hypot(ev.clientX - cur.px, ev.clientY - cur.py) <= 5) return; // plain click, no move
        const st = useProjectStore.getState();
        const res = canPlace(st.project.objects, cur.candidate, BOUNDS);
        if (!res.ok) {
          useAppStore.getState().setMessage(res.reason);
          return;
        }
        st.updateObject(cur.id, cur.candidate);
        useAppStore.getState().markDirty();
      };
      upHandlerRef.current = onUp;
      window.addEventListener("pointerup", onUp);
    },
    [setDrag],
  );

  useEffect(
    () => () => {
      if (upHandlerRef.current) window.removeEventListener("pointerup", upHandlerRef.current);
    },
    [],
  );

  // Stable handlers shared by every pickable group; the id comes from `e.object.name`.
  const handlers: ObjHandlers = useMemo(
    () => ({
      onPointerDown: (e) => {
        const t = useAppStore.getState().activeTool;
        downRef.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, onObject: true };
        const id = e.object.name;
        if (t === "select" && id) {
          e.stopPropagation();
        } else if (t === "move" && id) {
          e.stopPropagation();
          const obj = useProjectStore.getState().project.objects[id];
          if (obj) {
            beginDrag({
              id,
              originObj: obj,
              grab: groundPoint(e.ray) ?? obj.position,
              px: e.nativeEvent.clientX,
              py: e.nativeEvent.clientY,
              snap: SNAP_TYPES.has(obj.type),
              candidate: null,
            });
          }
        }
      },
      onClick: (e) => {
        const d = downRef.current;
        if (d && Math.hypot(e.nativeEvent.clientX - d.x, e.nativeEvent.clientY - d.y) > 5) return;
        if (useAppStore.getState().activeTool !== "select") return;
        e.stopPropagation();
        const id = e.object.name;
        if (id) useSelectionStore.getState().select(id);
      },
      onPointerOver: (e) => {
        if (useAppStore.getState().activeTool !== "select") return;
        e.stopPropagation();
        const id = e.object.name;
        useSelectionStore.getState().hover(id || null);
      },
      onPointerOut: () => {
        useSelectionStore.getState().hover(null);
      },
      onPointerMove: (e) => {
        trackRay(e.ray);
      },
    }),
    [trackRay, beginDrag],
  );

  const placeAt = (ray: THREE.Ray) => {
    const t = useAppStore.getState().activeTool;
    const p = groundPoint(ray);
    if (!p) return;
    const app = useAppStore.getState();

    if (t === "build-road") {
      const point = snapRoadPoint(p, roads);
      if (!app.roadDraft) {
        app.beginRoadDraft(point);
        return;
      }
      const segment = buildRoadSegment(app.roadDraft, point);
      const res = validateRoadSegment(useProjectStore.getState().project.objects, segment, BOUNDS);
      if (!res.ok) {
        app.setMessage(res.reason);
        return;
      }
      useProjectStore.getState().addObject(segment);
      app.cancelRoadDraft();
      useSelectionStore.getState().select(segment.id);
      app.markDirty();
      return;
    }

    const candidate = buildCandidate(t, p, roadsMap);
    if (!candidate) {
      app.setMessage("Nothing to place here — add a road first");
      return;
    }
    const res = canPlace(useProjectStore.getState().project.objects, candidate, BOUNDS);
    if (!res.ok) {
      app.setMessage(res.reason);
      return;
    }
    useProjectStore.getState().addObject(candidate);
    app.markDirty();
  };

  const ghostBase = useMemo(() => {
    if (tool === "build-road") {
      return roadDraft && cursor ? buildRoadSegment(roadDraft, cursor) : null;
    }
    return cursor && PLACE_TOOLS.has(tool) ? buildCandidate(tool, cursor, roadsMap) : null;
  }, [cursor, tool, roadsMap, roadDraft]);
  const ghostObj = drag?.candidate ?? ghostBase;
  const ghostOk = useMemo(() => {
    if (!ghostObj) return true;
    const objects = project.objects;
    return ghostObj.type === "road"
      ? validateRoadSegment(objects, ghostObj, BOUNDS).ok
      : canPlace(objects, ghostObj, BOUNDS).ok;
  }, [ghostObj, project]);

  // A draft is only meaningful while the road tool is active.
  useEffect(() => {
    if (tool !== "build-road") useAppStore.getState().cancelRoadDraft();
  }, [tool]);

  // Cursor affordance + stale hover cleanup when the tool changes.
  useEffect(() => {
    document.body.style.cursor = PLACE_TOOLS.has(tool) ? "crosshair" : tool === "move" ? "grab" : "";
    useSelectionStore.getState().hover(null);
    return () => {
      document.body.style.cursor = "";
    };
  }, [tool]);

  return (
    <group>
      <mesh
        rotation-x={-Math.PI / 2}
        receiveShadow
        onPointerDown={(e) => {
          downRef.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, onObject: false };
        }}
        onPointerMove={(e) => trackRay(e.ray)}
        onPointerUp={(e) => {
          const d = downRef.current;
          downRef.current = null;
          if (!d || d.onObject || dragRef.current) return;
          if (Math.hypot(e.nativeEvent.clientX - d.x, e.nativeEvent.clientY - d.y) > 5) return;
          const t = useAppStore.getState().activeTool;
          if (PLACE_TOOLS.has(t)) placeAt(e.ray);
          else if (t === "select") useSelectionStore.getState().select(null);
        }}
        onPointerLeave={() => {
          if (!dragRef.current) setCursor(null);
        }}
      >
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#0a0f1a" roughness={1} />
      </mesh>

      {layers.geometry && (
        <>
          <Roads roads={roads} handlers={handlers} />
          <RoadDetails roads={roads} />
          <Buildings buildings={buildings} handlers={handlers} detail={QUALITY[quality].detail} />
          <RoadsideTrees buildings={buildings} detail={QUALITY[quality].detail} />
          <Zones zones={zones} handlers={handlers} />
          <Incidents incidents={incidents} handlers={handlers} />
        </>
      )}
      {layers.signals && <Signals signals={signals} handlers={handlers} />}
      {layers.vehicles && <CityTraffic vehicles={vehicles} roads={roadsMap} handlers={handlers} />}
      {(layers.heatmap || layers.congestion) && <DensityLayers roads={roads} />}

      <SelectionRing />
      <Ghost obj={ghostObj} ok={ghostOk} />
      {roadDraft && (
        <mesh position={[roadDraft[0], 0.35, roadDraft[1]]}>
          <sphereGeometry args={[0.7, 12, 12]} />
          <meshBasicMaterial color="#22d3ee" toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}
