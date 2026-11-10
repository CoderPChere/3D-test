"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useSyncExternalStore, type ElementRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import * as THREE from "three";
import { cameraMode, INITIAL_MODE } from "@/camera/store";

gsap.registerPlugin(ScrollTrigger);

// pose targets for the non-scroll modes — each mode is visually distinct (5.1)
const OVERVIEW_POS = new THREE.Vector3(0, 85, 55);
const OVERVIEW_LOOK = new THREE.Vector3(0, 0, 0);
const FLY_RADIUS = 55;
const FLY_HEIGHT = 22;
const FLY_SPEED = 0.08; // orbit radians per second
// focus pose offset: three-quarter elevated view, raycast-verified clear of
// Central Core highrises for every default landmark plot (task 5.5)
const FOCUS_OFFSET = new THREE.Vector3(24, 35, -24);
/** Exponential glide rate toward a mode pose — no teleports between modes */
const BLEND = 5;

const TARGET_POS = new THREE.Vector3();
const TARGET_LOOK = new THREE.Vector3();

// reduced motion (task 6.8): read once at load, same pattern as environment/store
const REDUCED_MOTION =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The single owner of the three camera (camera-system spec): mode state
 * machine with hero (page scroll), overview, flythrough, free, and
 * landmark-focus. OrbitControls mounts only in free mode; no other
 * component writes camera position or orientation.
 */
export default function CameraRig() {
    const camera = useThree((s) => s.camera);
    const { mode, focus } = useSyncExternalStore(cameraMode.subscribe, cameraMode.get, cameraMode.get);
    const controlsRef = useRef<ElementRef<typeof OrbitControls>>(null);

    // rig-owned scroll sequence: GSAP tweens these vectors only — the rig
    // copies them into the camera each frame (single camera owner)
    const heroPos = useRef(new THREE.Vector3(80, 80, 80));
    const heroLook = useRef(new THREE.Vector3(0, 0, 0));
    /** last applied look point — handed to OrbitControls when entering free */
    const lastLook = useRef(new THREE.Vector3(0, 0, 0));
    const flyAngle = useRef(0);

    useEffect(() => {
        // deterministic start regardless of mount order (spec: mounting order)
        camera.position.copy(heroPos.current);
        lastLook.current.copy(heroLook.current);
        camera.lookAt(lastLook.current);

        // reduced motion: no scroll flight — camera holds the fixed hero pose
        // until the user manually changes mode (task 6.8)
        if (REDUCED_MOTION) return;

        const pos = heroPos.current;
        const look = heroLook.current;
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: "main",
                start: "top top",
                end: "bottom bottom",
                scrub: 2,
                immediateRender: false,
            },
        });
        // flight sequence (moved from CinematicCamera; scoped cleanup, never
        // ScrollTrigger.getAll().kill() — that killed unrelated triggers)
        tl.to(pos, { x: 30, y: 20, z: 60, duration: 1 })
            .to(look, { x: 10, y: 0, z: 10, duration: 1 }, "<")
            .to(pos, { x: -40, y: 15, z: 20, duration: 1 })
            .to(look, { x: -15, y: 12, z: -15, duration: 1 }, "<")
            .to(pos, { x: 0, y: 5, z: -40, duration: 1 })
            .to(look, { x: 0, y: 0, z: 0, duration: 1 }, "<");

        return () => {
            tl.scrollTrigger?.kill();
            tl.kill();
        };
    }, [camera]);

    // a scene (re)mount starts in the configured initial mode
    useEffect(
        () => () => {
            cameraMode.setMode(INITIAL_MODE);
            cameraMode.setFocus(null);
        },
        []
    );

    // entering free mode: seed the controls with the current look point so
    // orientation carries over instead of snapping to the origin
    useEffect(() => {
        if (mode === "free" && controlsRef.current) {
            controlsRef.current.target.copy(lastLook.current);
            controlsRef.current.update();
        }
    }, [mode]);

    useFrame((_, dt) => {
        if (mode === "free") return; // OrbitControls is the sole writer in free mode
        // reduced motion: snap to the target pose instead of gliding (task 6.8)
        const k = REDUCED_MOTION ? 1 : 1 - Math.exp(-BLEND * dt);

        if (mode === "hero") {
            TARGET_POS.copy(heroPos.current);
            TARGET_LOOK.copy(heroLook.current);
        } else if (mode === "overview") {
            TARGET_POS.copy(OVERVIEW_POS);
            TARGET_LOOK.copy(OVERVIEW_LOOK);
        } else if (mode === "flythrough") {
            if (!REDUCED_MOTION) flyAngle.current += dt * FLY_SPEED; // no auto-orbit under reduced motion
            TARGET_POS.set(
                Math.cos(flyAngle.current) * FLY_RADIUS,
                FLY_HEIGHT,
                Math.sin(flyAngle.current) * FLY_RADIUS
            );
            TARGET_LOOK.copy(OVERVIEW_LOOK);
        } else {
            // landmark-focus: frame the focus point (city center until one is set)
            const [fx, fy, fz] = focus ?? [0, 0, 0];
            TARGET_POS.set(fx + FOCUS_OFFSET.x, fy + FOCUS_OFFSET.y, fz + FOCUS_OFFSET.z);
            TARGET_LOOK.set(fx, fy, fz);
        }
        camera.position.lerp(TARGET_POS, k);
        lastLook.current.lerp(TARGET_LOOK, k);
        camera.lookAt(lastLook.current);
    });

    if (mode === "free") {
        return (
            <OrbitControls
                ref={controlsRef}
                enablePan={false}
                // zoom stays on but bounded: min/max distance clamp the dolly,
                // maxPolarAngle (< π/2) keeps the camera above the target plane
                // and the target never sinks below y=0 (pan disabled)
                maxPolarAngle={Math.PI / 2.1}
                minDistance={10}
                maxDistance={200}
            />
        );
    }
    return null;
}
