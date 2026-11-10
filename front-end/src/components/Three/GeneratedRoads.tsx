"use client";

import { useMemo } from "react";
import { Instances, Instance } from "@react-three/drei";
import { generateRoads, generateStreetFurniture, RoadSegment } from "@/city/roads";
import { defaultProfile } from "@/config/city";

interface Strip {
    from: [number, number];
    to: [number, number];
    width: number;
}

interface Placed {
    position: [number, number, number];
    args: [number, number, number];
}

/** Center + box args for a road/sidewalk strip; y is the box center height */
function stripOf(r: Strip, y: number, thickness: number, width: number): Placed {
    const horizontal = r.from[1] === r.to[1];
    const len = Math.abs(horizontal ? r.to[0] - r.from[0] : r.to[1] - r.from[1]);
    return {
        position: [(r.from[0] + r.to[0]) / 2, y, (r.from[1] + r.to[1]) / 2],
        args: horizontal ? [len, thickness, width] : [width, thickness, len],
    };
}

// Stacked top faces so overlapping strips (same-line roads, sidewalks crossing
// roads, zebra bars) never sit coplanar and z-fight
const Y = { primary: 0.045, secondary: 0.05, local: 0.055, sidewalk: 0.06, dash: 0.13, zebra: 0.17 };

/**
 * Generated road surface: hierarchy-colored strips, lane dashes on primary and
 * secondary roads, sidewalks along both edges, and zebra bars at every
 * crossing (city-infrastructure spec).
 */
export default function GeneratedRoads() {
    const { roads, sidewalks, crosswalks } = useMemo(() => {
        const roads = generateRoads(defaultProfile);
        const { sidewalks, crosswalks } = generateStreetFurniture(roads);
        return { roads, sidewalks, crosswalks };
    }, []);

    const surfaces = useMemo(
        () => roads.map((r) => ({ ...stripOf(r, Y[r.class], 0.1, r.width), cls: r.class })),
        [roads]
    );

    // Double lane dashes every 4 units on primary/secondary roads only
    const dashes = useMemo(() => {
        const out: { pos: [number, number, number]; horizontal: boolean }[] = [];
        for (const r of roads) {
            if (r.class === "local") continue;
            const horizontal = r.from[1] === r.to[1];
            const span = horizontal ? r.to[0] - r.from[0] : r.to[1] - r.from[1];
            const dir = Math.sign(span);
            const len = Math.abs(span);
            const off = r.width / 4;
            for (let t = 2; t < len - 1; t += 4) {
                const x = horizontal ? r.from[0] + dir * t : r.from[0];
                const z = horizontal ? r.from[1] : r.from[1] + dir * t;
                if (horizontal) {
                    out.push({ pos: [x, Y.dash, z + off], horizontal: true });
                    out.push({ pos: [x, Y.dash, z - off], horizontal: true });
                } else {
                    out.push({ pos: [x + off, Y.dash, z], horizontal: false });
                    out.push({ pos: [x - off, Y.dash, z], horizontal: false });
                }
            }
        }
        return out;
    }, [roads]);

    const walks = useMemo(
        () => sidewalks.map((s) => stripOf(s as RoadSegment, Y.sidewalk, 0.12, s.width)),
        [sidewalks]
    );

    // Zebra bars: per crossing, two bands across each road line just outside
    // the crossing road's edge (bar length = the road being crossed)
    const zebra = useMemo(() => {
        const bars: { pos: [number, number, number]; scale: [number, number, number] }[] = [];
        for (const c of crosswalks) {
            let hW = 0;
            let vW = 0;
            for (const r of roads) {
                const horizontal = r.from[1] === r.to[1];
                const inX = c.x >= Math.min(r.from[0], r.to[0]) && c.x <= Math.max(r.from[0], r.to[0]);
                const inZ = c.z >= Math.min(r.from[1], r.to[1]) && c.z <= Math.max(r.from[1], r.to[1]);
                if (horizontal && r.from[1] === c.z && inX) hW = Math.max(hW, r.width);
                if (!horizontal && r.from[0] === c.x && inZ) vW = Math.max(vW, r.width);
            }
            if (hW > 0) {
                for (const side of [-1, 1]) {
                    const bx = c.x + side * (vW / 2 + 1.5);
                    for (let i = 0; i < 4; i++) {
                        bars.push({ pos: [bx + (i - 1.5) * 0.7, Y.zebra, c.z], scale: [0.28, 0.04, hW * 0.75] });
                    }
                }
            }
            if (vW > 0) {
                for (const side of [-1, 1]) {
                    const bz = c.z + side * (hW / 2 + 1.5);
                    for (let i = 0; i < 4; i++) {
                        bars.push({ pos: [c.x, Y.zebra, bz + (i - 1.5) * 0.7], scale: [vW * 0.75, 0.04, 0.28] });
                    }
                }
            }
        }
        return bars;
    }, [crosswalks, roads]);

    const hDashes = dashes.filter((d) => d.horizontal);
    const vDashes = dashes.filter((d) => !d.horizontal);

    return (
        <group>
            {/* instanced surfaces/sidewalks: one draw each instead of one per strip (task 6.1) */}
            <Instances range={surfaces.length} receiveShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#0a0a0a" roughness={0.9} metalness={0.1} />
                {surfaces.map((s, i) => (
                    <Instance key={i} position={s.position} scale={s.args} />
                ))}
            </Instances>

            <Instances range={walks.length}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#475569" roughness={0.95} />
                {walks.map((w, i) => (
                    <Instance key={i} position={w.position} scale={w.args} />
                ))}
            </Instances>

            <Instances range={hDashes.length}>
                <boxGeometry args={[2, 0.04, 0.2]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
                {hDashes.map((d, i) => (
                    <Instance key={i} position={d.pos} />
                ))}
            </Instances>
            <Instances range={vDashes.length}>
                <boxGeometry args={[0.2, 0.04, 2]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
                {vDashes.map((d, i) => (
                    <Instance key={i} position={d.pos} />
                ))}
            </Instances>

            <Instances range={zebra.length}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color="#e2e8f0" transparent opacity={0.55} />
                {zebra.map((b, i) => (
                    <Instance key={i} position={b.pos} scale={b.scale} />
                ))}
            </Instances>
        </group>
    );
}
