import { describe, it, expect } from "vitest";
import { generateCity, DEFAULT_DISTRICT_STYLE } from "./generate";
import { generateRoads } from "./roads";
import { defaultProfile, DistrictDef } from "../config/city";

describe("generateCity", () => {
  it("produces an identical layout for the same seed", () => {
    const a = generateCity(defaultProfile);
    const b = generateCity(defaultProfile);
    expect(a.buildings).toEqual(b.buildings);
    expect(a.buildings.length).toBeGreaterThan(0);
  });

  it("produces a different layout for a different seed", () => {
    const a = generateCity(defaultProfile);
    const b = generateCity({ ...defaultProfile, seed: 99991 });
    expect(a.buildings).not.toEqual(b.buildings);
  });

  it("produces a different but still valid layout for an alternate seed", () => {
    const profile = { ...defaultProfile, seed: 4242 };
    const base = generateCity(defaultProfile);
    const alt = generateCity(profile);
    // different seed ⇒ different layout
    expect(alt.buildings).not.toEqual(base.buildings);
    // ...but still valid: in-district, positive heights, landmarks reserved
    expect(alt.buildings.length).toBeGreaterThan(0);
    for (const b of alt.buildings) {
      const d = profile.districts.find((x) => x.name === b.district);
      if (d) {
        expect(Math.hypot(b.x - d.center[0], b.z - d.center[1])).toBeLessThanOrEqual(d.radius);
      }
      expect(b.height).toBeGreaterThan(0);
      expect(Number.isFinite(b.x)).toBe(true);
      expect(Number.isFinite(b.z)).toBe(true);
    }
    expect(alt.landmarkPlots).toHaveLength(profile.landmarks.length);
    // extent/density/heightRange changes alter the output too
    const wider = generateCity({ ...profile, generation: { ...profile.generation, extent: 84 } });
    expect(wider.buildings.length).not.toBe(alt.buildings.length);
  });

  it("keeps every building inside its district region", () => {
    const { buildings } = generateCity(defaultProfile);
    for (const b of buildings) {
      const d = defaultProfile.districts.find((x) => x.name === b.district);
      if (d) {
        const dist = Math.hypot(b.x - d.center[0], b.z - d.center[1]);
        expect(dist).toBeLessThanOrEqual(d.radius);
      }
    }
  });

  it("generates at least three distinct building types city-wide", () => {
    const { buildings } = generateCity(defaultProfile);
    const types = new Set(buildings.map((b) => b.type));
    expect(types.size).toBeGreaterThanOrEqual(3);
  });

  it("generates no buildings in park districts", () => {
    const { buildings } = generateCity(defaultProfile);
    const parks = defaultProfile.districts.filter((d) => d.style === "park").map((d) => d.name);
    for (const b of buildings) {
      expect(parks).not.toContain(b.district);
    }
  });
});

