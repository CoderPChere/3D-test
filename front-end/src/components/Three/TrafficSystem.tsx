"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Box, Html } from "@react-three/drei";
import { trafficState } from "./City";

const COLORS = ["#0ea5e9", "#22d3ee", "#3b82f6", "#6366f1", "#a855f7", "#ffffff", "#f59e0b"];

// Global registry of all vehicle positions for collision detection
export const vehiclePositions: { [id: string]: { laneId: string, progress: number, direction: number } } = {};

export default function TrafficSystem() {
    const cars = useMemo(() => {
        const result = [];
        let idCounter = 0;
        const roadIndices = [0, 1, 2];
        const directions = [1, -1];
        const lanes = [1, 2]; // Inner lane (1) and Outer lane (2)
        
        for (const roadIndex of roadIndices) {
            for (const isHorizontal of [true, false]) {
                for (const direction of directions) {
                    for (const lane of lanes) {
                        // 1 car per lane
                        for (let i = 0; i < 1; i++) {
                            const offset = (i * 0.5) + (roadIndex * 0.33) + (isHorizontal ? 0 : 0.16) + (direction === 1 ? 0 : 0.08) + (lane * 0.1);
                            
                            const laneOffset = direction * (lane === 1 ? 1.0 : 3.0);
                            const fixedPos = [-36, 0, 36][roadIndex];
                            
                            const laneId = `${isHorizontal ? 'H' : 'V'}-${fixedPos}-${laneOffset}`;
                            
                            result.push({
                                id: (idCounter++).toString(),
                                // Reduced base speed by another 50%
                                baseSpeed: 0.03 + Math.random() * 0.01,  
                                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                                offset: offset,
                                roadIndex: roadIndex,
                                isHorizontal: isHorizontal,
                                direction: direction,
                                laneOffset: laneOffset,
                                laneId: laneId,
                                // Highlight roughly 30% of cars
                                isHighlighted: Math.random() < 0.3 
                            });
                        }
                    }
                }
            }
        }
        return result;
    }, []);

    return (
        <group>
            {cars.map((car) => (
                <Car key={car.id} data={car} />
            ))}
        </group>
    );
}

