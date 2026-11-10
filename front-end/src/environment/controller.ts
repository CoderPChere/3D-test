import type { EnvironmentMode } from "../config/city";

/**
 * Environment controller — single source of time-of-day state.
 *
 * Owns the three modes (day / golden-hour / night), blends between them over
 * a duration, optionally auto-cycles, and exposes an observable state for UI.
 * Pure data: the frame loop (EnvironmentRig) writes these values into three
 * objects — no three.js imports here so the state machine stays unit-testable.
 */

export interface EnvValues {
    skyTop: string;
    skyHorizon: string;
    fogColor: string;
    fogDensity: number;
    ambientColor: string;
    ambientIntensity: number;
    sunColor: string;
    sunIntensity: number;
    sunPosition: [number, number, number];
    /** star field visibility, 0..1 (night only) */
    stars: number;
}

export const MODE_PRESETS: Record<EnvironmentMode, EnvValues> = {
    day: {
        skyTop: "#4f8fd6",
        skyHorizon: "#c9e2f7",
        fogColor: "#c9e2f7",
        fogDensity: 0.005,
        ambientColor: "#ffffff",
        ambientIntensity: 0.55,
        sunColor: "#fff3dd",
        sunIntensity: 1.1,
        sunPosition: [60, 90, 40],
        stars: 0,
    },
    "golden-hour": {
        skyTop: "#3f5f96",
        skyHorizon: "#f7a15c",
        fogColor: "#e89a5e",
        fogDensity: 0.008,
        ambientColor: "#ffd2a1",
        ambientIntensity: 0.4,
        sunColor: "#ffb45e",
        sunIntensity: 0.9,
        sunPosition: [-70, 16, -25],
        stars: 0,
    },
    night: {
        skyTop: "#04060f",
        skyHorizon: "#0e1730",
        fogColor: "#0a0f1e",
        fogDensity: 0.012,
        ambientColor: "#46587f",
        ambientIntensity: 0.22,
        sunColor: "#9db4e8",
        sunIntensity: 0.22,
        sunPosition: [-40, 35, -70],
        stars: 1,
    },
};

const CYCLE_ORDER: EnvironmentMode[] = ["day", "golden-hour", "night"];
const DEFAULT_TRANSITION_SEC = 2;

export interface EnvConfig {
    /** "auto" cycles continuously; a fixed mode pins the scene (manual changes still allowed) */
    mode: EnvironmentMode | "auto";
    cycleDurationSec: number;
    transitionDurationSec?: number;
    /** reduced-motion preference: auto mode never advances (manual selection still applies) */
    reducedMotion?: boolean;
}

export interface EnvState {
    /** active (target) mode */
    mode: EnvironmentMode;
    /** mode the current transition started from */
    from: EnvironmentMode;
    /** 0..1 transition progress; 1 = settled */
    progress: number;
    cycling: boolean;
}

export interface EnvController {
    setMode(mode: EnvironmentMode): void;
    tick(dt: number): void;
    values(): EnvValues;
    getState(): EnvState;
    /** notified when the active mode changes (not per-frame) */
    subscribe(fn: () => void): () => void;
}

function hexToRgb(hex: string): [number, number, number] {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpHex(a: string, b: string, t: number): string {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
    return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function ease(t: number): number {
    // smoothstep — no abrupt visual jumps at leg boundaries
    return t * t * (3 - 2 * t);
}

function blend(a: EnvValues, b: EnvValues, t: number): EnvValues {
    const e = ease(t);
    return {
        skyTop: lerpHex(a.skyTop, b.skyTop, e),
        skyHorizon: lerpHex(a.skyHorizon, b.skyHorizon, e),
        fogColor: lerpHex(a.fogColor, b.fogColor, e),
        fogDensity: lerp(a.fogDensity, b.fogDensity, e),
        ambientColor: lerpHex(a.ambientColor, b.ambientColor, e),
        ambientIntensity: lerp(a.ambientIntensity, b.ambientIntensity, e),
        sunColor: lerpHex(a.sunColor, b.sunColor, e),
        sunIntensity: lerp(a.sunIntensity, b.sunIntensity, e),
        sunPosition: [
            lerp(a.sunPosition[0], b.sunPosition[0], e),
            lerp(a.sunPosition[1], b.sunPosition[1], e),
            lerp(a.sunPosition[2], b.sunPosition[2], e),
        ],
        stars: lerp(a.stars, b.stars, e),
    };
}

function settled(mode: EnvironmentMode): EnvValues {
    const p = MODE_PRESETS[mode];
    return { ...p, sunPosition: [...p.sunPosition] };
}

export function createEnvironmentController(cfg: EnvConfig): EnvController {
    const cycling = cfg.mode === "auto" && !cfg.reducedMotion;
    // reduced motion: manual mode changes settle immediately (task 6.8)
    const transitionSec = cfg.reducedMotion ? 0 : cfg.transitionDurationSec ?? DEFAULT_TRANSITION_SEC;

    let to: EnvironmentMode = cfg.mode === "auto" ? "day" : cfg.mode;
    let from: EnvironmentMode = to;
    let current: EnvValues = settled(to);
    let fromValues: EnvValues = current;
    let progress = 1;
    let legDuration = transitionSec;
    const listeners = new Set<() => void>();

    function notify() {
        for (const fn of listeners) fn();
    }

    function begin(target: EnvironmentMode, duration: number) {
        from = to;
        fromValues = current;
        to = target;
        legDuration = duration;
        if (duration <= 0) {
            // zero-length transition: settle now so no animation runs
            progress = 1;
            current = settled(to);
        } else {
            progress = 0;
        }
        notify();
    }

    return {
        setMode(mode) {
            if (to === mode) return; // already there or already heading there
            begin(mode, transitionSec);
        },

        tick(dt) {
            if (progress >= 1) {
                if (!cycling) return;
                // one full cycle = cycleDurationSec across the three legs
                const next = CYCLE_ORDER[(CYCLE_ORDER.indexOf(to) + 1) % CYCLE_ORDER.length];
                begin(next, cfg.cycleDurationSec / CYCLE_ORDER.length);
            }
            progress = Math.min(1, progress + dt / legDuration);
            current = progress >= 1 ? settled(to) : blend(fromValues, MODE_PRESETS[to], progress);
        },

        values: () => current,

        getState: () => ({ mode: to, from, progress, cycling }),

        subscribe(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
    };
}
