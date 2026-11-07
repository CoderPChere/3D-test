"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Box, Plane, Instances, Instance } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import TrafficSystem from "./TrafficSystem";

// Global traffic light state for cars to read
export const trafficState = { cycle: 0 }; // 0 to 100, where 0-40 is Green Horizontal, 50-90 is Green Vertical

export default function City() {
    const gridSize = 10;
    const spacing = 12;

    // Generate buildings
    const buildings = useMemo(() => {
        const data = [];
        for (let x = -gridSize / 2; x < gridSize / 2; x++) {
            for (let z = -gridSize / 2; z < gridSize / 2; z++) {
                // Leave space for roads
                if (Math.abs(x) % 3 === 0 || Math.abs(z) % 3 === 0) continue;

                const height = 10 + Math.random() * 30;
                data.push({
                    position: [x * spacing, height / 2, z * spacing],
                    args: [8, height, 8],
                    id: `b-${x}-${z}`,
                });
            }
        }
        return data;
    }, []);

    // Generate roads
    const roads = useMemo(() => {
        const data: any[] = [];
        const roadPositions = [-36, 0, 36]; // Exact spaces where buildings are missing
        roadPositions.forEach((pos, i) => {
            const length = gridSize * spacing; // 120
            // Horizontal
            data.push({
                position: [0, 0.05, pos],
                args: [length, 0.1, 8],
                id: `rh-${i}`,
            });
            // Vertical
            data.push({
                position: [pos, 0.05, 0],
                args: [8, 0.1, length],
                id: `rv-${i}`,
            });
        });
        return data;
    }, []);

    // Traffic light cycle timer
    useEffect(() => {
        const interval = setInterval(() => {
            trafficState.cycle = (trafficState.cycle + 1) % 100;
        }, 100); // 10s full cycle
        return () => clearInterval(interval);
    }, []);

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

            {/* Buildings */}
            {buildings.map((b) => (
                <Building key={b.id} {...b} />
            ))}

            {/* Roads & Instanced Dashes */}
            <RoadsWithDashes roads={roads} />

            {/* Dynamic Traffic */}
            <TrafficSystem />

            {/* Building Windows - Instanced for maximum performance */}
            <BuildingWindows buildings={buildings} />

            {/* CCTV Camera Points */}
            <CCTVPoints />

            {/* Street Lights */}
            <StreetLights />

            {/* Road Signs */}
            <RoadSigns />

            {/* Traffic Lights */}
            <TrafficLights />
        </group>
    );
}

function Building({ position, args }: any) {
    return (
        <group position={position}>
            {/* Main Building Block */}
            <Box
                args={args}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial
                    color="#080808"
                    metalness={0.1}
                    roughness={0.9}
                />
            </Box>
        </group>
    );
}

