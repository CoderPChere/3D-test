import { site } from "./site";

/**
 * CITYFLUXY project profile — single source for re-theming the 3D city per project.
 * Pure data only: no browser APIs at module scope (evaluated during `next build`).
 *
 * Field documentation and defaults (defaults live in `defaultProfile`):
 *
 * - seed                 Deterministic generation seed. Same seed ⇒ identical city.
 *                        Default: 1337
 * - generation.extent    Half-size of the modeled area in world units. Default: 60
 * - generation.density   Fraction of buildable plots occupied, 0..1. Default: 0.7
 * - generation.heightRange Global building height range [min,max] used when a
 *                        district does not override it. Default: [10, 40]
 * - environment.mode     "day" | "golden-hour" | "night" | "auto" (automatic
 *                        cycle). Default: "auto"
 * - environment.cycleDurationSec  Seconds for one full automatic day cycle.
 *                        Default: 120
 * - traffic.density      "off" | "low" | "medium" | "high" vehicle count/mix.
 *                        Default: "medium"
 * - traffic categories   The vehicle categories in the mix (car / bus / truck)
 *                        with distinct chassis sizes, speed ranges, and mix
 *                        shares are defined in src/traffic/simulation.ts
 *                        (CATEGORIES): car 2.5 long, share .7; bus 4.5, share
 *                        .2; truck 3.5, share .1
 * - traffic.signalCycleSec  Full traffic-light cycle length. Default: 10
 * - traffic.minGap       Minimum following gap between vehicles in world units.
 *                        Default: 8
 * - water.enabled        When true, a river band with bridges where roads
 *                        cross it is generated; false ⇒ no water bodies and
 *                        no bridges. Default: true
 * - districts[]          Named regions: center [x,z], radius, style (highrise |
 *                        midrise | lowrise | campus | park), heightRange
 *                        override [min,max], density 0..1. Default: the seven
 *                        CITYFLUXY districts (see below). "park" generates no
 *                        buildings. Centers should sit on the 12-unit plot
 *                        grid (multiples of 12) so generated roads run between
 *                        building plots instead of through them.
 * - landmarks[]          Registry of interactive landmarks (full schema and
 *                        copy-paste example under "Landmark registry schema"
 *                        below). Default: Nexus Spire + Transit Hub.
 * - roadSigns[]          {text,color} entries rendered on sign faces. Default:
 *                        site.roadSigns (shared with the app's sign config)
 * - emphasis.districts   District names to highlight. Default: []
 * - emphasis.landmarks   Landmark names to highlight. Default: ["nexus-spire"]
 * - emphasis.dimOthers   Dim non-emphasized structures. Default: false
 * - uiContent.hero.title / .tagline  Home hero copy. Default: site.name /
 *                        site.tagline
 * - uiContent.hud.*      HUD labels: totalScans, activeViolations, latency,
 *                        detection, activeCams, sweepAction, logExport.
 *                        Defaults: current HUD strings ("Total Scans", ...)
 * - quality.tier         Initial quality tier: "low" | "medium" | "high";
 *                        runtime selection overrides for the session.
 *                        Default: "medium"
 *
 * Generation parameters and regeneration behavior:
 *
 * - `seed`, `generation.extent`, `generation.density`, and
 *   `generation.heightRange` (plus per-district `heightRange`/`density`)
 *   are the inputs to `generateCity(profile)` in `src/city/generate.ts`.
 * - Generation is deterministic: the same profile always produces the
 *   identical layout, building heights/footprints, and landmark plots.
 *   Changing any of these fields changes the layout on the next render
 *   (edit the value, reload the page — no other code edits needed).
 * - Invalid values never crash generation: each field falls back to the
 *   default above (with a console warning from `validateProfile()`), so a
 *   malformed profile renders the default city.
 * - Districts marked `style: "park"` generate no buildings; plots outside
 *   every district use the default low-rise style as "Outskirts".
 * - The district containing the origin (0,0) is shaped as the central
 *   core: extra density and heights biased toward the top of its range so
 *   the core reads as the tallest cluster.
 * - Every landmark gets a reserved plot at its district center, kept
 *   ≥12 units from other landmark plots and clear of buildings by 10
 *   units, so landmark meshes never overlap roads or other landmarks.
 *
 * Environment and infrastructure behavior (fields documented above):
 *
 * - `environment.mode: "auto"` cycles day → golden-hour → night, one full
 *   cycle per `cycleDurationSec` (three equal legs), each leg an eased
 *   ~2s transition; sky, fog, lights, stars, windows, and streetlights all
 *   follow the single environment controller in `src/environment/`.
 * - With `prefers-reduced-motion: reduce`, "auto" never advances (the
 *   scene stays at day); a fixed mode still applies, and manual mode
 *   selection works regardless of the preference.
 * - Night mode lights building windows and streetlight bulbs through
 *   emissive materials only — no extra real-time lights are created, and
 *   only the environment's directional light casts shadows (budget ≤6).
 * - Roads are laid on the 12-unit plot grid with zebra crossings and
 *   streetlights along both sidewalks; `water.enabled: false` removes the
 *   river band and every bridge over it; `roadSigns[]` entries render
 *   their `text` in `color` on the sign face (a sign with empty text
 *   renders blank without error).
 *
 * Landmark registry schema (`landmarks[]`, each entry a `LandmarkDef`):
 *
 * - name         Unique kebab-case identifier — the key used for hover,
 *                selection, and emphasis. Duplicates or entries missing
 *                required fields are skipped with a console warning by
 *                validateProfile(); the remaining landmarks still work.
 * - title        Heading shown in the selection panel.
 * - description  Copy shown under the title.
 * - district     Must match a `districts[].name`; the landmark gets a
 *                reserved plot at that district's center.
 * - action       Optional (omit it, or use {type:"none"}, for an
 *                information-only landmark):
 *                  { type: "navigate", route: "/real-time-traffic" }
 *                    → panel shows an "Open →" link that navigates the
 *                      browser to `route` (must be a real app route);
 *                  { type: "callback", id: "open-cctv" }
 *                    → panel shows an "Activate" button that invokes the
 *                      handler registered from project code with
 *                      registerLandmarkCallback("open-cctv", fn)
 *                      (src/landmarks/actions.ts);
 *                  { type: "none" }
 *                    → information only, no affordance.
 *
 * Example — paste verbatim into `defaultProfile.landmarks`:
 *
 *   {
 *     name: "harbor-exchange",
 *     title: "Harbor Exchange",
 *     description: "Riverside trading floor of the Green District.",
 *     district: "Green District",
 *     action: { type: "navigate", route: "/real-time-traffic" },
 *   }
 *
 * The landmark then appears on its district plot, highlights on hover,
 * shows the info panel with its action when selected, and needs no edits
 * to city, camera, or scene components; deleting the entry removes it.
 */

