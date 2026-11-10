import { describe, it, expect } from "vitest";
import { TrafficSimulation, generateSpawns, CATEGORIES, MIN_GAP, type VehicleSpawn } from "./simulation";
import { SignalClock } from "./signal";

const spawns = generateSpawns(1337);

describe("vehicle state lifecycle (task 4.2)", () => {
    it("start allocates state exactly once", () => {
        const sim = new TrafficSimulation(spawns);
        expect(sim.running).toBe(false);
        expect(sim.world).toBeNull();
        sim.start();
        expect(sim.allocations).toBe(1);
        const world = sim.world;
        expect(world).not.toBeNull();
        sim.start(); // second start must not reallocate
        expect(sim.allocations).toBe(1);
        expect(sim.world).toBe(world);
    });

    it("stop releases state exactly once", () => {
        const sim = new TrafficSimulation(spawns);
        sim.start();
        sim.stop();
        expect(sim.releases).toBe(1);
        expect(sim.world).toBeNull();
        expect(sim.running).toBe(false);
        sim.stop(); // idempotent — no double release
        expect(sim.releases).toBe(1);
    });

    it("step advances while running and is a no-op once stopped", () => {
        const sim = new TrafficSimulation(spawns);
        const clock = new SignalClock(); // cycle 0: horizontal green
        sim.start();
        const before = sim.world![0];
        sim.step(1 / 60, clock);
        expect(sim.world![0]).not.toBe(before);
        sim.stop();
        expect(() => sim.step(1 / 60, clock)).not.toThrow();
        sim.start(); // restart: one fresh allocation, releases unchanged
        expect(sim.allocations).toBe(2);
        expect(sim.releases).toBe(1);
        sim.step(1 / 60, clock);
        expect(sim.running).toBe(true);
    });

    it("spawn generation is deterministic per seed and covers the full grid", () => {
        expect(generateSpawns(1337)).toEqual(generateSpawns(1337));
        const s = generateSpawns(1337);
        expect(s.length).toBe(24); // 3 roads x H/V x 2 directions x 2 lanes
        expect(s.every((v) => v.baseSpeed > 0)).toBe(true);
    });

    it("each category's speeds stay within its configured range", () => {
        for (const v of generateSpawns(1337)) {
            const [lo, hi] = CATEGORIES[v.category].speedRange;
            expect(v.baseSpeed).toBeGreaterThanOrEqual(lo);
            expect(v.baseSpeed).toBeLessThanOrEqual(hi);
        }
    });

    it("the mix contains all three categories with distinct sizes", () => {
        const s = generateSpawns(1337);
        expect(CATEGORIES.length).toBeGreaterThanOrEqual(3); // car, bus, truck
        expect(new Set(s.map((v) => v.category)).size).toBe(3);
        const sizes = CATEGORIES.map((c) => c.size.join("x"));
        expect(new Set(sizes).size).toBe(CATEGORIES.length);
    });

    it("instance slots are unique and contiguous within each category", () => {
        const byCat = new Map<number, number[]>();
        for (const v of generateSpawns(1337)) {
            const slots = byCat.get(v.category) ?? [];
            slots.push(v.slot);
            byCat.set(v.category, slots);
        }
        for (const slots of byCat.values()) {
            expect([...slots].sort((a, b) => a - b)).toEqual(slots.map((_, i) => i));
        }
    });
});

// ---- helpers for lane-following tests (task 4.4) ----

const mod120 = (a: number) => ((a % 120) + 120) % 120;

const makeLaneVehicle = (id: number, over: Partial<VehicleSpawn> = {}): VehicleSpawn => ({
    id,
    baseSpeed: 0.03,
    color: "#ffffff",
    offset: 0,
    roadIndex: 1,
    isHorizontal: true,
    direction: 1,
    laneOffset: 1,
    category: 0,
    slot: id,
    ...over,
});

/** Along-lane world coordinate of array index i (x for horizontal, z for vertical) */
const alongCoord = (v: VehicleSpawn, world: Float32Array, i: number) =>
    v.isHorizontal ? world[i * 2] : world[i * 2 + 1];

/** Distance along travel direction from `me` to a point `other` ahead of it (0..120) */
const gapAhead = (dir: 1 | -1, me: number, other: number) =>
    dir === 1 ? mod120(other - me) : mod120(me - other);

