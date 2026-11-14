"use client";

import { Fragment, memo, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Instances, Instance } from "@react-three/drei";
import * as THREE from "three";
import type { Road, Vehicle, VehicleType } from "@/lib/model/types";
import type { ObjHandlers } from "./handlers";
import { getEngine } from "@/lib/simulation/engineHost";
import { useProjectStore } from "@/lib/state/projectStore";
import { useSettingsStore } from "@/lib/state/settingsStore";
import { VEHICLE_TYPE_COLORS } from "@/lib/state/layerLabels";

/** Per body-type instance geometry [width, height, length]. */
const SIZES: Record<VehicleType, [number, number, number]> = {
    car: [1.9, 1.3, 4.2],
    bus: [2.4, 2.6, 9],
    truck: [2.4, 2.7, 7],
    van: [2.1, 1.9, 4.6],
};

/** Cabin/roof silhouette per body type [width, height, length], centred on the body. */
const CABINS: Record<VehicleType, [number, number, number]> = {
    car: [1.5, 0.55, 2.2],
    bus: [2.1, 0.5, 8.2],
    truck: [1.9, 0.6, 2.6],
    van: [1.7, 0.55, 3],
};

const COLORS = ["#38bdf8", "#a855f7", "#f59e0b", "#22d3ee", "#f472b6", "#34d399", "#e2e8f0"];

/** Deterministic per-id color so a given vehicle keeps its color across reloads. */
function hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

interface CityTrafficProps {
    vehicles: Vehicle[];
    roads: Record<string, Road>;
    handlers: ObjHandlers;
}

interface Pose {
    x: number;
    y: number;
    z: number;
    ry: number;
    /** Cabin centre height, fixed per body type. */
    cy: number;
}

/**
 * Instanced vehicle rendering — one InstancedMesh per body type.
 * Static project pose until the engine has a fleet; once running, transforms
 * are written straight into the instances from the engine snapshot (useFrame),
 * so ticks never re-render React.
 */
const CityTraffic = memo(function CityTraffic({ vehicles, roads, handlers }: CityTrafficProps) {
    const distribution = useSettingsStore((s) => s.layers.distribution);
    const groups = useMemo(() => {
        const g = { car: [] as Vehicle[], bus: [] as Vehicle[], truck: [] as Vehicle[], van: [] as Vehicle[] };
        for (const v of vehicles) g[v.vehicleType].push(v);
        return g;
    }, [vehicles]);

    /** Static pose per project vehicle — fallback before first play and after reset. */
    const staticPoses = useMemo(() => {
        const map = new Map<string, Pose>();
        for (const v of vehicles) {
            const road = roads[v.spawnRoadId];
            const dir = road
                ? v.heading === 1
                    ? [road.b[0] - road.a[0], road.b[1] - road.a[1]]
                    : [road.a[0] - road.b[0], road.a[1] - road.b[1]]
                : [0, 1];
            map.set(v.id, {
                x: v.position[0],
                y: SIZES[v.vehicleType][1] / 2 + 0.05,
                z: v.position[1],
                ry: Math.atan2(dir[0], dir[1]),
                cy: SIZES[v.vehicleType][1] + 0.05 + CABINS[v.vehicleType][1] / 2,
            });
        }
        return map;
    }, [vehicles, roads]);

    const meshes = useRef(new Map<string, THREE.Object3D>());
    const cabins = useRef(new Map<string, THREE.Object3D>());

    useFrame(() => {
        const snap = getEngine(useProjectStore.getState().project).getSnapshot();
        const live = snap.vehicles.length > 0 ? new Map(snap.vehicles.map((v) => [v.id, v])) : null;
        for (const [id, mesh] of meshes.current) {
            const cabin = cabins.current.get(id);
            const pose = staticPoses.get(id);
            const lv = live?.get(id);
            if (lv) {
                const y = pose?.y ?? 1;
                mesh.position.set(lv.x, y, lv.z);
                mesh.rotation.y = lv.rotY;
                cabin?.position.set(lv.x, pose?.cy ?? y + 1, lv.z);
                if (cabin) cabin.rotation.y = lv.rotY;
            } else if (live) {
                mesh.position.set(0, -50, 0); // dropped from the fleet — park below ground
                cabin?.position.set(0, -50, 0);
            } else if (pose) {
                mesh.position.set(pose.x, pose.y, pose.z);
                mesh.rotation.y = pose.ry;
                cabin?.position.set(pose.x, pose.cy, pose.z);
                if (cabin) cabin.rotation.y = pose.ry;
            }
        }
    });

    return (
        <>
            {(Object.keys(SIZES) as VehicleType[]).map((type) => {
                const list = groups[type];
                if (list.length === 0) return null;
                const [w, h, l] = SIZES[type];
                const [cw, ch, cl] = CABINS[type];
                return (
                    <Fragment key={type}>
                        <Instances limit={1000} castShadow>
                            <boxGeometry args={[w, h, l]} />
                            <meshStandardMaterial metalness={0.35} roughness={0.5} />
                            {list.map((v) => {
                                const s = staticPoses.get(v.id)!;
                                return (
                                    <Instance
                                        key={v.id}
                                        name={v.id}
                                        {...handlers}
                                        ref={(m: THREE.Object3D | null) => {
                                            if (m) meshes.current.set(v.id, m);
                                            else meshes.current.delete(v.id);
                                        }}
                                        position={[s.x, s.y, s.z]}
                                        rotation={[0, s.ry, 0]}
                                        color={
                                            distribution
                                                ? VEHICLE_TYPE_COLORS[v.vehicleType] // distribution layer: color by body type
                                                : COLORS[hash(v.id) % COLORS.length]
                                        }
                                    />
                                );
                            })}
                        </Instances>
                        <Instances limit={1000}>
                            <boxGeometry args={[cw, ch, cl]} />
                            <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.25} />
                            {list.map((v) => {
                                const s = staticPoses.get(v.id)!;
                                return (
                                    <Instance
                                        key={v.id}
                                        ref={(m: THREE.Object3D | null) => {
                                            if (m) cabins.current.set(v.id, m);
                                            else cabins.current.delete(v.id);
                                        }}
                                        position={[s.x, s.cy, s.z]}
                                        rotation={[0, s.ry, 0]}
                                    />
                                );
                            })}
                        </Instances>
                    </Fragment>
                );
            })}
        </>
    );
});

export default CityTraffic;