export type EnvironmentMode = "day" | "golden-hour" | "night";
export type QualityTier = "low" | "medium" | "high";
export type TrafficDensity = "off" | "low" | "medium" | "high";
export type BuildingStyle = "highrise" | "midrise" | "lowrise" | "campus" | "park";

export interface DistrictDef {
  name: string;
  /** District region center as world [x, z] */
  center: [number, number];
  /** Region radius in world units */
  radius: number;
  style: BuildingStyle;
  /** Height range override [min, max]; falls back to generation.heightRange */
  heightRange?: [number, number];
  /** Fraction of buildable plots occupied, 0..1 */
  density: number;
}

export type LandmarkAction =
  | { type: "navigate"; route: string }
  | { type: "callback"; id: string }
  | { type: "none" };

export interface LandmarkDef {
  /** Unique kebab-case identifier */
  name: string;
  title: string;
  description: string;
  /** Must match a district name in `districts` */
  district: string;
  action?: LandmarkAction;
}

export interface CityProfile {
  seed: number;
  generation: {
    extent: number;
    density: number;
    heightRange: [number, number];
  };
  environment: {
    /** "auto" cycles automatically; a fixed mode pins the scene */
    mode: EnvironmentMode | "auto";
    cycleDurationSec: number;
  };
  traffic: {
    density: TrafficDensity;
    signalCycleSec: number;
    minGap: number;
  };
  /** Optional water feature — river band with bridges only when enabled */
  water: { enabled: boolean };
  districts: DistrictDef[];
  landmarks: LandmarkDef[];
  roadSigns: Array<{ text: string; color: string }>;
  emphasis: {
    districts: string[];
    landmarks: string[];
    dimOthers: boolean;
  };
  uiContent: {
    hero: { title: string; tagline: string };
    hud: {
      totalScans: string;
      activeViolations: string;
      latency: string;
      detection: string;
      activeCams: string;
      sweepAction: string;
      logExport: string;
    };
  };
  quality: { tier: QualityTier };
}