function Car({ data }: { data: any }) {
    const meshRef = useRef<THREE.Group>(null!);
    const [hovered, setHovered] = useState(false);
    const [scanned, setScanned] = useState(false);
    
    // Convert initial offset to world units (each loop is range * 2)
    const range = 60;
    const progressRef = useRef(data.offset * range * 2); 
    const currentSpeedRef = useRef(0);

    useFrame((state, delta) => {
        const roadPositions = [-36, 0, 36];
        const fixedPos = roadPositions[data.roadIndex];

        // Current actual mathematical position along the road (-60 to 60)
        let currentPos = (progressRef.current % (range * 2)) - range;
        if (currentPos < -range) currentPos += range * 2; 

        // 1. Calculate base desired speed
        let targetSpeed = data.baseSpeed * 200 * delta; 
        
        // 2. Traffic Light Logic
        const c = trafficState.cycle;
        let isRed = data.isHorizontal ? (c >= 40) : (c < 50 || c >= 90);

        if (isRed) {
            let distToIntersection = Infinity;
            for (let inter of roadPositions) {
                const diff = (inter - currentPos) * data.direction;
                if (diff > 2 && diff < 12) {
                    distToIntersection = diff;
                }
            }
            if (distToIntersection < Infinity) {
                targetSpeed *= Math.max(0, (distToIntersection - 2) / 6);
            }
        }

        // 3. Collision avoidance (Queueing AI)
        // REMOVED: Cars will no longer stop for each other

        // Apply smooth acceleration/deceleration
        currentSpeedRef.current = THREE.MathUtils.lerp(currentSpeedRef.current, targetSpeed, 0.1);
        progressRef.current += currentSpeedRef.current;
        
        // Register our position for others to check
        let myPosForOthers = (progressRef.current % (range * 2)) - range;
        if (myPosForOthers < -range) myPosForOthers += range * 2;
        
        vehiclePositions[data.id] = {
            laneId: data.laneId,
            progress: myPosForOthers,
            direction: data.direction
        };

        // Render position calculation
        let rawProgress = (progressRef.current % (range * 2));
        let progress = rawProgress - range;
        if (data.direction < 0) {
           progress = range - rawProgress;
        }

        let x = 0, z = 0;
        if (data.isHorizontal) {
            x = progress;
            z = fixedPos + data.laneOffset;
            meshRef.current.rotation.y = data.direction > 0 ? 0 : Math.PI;
        } else {
            z = progress;
            x = fixedPos - data.laneOffset;
            meshRef.current.rotation.y = data.direction > 0 ? -Math.PI / 2 : Math.PI / 2;
        }

        meshRef.current.position.set(x, 0, z);

        // Random scanning trigger
        if (Math.sin(state.clock.getElapsedTime() * 5 + data.offset) > 0.999 && !scanned) {
            setScanned(true);
            setTimeout(() => setScanned(false), 2000);
        }
    });

    // Clean up registry on unmount
    useMemo(() => {
        return () => {
            delete vehiclePositions[data.id];
        }
    }, [data.id]);

    return (
        <group ref={meshRef}>
            <group
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                {/* Chassis */}
                <Box args={[2.5, 0.5, 1.2]} position={[0, 0.4, 0]} castShadow>
                     <meshStandardMaterial color={hovered ? "#fff" : data.color} metalness={0.6} roughness={0.2} />
                </Box>
                {/* Cabin */}
                <Box args={[1.2, 0.4, 1.0]} position={[-0.2, 0.85, 0]} castShadow>
                     <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
                </Box>
                
                {/* Wheels */}
                {/* Front Left */}
                <mesh position={[0.8, 0.2, 0.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.2, 0.2, 0.2, 16]} />
                    <meshStandardMaterial color="#111" roughness={0.9} />
                </mesh>
                {/* Front Right */}
                <mesh position={[0.8, 0.2, -0.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.2, 0.2, 0.2, 16]} />
                    <meshStandardMaterial color="#111" roughness={0.9} />
                </mesh>
                {/* Rear Left */}
                <mesh position={[-0.8, 0.2, 0.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.2, 0.2, 0.2, 16]} />
                    <meshStandardMaterial color="#111" roughness={0.9} />
                </mesh>
                {/* Rear Right */}
                <mesh position={[-0.8, 0.2, -0.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.2, 0.2, 0.2, 16]} />
                    <meshStandardMaterial color="#111" roughness={0.9} />
                </mesh>

                {/* Headlights */}
                <mesh position={[1.26, 0.5, 0.4]}>
                    <boxGeometry args={[0.05, 0.15, 0.2]} />
                    <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
                </mesh>
                <mesh position={[1.26, 0.5, -0.4]}>
                    <boxGeometry args={[0.05, 0.15, 0.2]} />
                    <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
                </mesh>

                {/* Taillights */}
                <mesh position={[-1.26, 0.5, 0.4]}>
                    <boxGeometry args={[0.05, 0.15, 0.2]} />
                    <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
                </mesh>
                <mesh position={[-1.26, 0.5, -0.4]}>
                    <boxGeometry args={[0.05, 0.15, 0.2]} />
                    <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
                </mesh>

                {/* Scanning Beam Visual */}
                {scanned && (
                    <mesh position={[0, 5, 0]}>
                        <cylinderGeometry args={[0.1, 2, 10, 32]} />
                        <meshStandardMaterial
                            color={data.color}
                            transparent
                            opacity={0.3}
                            emissive={data.color}
                            emissiveIntensity={2}
                        />
                    </mesh>
                )}

                {/* Floating Data if hovered */}
                {hovered && (
                    <Html distanceFactor={15}>
                        <div className="glass p-2 rounded border border-neon-cyan whitespace-nowrap bg-black/50 pointer-events-none">
                            <p className="text-[8px] uppercase text-slate-200 font-mono">Scan ID: {Math.floor(Math.random() * 10000)}</p>
                            <p className="text-[10px] font-bold text-neon-cyan font-mono tracking-tighter">SPD: {Math.floor(data.speed * 400)} KM/H</p>
                        </div>
                    </Html>
                )}
            </group>
        </group>
    );
}