describe("generateCity core shaping, landmark plots, and fallbacks", () => {
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

  it("shapes the central core as the tallest cluster", () => {
    const { buildings } = generateCity(defaultProfile);
    const core = buildings.filter((b) => b.district === "Central Core");
    expect(core.length).toBeGreaterThan(0);
    const coreMean = mean(core.map((b) => b.height));
    const districtNames = new Set(buildings.map((b) => b.district));
    for (const name of districtNames) {
      if (name === "Central Core") continue;
      const other = buildings.filter((b) => b.district === name).map((b) => b.height);
      expect(coreMean).toBeGreaterThan(mean(other));
    }
    const tallest = buildings.reduce((a, b) => (b.height > a.height ? b : a));
    expect(tallest.district).toBe("Central Core");
  });

  it("reserves a unique plot per landmark that no building occupies", () => {
    const { buildings, landmarkPlots } = generateCity(defaultProfile);
    expect(landmarkPlots.map((p) => p.name).sort()).toEqual(["nexus-spire", "transit-hub"]);
    for (let i = 0; i < landmarkPlots.length; i++) {
      for (let j = i + 1; j < landmarkPlots.length; j++) {
        const d = Math.hypot(
          landmarkPlots[i].x - landmarkPlots[j].x,
          landmarkPlots[i].z - landmarkPlots[j].z
        );
        expect(d).toBeGreaterThanOrEqual(12);
      }
      for (const b of buildings) {
        const d = Math.hypot(b.x - landmarkPlots[i].x, b.z - landmarkPlots[i].z);
        expect(d).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it("falls back to defaults for invalid generation parameters", () => {
    const base = generateCity(defaultProfile).buildings;
    const badExtent = generateCity({
      ...defaultProfile,
      generation: { ...defaultProfile.generation, extent: -5 },
    }).buildings;
    expect(badExtent).toEqual(base);
    const badDensity = generateCity({
      ...defaultProfile,
      generation: { ...defaultProfile.generation, density: 5 },
    }).buildings;
    expect(badDensity).toEqual(base);
    const badRange = generateCity({
      ...defaultProfile,
      generation: { ...defaultProfile.generation, heightRange: [40, 10] },
    }).buildings;
    expect(badRange).toEqual(base);
  });
});

describe("generateCity road clearance", () => {
  /** Axis-aligned rectangle overlap (touching edges do not overlap) */
  function overlaps(
    ax0: number, ax1: number, az0: number, az1: number,
    bx0: number, bx1: number, bz0: number, bz1: number
  ): boolean {
    return ax0 < bx1 && bx0 < ax1 && az0 < bz1 && bz0 < az1;
  }

  it("never places a building on a road corridor", () => {
    const roads = generateRoads(defaultProfile);
    const { buildings } = generateCity(defaultProfile);
    expect(buildings.length).toBeGreaterThan(0);

    for (const b of buildings) {
      const hx = b.footprint[0] / 2;
      const hz = b.footprint[1] / 2;
      for (const r of roads) {
        const hw = r.width / 2;
        const [x0, x1] = [Math.min(r.from[0], r.to[0]), Math.max(r.from[0], r.to[0])];
        const [z0, z1] = [Math.min(r.from[1], r.to[1]), Math.max(r.from[1], r.to[1])];
        const corridor =
          r.from[1] === r.to[1] // horizontal road: z band, x span
            ? overlaps(x0, x1, r.from[1] - hw, r.from[1] + hw, b.x - hx, b.x + hx, b.z - hz, b.z + hz)
            : overlaps(r.from[0] - hw, r.from[0] + hw, z0, z1, b.x - hx, b.x + hx, b.z - hz, b.z + hz);
        expect(
          corridor,
          `building at (${b.x},${b.z}) overlaps ${r.class} road`
        ).toBe(false);
      }
    }
  });

  it("still fills the city after road clearance", () => {
    // guard against a road pass that empties the map
    expect(generateCity(defaultProfile).buildings.length).toBeGreaterThanOrEqual(25);
  });
});

describe("district fallback and custom districts (acceptance CG-02.2 / CC-02.1)", () => {
  it("assigns the default district style to plots outside every district", () => {
    // widened extent guarantees plots beyond every configured district region
    const profile = {
      ...defaultProfile,
      generation: { ...defaultProfile.generation, extent: 84 },
    };
    const { buildings } = generateCity(profile);
    const outskirts = buildings.filter((b) => b.district === "Outskirts");
    expect(outskirts.length).toBeGreaterThan(0);
    for (const b of outskirts) expect(b.type).toBe(DEFAULT_DISTRICT_STYLE);
  });

  it("places a profile-added custom district's style within its region", () => {
    const custom: DistrictDef = {
      name: "Test Harbor",
      center: [48, 48],
      radius: 20,
      style: "midrise",
      heightRange: [10, 20],
      density: 1,
    };
    const profile = {
      ...defaultProfile,
      generation: { ...defaultProfile.generation, density: 1 },
      districts: [...defaultProfile.districts, custom],
    };
    const { buildings } = generateCity(profile);
    const mine = buildings.filter((b) => b.district === "Test Harbor");
    expect(mine.length).toBeGreaterThan(0);
    for (const b of mine) {
      expect(b.type).toBe("midrise");
      expect(Math.hypot(b.x - custom.center[0], b.z - custom.center[1])).toBeLessThanOrEqual(
        custom.radius
      );
    }
  });
});
