"use client";

import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { environment } from "../../environment/store";

/**
 * Owns all time-of-day rendering: sky dome, fog, ambient + directional light,
 * star field. One shared frame loop ticks the environment controller and writes
 * its values into the three objects — no other component applies lighting.
 */

const SKY_RADIUS = 500;

const skyVertex = /* glsl */ `
varying vec3 vPos;
void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const skyFragment = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
varying vec3 vPos;
void main() {
    float h = normalize(vPos).y;
    float t = smoothstep(0.0, 0.35, h);
    gl_FragColor = vec4(mix(uHorizon, uTop, t), 1.0);
    #include <colorspace_fragment>
}
`;

export default function EnvironmentRig() {
    const fogRef = useRef<THREE.FogExp2>(null);
    const ambientRef = useRef<THREE.AmbientLight>(null);
    const sunRef = useRef<THREE.DirectionalLight>(null);
    const starsRef = useRef<THREE.Group>(null);

    const uniforms = useMemo(
        () => ({
            uTop: { value: new THREE.Color("#4f8fd6") },
            uHorizon: { value: new THREE.Color("#c9e2f7") },
        }),
        []
    );

    useFrame((_, dt) => {
        // clamp so a backgrounded tab doesn't skip the cycle on resume
        environment.tick(Math.min(dt, 0.1));
        const v = environment.values();

        if (fogRef.current) {
            fogRef.current.color.set(v.fogColor);
            fogRef.current.density = v.fogDensity;
        }

        if (ambientRef.current) {
            ambientRef.current.color.set(v.ambientColor);
            ambientRef.current.intensity = v.ambientIntensity;
        }
        if (sunRef.current) {
            sunRef.current.color.set(v.sunColor);
            sunRef.current.intensity = v.sunIntensity;
            sunRef.current.position.set(...v.sunPosition);
        }
        uniforms.uTop.value.set(v.skyTop);
        uniforms.uHorizon.value.set(v.skyHorizon);
        // shortcut: threshold toggle, upgrade to a material-opacity fade if the pop is noticeable
        if (starsRef.current) starsRef.current.visible = v.stars > 0.5;
    });

    return (
        <>
            {/* fragment keeps fog a direct child of the scene (function components are transparent) */}
            <fogExp2 ref={fogRef} attach="fog" args={["#c9e2f7", 0.005]} />
            <group>
            <mesh frustumCulled={false}>
                <sphereGeometry args={[SKY_RADIUS, 32, 16]} />
                <shaderMaterial
                    side={THREE.BackSide}
                    depthWrite={false}
                    uniforms={uniforms}
                    vertexShader={skyVertex}
                    fragmentShader={skyFragment}
                />
            </mesh>

            <ambientLight ref={ambientRef} />
            <directionalLight
                ref={sunRef}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-90}
                shadow-camera-right={90}
                shadow-camera-top={90}
                shadow-camera-bottom={-90}
                shadow-camera-near={0.5}
                shadow-camera-far={400}
            />

            <group ref={starsRef}>
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            </group>
            </group>
        </>
    );
}
