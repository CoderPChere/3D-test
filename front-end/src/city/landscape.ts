import { CityProfile, DistrictDef } from "../config/city";
import { createSeededRandom } from "./random";
import { RoadSegment } from "./roads";

/** Horizontal river band the road network spans (world units, z range) */
export interface RiverBand {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

/** A planted point in a park or green pocket */
export interface Vegetation {
  x: number;
  z: number;
  kind: "tree" | "groundcover";
}

/** A pedestrian path through a park (straight segment + width) */
export interface ParkPath {
  from: [number, number];
  to: [number, number];
  width: number;
}

/** Bridge deck where a road fully spans the river band */
export interface Bridge {
  x: number;
  z0: number;
  z1: number;
  width: number;
}

export interface Landscape {
  vegetation: Vegetation[];
  paths: ParkPath[];
  water: RiverBand[];
  bridges: Bridge[];
}

/** River sits inside the z=-36 plot row (between the z=-48 and z=-24 rows) */
const RIVER_Z0 = -42;
const RIVER_Z1 = -36;

/** The river band for a profile: full city width plus a margin */
export function riverBand(profile: CityProfile): RiverBand {
  const e = Number.isFinite(profile.generation.extent) && profile.generation.extent > 0 ? profile.generation.extent : 60;
  return { x0: -(e + 10), x1: e + 10, z0: RIVER_Z0, z1: RIVER_Z1 };
}

function inRiver(band: RiverBand, x: number, z: number): boolean {
  return x >= band.x0 && x <= band.x1 && z >= band.z0 && z <= band.z1;
}

/** Points scattered inside a district circle, plus a cross of paths for parks */
function parkContents(district: DistrictDef, rng: ReturnType<typeof createSeededRandom>, band: RiverBand) {
  const vegetation: Vegetation[] = [];
  const paths: ParkPath[] = [];
  const [cx, cz] = district.center;
  const r = district.radius;

  if (district.style === "park") {
    const count = Math.round(r * 1.5);
    for (let i = 0; i < count; i++) {
      const angle = rng.next() * Math.PI * 2;
      const dist = r * Math.sqrt(rng.next());
      const x = cx + Math.cos(angle) * dist;
      const z = cz + Math.sin(angle) * dist;
      if (inRiver(band, x, z)) continue;
      vegetation.push({ x, z, kind: rng.next() < 0.7 ? "tree" : "groundcover" });
    }
    paths.push(
      { from: [cx - r, cz], to: [cx + r, cz], width: 1.5 },
      { from: [cx, cz - r], to: [cx, cz + r], width: 1.5 }
    );
  } else {
    // green pockets elsewhere: a few groundcover points near the district edge
    for (let i = 0; i < 3; i++) {
      const angle = rng.next() * Math.PI * 2;
      const dist = r * (0.5 + 0.4 * rng.next());
      const x = cx + Math.cos(angle) * dist;
      const z = cz + Math.sin(angle) * dist;
      if (inRiver(band, x, z)) continue;
      vegetation.push({ x, z, kind: "groundcover" });
    }
  }
  return { vegetation, paths };
}

/**
 * Parks/vegetation for park districts (green pockets elsewhere), plus the
 * optional river band with a bridge for every road that fully spans it
 * (city-infrastructure spec: parks and optional water).
 */
export function generateLandscape(profile: CityProfile, roads: RoadSegment[]): Landscape {
  const rng = createSeededRandom(profile.seed + 3);
  const band = riverBand(profile);

  const vegetation: Vegetation[] = [];
  const paths: ParkPath[] = [];
  for (const d of profile.districts) {
    const contents = parkContents(d, rng, band);
    vegetation.push(...contents.vegetation);
    paths.push(...contents.paths);
  }

  if (!profile.water?.enabled) return { vegetation, paths, water: [], bridges: [] };

  const bridges: Bridge[] = [];
  const seen = new Set<number>();
  for (const r of roads) {
    if (r.from[0] !== r.to[0]) continue; // only vertical roads cross a horizontal band
    const zmin = Math.min(r.from[1], r.to[1]);
    const zmax = Math.max(r.from[1], r.to[1]);
    if (!(zmin < band.z0 && zmax > band.z1)) continue;
    if (seen.has(r.from[0])) continue;
    seen.add(r.from[0]);
    bridges.push({ x: r.from[0], z0: band.z0, z1: band.z1, width: r.width });
  }

  return { vegetation, paths, water: [band], bridges };
}
