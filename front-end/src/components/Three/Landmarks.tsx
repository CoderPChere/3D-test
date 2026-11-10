"use client";

import { useEffect, useRef, useState } from "react";
import type { LandmarkPlot } from "@/city/generate";
import { defaultProfile } from "@/config/city";
import { cameraMode, INITIAL_MODE, type CameraMode } from "@/camera/store";
import { landmarkSelection } from "@/landmarks/store";

const HEIGHT = 20;
const WIDTH = 5;

/**
 * Profile landmark registry → interactive meshes (camera-system spec):
 * hover highlight, exclusive selection (via the selection store — the
 * page-layer panel owns the info UI), camera focus through the camera-mode
 * store, and prior-mode restore on deselect.
 */
export default function Landmarks({ plots }: { plots: LandmarkPlot[] }) {
    const [hovered, setHovered] = useState<string | null>(null);
    const [selected, setSelected] = useState<string | null>(null);

    // cursor indicates interactivity while a landmark is under the pointer (spec)
    useEffect(() => {
        document.body.style.cursor = hovered ? "pointer" : "";
        return () => {
            document.body.style.cursor = "";
        };
    }, [hovered]);
    /** mode active before the first selection — restored on deselect */
    const priorMode = useRef<CameraMode | null>(null);
    const selectedRef = useRef<string | null>(null);

    // single place that drives the camera for landmark selection: the mesh
    // click and the panel's close button both go through the store
    useEffect(
        () =>
            landmarkSelection.subscribe(() => {
                const name = landmarkSelection.get();
                const prev = selectedRef.current;
                if (name === prev) return;
                selectedRef.current = name;
                setSelected(name);
                if (name) {
                    if (prev === null) priorMode.current = cameraMode.get().mode;
                    const plot = plots.find((p) => p.name === name);
                    if (plot) {
                        cameraMode.setFocus([plot.x, HEIGHT / 2, plot.z]);
                        cameraMode.setMode("landmark-focus");
                    }
                } else {
                    cameraMode.setMode(priorMode.current ?? INITIAL_MODE);
                    cameraMode.setFocus(null);
                    priorMode.current = null;
                }
            }),
        [plots]
    );

    const emphasized = new Set(defaultProfile.emphasis.landmarks);
    // task 7.2: dimOthers recedes non-emphasized landmarks to near-invisible
    const dimOthers = defaultProfile.emphasis.dimOthers;

    return (
        <group>
            {defaultProfile.landmarks.map((lm) => {
                const plot = plots.find((p) => p.name === lm.name);
                if (!plot) return null; // profile entry without a reserved plot
                const isSel = selected === lm.name;
                const isHov = hovered === lm.name;
                const emph = emphasized.has(lm.name);
                const glow = isSel ? 2 : isHov ? 1.2 : emph ? 0.6 : dimOthers ? 0.05 : 0.3;
                return (
                    <mesh
                        key={lm.name}
                        position={[plot.x, HEIGHT / 2, plot.z]}
                        onPointerOver={(e) => {
                            e.stopPropagation();
                            setHovered(lm.name);
                        }}
                        onPointerOut={() =>
                            setHovered((h) => (h === lm.name ? null : h))
                        }
                        onClick={(e) => {
                            e.stopPropagation();
                            // exclusive: clicking the selected one deselects
                            if (selectedRef.current === lm.name) landmarkSelection.clear();
                            else landmarkSelection.select(lm.name);
                        }}
                    >
                        <boxGeometry args={[WIDTH, HEIGHT, WIDTH]} />
                        <meshStandardMaterial
                            color="#0a1622"
                            emissive="#22d3ee"
                            emissiveIntensity={glow}
                            metalness={0.4}
                            roughness={0.3}
                        />
                    </mesh>
                );
            })}
        </group>
    );
}
