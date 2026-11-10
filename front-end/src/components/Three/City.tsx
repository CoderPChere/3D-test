"use client";

import { useMemo, useEffect, useRef } from "react";
import { Plane, Instances, Instance } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import TrafficSystem from "./TrafficSystem";
import GeneratedBuildings from "./GeneratedBuildings";
import GeneratedRoads from "./GeneratedRoads";
import SkylineRing from "./SkylineRing";
import Landmarks from "./Landmarks";
import { generateCity, BuildingRecord } from "@/city/generate";
import { generateRoads, generateStreetFurniture } from "@/city/roads";
import { createSeededRandom } from "@/city/random";
import { defaultProfile } from "@/config/city";
import { lodDetailVisible, quality } from "@/config/quality";
import { environment } from "@/environment/store";
import { SignalClock, SignalPhase } from "@/traffic/signal";

// Window glass colors — blended per frame by night factor (controller's stars value)
const WINDOW_LIT = new THREE.Color("#eac668");
const WINDOW_DARK = new THREE.Color("#191b26");
const WINDOW_TMP = new THREE.Color();

// Profile visual emphasis (task 7.2): with dimOthers, lit windows only render
// inside emphasized districts, so the rest of the city recedes at night
const EMPHASIZED_DISTRICTS = new Set(defaultProfile.emphasis.districts);
const DIM_OTHERS = defaultProfile.emphasis.dimOthers;

export default function City() {
    // District-aware seeded layout from the profile (city-generation spec);
    // the generator already keeps plots clear of road corridors
    const { buildings, landmarkPlots } = useMemo(() => generateCity(defaultProfile), []);

    // Single signal-timing source (traffic-simulation spec): owned here,
    // passed to poles and vehicles; ticked by TrafficLights' frame loop
    const signalClock = useMemo(
        () => new SignalClock(defaultProfile.traffic.signalCycleSec),
        []
    );

    return (
        <group>
            {/* Ground */}
            <Plane
                args={[200, 200]}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0, 0]}
                receiveShadow
            >
                <meshStandardMaterial color="#020617" roughness={0.8} />
            </Plane>

            {/* Grid Helper for futuristic feel */}
            <gridHelper args={[200, 40, "#0ea5e9", "#1e293b"]} position={[0, 0.1, 0]} />

            {/* Buildings — instanced per style from the generator */}
            <GeneratedBuildings buildings={buildings} />

            {/* Profile landmark registry — interactive meshes on reserved plots */}
            <Landmarks plots={landmarkPlots} />

            {/* Distant skyline silhouette beyond the modeled area */}
            <SkylineRing />

            {/* Generated road network: surfaces, dashes, sidewalks, crosswalks */}
            <GeneratedRoads />

            {/* Dynamic Traffic */}
            <TrafficSystem clock={signalClock} />

            {/* Building Windows - Instanced for maximum performance */}
            <BuildingWindows buildings={buildings} />

            {/* CCTV Camera Points */}
            <CCTVPoints />

            {/* Street Lights */}
            <StreetLights />

            {/* Road Signs */}
            <RoadSigns />

            {/* Traffic Lights */}
            <TrafficLights clock={signalClock} />
        </group>
    );
}

