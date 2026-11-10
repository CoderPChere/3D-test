/**
 * Typed-array vehicle state for the traffic simulation (task 4.2): one
 * allocation for the whole fleet, stepped from a single shared frame loop —
 * no per-car React component owns simulation state. Pure logic; rendering
 * reads `world`/`heading` and writes transforms imperatively.
 */
import { createSeededRandom } from "../city/random";
import type { TrafficDensity } from "../config/city";
import type { SignalClock } from "./signal";

export interface VehicleSpawn {
    id: number;
    /** Cruising speed factor; frame target = baseSpeed * 200 * dt */
    baseSpeed: number;
    color: string;
    /** Phase offset 0..~1.2; also drives the scan-beam trigger */
    offset: number;
    roadIndex: number;
    isHorizontal: boolean;
    direction: 1 | -1;
    laneOffset: number;
    /** Index into CATEGORIES (car / bus / truck) */
    category: number;
    /** Slot within its category's InstancedMesh */
    slot: number;
}

export interface CategorySpec {
    readonly name: string;
    /** Chassis box dimensions (world units) */
    readonly size: [number, number, number];
    /** Inclusive baseSpeed range for this category */
    readonly speedRange: [number, number];
    /** Share of the fleet, summed across categories = 1 */
    readonly share: number;
}

/** Vehicle categories: distinct sizes and non-overlapping speed ranges */
export const CATEGORIES: readonly CategorySpec[] = [
    { name: "car", size: [2.5, 0.9, 1.2], speedRange: [0.03, 0.04], share: 0.7 },
    { name: "bus", size: [4.5, 1.4, 1.5], speedRange: [0.022, 0.028], share: 0.2 },
    { name: "truck", size: [3.5, 1.6, 1.6], speedRange: [0.016, 0.022], share: 0.1 },
];

const COLORS = ["#0ea5e9", "#22d3ee", "#3b82f6", "#6366f1", "#a855f7", "#ffffff", "#f59e0b"];

const RANGE = 60; // road half-length
const CYCLE_LEN = RANGE * 2;
const ROAD_POSITIONS = [-36, 0, 36];

/** Fraction of the spawn grid kept per density level (task 4.6) */
const DENSITY_KEEP: Record<TrafficDensity, number> = {
    off: 0,
    low: 0.25,
    medium: 0.5,
    high: 1,
};

/** Built-in default gap; the profile's traffic.minGap overrides it (task 4.9) */
export const MIN_GAP = 6;
/** Distance over which a follower eases off when closing on its leader */
const BRAKE_DIST = 6;

/** Seeded spawn grid: 3 roads x H/V x 2 directions x 2 lanes x 1 car = 24 at high density */
export function generateSpawns(seed: number, density: TrafficDensity = "high"): VehicleSpawn[] {
    const rng = createSeededRandom(seed + 2);
    const result: VehicleSpawn[] = [];
    const slots = CATEGORIES.map(() => 0);
    let id = 0;
    for (const roadIndex of [0, 1, 2]) {
        for (const isHorizontal of [true, false]) {
            for (const direction of [1, -1] as const) {
                for (const lane of [1, 2]) {
                    const offset =
                        roadIndex * 0.33 +
                        (isHorizontal ? 0 : 0.16) +
                        (direction === 1 ? 0 : 0.08) +
                        lane * 0.1;
                    const laneOffset = direction * (lane === 1 ? 1.0 : 3.0);
                    // category roll from the configured shares
                    const roll = rng.next();
                    let category = CATEGORIES.length - 1;
                    let acc = 0;
                    for (let c = 0; c < CATEGORIES.length; c++) {
                        acc += CATEGORIES[c].share;
                        if (roll < acc) {
                            category = c;
                            break;
                        }
                    }
                    const [lo, hi] = CATEGORIES[category].speedRange;
                    result.push({
                        id: id++,
                        baseSpeed: lo + rng.next() * (hi - lo),
                        color: COLORS[Math.floor(rng.next() * COLORS.length)],
                        offset,
                        roadIndex,
                        isHorizontal,
                        direction,
                        laneOffset,
                        category,
                        slot: slots[category]++,
                    });
                }
            }
        }
    }

    // density drives count and mix (task 4.6): keep a deterministic stride of
    // the grid so every density level stays evenly spread across all roads,
    // then renumber id/slot so instanced rendering indices stay dense
    const keep = Math.round((DENSITY_KEEP[density] * result.length));
    if (keep === 0) return [];
    const subset = result.filter((_, i) => (i * keep) % result.length === 0);
    const dense = CATEGORIES.map(() => 0);
    subset.forEach((v, i) => {
        v.id = i;
        v.slot = dense[v.category]++;
    });
    return subset;
}

export class TrafficSimulation {
    readonly spawns: readonly VehicleSpawn[];
    private progression: Float32Array | null = null;
    private speeds: Float32Array | null = null;
    private worldCoords: Float32Array | null = null; // x,z pairs
    private headings: Float32Array | null = null;
    /** Per-lane member indices (same road/orientation/direction/offset) for leader tracking */
    private readonly lanes: number[][];
    /** laneOf[i] = member array of the lane containing vehicle i (shared reference) */
    private readonly laneOf: number[][];
    /** lifecycle observability: how many times state was allocated/released */
    allocations = 0;
    releases = 0;

