"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Stars, Environment, ContactShadows } from "@react-three/drei";
import { Suspense } from "react";
import CinematicCamera from "./CinematicCamera";

interface SceneContainerProps {
    children: React.ReactNode;
}

export default function Scene({ children }: SceneContainerProps) {
    return (
        <div className="fixed inset-0 z-0">
            <Canvas
                shadows
                gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
                dpr={[1, 1.5]}
            >
                <Suspense fallback={null}>
                    <PerspectiveCamera makeDefault position={[50, 50, 50]} fov={50} />
                    <CinematicCamera />
                    <OrbitControls
                        enablePan={false}
                        enableZoom={false}
                        maxPolarAngle={Math.PI / 2.1}
                        minDistance={10}
                        maxDistance={200}
                    />

                    <ambientLight intensity={0.2} />
                    <pointLight position={[100, 100, 100]} intensity={1.5} castShadow />
                    <spotLight
                        position={[0, 100, 0]}
                        angle={0.3}
                        penumbra={1}
                        intensity={2}
                        castShadow
                        shadow-mapSize={[1024, 1024]}
                    />

                    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                    <Environment preset="city" />

                    {children}

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