function BuildingWindows({ buildings }: { buildings: BuildingRecord[] }) {
    const frontMat = useRef<THREE.MeshBasicMaterial>(null);
    const sideMat = useRef<THREE.MeshBasicMaterial>(null);
    // per-window instance groups for LOD culling (task 6.2)
    const frontRefs = useRef<(THREE.Group | null)[]>([]);
    const sideRefs = useRef<(THREE.Group | null)[]>([]);
    const lastCam = useRef(new THREE.Vector3(1e9, 0, 0));
    // a tier switch must re-apply LOD even when the camera hasn't moved
    useEffect(() => quality.subscribe(() => lastCam.current.set(1e9, 0, 0)), []);

    const windows = useMemo(() => {
        const rng = createSeededRandom(defaultProfile.seed + 1); // deterministic lit-window pattern
        const allWindows: { pos: [number, number, number]; args: [number, number, number] }[] = [];
        buildings.forEach(b => {
            if (DIM_OTHERS && !EMPHASIZED_DISTRICTS.has(b.district)) return; // dimmed district (task 7.2)
            const w = b.footprint[0];
            const h = b.height;
            const d = b.footprint[1];
            const floors = Math.floor(h / 3);
            const winPerRowX = Math.floor(w / 2);
            const winPerRowZ = Math.floor(d / 2);

            for (let y = 1; y < floors; y++) {
                for (let x = 0; x < winPerRowX; x++) {
                    const isLit1 = rng.next() > 0.8;
                    const isLit2 = rng.next() > 0.8;
                    const posX = -w/2 + (w / winPerRowX) * (x + 0.5);
                    const posY = -h/2 + y * 3;
                    
                    if (isLit1) {
                        allWindows.push({
                            pos: [b.x + posX, b.height / 2 + posY, b.z + d/2 + 0.01],
                            args: [1, 1.5, 0.05],
                        });
                    }
                    if (isLit2) {
                        allWindows.push({
                            pos: [b.x + posX, b.height / 2 + posY, b.z - d/2 - 0.01],
                            args: [1, 1.5, 0.05],
                        });
                    }
                }
                for (let z = 0; z < winPerRowZ; z++) {
                    const isLit1 = rng.next() > 0.8;
                    const isLit2 = rng.next() > 0.8;
                    const posZ = -d/2 + (d / winPerRowZ) * (z + 0.5);
                    const posY = -h/2 + y * 3;
                    
                    if (isLit1) {
                        allWindows.push({
                            pos: [b.x + w/2 + 0.01, b.height / 2 + posY, b.z + posZ],
                            args: [0.05, 1.5, 1],
                        });
                    }
                    if (isLit2) {
                        allWindows.push({
                            pos: [b.x - w/2 - 0.01, b.height / 2 + posY, b.z + posZ],
                            args: [0.05, 1.5, 1],
                        });
                    }
                }
            }
        });
        return allWindows;
    }, [buildings]);

    // Separate into two groups for different orientations to avoid rotation logic in instancing for now
    const frontBack = windows.filter(w => w.args[0] === 1);
    const leftRight = windows.filter(w => w.args[0] === 0.05);

    useFrame(({ camera }) => {
        // night factor from the single environment controller: 0 = day/golden, 1 = night
        WINDOW_TMP.lerpColors(WINDOW_DARK, WINDOW_LIT, environment.values().stars);
        frontMat.current?.color.copy(WINDOW_TMP);
        sideMat.current?.color.copy(WINDOW_TMP);

        // LOD pass (task 6.2): cull lit-window quads beyond the tier distance —
        // the building boxes themselves always render, so no gaps appear.
        // Re-runs only once the camera moved ≥2 units since the last pass
        if (camera.position.distanceToSquared(lastCam.current) < 4) return;
        lastCam.current.copy(camera.position);
        const cull = (refs: (THREE.Group | null)[], list: { pos: [number, number, number] }[]) => {
            for (let i = 0; i < list.length; i++) {
                const g = refs[i];
                if (!g) continue;
                const p = list[i].pos;
                const d = Math.hypot(
                    p[0] - camera.position.x,
                    p[1] - camera.position.y,
                    p[2] - camera.position.z
                );
                g.scale.setScalar(lodDetailVisible(d) ? 1 : 0);
            }
        };
        cull(frontRefs.current, frontBack);
        cull(sideRefs.current, leftRight);
    });

    return (
        <group>
            <Instances range={frontBack.length}>
                <boxGeometry args={[1, 1.5, 0.05]} />
                <meshBasicMaterial ref={frontMat} color="#eac668" toneMapped={false} />
                {frontBack.map((w, i) => (
                    <Instance 
                        key={i} 
                        ref={(el: THREE.Group | null) => { frontRefs.current[i] = el; }}
                        position={w.pos as [number, number, number]} 
                    />
                ))}
            </Instances>
            <Instances range={leftRight.length}>
                <boxGeometry args={[0.05, 1.5, 1]} />
                <meshBasicMaterial ref={sideMat} color="#eac668" toneMapped={false} />
                {leftRight.map((w, i) => (
                    <Instance 
                        key={i} 
                        ref={(el: THREE.Group | null) => { sideRefs.current[i] = el; }}
                        position={w.pos as [number, number, number]} 
                    />
                ))}
            </Instances>
        </group>
    );
}


function CCTVPoints() {
    const cameras: { pos: [number, number, number] }[] = [
        { pos: [15, 12, 15] },
        { pos: [-15, 15, -15] },
        { pos: [45, 10, -30] },
        { pos: [-30, 20, 45] },
    ];

    return (
        <>
            {cameras.map((c, i) => (
                <CctvMarker key={i} pos={c.pos} />
            ))}
        </>
    );
}