describe("lane following and gap maintenance (task 4.4)", () => {
    it("following vehicle never closes below the minimum gap", () => {
        // same lane: follower starts closer than MIN_GAP and is much faster
        const leader = makeLaneVehicle(0, { offset: 30 / 120, baseSpeed: 0.016 });
        const follower = makeLaneVehicle(1, { offset: 25 / 120, baseSpeed: 0.04 });
        const sim = new TrafficSimulation([leader, follower]);
        sim.start();
        const clock = new SignalClock();
        for (let i = 0; i < 3600; i++) {
            sim.step(1 / 60, clock);
            const w = sim.world!;
            const gap = gapAhead(1, w[2], w[0]); // follower x to leader x
            expect(gap).toBeGreaterThanOrEqual(MIN_GAP - 1e-6);
        }
    });

    it("a 10-minute run at max density produces zero lane overlaps", () => {
        // proxy for max density (configured densities land in task 4.6):
        // two lanes packed at 6.5-unit spacing with alternating fast/slow vehicles,
        // so every follower is constantly pressuring its leader
        const N = 18; // floor(120 / 6.5)
        const all: VehicleSpawn[] = [];
        for (let i = 0; i < N; i++) {
            const speed = i % 2 === 0 ? 0.04 : 0.016;
            all.push(makeLaneVehicle(i, { offset: (i * 6.5) / 120, baseSpeed: speed }));
            all.push(
                makeLaneVehicle(100 + i, {
                    offset: (i * 6.5) / 120,
                    baseSpeed: speed,
                    roadIndex: 0,
                    isHorizontal: false,
                    direction: -1, // covers the reversed-coordinate lane too
                })
            );
        }
        const laneA = Array.from({ length: N }, (_, i) => i * 2);
        const laneB = Array.from({ length: N }, (_, i) => i * 2 + 1);

        const sim = new TrafficSimulation(all);
        sim.start();
        const clock = new SignalClock();
        // cheap per-step check (a matcher call per pair would dwarf the sim cost);
        // zero-tolerance asserted once below
        let violations = 0;
        let firstViolationStep = -1;
        for (let step = 0; step < 600 * 60; step++) {
            sim.step(1 / 60, clock);
            const w = sim.world!;
            for (const lane of [laneA, laneB]) {
                const dir = all[lane[0]].direction;
                const coords = lane.map((i) => alongCoord(all[i], w, i));
                for (let a = 0; a < coords.length; a++) {
                    for (let b = 0; b < coords.length; b++) {
                        if (a === b) continue;
                        // both ordered gaps >= MIN_GAP means physical separation
                        // is inside [MIN_GAP, 120 - MIN_GAP]: no overlap, ever
                        if (gapAhead(dir, coords[a], coords[b]) < MIN_GAP - 1e-6) {
                            violations++;
                            if (firstViolationStep < 0) firstViolationStep = step;
                        }
                    }
                }
            }
        }
        expect(violations).toBe(0);
        expect(firstViolationStep).toBe(-1);
    }, 300000);
});

describe("configurable traffic density (task 4.6)", () => {
    it("density levels produce monotonically increasing counts", () => {
        const counts = (["off", "low", "medium", "high"] as const).map(
            (d) => generateSpawns(1337, d).length
        );
        expect(counts[0]).toBe(0); // off
        expect(counts[1]).toBeGreaterThan(counts[0]);
        expect(counts[2]).toBeGreaterThan(counts[1]);
        expect(counts[3]).toBeGreaterThan(counts[2]);
    });

    it("off spawns zero vehicles with no updates running", () => {
        const sim = new TrafficSimulation(generateSpawns(1337, "off"));
        sim.start();
        expect(sim.running).toBe(false); // nothing ever runs for an empty fleet
        expect(sim.world).toBeNull();
        expect(() => sim.step(1 / 60, new SignalClock())).not.toThrow();
        expect(sim.world).toBeNull(); // still no state, still no updates
        expect(sim.allocations).toBe(0);
    });

    it("density subsets keep ids and instance slots dense for rendering", () => {
        for (const d of ["low", "medium", "high"] as const) {
            const s = generateSpawns(1337, d);
            expect(s.map((v) => v.id)).toEqual(s.map((_, i) => i)); // id === array index
            const slotsByCat = new Map<number, number[]>();
            for (const v of s) {
                const slots = slotsByCat.get(v.category) ?? [];
                slots.push(v.slot);
                slotsByCat.set(v.category, slots);
            }
            for (const slots of slotsByCat.values()) {
                expect(slots).toEqual(slots.map((_, i) => i)); // dense 0..n-1 per mesh
            }
        }
    });
});

