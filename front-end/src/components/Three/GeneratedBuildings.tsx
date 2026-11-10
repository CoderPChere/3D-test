"use client";

import { useMemo } from "react";
import { Instances, Instance } from "@react-three/drei";
import * as THREE from "three";
import { BuildingRecord } from "@/city/generate";
import { BuildingStyle, defaultProfile } from "@/config/city";

/** Shared material color per building style — variety also comes from height/footprint */
const STYLE_COLOR: Record<BuildingStyle, string> = {
    highrise: "#0a0a0f",
    midrise: "#0d0f12",
    lowrise: "#101210",
    campus: "#0f1218",
    park: "#052e16",
};

// Profile visual emphasis (task 7.2): buildings in emphasized districts get a
// cyan emissive wash; with dimOthers, every other district is darkened instead
const EMPHASIZED = new Set(defaultProfile.emphasis.districts);
const DIM_OTHERS = defaultProfile.emphasis.dimOthers;
const HIGHLIGHT_EMISSIVE = "#22d3ee";
const HIGHLIGHT_INTENSITY = 0.5;

/** Darken a style color toward the ground so non-emphasized districts recede */
function dimmed(hex: string): string {
    return `#${new THREE.Color(hex).multiplyScalar(0.4).getHexString()}`;
}

/**
 * Instanced render layer for generator output: one InstancedMesh per
 * (building style × emphasis state) with shared unit-box geometry and
 * per-instance position/scale — replaces the per-building components.
 */
export default function GeneratedBuildings({ buildings }: { buildings: BuildingRecord[] }) {
    const byType = useMemo(() => {
        const groups = new Map<string, { style: BuildingStyle; emph: boolean; list: BuildingRecord[] }>();
        for (const b of buildings) {
            const emph = EMPHASIZED.has(b.district);
            const key = `${b.type}|${emph}`;
            const g = groups.get(key);
            if (g) g.list.push(b);
            else groups.set(key, { style: b.type, emph, list: [b] });
        }
        return [...groups.entries()];
    }, [buildings]);

    return (
        <>
            {byType.map(([key, { style, emph, list }]) => (
                <Instances key={key} range={list.length} castShadow receiveShadow>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial
                        color={emph || !DIM_OTHERS ? STYLE_COLOR[style] : dimmed(STYLE_COLOR[style])}
                        emissive={emph ? HIGHLIGHT_EMISSIVE : "#000000"}
                        emissiveIntensity={emph ? HIGHLIGHT_INTENSITY : 0}
                        metalness={0.1}
                        roughness={0.9}
                    />
                    {list.map((b, i) => (
                        <Instance
                            key={i}
                            position={[b.x, b.height / 2, b.z]}
                            scale={[b.footprint[0], b.height, b.footprint[1]]}
                        />
                    ))}
                </Instances>
            ))}
        </>
    );
}
