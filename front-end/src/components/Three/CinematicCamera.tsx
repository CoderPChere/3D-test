"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import * as THREE from "three";

gsap.registerPlugin(ScrollTrigger);

export default function CinematicCamera() {
    const { camera, scene } = useThree();
    const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0));

    useEffect(() => {
        // Initial camera position
        camera.position.set(80, 80, 80);
        camera.lookAt(0, 0, 0);

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: "main",
                start: "top top",
                end: "bottom bottom",
                scrub: 2,
                immediateRender: false,
            },
        });

        // Flight sequence
        // Section 1: Overview to Sector Scan
        tl.to(camera.position, {
            x: 30, y: 20, z: 60,
            duration: 1,
        })
            .to(lookAtTarget.current, {
                x: 10, y: 0, z: 10,
                duration: 1,
                onUpdate: () => camera.lookAt(lookAtTarget.current),
            }, "<")

            // Section 2: To Smart Surveillance (CCTV Focus)
            .to(camera.position, {
                x: -40, y: 15, z: 20,
                duration: 1,
            })
            .to(lookAtTarget.current, {
                x: -15, y: 12, z: -15,
                duration: 1,
                onUpdate: () => camera.lookAt(lookAtTarget.current),
            }, "<")

            // Section 3: To AI Enhancement (Close-up on roads)
            .to(camera.position, {
                x: 0, y: 5, z: -40,
                duration: 1,
            })
            .to(lookAtTarget.current, {
                x: 0, y: 0, z: 0,
                duration: 1,
                onUpdate: () => camera.lookAt(lookAtTarget.current),
            }, "<");

        return () => {
            ScrollTrigger.getAll().forEach(t => t.kill());
        };
    }, [camera, scene]);

    return null;
}
