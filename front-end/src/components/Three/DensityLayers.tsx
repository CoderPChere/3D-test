"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getEngine } from "@/lib/simulation/engineHost";
import { hotspotIntensity, roadDensity } from "@/lib/simulation/density";
import { useProjectStore } from "@/lib/state/projectStore";
import { useSettingsStore } from "@/lib/state/settingsStore";
import type { Road } from "@/lib/model/types";

/** Bounded cadence: analytics visuals refresh 4×/s — never per render frame (spec: metric computation does not degrade interactivity). */
const UPDATE_S = 0.25;
const HOTSPOT_THRESHOLD = 0.35;
const GROUND = new THREE.Color("#0a0f1a");
const WARM = new THREE.Color("#eab308");
const HOT = new THREE.Color("#ef4444");

/** ground → warm → hot as density climbs, so strips fade into the road at zero. */
function heatColor(density: number, out: THREE.Color): THREE.Color {
  if (density < 0.5) return out.copy(GROUND).lerp(WARM, density * 2);
  return out.copy(WARM).lerp(HOT, (density - 0.5) * 2);
}

interface RoadInfo {
  id: string;
  capacity: number;
  cx: number;
  cz: number;
  len: number;
  rot: number;
}

/**
 * Congestion hotspots + density heatmap: instanced overlays driven by live
 * engine vehicle counts, rewritten at a bounded cadence.
 */
export default function DensityLayers({ roads }: { roads: Road[] }) {
  const heatRef = useRef<THREE.InstancedMesh>(null);
  const spotRef = useRef<THREE.InstancedMesh>(null);
  const last = useRef(-Infinity);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const info = useMemo<RoadInfo[]>(
    () =>
      roads.map((r) => {
        const dx = r.b[0] - r.a[0];
        const dz = r.b[1] - r.a[1];
        return {
          id: r.id,
          capacity: r.capacity,
          cx: (r.a[0] + r.b[0]) / 2,
          cz: (r.a[1] + r.b[1]) / 2,
          len: Math.hypot(dx, dz),
          rot: Math.atan2(dx, dz),
        };
      }),
    [roads],
  );

  useFrame((state) => {
    if (state.clock.elapsedTime - last.current < UPDATE_S) return;
    last.current = state.clock.elapsedTime;
    const heat = heatRef.current;
    const spot = spotRef.current;
    if (!heat || !spot) return;
    const layers = useSettingsStore.getState().layers;
    heat.visible = layers.heatmap;
    spot.visible = layers.congestion;
    if (!heat.visible && !spot.visible) return;

    const snap = getEngine(useProjectStore.getState().project).getSnapshot();
    const counts: Record<string, number> = {};
    for (const v of snap.vehicles) counts[v.roadId] = (counts[v.roadId] ?? 0) + 1;

    info.forEach((r, i) => {
      const d = roadDensity(counts[r.id] ?? 0, r.capacity);
      // Heat strip along the road — fades into the ground color at zero density.
      dummy.position.set(r.cx, 0.3, r.cz);
      dummy.rotation.set(-Math.PI / 2, 0, r.rot);
      dummy.scale.set(7, r.len, 1);
      dummy.updateMatrix();
      heat.setMatrixAt(i, dummy.matrix);
      heat.setColorAt(i, heatColor(d, color));
      // Hotspot disc — scale 0 (hidden) until density crosses the threshold.
      const intensity = hotspotIntensity(d, HOTSPOT_THRESHOLD);
      dummy.position.set(r.cx, 0.36, r.cz);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      const s = intensity === 0 ? 0 : 1.5 + intensity * 4.5;
      dummy.scale.set(s, s, 1);
      dummy.updateMatrix();
      spot.setMatrixAt(i, dummy.matrix);
      spot.setColorAt(i, color.setRGB(1, 0.55 - intensity * 0.4, 0.05));
    });
    heat.instanceMatrix.needsUpdate = true;
    spot.instanceMatrix.needsUpdate = true;
    if (heat.instanceColor) heat.instanceColor.needsUpdate = true;
    if (spot.instanceColor) spot.instanceColor.needsUpdate = true;
  });

  if (info.length === 0) return null;

  return (
    <group>
      <instancedMesh ref={heatRef} args={[undefined, undefined, info.length]} frustumCulled={false} renderOrder={1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial transparent opacity={0.4} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={spotRef} args={[undefined, undefined, info.length]} frustumCulled={false} renderOrder={2}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial transparent opacity={0.55} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
