import { describe, it, expect } from "vitest";
import { signalFor, mustStop, SignalClock } from "./signal";

const DIRS = [true, false]; // horizontal, vertical

describe("single-sourced signal timing (task 4.1)", () => {
    it("a displayed green direction never has a stopped vehicle", () => {
        for (let cycle = 0; cycle < 100; cycle++) {
            for (const isHorizontal of DIRS) {
                if (signalFor(cycle, isHorizontal) === "green") {
                    expect(mustStop(cycle, isHorizontal)).toBe(false);
                }
            }
        }
    });

    it("vehicles stop on yellow and red", () => {
        for (let cycle = 0; cycle < 100; cycle++) {
            for (const isHorizontal of DIRS) {
                const shown = signalFor(cycle, isHorizontal);
                expect(mustStop(cycle, isHorizontal)).toBe(shown !== "green");
            }
        }
    });

    it("the two directions never show green at the same time", () => {
        for (let cycle = 0; cycle < 100; cycle++) {
            const hGreen = signalFor(cycle, true) === "green";
            const vGreen = signalFor(cycle, false) === "green";
            expect(hGreen && vGreen).toBe(false);
        }
    });

    it("clock signal and stop decision agree at every tick", () => {
        const clock = new SignalClock();
        for (let i = 0; i < 1000; i++) {
            clock.tick(0.1);
            for (const isHorizontal of DIRS) {
                if (clock.signal(isHorizontal) === "green") {
                    expect(clock.mustStop(isHorizontal)).toBe(false);
                } else {
                    expect(clock.mustStop(isHorizontal)).toBe(true);
                }
            }
        }
    });

    it("one full cycle takes signalCycleSec seconds and wraps", () => {
        const clock = new SignalClock(10);
        expect(clock.cycle).toBe(0);
        clock.tick(4);
        expect(clock.cycle).toBe(40); // 40% through the cycle
        clock.tick(6); // completes 10s
        expect(clock.cycle).toBe(0); // wrapped
        expect(clock.cycle).toBeGreaterThanOrEqual(0);
        expect(clock.cycle).toBeLessThan(100);
    });

    it("subscribers get an initial apply, then notify on tick, and can unsubscribe", () => {
        const clock = new SignalClock();
        let calls = 0;
        const unsub = clock.subscribe(() => calls++);
        expect(calls).toBe(1); // applied immediately on subscribe
        clock.tick(0.1);
        expect(calls).toBe(2);
        unsub();
        clock.tick(0.1);
        expect(calls).toBe(2);
    });
});
