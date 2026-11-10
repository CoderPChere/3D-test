"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, ContactShadows } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import CameraRig from "./CameraRig";
import EnvironmentRig from "./EnvironmentRig";
import { landmarkSelection } from "@/landmarks/store";
import { QUALITY, clampDpr, quality, type QualityTier } from "@/config/quality";

interface SceneContainerProps {
    children: React.ReactNode;
}

/** True when the browser can create a WebGL context (task 6.7) */
function webglAvailable(): boolean {
    try {
        const c = document.createElement("canvas");
        return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
        return false;
    }
}

/**
 * Toggle the renderer shadow map — the shadow define is baked into compiled
 * programs, so materials recompile once per toggle.
 * Module scope on purpose: react-hooks/immutability forbids writing to a
 * hook-returned value inside the component.
 */
function setShadowEnabled(gl: THREE.WebGLRenderer, scene: THREE.Scene, on: boolean) {
    gl.shadowMap.enabled = on;
    scene.traverse((o) => {
        const m = (o as THREE.Mesh).material;
        if (!m) return;
        if (Array.isArray(m)) m.forEach((x) => (x.needsUpdate = true));
        else m.needsUpdate = true;
    });
}

/**
 * Task 6.4: applies tier pixel-ratio bounds and the shadow switch on tier
 * change, then adapts the pixel ratio within those bounds from measured
 * frame times — refs only, so the loop never renders React.
 */
function AdaptiveDpr() {
    const gl = useThree((s) => s.gl);
    const scene = useThree((s) => s.scene);
    const slow = useRef(0);
    const fast = useRef(0);
    const winTime = useRef(0);
    const winFrames = useRef(0);

    const apply = useCallback((tier: QualityTier) => {
        const q = QUALITY[tier];
        gl.setPixelRatio(clampDpr(gl.getPixelRatio(), q.dprMin, q.dprMax));
        if (gl.shadowMap.enabled !== q.shadows) setShadowEnabled(gl, scene, q.shadows);
    }, [gl, scene]);

    useEffect(() => {
        apply(quality.get());
        return quality.subscribe(() => apply(quality.get()));
    }, [apply]);

    useFrame((_, dt) => {
        const q = QUALITY[quality.get()];
        winTime.current += dt;
        winFrames.current++;
        if (winTime.current < 1) return;
        const avgMs = (winTime.current / winFrames.current) * 1000;
        winTime.current = 0;
        winFrames.current = 0;
        if (avgMs > 33) {
            slow.current++;
            fast.current = 0;
        } else if (avgMs < 20) {
            fast.current++;
            slow.current = 0;
        } else {
            slow.current = 0;
            fast.current = 0;
        }
        if (slow.current < 3 && fast.current < 3) return;
        const cur = gl.getPixelRatio();
        const next = clampDpr(cur + (slow.current >= 3 ? -0.1 : 0.1), q.dprMin, q.dprMax);
        if (next !== cur) gl.setPixelRatio(next);
        slow.current = 0;
        fast.current = 0;
    });

    return null;
}

export default function Scene({ children }: SceneContainerProps) {
    // detect after hydration so server and first client render match; the
    // Canvas mounts only once WebGL is confirmed, so R3F never crashes
    const [support, setSupport] = useState<"pending" | "ok" | "fail">("pending");
    // defer one frame: keeps server/client render identical and avoids a
    // cascading synchronous setState in the effect body
    useEffect(() => {
        const id = requestAnimationFrame(() => setSupport(webglAvailable() ? "ok" : "fail"));
        return () => cancelAnimationFrame(id);
    }, []);

    if (support === "fail") {
        return (
            <div
                className="fixed inset-0 z-0 flex items-center justify-center bg-slate-950 px-6 text-center"
                role="status"
            >
                <div>
                    <p className="text-lg font-semibold text-slate-200">3D rendering unavailable</p>
                    <p className="mt-2 max-w-md text-sm text-slate-400">
                        WebGL is not supported or is disabled in this browser. The rest of
                        CITYFLUXY works without the 3D scene.
                    </p>
                </div>
            </div>
        );
    }
    if (support === "pending") return <div className="fixed inset-0 z-0" />;

    return (
        <div className="fixed inset-0 z-0">
            <Canvas
                shadows
                gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
                dpr={[0.6, 1.5]}
                // R3F raycasts only objects with pointer handlers, so ground/buildings
                // are never tested — a click there is a miss (deselects the landmark)
                onPointerMissed={() => landmarkSelection.clear()}
            >
                <Suspense fallback={null}>
                    <PerspectiveCamera makeDefault position={[50, 50, 50]} fov={50} />
                    {/* single camera owner: mode state machine + scroll sequence */}
                    <CameraRig />

                    {/* Time-of-day lighting, sky, fog and stars — single owner */}
                    <EnvironmentRig />

                    {/* tier pixel-ratio bounds + adaptive dpr + shadow switch */}
                    <AdaptiveDpr />

                    {children}

                    {/* grounding shadow pass — uses no THREE light, so the directional light remains the only shadow-casting light */}
                    <ContactShadows
                        opacity={0.4}
                        scale={200}
                        blur={2}
                        far={10}
                        resolution={128}
                        color="#000000"
                    />
                </Suspense>
            </Canvas>
        </div>
    );
}
