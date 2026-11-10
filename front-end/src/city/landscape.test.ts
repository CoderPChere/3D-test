import { describe, it, expect } from "vitest";
import { generateLandscape, RiverBand } from "./landscape";
import { generateRoads, RoadSegment } from "./roads";
import { generateCity } from "./generate";
import { defaultProfile, CityProfile } from "../config/city";

/** River band the shipped roads cross (exported by the implementation) */
function spansRiver(river: RiverBand, s: RoadSegment): boolean {
  if (s.from[0] !== s.to[0]) return false; // only vertical roads cross a horizontal band
  const zmin = Math.min(s.from[1], s.to[1]);
  const zmax = Math.max(s.from[1], s.to[1]);
  return zmin < river.z0 && zmax > river.z1;
}

describe("generateLandscape", () => {
  it("produces zero water and bridge records when water is off", () => {
    const roads = generateRoads(defaultProfile);
    const off = generateLandscape({ ...defaultProfile, water: { enabled: false } }, roads);
    expect(off.water).toHaveLength(0);
    expect(off.bridges).toHaveLength(0);
    // parks still generated with water off
    expect(off.vegetation.length).toBeGreaterThan(0);
  });

  it("produces a river and a bridge for every road crossing it when water is on", () => {
    const roads = generateRoads(defaultProfile);
    const on = generateLandscape(defaultProfile, roads); // default profile ships water on
    expect(on.water).toHaveLength(1);
    expect(on.bridges.length).toBeGreaterThan(0);

    const river = on.water[0];
    // every bridge sits on a road that fully spans the river band
    for (const b of on.bridges) {
      expect(
        roads.some((r) => r.from[0] === b.x && spansRiver(river, r))
      ).toBe(true);
    }
    // no vegetation grows inside the river
    for (const v of on.vegetation) {
      expect(v.z > river.z1 || v.z < river.z0).toBe(true);
    }
  });

  it("parks contain no building plots", () => {
    const parkDistricts = defaultProfile.districts.filter((d) => d.style === "park");
    expect(parkDistricts.length).toBeGreaterThan(0);

    const city = generateCity(defaultProfile);
    for (const p of parkDistricts) {
      for (const b of city.buildings) {
        expect(Math.hypot(b.x - p.center[0], b.z - p.center[1])).toBeGreaterThan(p.radius);
      }
    }

    // ...but parks do contain vegetation
    const land = generateLandscape(defaultProfile, generateRoads(defaultProfile));
    const inPark = land.vegetation.filter((v) =>
      parkDistricts.some((p) => Math.hypot(v.x - p.center[0], v.z - p.center[1]) <= p.radius)
    );
    expect(inPark.length).toBeGreaterThan(0);
  });

  it("keeps buildings out of the river when water is on", () => {
    const riverProfile: CityProfile = { ...defaultProfile, water: { enabled: true } };
    const city = generateCity(riverProfile);
    const [river] = generateLandscape(riverProfile, generateRoads(riverProfile)).water;
    expect(river).toBeDefined();
    for (const b of city.buildings) {
      const half = b.footprint[1] / 2;
      const overlaps = b.z + half > river.z0 && b.z - half < river.z1;
      expect(overlaps).toBe(false);
    }
  });
});