    constructor(spawns: readonly VehicleSpawn[], private readonly minGap: number = MIN_GAP) {
        this.spawns = spawns;
        const byLane = new Map<string, number[]>();
        spawns.forEach((v, i) => {
            const key = `${v.roadIndex}|${v.isHorizontal ? 1 : 0}|${v.direction}|${v.laneOffset}`;
            const lane = byLane.get(key);
            if (lane) lane.push(i);
            else byLane.set(key, [i]);
        });
        this.lanes = [...byLane.values()];
        this.laneOf = spawns.map((_, i) => this.lanes.find((lane) => lane.includes(i))!);
    }

    get running(): boolean {
        return this.progression !== null;
    }

    /** Interleaved world x,z per vehicle, or null while stopped */
    get world(): Float32Array | null {
        return this.worldCoords;
    }

    /** Y rotation per vehicle, or null while stopped */
    get heading(): Float32Array | null {
        return this.headings;
    }

    /** Current per-frame speed step of vehicle i, or 0 while stopped */
    speed(i: number): number {
        return this.speeds?.[i] ?? 0;
    }

    start(): void {
        if (this.running || this.spawns.length === 0) return; // density "off": never runs
        const n = this.spawns.length;
        this.progression = new Float32Array(n);
        this.speeds = new Float32Array(n);
        this.worldCoords = new Float32Array(n * 2);
        this.headings = new Float32Array(n);
        for (let i = 0; i < n; i++) this.progression[i] = this.spawns[i].offset * CYCLE_LEN;
        this.allocations++;
    }

    stop(): void {
        if (!this.running) return;
        this.progression = null;
        this.speeds = null;
        this.worldCoords = null;
        this.headings = null;
        this.releases++;
    }

    /**
     * Gap (0..120) from vehicle i to the nearest vehicle ahead of it in its
     * lane, plus that leader's index (-1 when the lane has no other vehicle).
     * A rel of 0 means the other vehicle sits at the same physical spot.
     */
    private leaderScan(p: Float32Array, lane: number[], i: number): [number, number] {
        let best = CYCLE_LEN;
        let leader = -1;
        for (const j of lane) {
            if (j === i) continue;
            const rel = (((p[j] - p[i]) % CYCLE_LEN) + CYCLE_LEN) % CYCLE_LEN;
            if (rel < best) {
                best = rel;
                leader = j;
            }
        }
        return [best, leader];
    }

    /** Advance all vehicles by dt seconds; no-op once stopped. */
    step(dt: number, clock: SignalClock): void {
        const p = this.progression;
        const s = this.speeds;
        const w = this.worldCoords;
        const h = this.headings;
        if (!p || !s || !w || !h) return;

        // pass 1: target speeds (red lights + lane leader), then advance
        for (let i = 0; i < this.spawns.length; i++) {
            const v = this.spawns[i];

            // position along the road (-60..60)
            let currentPos = (p[i] % CYCLE_LEN) - RANGE;
            if (currentPos < -RANGE) currentPos += CYCLE_LEN;

            // frame target speed, damped when a red signal is ahead
            let target = v.baseSpeed * 200 * dt;
            if (clock.mustStop(v.isHorizontal)) {
                let dist = Infinity;
                let atLine = false;
                for (const inter of ROAD_POSITIONS) {
                    const diff = (inter - currentPos) * v.direction;
                    if (diff > 2 && diff < 12) dist = diff;
                    // at the stop line (2 before the intersection center): hold
                    // until green — proportional damping alone only asymptotically
                    // approaches it and lets vehicles creep through on long reds
                    if (diff > 0 && diff <= 2) atLine = true;
                }
                if (dist < Infinity) target *= Math.max(0, (dist - 2) / 6);
                if (atLine) {
                    target = 0;
                    s[i] = 0;
                }
            }

            // lane following: ease off as the gap to the leader closes on minGap
            const [gap] = this.leaderScan(p, this.laneOf[i], i);
            target *= Math.min(1, Math.max(0, (gap - this.minGap) / BRAKE_DIST));

            s[i] += (target - s[i]) * 0.1;
            p[i] += s[i];
        }

        // pass 2: hard invariant — no follower ends a step closer than minGap
        // to its lane leader (cascades settle within lane.length passes; a lane
        // holds at most floor(CYCLE_LEN / minGap) vehicles at minimum spacing)
        for (const lane of this.lanes) {
            for (let pass = 0; pass <= lane.length; pass++) {
                let fixed = false;
                for (const i of lane) {
                    const [gap, leader] = this.leaderScan(p, lane, i);
                    if (leader !== -1 && gap < this.minGap) {
                        p[i] = p[leader] - this.minGap;
                        fixed = true;
                    }
                }
                if (!fixed) break;
            }
        }

        // pass 3: world transforms from the clamped progression
        for (let i = 0; i < this.spawns.length; i++) {
            const v = this.spawns[i];
            const raw = ((p[i] % CYCLE_LEN) + CYCLE_LEN) % CYCLE_LEN; // clamping may push p below 0
            let pos = raw - RANGE;
            if (v.direction < 0) pos = RANGE - raw;
            if (v.isHorizontal) {
                w[i * 2] = pos;
                w[i * 2 + 1] = ROAD_POSITIONS[v.roadIndex] + v.laneOffset;
                h[i] = v.direction > 0 ? 0 : Math.PI;
            } else {
                w[i * 2] = ROAD_POSITIONS[v.roadIndex] - v.laneOffset;
                w[i * 2 + 1] = pos;
                h[i] = v.direction > 0 ? -Math.PI / 2 : Math.PI / 2;
            }
        }
    }
}