describe("remount lifecycle (task 4.8)", () => {
    it("mount → unmount → mount yields one simulation with no doubled speeds", () => {
        // mount (component effect): exactly one instance starts
        const first = new TrafficSimulation(spawns);
        first.start();
        expect(first.running).toBe(true);
        expect(first.allocations).toBe(1);

        // unmount (effect cleanup): all registered vehicle state released
        first.stop();
        expect(first.releases).toBe(1);
        expect(first.world).toBeNull();
        expect(first.running).toBe(false);

        // remount: a fresh instance runs; the unmounted one can never contribute again
        const second = new TrafficSimulation(spawns);
        second.start();
        expect(second.allocations).toBe(1);
        expect(second.running).toBe(true);
        expect(first.world).toBeNull();
        expect(first.running).toBe(false);

        // no doubled speeds: after 10s the live instance matches a single fresh
        // baseline exactly — any stale loop/state leaking in would diverge
        const baseline = new TrafficSimulation(spawns);
        baseline.start();
        const c1 = new SignalClock();
        const c2 = new SignalClock();
        for (let i = 0; i < 600; i++) {
            second.step(1 / 60, c1);
            baseline.step(1 / 60, c2);
        }
        expect(Array.from(second.world!)).toEqual(Array.from(baseline.world!));
        expect(first.world).toBeNull(); // unmounted instance still holds nothing
    });
});

describe("traffic config wiring (task 4.9)", () => {
    it("honors a custom minGap from configuration", () => {
        // follower starts 5 units behind its leader; a configured gap of 10
        // must be maintained even though the built-in default is 6
        const leader = makeLaneVehicle(0, { offset: 30 / 120, baseSpeed: 0.016 });
        const follower = makeLaneVehicle(1, { offset: 25 / 120, baseSpeed: 0.04 });
        const sim = new TrafficSimulation([leader, follower], 10);
        sim.start();
        const clock = new SignalClock();
        let minObserved = Infinity;
        for (let i = 0; i < 3600; i++) {
            sim.step(1 / 60, clock);
            const w = sim.world!;
            minObserved = Math.min(minObserved, gapAhead(1, w[2], w[0]));
        }
        expect(minObserved).toBeGreaterThanOrEqual(10 - 1e-6);
    });
});

describe("traffic-light compliance (task 4.5)", () => {
    it("an approaching vehicle stops before the stop line at red and resumes at green", () => {
        // single horizontal vehicle driving toward the road-0 intersection (x = -36);
        // the stop line sits 2 units before the intersection center
        const STOP_LINE = -38;
        const INTERSECTION = -36;
        const vehicle = makeLaneVehicle(0, { roadIndex: 0, offset: 0 }); // starts at x = -60
        const sim = new TrafficSimulation([vehicle]);
        sim.start();

        const clock = new SignalClock();
        clock.tick(5); // phase 50: horizontal is red (shared signal source)

        // approach under red — the clock is held (only the app's frame loop ticks it)
        let maxX = -Infinity;
        let stable = 0;
        let stoppedX = -Infinity;
        for (let i = 0; i < 3000 && stable < 30; i++) {
            sim.step(1 / 60, clock);
            const x = sim.world![0];
            if (x > INTERSECTION) {
                throw new Error(`entered the intersection at red (x=${x.toFixed(3)})`);
            }
            maxX = Math.max(maxX, x);
            if (x === stoppedX) stable++;
            else {
                stable = 0;
                stoppedX = x;
            }
        }
        expect(maxX).toBeGreaterThan(STOP_LINE - 0.5); // drove right up to the stop line
        expect(stable).toBe(30); // and actually came to rest (never just slowed)
        expect(stoppedX).toBeLessThanOrEqual(STOP_LINE + 0.05); // stopped at/behind the stop line

        // stay red for another 4s: the parked vehicle must not creep
        let drift = 0;
        let lastX = stoppedX;
        for (let i = 0; i < 240; i++) {
            sim.step(1 / 60, clock);
            drift += sim.world![0] - lastX;
            lastX = sim.world![0];
        }
        expect(Math.abs(drift)).toBeLessThan(0.001);

        // green again: same shared source the poles display
        clock.tick(5.5); // wraps past yellow into horizontal green
        for (let i = 0; i < 360; i++) sim.step(1 / 60, clock);
        expect(sim.world![0]).toBeGreaterThan(stoppedX + 3); // resumes and clears the line
    });
});
