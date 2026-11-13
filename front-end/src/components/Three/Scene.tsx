"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, Grid, OrbitControls, PerspectiveCamera, Stars } from "@react-three/drei";
import { useAppStore } from "@/lib/state/appStore";
import { useSettingsStore } from "@/lib/state/settingsStore";
import { QUALITY } from "@/lib/render/quality";

interface SceneContainerProps {
    children: React.ReactNode;
}

/**
 * Workspace viewport scene: orbit/pan/zoom camera (no scroll linkage),
 * one shadow-casting directional light, bounded contact shadows,
 * fully offline (no asset fetches). DPR/shadows follow the quality tier.
 */
export default function Scene({ children }: SceneContainerProps) {
    const controlsEnabled = useAppStore((s) => s.controlsEnabled);
    const quality = useSettingsStore((s) => s.quality);
    const q = QUALITY[quality];

    return (
        <div className="absolute inset-0 z-0">
            <Canvas
                shadows={q.shadows}
                gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
                dpr={q.dpr}
            >
                <PerspectiveCamera makeDefault position={[70, 60, 70]} fov={50} />
                <OrbitControls
                    makeDefault
                    enabled={controlsEnabled}
                    enablePan
                    enableZoom
                    enableRotate
                    target={[0, 0, 0]}
                    maxPolarAngle={Math.PI / 2.1}
                    minDistance={10}
                    maxDistance={250}
                />

                <ambientLight intensity={0.35} />
                <hemisphereLight args={["#38bdf8", "#020617", 0.4]} />
                <directionalLight
                    position={[80, 120, 60]}
                    intensity={1.6}
                    castShadow={q.shadows}
                    shadow-mapSize={[1024, 1024]}
                    shadow-camera-left={-120}
                    shadow-camera-right={120}
                    shadow-camera-top={120}
                    shadow-camera-bottom={-120}
                    shadow-camera-far={400}
                />

                <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
                <Grid
                    position={[0, 0.01, 0]}
                    args={[300, 300]}
                    cellSize={4}
                    cellColor="#1e293b"
                    sectionSize={24}
                    sectionColor="#334155"
                    fadeDistance={280}
                    infiniteGrid={false}
                />
                {q.shadows && (
                    <ContactShadows
                        position={[0, 0.02, 0]}
                        scale={220}
                        blur={2.5}
                        far={20}
                        opacity={0.55}
                        resolution={512}
                    />
                )}

                {children}
            </Canvas>
        </div>
    );
}
