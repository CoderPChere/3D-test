import { defaultProfile, type TrafficDensity } from "./city";

/**
 * Quality tiers (rendering-performance spec).
 *
 * Each tier configures four settings the tier switch applies at runtime
 * without a reload (task 6.4):
 *  - `dprMin`/`dprMax`: pixel-ratio bounds the adaptive dpr clamps into
 *  - `shadows`: whether the directional shadow map renders at all
 *  - `density`: traffic density a runtime tier switch applies
 *    (startup density stays `profile.traffic.density` — config owns boot,
 *    the tier table owns switches)
 *  - `lodDistance`: camera distance beyond which detail layers simplify
 *
 * LOD boundary: beyond `lodDistance` from the camera, *detail* layers drop
 * to their simplified form — lit window quads vanish (buildings render as
 * plain shapes), sign faces and CCTV markers hide. Structures themselves
 * (buildings, poles, skyline backdrop) always render, so there are never
 * visible gaps at the boundary.
 */
export type QualityTier = "low" | "medium" | "high";

export interface QualitySettings {
    /** Adaptive pixel-ratio bounds for this tier */
    dprMin: number;
    dprMax: number;
    /** Whether the directional light's shadow map renders */
    shadows: boolean;
    /** Traffic density applied when the tier is switched at runtime */
    density: TrafficDensity;
    /** Camera distance beyond which detail layers simplify (world units) */
    lodDistance: number;
}

export const QUALITY: Record<QualityTier, QualitySettings> = {
    low: { dprMin: 0.6, dprMax: 1, shadows: false, density: "low", lodDistance: 110 },
    medium: { dprMin: 1, dprMax: 1.25, shadows: true, density: "medium", lodDistance: 150 },
    high: { dprMin: 1, dprMax: 1.5, shadows: true, density: "high", lodDistance: 240 },
};

/** Tier the scene starts at — from `profile.quality`, default medium */
export const DEFAULT_TIER: QualityTier = "medium";

/** Clamp an adaptive pixel ratio into `[min, max]` (NaN → min, cheapest) */
export function clampDpr(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
}

/** Whether a detail layer renders at `distance` from the camera in `tier` */
export function lodDetailVisible(distance: number, tier: QualityTier = quality.get()): boolean {
    return distance <= QUALITY[tier].lodDistance;
}

/** Runtime tier singleton (same pattern as camera/environment stores) */
export const quality = (() => {
    let tier: QualityTier = DEFAULT_TIER;
    const listeners = new Set<() => void>();
    return {
        get: () => tier,
        subscribe(fn: () => void): () => void {
            listeners.add(fn);
            return () => void listeners.delete(fn);
        },
        set(next: QualityTier): void {
            if (next === tier) return;
            tier = next;
            listeners.forEach((fn) => fn());
        },
    };
})();

// initial tier comes from the profile (validated field, default medium)
quality.set(defaultProfile.quality.tier);