/** Built-in CITYFLUXY profile — used when no profile is provided (city-config spec). */
export const defaultProfile: CityProfile = {
  seed: 1337,
  generation: {
    extent: 60,
    density: 0.7,
    heightRange: [10, 40],
  },
  environment: {
    mode: "auto",
    cycleDurationSec: 120,
  },
  traffic: {
    density: "medium",
    signalCycleSec: 10,
    minGap: 8,
  },
  water: { enabled: true },
  districts: [
    { name: "Central Core", center: [0, 0], radius: 24, style: "highrise", heightRange: [30, 70], density: 0.85 },
    { name: "Innovation District", center: [-36, -36], radius: 20, style: "midrise", heightRange: [18, 45], density: 0.7 },
    { name: "Knowledge District", center: [36, -36], radius: 20, style: "campus", heightRange: [8, 22], density: 0.6 },
    { name: "Business District", center: [48, 0], radius: 20, style: "highrise", heightRange: [25, 60], density: 0.75 },
    { name: "Residential District", center: [0, 48], radius: 20, style: "lowrise", heightRange: [8, 18], density: 0.8 },
    { name: "Green District", center: [-36, 36], radius: 16, style: "park", density: 0 },
    { name: "Transportation District", center: [-48, 0], radius: 20, style: "lowrise", heightRange: [10, 26], density: 0.6 },
  ],
  landmarks: [
    {
      name: "nexus-spire",
      title: "Nexus Spire",
      description: "Central Core flagship tower and CITYFLUXY command center.",
      district: "Central Core",
      action: { type: "none" },
    },
    {
      name: "transit-hub",
      title: "Transit Hub",
      description: "Main interchange for the Transportation District.",
      district: "Transportation District",
      action: { type: "navigate", route: "/real-time-traffic" },
    },
  ],
  roadSigns: site.roadSigns,
  emphasis: {
    districts: [],
    landmarks: ["nexus-spire"],
    dimOthers: false,
  },
  uiContent: {
    hero: { title: site.name, tagline: site.tagline },
    hud: {
      totalScans: "Total Scans",
      activeViolations: "Active Violations",
      latency: "Latency",
      detection: "Detection",
      activeCams: "Active Cams",
      sweepAction: "Initialize Sweep",
      logExport: "Log Export",
    },
  },
  quality: { tier: "medium" },
};

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isPair = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && isNum(v[0]) && isNum(v[1]);
const HEX = /^#[0-9a-f]{3,8}$/i;
const STYLES: ReadonlyArray<BuildingStyle> = ["highrise", "midrise", "lowrise", "campus", "park"];
const MODES = ["day", "golden-hour", "night", "auto"] as const;
const TIERS: ReadonlyArray<QualityTier> = ["low", "medium", "high"];
const DENSITIES: ReadonlyArray<TrafficDensity> = ["off", "low", "medium", "high"];
const isRec = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const warn = (m: string) => console.warn(`[city-profile] ${m}`);
const nonEmpty = (v: unknown): v is string => isStr(v) && v.length > 0;

/**
 * Validate a project profile against CityProfile, falling back to defaults
 * per invalid field and warning for each fallback (city-config spec:
 * malformed profiles render with defaults, never crash).
 */
