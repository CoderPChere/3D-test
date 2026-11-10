import { describe, expect, it } from "vitest";
import {
    DEFAULT_TIER,
    QUALITY,
    clampDpr,
    lodDetailVisible,
    quality,
    type QualityTier,
} from "./quality";

// task 6.2: LOD tier distances are applied from the quality config
describe("quality tier LOD distances (task 6.2)", () => {
    const tiers: QualityTier[] = ["low", "medium", "high"];

    it("provides an LOD distance for every tier", () => {
        for (const t of tiers) {
            expect(QUALITY[t].lodDistance).toBeGreaterThan(0);
        }
    });

    it("shows detail at the tier distance and simplifies beyond it", () => {
        for (const t of tiers) {
            const d = QUALITY[t].lodDistance;
            expect(lodDetailVisible(d, t)).toBe(true); // at the boundary: full detail
            expect(lodDetailVisible(d + 0.01, t)).toBe(false); // beyond: simplified shape
        }
    });

    it("applies the default tier when none is given", () => {
        const d = QUALITY[DEFAULT_TIER].lodDistance;
        expect(lodDetailVisible(d)).toBe(true);
        expect(lodDetailVisible(d + 0.01)).toBe(false);
    });

    it("keeps detail farther at higher quality", () => {
        expect(QUALITY.low.lodDistance).toBeLessThan(QUALITY.medium.lodDistance);
        expect(QUALITY.medium.lodDistance).toBeLessThan(QUALITY.high.lodDistance);
    });
});

// task 6.4: quality tiers + adaptive pixel ratio clamp
describe("quality tiers (task 6.4)", () => {
    const tiers: QualityTier[] = ["low", "medium", "high"];

    it("every tier configures pixel-ratio bounds, shadows, and density", () => {
        for (const t of tiers) {
            const q = QUALITY[t];
            expect(q.dprMin).toBeGreaterThan(0);
            expect(q.dprMax).toBeGreaterThanOrEqual(q.dprMin);
            expect(typeof q.shadows).toBe("boolean");
            expect(["off", "low", "medium", "high"]).toContain(q.density);
        }
        // low tier reduces load: lowest pixel-ratio ceiling, shadows off
        expect(QUALITY.low.dprMax).toBeLessThan(QUALITY.medium.dprMax);
        expect(QUALITY.low.shadows).toBe(false);
        expect(QUALITY.medium.shadows).toBe(true);
    });

    it("clamps the adaptive pixel ratio to the configured bounds", () => {
        expect(clampDpr(1.2, 1, 1.5)).toBe(1.2); // in range: unchanged
        expect(clampDpr(0.5, 1, 1.5)).toBe(1); // below minimum
        expect(clampDpr(2, 1, 1.5)).toBe(1.5); // above maximum
        expect(clampDpr(Number.NaN, 1, 1.5)).toBe(1); // garbage input → cheapest
    });

    it("switching tiers notifies subscribers and ignores redundant sets", () => {
        const seen: QualityTier[] = [];
        const un = quality.subscribe(() => seen.push(quality.get()));
        quality.set("low");
        quality.set("low"); // no-op: no duplicate notification
        quality.set(DEFAULT_TIER); // restore for other tests (a real change: notifies)
        un();
        expect(seen).toEqual(["low", DEFAULT_TIER]);
        expect(quality.get()).toBe(DEFAULT_TIER);
    });
});