function BuildingWindows({ buildings }: { buildings: any[] }) {
    const windows = useMemo(() => {
        const allWindows: any[] = [];
        buildings.forEach(b => {
            const w = b.args[0];
            const h = b.args[1];
            const d = b.args[2];
            const floors = Math.floor(h / 3);
            const winPerRowX = Math.floor(w / 2);
            const winPerRowZ = Math.floor(d / 2);

            for (let y = 1; y < floors; y++) {
                for (let x = 0; x < winPerRowX; x++) {
                    const isLit1 = Math.random() > 0.8;
                    const isLit2 = Math.random() > 0.8;
                    const posX = -w/2 + (w / winPerRowX) * (x + 0.5);
                    const posY = -h/2 + y * 3;
                    
                    if (isLit1) {
                        allWindows.push({
                            pos: [b.position[0] + posX, b.position[1] + posY, b.position[2] + d/2 + 0.01],
                            args: [1, 1.5, 0.05],
                        });
                    }
                    if (isLit2) {
                        allWindows.push({
                            pos: [b.position[0] + posX, b.position[1] + posY, b.position[2] - d/2 - 0.01],
                            args: [1, 1.5, 0.05],
                        });
                    }
                }
                for (let z = 0; z < winPerRowZ; z++) {
                    const isLit1 = Math.random() > 0.8;
                    const isLit2 = Math.random() > 0.8;
                    const posZ = -d/2 + (d / winPerRowZ) * (z + 0.5);
                    const posY = -h/2 + y * 3;
                    
                    if (isLit1) {
                        allWindows.push({
                            pos: [b.position[0] + w/2 + 0.01, b.position[1] + posY, b.position[2] + posZ],
                            args: [0.05, 1.5, 1],
                        });
                    }
                    if (isLit2) {
                        allWindows.push({
                            pos: [b.position[0] - w/2 - 0.01, b.position[1] + posY, b.position[2] + posZ],
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

    return (
        <group>
            <Instances range={frontBack.length}>
                <boxGeometry args={[1, 1.5, 0.05]} />
                <meshBasicMaterial color="#eac668" toneMapped={false} />
                {frontBack.map((w, i) => (
                    <Instance 
                        key={i} 
                        position={w.pos as [number, number, number]} 
                    />
                ))}
            </Instances>
            <Instances range={leftRight.length}>
                <boxGeometry args={[0.05, 1.5, 1]} />
                <meshBasicMaterial color="#eac668" toneMapped={false} />
                {leftRight.map((w, i) => (
                    <Instance 
                        key={i} 
                        position={w.pos as [number, number, number]} 
                    />
                ))}
            </Instances>
        </group>
    );
}


function RoadsWithDashes({ roads }: { roads: any[] }) {
    const allDashes = useMemo(() => {
        const dashes: any[] = [];
        roads.forEach(r => {
            const isHorizontal = r.args[0] > r.args[2];
            const length = isHorizontal ? r.args[0] : r.args[2];
            for (let i = -length / 2 + 2; i < length / 2; i += 4) {
                if (isHorizontal) {
                    dashes.push({ pos: [r.position[0] + i, 0.12, r.position[2] + 2], args: [2, 0.1, 0.2] });
                    dashes.push({ pos: [r.position[0] + i, 0.12, r.position[2] - 2], args: [2, 0.1, 0.2] });
                } else {
                    dashes.push({ pos: [r.position[0] + 2, 0.12, r.position[2] + i], args: [0.2, 0.1, 2] });
                    dashes.push({ pos: [r.position[0] - 2, 0.12, r.position[2] + i], args: [0.2, 0.1, 2] });
                }
            }
        });
        return dashes;
    }, [roads]);

    const hDashes = allDashes.filter(d => d.args[0] === 2);
    const vDashes = allDashes.filter(d => d.args[0] === 0.2);

    return (
        <group>
            {roads.map(r => (
                <Box key={r.id} position={r.position} args={r.args} receiveShadow>
                    <meshStandardMaterial color="#0a0a0a" roughness={0.9} metalness={0.1} />
                </Box>
            ))}
            
            <Instances range={hDashes.length}>
                <boxGeometry args={[2, 0.05, 0.2]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
                {hDashes.map((d, i) => (
                    <Instance key={i} position={d.pos as [number, number, number]} />
                ))}
            </Instances>
            <Instances range={vDashes.length}>
                <boxGeometry args={[0.2, 0.05, 2]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
                {vDashes.map((d, i) => (
                    <Instance key={i} position={d.pos as [number, number, number]} />
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
                <group key={i} position={c.pos}>
                    <mesh castShadow>
                        <sphereGeometry args={[0.8, 16, 16]} />
                        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
                    </mesh>
                    <pointLight color="#ef4444" intensity={1} distance={10} />
                    {/* Holographic Ring */}
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[1.5, 0.05, 16, 32]} />
                        <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={1} transparent opacity={0.5} />
                    </mesh>
                </group>
            ))}
        </>
    );
}

function StreetLights() {
    const roadPositions = [-36, 0, 36];
    
    const lightsData = useMemo(() => {
        const data = [];
        for (let pos of roadPositions) {
            for (let i = -50; i <= 50; i += 20) {
                if (Math.abs(i) !== 36 && i !== 0) {
                    data.push({ pos: [i, 0, pos - 4.5], rot: 0 });
                    data.push({ pos: [i, 0, pos + 4.5], rot: Math.PI });
                    data.push({ pos: [pos - 4.5, 0, i], rot: -Math.PI / 2 });
                    data.push({ pos: [pos + 4.5, 0, i], rot: Math.PI / 2 });
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
                <meshStandardMaterial color="#ffffff" emissive="#fef08a" emissiveIntensity={2} />
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

function TrafficLights() {
    const roadPositions = [-36, 0, 36];
    const intersections = [];
    
    for (let x of roadPositions) {
        for (let z of roadPositions) {
            intersections.push([x, z]);
        }
    }

    return (
        <group>
            {intersections.map(([x, z], idx) => (
                <group key={idx} position={[x, 0, z]}>
                    <TrafficLightPole position={[-5, 0, 5]} rotation={[0, Math.PI / 4, 0]} isHorizontal={true} />
                    <TrafficLightPole position={[5, 0, -5]} rotation={[0, -Math.PI * 0.75, 0]} isHorizontal={true} />
                    <TrafficLightPole position={[-5, 0, -5]} rotation={[0, -Math.PI / 4, 0]} isHorizontal={false} />
                    <TrafficLightPole position={[5, 0, 5]} rotation={[0, Math.PI * 0.75, 0]} isHorizontal={false} />
                </group>
            ))}
        </group>
    );
}

function TrafficLightPole({ position, rotation, isHorizontal }: any) {
    const [color, setColor] = useState("#22c55e"); // Green default

    // React to global traffic cycle using useFrame for efficiency
    useFrame(() => {
        // cycle: 0-40 (H Green, V Red), 40-50 (H Yellow, V Red), 50-90 (H Red, V Green), 90-100 (H Red, V Yellow)
        const c = trafficState.cycle;
        let newColor = "#22c55e"; // Green default
        
        if (isHorizontal) {
            if (c < 40) newColor = "#22c55e"; // Green
            else if (c < 50) newColor = "#eab308"; // Yellow
            else newColor = "#ef4444"; // Red
        } else {
            if (c >= 50 && c < 90) newColor = "#22c55e"; // Green
            else if (c >= 90) newColor = "#eab308"; // Yellow
            else newColor = "#ef4444"; // Red
        }
        
        if (newColor !== color) {
            setColor(newColor);
        }
    });

    return (
        <group position={position} rotation={rotation}>
            <mesh position={[0, 2.5, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 5]} />
                <meshStandardMaterial color="#111" metalness={0.8} />
            </mesh>
            <group position={[0, 5, 0.5]}>
                <mesh>
                    <boxGeometry args={[0.5, 1.5, 0.5]} />
                    <meshStandardMaterial color="#111" metalness={0.9} />
                </mesh>
                {/* Red */}
                <mesh position={[0, 0.5, 0.26]}>
                    <circleGeometry args={[0.15, 16]} />
                    <meshStandardMaterial color={color === "#ef4444" ? "#ef4444" : "#450a0a"} emissive={color === "#ef4444" ? "#ef4444" : "#000"} emissiveIntensity={color === "#ef4444" ? 2 : 0} />
                </mesh>
                {/* Yellow */}
                <mesh position={[0, 0, 0.26]}>
                    <circleGeometry args={[0.15, 16]} />
                    <meshStandardMaterial color={color === "#eab308" ? "#eab308" : "#422006"} emissive={color === "#eab308" ? "#eab308" : "#000"} emissiveIntensity={color === "#eab308" ? 2 : 0} />
                </mesh>
                    <mesh position={[0, -0.5, 0.26]}>
                        <circleGeometry args={[0.15, 16]} />
                        <meshStandardMaterial color={color === "#22c55e" ? "#22c55e" : "#052e16"} emissive={color === "#22c55e" ? "#22c55e" : "#000"} emissiveIntensity={color === "#22c55e" ? 2 : 0} />
                    </mesh>
                </group>
            </group>
        );
    }
    
function RoadSigns() {
    const signs = [
        { pos: [-15, 0, -38], text: "SECTOR 07", color: "#0ea5e9" },
        { pos: [15, 0, 38], text: "SPEED LIMIT: 60", color: "#ef4444" },
        { pos: [38, 0, -15], text: "AI PATROL", color: "#8b5cf6" },
        { pos: [-38, 0, 15], text: "NEURAL NET ACTIVE", color: "#22c55e" },
    ];

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
                    <mesh position={[0, 6, 0.15]}>
                        <planeGeometry args={[3.8, 1.8]} />
                        <meshBasicMaterial color={s.color} transparent opacity={0.2} />
                    </mesh>
                </group>
            ))}
        </group>
    );
}