/** One CCTV marker — hidden beyond the LOD distance (street-furniture detail, task 6.2) */
function CctvMarker({ pos }: { pos: [number, number, number] }) {
    const ref = useRef<THREE.Group>(null);
    useLodVisible(ref);

    return (
        <group position={pos} ref={ref}>
            {/* no castShadow — small marker, shadow policy task 6.3 */}
            <mesh>
                <sphereGeometry args={[0.8, 16, 16]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
            </mesh>
            {/* emissive marker only — no per-marker point lights (light budget) */}
            {/* Holographic Ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.5, 0.05, 16, 32]} />
                <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={1} transparent opacity={0.5} />
            </mesh>
        </group>
    );
}

function StreetLights() {
    const bulbMat = useRef<THREE.MeshStandardMaterial>(null);

    useFrame(() => {
        // extinguish in day, glow at night — emissive only, no extra real-time lights
        if (bulbMat.current) bulbMat.current.emissiveIntensity = 2 * environment.values().stars;
    });

    // Poles along both sidewalk edges of every generated road, every 24 units
    const lightsData = useMemo(() => {
        const data: { pos: [number, number, number]; rot: number }[] = [];
        for (const r of generateRoads(defaultProfile)) {
            const horizontal = r.from[1] === r.to[1];
            const span = horizontal ? r.to[0] - r.from[0] : r.to[1] - r.from[1];
            const dir = Math.sign(span);
            const len = Math.abs(span);
            const off = r.width / 2 + 1; // sidewalk center
            for (let t = 6; t < len - 4; t += 24) {
                const x = horizontal ? r.from[0] + dir * t : r.from[0];
                const z = horizontal ? r.from[1] : r.from[1] + dir * t;
                // bulb faces the roadway
                if (horizontal) {
                    data.push({ pos: [x, 0, z - off], rot: 0 });
                    data.push({ pos: [x, 0, z + off], rot: Math.PI });
                } else {
                    data.push({ pos: [x - off, 0, z], rot: Math.PI / 2 });
                    data.push({ pos: [x + off, 0, z], rot: -Math.PI / 2 });
                }
            }
        }
        return data;
    }, []);

    return (
        <group>
            {/* Instanced Poles */}
            <Instances range={lightsData.length}>
                <cylinderGeometry args={[0.1, 0.1, 8]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.8} />
                {lightsData.map((l, i) => (
                    <Instance key={i} position={[l.pos[0], 4, l.pos[2]]} />
                ))}
            </Instances>
            
            {/* Bulbs / Lights - Only visible glowing ones, no expensive spotLights for every single one */}
            <Instances range={lightsData.length}>
                <boxGeometry args={[0.3, 0.1, 0.5]} />
                <meshStandardMaterial ref={bulbMat} color="#ffffff" emissive="#fef08a" emissiveIntensity={2} />
                {lightsData.map((l, i) => {
                    // Calc rotation offset for bulb
                    const offsetX = Math.sin(l.rot) * 1;
                    const offsetZ = Math.cos(l.rot) * 1;
                    return (
                        <Instance 
                            key={i} 
                            position={[l.pos[0] + offsetX, 7.9, l.pos[2] + offsetZ]} 
                            rotation={[0, l.rot, 0]}
                        />
                    );
                })}
            </Instances>
        </group>
    );
}

/** Lamp colors (lit hue / unlit dim) shared by JSX initial state and setLamp */
const LAMP: Record<SignalPhase, { hue: string; dim: string }> = {
    red: { hue: "#ef4444", dim: "#450a0a" },
    yellow: { hue: "#eab308", dim: "#422006" },
    green: { hue: "#22c55e", dim: "#052e16" },
};

function setLamp(mat: THREE.MeshStandardMaterial | null, on: boolean, hue: string, dim: string) {
    if (!mat) return;
    mat.color.set(on ? hue : dim);
    mat.emissive.set(on ? hue : "#000000");
    mat.emissiveIntensity = on ? 2 : 0;
}

/** Initial JSX material state for a lamp color showing `shown` */
function lampProps(sig: SignalPhase, shown: SignalPhase) {
    const on = shown === sig;
    const { hue, dim } = LAMP[sig];
    return {
        color: on ? hue : dim,
        emissive: on ? hue : "#000000",
        emissiveIntensity: on ? 2 : 0,
    };
}

interface Part {
    pos: [number, number, number];
    rot: number;
}

/** Two pole slots per intersection — identical placement to the old markup */
const POLE_SLOTS: { dx: number; dz: number; rot: number; horizontal: boolean }[] = [
    { dx: -5, dz: 5, rot: Math.PI / 4, horizontal: true },
    { dx: 5, dz: -5, rot: -Math.PI * 0.75, horizontal: false },
];

/** Lens offsets within the pole (housing [0,5,0.5] + lens z 0.26) */
const LENS: { sig: SignalPhase; y: number }[] = [
    { sig: "red", y: 0.5 },
    { sig: "yellow", y: 0 },
    { sig: "green", y: -0.5 },
];

function TrafficLights({ clock }: { clock: SignalClock }) {
    // One signal pair per controlled intersection from the generator
    const intersections = useMemo(
        () => generateStreetFurniture(generateRoads(defaultProfile)).lights,
        []
    );

    // The single frame loop that advances signal time for poles and vehicles
    useFrame((_, dt) => clock.tick(dt));

    // World placements for every pole part (task 6.1: one instanced batch per
    // part instead of 5 meshes per pole — ~650 draws → 8)
    const parts = useMemo(() => {
        const yaw = (v: [number, number, number], a: number): [number, number, number] => {
            const s = Math.sin(a);
            const c = Math.cos(a);
            return [v[2] * s, v[1], v[2] * c];
        };
        const pole: Part[] = [];
        const housing: Part[] = [];
        // lens batches: [horizontal, vertical] per lamp color — the signal
        // phase is global per axis, so one material per batch is correct
        const lens: Record<SignalPhase, [Part[], Part[]]> = {
            red: [[], []],
            yellow: [[], []],
            green: [[], []],
        };
        for (const p of intersections) {
            for (const s of POLE_SLOTS) {
                const bx = p.x + s.dx;
                const bz = p.z + s.dz;
                pole.push({ pos: [bx, 2.5, bz], rot: s.rot });
                const h = yaw([0, 5, 0.5], s.rot);
                housing.push({ pos: [bx + h[0], h[1], bz + h[2]], rot: s.rot });
                for (const l of LENS) {
                    const o = yaw([0, 5 + l.y, 0.76], s.rot);
                    lens[l.sig][s.horizontal ? 0 : 1].push({
                        pos: [bx + o[0], o[1], bz + o[2]],
                        rot: s.rot,
                    });
                }
            }
        }
        return { pole, housing, lens };
    }, [intersections]);

    const shownH = clock.signal(true);
    const shownV = clock.signal(false);

    // One subscription drives all six lamp materials — direct writes, no
    // useState and no per-pole frame loop, so ticks never re-render
    const redH = useRef<THREE.MeshStandardMaterial>(null);
    const yellowH = useRef<THREE.MeshStandardMaterial>(null);
    const greenH = useRef<THREE.MeshStandardMaterial>(null);
    const redV = useRef<THREE.MeshStandardMaterial>(null);
    const yellowV = useRef<THREE.MeshStandardMaterial>(null);
    const greenV = useRef<THREE.MeshStandardMaterial>(null);
    useEffect(
        () =>
            clock.subscribe((c) => {
                const h = c.signal(true);
                const v = c.signal(false);
                setLamp(redH.current, h === "red", LAMP.red.hue, LAMP.red.dim);
                setLamp(yellowH.current, h === "yellow", LAMP.yellow.hue, LAMP.yellow.dim);
                setLamp(greenH.current, h === "green", LAMP.green.hue, LAMP.green.dim);
                setLamp(redV.current, v === "red", LAMP.red.hue, LAMP.red.dim);
                setLamp(yellowV.current, v === "yellow", LAMP.yellow.hue, LAMP.yellow.dim);
                setLamp(greenV.current, v === "green", LAMP.green.hue, LAMP.green.dim);
            }),
        [clock]
    );

    const lampBatch = (
        sig: SignalPhase,
        axis: 0 | 1,
        ref: { current: THREE.MeshStandardMaterial | null },
        shown: SignalPhase
    ) => (
        <Instances key={`${sig}${axis}`} range={parts.lens[sig][axis].length}>
            <circleGeometry args={[0.15, 16]} />
            <meshStandardMaterial ref={ref} {...lampProps(sig, shown)} />
            {parts.lens[sig][axis].map((p, i) => (
                <Instance key={i} position={p.pos} rotation={[0, p.rot, 0]} />
            ))}
        </Instances>
    );

    return (
        <group>
            <Instances range={parts.pole.length}>
                <cylinderGeometry args={[0.1, 0.1, 5]} />
                <meshStandardMaterial color="#111" metalness={0.8} />
                {parts.pole.map((p, i) => (
                    <Instance key={i} position={p.pos} rotation={[0, p.rot, 0]} />
                ))}
            </Instances>

            <Instances range={parts.housing.length}>
                <boxGeometry args={[0.5, 1.5, 0.5]} />
                <meshStandardMaterial color="#111" metalness={0.9} />
                {parts.housing.map((p, i) => (
                    <Instance key={i} position={p.pos} rotation={[0, p.rot, 0]} />
                ))}
            </Instances>

            {lampBatch("red", 0, redH, shownH)}
            {lampBatch("yellow", 0, yellowH, shownH)}
            {lampBatch("green", 0, greenH, shownH)}
            {lampBatch("red", 1, redV, shownV)}
            {lampBatch("yellow", 1, yellowV, shownV)}
            {lampBatch("green", 1, greenV, shownV)}
        </group>
    );
}
    
const LOD_POS = new THREE.Vector3();

/** Hide a detail object beyond the tier's LOD distance (task 6.2) */
function useLodVisible(ref: { current: THREE.Object3D | null }) {
    const lastCam = useRef(new THREE.Vector3(1e9, 0, 0));
    // a tier switch must re-apply even when the camera hasn't moved
    useEffect(() => quality.subscribe(() => lastCam.current.set(1e9, 0, 0)), []);
    useFrame(({ camera }) => {
        const obj = ref.current;
        if (!obj) return;
        if (camera.position.distanceToSquared(lastCam.current) < 4) return;
        lastCam.current.copy(camera.position);
        obj.getWorldPosition(LOD_POS);
        obj.visible = lodDetailVisible(camera.position.distanceTo(LOD_POS));
    });
}

function RoadSigns() {
    // Positions are scene layout, not branding — sign text/colors come from the profile.
    const positions = [
        [-15, 0, -38],
        [15, 0, 38],
        [38, 0, -15],
        [-38, 0, 15],
    ];
    const signs = defaultProfile.roadSigns.map((s, idx) => ({
        pos: positions[idx] ?? [0, 0, 0],
        text: s.text,
        color: s.color,
    }));

    return (
        <group>
            {signs.map((s, idx) => (
                <group key={idx} position={s.pos as [number, number, number]} rotation={[0, s.pos[0] > 10 ? -Math.PI / 2 : 0, 0]}>
                    <mesh position={[0, 3, 0]}>
                        <cylinderGeometry args={[0.1, 0.1, 6]} />
                        <meshStandardMaterial color="#1a1a1a" metalness={0.8} />
                    </mesh>
                    <mesh position={[0, 6, 0]}>
                        <boxGeometry args={[4, 2, 0.2]} />
                        <meshStandardMaterial color="#0f172a" metalness={0.9} />
                    </mesh>
                    <SignFace text={s.text} color={s.color} />
                </group>
            ))}
        </group>
    );
}

/** Sign face: color wash + the configured text drawn in the sign's color */
function SignFace({ text, color }: { text: string; color: string }) {
    const meshRef = useRef<THREE.Mesh>(null);
    // street-furniture detail: face hides beyond the LOD distance, the sign stays (task 6.2)
    useLodVisible(meshRef);
    const texture = useMemo(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 512, 256);
            ctx.globalAlpha = 1;
            if (text) {
                ctx.fillStyle = color;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                let size = 56;
                ctx.font = `bold ${size}px sans-serif`;
                while (ctx.measureText(text).width > 460 && size > 20) {
                    size -= 4;
                    ctx.font = `bold ${size}px sans-serif`;
                }
                ctx.fillText(text, 256, 128);
            }
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }, [text, color]);

    // GPU resource created outside JSX — dispose on unmount/text change (task 6.6)
    useEffect(() => () => texture.dispose(), [texture]);

    return (
        <mesh position={[0, 6, 0.15]} ref={meshRef}>
            <planeGeometry args={[3.8, 1.8]} />
            <meshBasicMaterial map={texture} transparent depthWrite={false} />
        </mesh>
    );
}
