"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import type { SignalClock } from "@/traffic/signal";
import { TrafficSimulation, generateSpawns, CATEGORIES } from "@/traffic/simulation";
import { defaultProfile, type TrafficDensity } from "@/config/city";
import { QUALITY, quality } from "@/config/quality";

const MATRIX_TMP = new THREE.Matrix4();
const COLOR_TMP = new THREE.Color();

export default function TrafficSystem({ clock }: { clock: SignalClock }) {
    // boot density comes from the profile; a runtime tier switch applies the
    // tier table's density (task 6.4 / config docs)
    const [density, setDensity] = useState<TrafficDensity>(defaultProfile.traffic.density);

    const sim = useMemo(
        () =>
            new TrafficSimulation(
                generateSpawns(defaultProfile.seed, density),
                defaultProfile.traffic.minGap
            ),
        [density]
    );
    const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
    const beamRef = useRef<THREE.InstancedMesh>(null);
    const anchorRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState<number | null>(null);
    // scan state drives only per-frame beam matrices — a ref, so scan ticks
    // never commit React (task 6.5)
    const scanned = useRef(new Set<number>());
    const scanTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

    // tier switch → new density → new vehicle set: rebuild the sim and drop
    // stale hover/scan state in the same batch (subscribe callback, not the
    // effect body — react-hooks/set-state-in-effect)
    useEffect(
        () =>
            quality.subscribe(() => {
                setDensity(QUALITY[quality.get()].density);
                setHovered(null);
                scanned.current.clear();
            }),
        []
    );

    const counts = useMemo(
        () => CATEGORIES.map((_, c) => sim.spawns.filter((v) => v.category === c).length),
        [sim]
    );
    // instanceId -> spawn index, per category mesh
    const spawnAtSlot = useMemo(() => {
        const map: number[][] = CATEGORIES.map(() => []);
        sim.spawns.forEach((v, i) => {
            map[v.category][v.slot] = i;
        });
        return map;
    }, [sim]);

    // simulation lifecycle: allocate on mount, release exactly once on unmount
    useEffect(() => {
        sim.start();
        const timers = scanTimers.current;
        return () => {
            sim.stop();
            for (const t of timers.values()) clearTimeout(t);
            timers.clear();
        };
    }, [sim]);

    // instance colors are painted from the frame loop (hover changes only):
    // reading meshRefs in an effect would taint it for per-frame mutation
    const lastPaint = useRef<number | null>(null);

    // the single shared frame loop: step typed-array state, then write transforms
    useFrame((state, dt) => {
        sim.step(dt, clock);
        const world = sim.world;
        const heading = sim.heading;
        if (!world || !heading) return;

        for (const v of sim.spawns) {
            const mesh = meshRefs.current[v.category];
            if (!mesh) continue;
            MATRIX_TMP.makeRotationY(heading[v.id]);
            MATRIX_TMP.setPosition(world[v.id * 2], 0, world[v.id * 2 + 1]);
            mesh.setMatrixAt(v.slot, MATRIX_TMP);
        }
        for (const mesh of meshRefs.current) {
            if (mesh) mesh.instanceMatrix.needsUpdate = true;
        }

        // paint instance colors on first frame and whenever hover changes
        const paintKey = hovered ?? -1;
        if (lastPaint.current !== paintKey) {
            const first = lastPaint.current === null;
            lastPaint.current = paintKey;
            for (const v of sim.spawns) {
                const mesh = meshRefs.current[v.category];
                if (!mesh) continue;
                if (first) mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                mesh.setColorAt(v.slot, COLOR_TMP.set(hovered === v.id ? "#ffffff" : v.color));
            }
            for (const mesh of meshRefs.current) {
                if (mesh?.instanceColor) mesh.instanceColor.needsUpdate = true;
            }
            const beam = beamRef.current;
            if (beam) {
                if (first) beam.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                for (const v of sim.spawns) beam.setColorAt(v.id, COLOR_TMP.set(v.color));
                if (beam.instanceColor) beam.instanceColor.needsUpdate = true;
            }
        }

        // scan beams: one instance per vehicle, scaled to zero when inactive
        const beam = beamRef.current;
        if (beam) {
            for (const v of sim.spawns) {
                if (scanned.current.has(v.id)) {
                    MATRIX_TMP.makeTranslation(world[v.id * 2], 5, world[v.id * 2 + 1]);
                } else {
                    MATRIX_TMP.makeScale(0, 0, 0);
                }
                beam.setMatrixAt(v.id, MATRIX_TMP);
            }
            beam.instanceMatrix.needsUpdate = true;
        }

        // tooltip anchor follows the hovered vehicle (bounds guard: hover can
        // be stale for a frame after a density switch shrinks the vehicle set)
        const anchor = anchorRef.current;
        if (anchor && hovered !== null && hovered < sim.spawns.length) {
            anchor.position.set(world[hovered * 2], 2, world[hovered * 2 + 1]);
        }

        // scan-beam trigger (ported from the old per-car frame loops)
        const t = state.clock.getElapsedTime();
        for (const v of sim.spawns) {
            if (
                Math.sin(t * 5 + v.offset) > 0.999 &&
                !scanned.current.has(v.id) &&
                !scanTimers.current.has(v.id)
            ) {
                const id = v.id;
                scanned.current.add(id);
                scanTimers.current.set(
                    id,
                    setTimeout(() => {
                        scanTimers.current.delete(id);
                        scanned.current.delete(id);
                    }, 2000)
                );
            }
        }
    });

    const spawn = hovered !== null ? (sim.spawns[hovered] ?? null) : null;

    return (
        <group>
            {/* one InstancedMesh per category (car / bus / truck) */}
            {CATEGORIES.map((cat, c) => (
                <instancedMesh
                    key={cat.name}
                    ref={(el) => {
                        meshRefs.current[c] = el;
                    }}
                    args={[undefined, undefined, counts[c]]}
                    // shadow policy (task 6.3): small objects never cast — groundings
                    // come from the ContactShadows depth pass instead
                    frustumCulled={false}
                    onPointerMove={(e) => {
                        if (e.instanceId != null) {
                            const idx = spawnAtSlot[c][e.instanceId];
                            setHovered((prev) => (prev === idx ? prev : idx));
                        }
                    }}
                    onPointerOut={() => setHovered(null)}
                >
                    <boxGeometry args={cat.size} />
                    <meshStandardMaterial metalness={0.6} roughness={0.2} />
                </instancedMesh>
            ))}

            {/* scan beams — one instance per vehicle, moved by the shared loop */}
            <instancedMesh
                ref={beamRef}
                args={[undefined, undefined, sim.spawns.length]}
                frustumCulled={false}
                raycast={() => null}
            >
                <cylinderGeometry args={[0.1, 2, 10, 32]} />
                <meshStandardMaterial
                    color="#22d3ee"
                    transparent
                    opacity={0.3}
                    emissive="#22d3ee"
                    emissiveIntensity={2}
                    depthWrite={false}
                />
            </instancedMesh>

            {/* hover tooltip anchored to the hovered vehicle */}
            <group ref={anchorRef}>
                {spawn && (
                    <Html distanceFactor={15}>
                        <div className="glass p-2 rounded border border-neon-cyan whitespace-nowrap bg-black/50 pointer-events-none">
                            <p className="text-[8px] uppercase text-slate-200 font-mono">
                                Scan ID: CFX-{String(spawn.id + 1).padStart(4, "0")}
                            </p>
                            <p className="text-[10px] font-bold text-neon-cyan font-mono tracking-tighter">
                                SPD: {Math.floor(sim.speed(spawn.id) * 400)} KM/H
                            </p>
                        </div>
                    </Html>
                )}
            </group>
        </group>
    );
}
