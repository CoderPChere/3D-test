/**
 * Single source of traffic-signal timing (traffic-simulation spec:
 * "intersections sharing the same phase so signals and vehicles never
 * disagree"). Pure logic — no React, no timers; the owning controller
 * ticks it from one frame loop and passes it to poles and vehicles.
 *
 * Cycle in percent 0..100 (matches the original trafficState semantics):
 *  0–40  horizontal green, vertical red
 * 40–50  horizontal yellow, vertical red
 * 50–90  horizontal red, vertical green
 * 90–100 horizontal red, vertical yellow
 */

export type SignalPhase = "green" | "yellow" | "red";

/** Phase a direction currently displays at this point in the cycle. */
export function signalFor(cycle: number, isHorizontal: boolean): SignalPhase {
    if (isHorizontal) {
        if (cycle < 40) return "green";
        if (cycle < 50) return "yellow";
        return "red";
    }
    if (cycle >= 50 && cycle < 90) return "green";
    if (cycle >= 90) return "yellow";
    return "red";
}

/** Whether a vehicle in that direction must be stopping (yellow counts as stop). */
export function mustStop(cycle: number, isHorizontal: boolean): boolean {
    return signalFor(cycle, isHorizontal) !== "green";
}

export class SignalClock {
    private phase = 0; // 0..100
    private readonly listeners = new Set<(clock: SignalClock) => void>();

    /** @param cycleDurationSec seconds for one full 0–100 cycle (profile traffic.signalCycleSec) */
    constructor(private readonly cycleDurationSec = 10) {}

    /** Advance by elapsed seconds; poles/vehicles read the result. */
    tick(dtSec: number): void {
        this.phase = (this.phase + (dtSec * 100) / this.cycleDurationSec) % 100;
        for (const fn of this.listeners) fn(this);
    }

    /** Current cycle position 0..100. */
    get cycle(): number {
        return this.phase;
    }

    signal(isHorizontal: boolean): SignalPhase {
        return signalFor(this.phase, isHorizontal);
    }

    mustStop(isHorizontal: boolean): boolean {
        return mustStop(this.phase, isHorizontal);
    }

    /** Notified on every tick; called once immediately so poles start correct. */
    subscribe(fn: (clock: SignalClock) => void): () => void {
        this.listeners.add(fn);
        fn(this);
        return () => {
            this.listeners.delete(fn);
        };
    }
}