export function validateProfile(input: unknown): CityProfile {
  const src: Record<string, unknown> = isRec(input) ? input : {};
  if (!isRec(input)) warn(`profile is not an object; using defaults`);

  const out = structuredClone(defaultProfile);

  if ("seed" in src) {
    if (isNum(src.seed) && Number.isInteger(src.seed) && src.seed >= 0) out.seed = src.seed;
    else warn(`invalid seed "${String(src.seed)}"; using default ${defaultProfile.seed}`);
  }

  if (isRec(src.generation)) {
    const g = src.generation;
    if ("extent" in g) {
      if (isNum(g.extent) && g.extent > 0) out.generation.extent = g.extent;
      else warn(`invalid generation.extent "${String(g.extent)}"; using default`);
    }
    if ("density" in g) {
      if (isNum(g.density) && g.density >= 0 && g.density <= 1) out.generation.density = g.density;
      else warn(`invalid generation.density "${String(g.density)}"; using default ${defaultProfile.generation.density}`);
    }
    if ("heightRange" in g) {
      if (isPair(g.heightRange) && g.heightRange[0] < g.heightRange[1]) out.generation.heightRange = g.heightRange;
      else warn("invalid generation.heightRange; using default");
    }
  } else if ("generation" in src) warn("invalid generation; using defaults");

  if (isRec(src.environment)) {
    const e = src.environment;
    if ("mode" in e) {
      if ((MODES as readonly unknown[]).includes(e.mode)) out.environment.mode = e.mode as EnvironmentMode | "auto";
      else warn(`invalid environment.mode "${String(e.mode)}"; using default`);
    }
    if ("cycleDurationSec" in e) {
      if (isNum(e.cycleDurationSec) && e.cycleDurationSec > 0) out.environment.cycleDurationSec = e.cycleDurationSec;
      else warn("invalid environment.cycleDurationSec; using default");
    }
  } else if ("environment" in src) warn("invalid environment; using defaults");

  if (isRec(src.traffic)) {
    const t = src.traffic;
    if ("density" in t) {
      if ((DENSITIES as readonly unknown[]).includes(t.density)) out.traffic.density = t.density as TrafficDensity;
      else warn(`invalid traffic.density "${String(t.density)}"; using default ${defaultProfile.traffic.density}`);
    }
    if ("signalCycleSec" in t) {
      if (isNum(t.signalCycleSec) && t.signalCycleSec > 0) out.traffic.signalCycleSec = t.signalCycleSec;
      else warn("invalid traffic.signalCycleSec; using default");
    }
    if ("minGap" in t) {
      if (isNum(t.minGap) && t.minGap > 0) out.traffic.minGap = t.minGap;
      else warn("invalid traffic.minGap; using default");
    }
  } else if ("traffic" in src) warn("invalid traffic; using defaults");

  if (isRec(src.water)) {
    if ("enabled" in src.water) {
      if (typeof src.water.enabled === "boolean") out.water.enabled = src.water.enabled;
      else warn(`invalid water.enabled "${String(src.water.enabled)}"; using default ${defaultProfile.water.enabled}`);
    }
  } else if ("water" in src) warn("invalid water; using defaults");

  if ("districts" in src) {
    if (Array.isArray(src.districts)) {
      const kept: DistrictDef[] = [];
      for (const d of src.districts) {
        if (
          isRec(d) && nonEmpty(d.name) && isPair(d.center) && isNum(d.radius) && d.radius > 0 &&
          (STYLES as readonly unknown[]).includes(d.style) && isNum(d.density) && d.density >= 0 && d.density <= 1 &&
          (d.heightRange === undefined || (isPair(d.heightRange) && d.heightRange[0] < d.heightRange[1]))
        ) kept.push(d as unknown as DistrictDef);
        else warn(`invalid district entry dropped: ${JSON.stringify(d)?.slice(0, 80)}`);
      }
      if (kept.length > 0) out.districts = kept;
      else warn("no valid districts; using defaults");
    } else warn("invalid districts; using defaults");
  }

  if ("landmarks" in src) {
    if (Array.isArray(src.landmarks)) {
      const kept: LandmarkDef[] = [];
      const seen = new Set<string>();
      for (const l of src.landmarks) {
        if (!isRec(l) || !nonEmpty(l.name) || !nonEmpty(l.title) || !nonEmpty(l.description) || !nonEmpty(l.district)) {
          warn(`invalid landmark entry dropped: ${JSON.stringify(l)?.slice(0, 80)}`);
          continue;
        }
        if (seen.has(l.name)) {
          warn(`duplicate landmark "${l.name}" dropped`);
          continue;
        }
        seen.add(l.name);
        const entry = l as unknown as LandmarkDef;
        if (entry.action !== undefined) {
          const a = entry.action;
          const validAction =
            (a.type === "none") ||
            (a.type === "navigate" && isStr(a.route)) ||
            (a.type === "callback" && isStr(a.id));
          if (!validAction) {
            warn(`invalid action on landmark "${entry.name}"; action removed`);
            delete entry.action;
          }
        }
        kept.push(entry);
      }
      if (kept.length > 0) out.landmarks = kept;
      else warn("no valid landmarks; using defaults");
    } else warn("invalid landmarks; using defaults");
  }

  if ("roadSigns" in src) {
    if (Array.isArray(src.roadSigns)) {
      const kept: Array<{ text: string; color: string }> = [];
      for (const s of src.roadSigns) {
        if (!isRec(s)) {
          warn(`invalid road sign entry dropped: ${JSON.stringify(s)?.slice(0, 80)}`);
          continue;
        }
        const text = isStr(s.text) ? s.text : "";
        let color = defaultProfile.roadSigns[0]?.color ?? "#0ea5e9";
        if ("color" in s) {
          if (isStr(s.color) && HEX.test(s.color)) color = s.color;
          else warn(`unknown road sign color "${String(s.color)}"; using default ${color}`);
        }
        kept.push({ text, color });
      }
      if (kept.length > 0) out.roadSigns = kept;
      else warn("no valid road signs; using defaults");
    } else warn("invalid roadSigns; using defaults");
  }

  if ("emphasis" in src) {
    const em = src.emphasis;
    if (isRec(em)) {
      if ("districts" in em) {
        if (Array.isArray(em.districts) && em.districts.every(isStr)) out.emphasis.districts = em.districts;
        else warn("invalid emphasis.districts; using default");
      }
      if ("landmarks" in em) {
        if (Array.isArray(em.landmarks) && em.landmarks.every(isStr)) out.emphasis.landmarks = em.landmarks;
        else warn("invalid emphasis.landmarks; using default");
      }
      if ("dimOthers" in em) {
        if (typeof em.dimOthers === "boolean") out.emphasis.dimOthers = em.dimOthers;
        else warn("invalid emphasis.dimOthers; using default");
      }
    } else warn("invalid emphasis; using defaults");
  }

  if ("uiContent" in src) {
    const ui = src.uiContent;
    if (isRec(ui)) {
      if (isRec(ui.hero)) {
        if ("title" in ui.hero) {
          if (isStr(ui.hero.title)) out.uiContent.hero.title = ui.hero.title;
          else warn("invalid uiContent.hero.title; using default");
        }
        if ("tagline" in ui.hero) {
          if (isStr(ui.hero.tagline)) out.uiContent.hero.tagline = ui.hero.tagline;
          else warn("invalid uiContent.hero.tagline; using default");
        }
      } else warn("invalid uiContent.hero; using defaults");
      if (isRec(ui.hud)) {
        for (const key of Object.keys(defaultProfile.uiContent.hud) as Array<keyof typeof defaultProfile.uiContent.hud>) {
          if (key in ui.hud) {
            if (isStr(ui.hud[key])) out.uiContent.hud[key] = ui.hud[key] as string;
            else warn(`invalid uiContent.hud.${key}; using default`);
          }
        }
      } else if ("hud" in ui) warn("invalid uiContent.hud; using defaults");
    } else warn("invalid uiContent; using defaults");
  }

  if ("quality" in src) {
    const q = src.quality;
    if (isRec(q)) {
      if ("tier" in q) {
        if ((TIERS as readonly unknown[]).includes(q.tier)) out.quality.tier = q.tier as QualityTier;
        else warn(`invalid quality.tier "${String(q.tier)}"; using default`);
      }
    } else warn("invalid quality; using defaults");
  }

  return out;
}
