"use client";

import { useMemo } from "react";
import { Instances, Instance } from "@react-three/drei";
import { createSeededRandom } from "@/city/random";
import { defaultProfile } from "@/config/city";

/** Count of silhouette towers in the horizon ring */
const RING_COUNT = 120;
/** Ring geometry: radius band and tower footprint beyond the modeled extent */
const RING_RADIUS = 110;
const RING_BAND = 25;

/**
 * Distant skyline silhouette ring beyond the modeled area — a band of
 * unlit towers that makes the horizon read as a large city from the
 * overview camera (city-generation spec: distant skyline).
 */
export default function SkylineRing() {
    const towers = useMemo(() => {
        const rng = createSeededRandom(defaultProfile.seed + 2);
        return Array.from({ length: RING_COUNT }, (_, i) => {
            const angle = (i / RING_COUNT) * Math.PI * 2 + rng.next() * 0.05;
            const radius = RING_RADIUS + rng.next() * RING_BAND;
            const height = 15 + rng.next() * 45;
            return {
                pos: [Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius] as [number, number, number],
                scale: [8 + rng.next() * 8, height, 8 + rng.next() * 8] as [number, number, number],
            };
        });
    }, []);

    return (
        <Instances range={towers.length}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#05070d" roughness={1} metalness={0} />
            {towers.map((t, i) => (
                <Instance key={i} position={t.pos} scale={t.scale} />
            ))}
        </Instances>
    );
}
