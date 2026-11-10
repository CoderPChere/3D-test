import { describe, it, expect } from "vitest";
import { createEnvironmentController, MODE_PRESETS } from "./controller";
import type { EnvironmentMode } from "../config/city";

const ALL_MODES: EnvironmentMode[] = ["day", "golden-hour", "night"];

describe("environment controller", () => {
  it("each mode has a distinct look (sky, fog, ambient, directional)", () => {
    for (let i = 0; i < ALL_MODES.length; i++) {
      for (let j = i + 1; j < ALL_MODES.length; j++) {
        const a = MODE_PRESETS[ALL_MODES[i]];
        const b = MODE_PRESETS[ALL_MODES[j]];
        const same =
          a.skyTop === b.skyTop &&
          a.skyHorizon === b.skyHorizon &&
          a.fogColor === b.fogColor &&
          a.fogDensity === b.fogDensity &&
          a.ambientColor === b.ambientColor &&
          a.ambientIntensity === b.ambientIntensity &&
          a.sunColor === b.sunColor &&
          a.sunIntensity === b.sunIntensity &&
          a.sunPosition[0] === b.sunPosition[0] &&
          a.sunPosition[1] === b.sunPosition[1] &&
          a.sunPosition[2] === b.sunPosition[2];
        expect(same, `${ALL_MODES[i]} vs ${ALL_MODES[j]} must differ`).toBe(false);
      }
    }
  });

  it("transitions smoothly: start = from-mode, end = to-mode, midpoint is a blend", () => {
    const c = createEnvironmentController({ mode: "day", cycleDurationSec: 120, transitionDurationSec: 2 });
    const day = MODE_PRESETS.day;
    const night = MODE_PRESETS.night;
    c.setMode("night");
    expect(c.values().fogDensity).toBeCloseTo(day.fogDensity, 5);
    c.tick(1); // halfway through the 2s transition
    const mid = c.values();
    expect(mid.fogDensity).toBeCloseTo((day.fogDensity + night.fogDensity) / 2, 5);
    expect(mid.fogDensity).not.toBeCloseTo(day.fogDensity, 5);
    expect(mid.fogDensity).not.toBeCloseTo(night.fogDensity, 5);
    c.tick(1);
    const end = c.values();
    expect(end.fogDensity).toBeCloseTo(night.fogDensity, 5);
    expect(end.skyTop).toBe(night.skyTop);
    expect(end.sunPosition).toEqual(night.sunPosition);
    expect(c.getState().mode).toBe("night");
    expect(c.getState().progress).toBe(1);
  });

  it("auto mode cycles day → golden-hour → night → day in order", () => {
    // full cycle 30s ⇒ each leg is 10s
    const c = createEnvironmentController({ mode: "auto", cycleDurationSec: 30 });
    expect(c.getState().cycling).toBe(true);
    expect(c.getState().mode).toBe("day");
    c.tick(10);
    expect(c.getState().mode).toBe("golden-hour");
    c.tick(10);
    expect(c.getState().mode).toBe("night");
    c.tick(10);
    expect(c.getState().mode).toBe("day");
    c.tick(10);
    expect(c.getState().mode).toBe("golden-hour");
  });

  it("a pinned mode never auto-advances", () => {
    const c = createEnvironmentController({ mode: "day", cycleDurationSec: 30 });
    expect(c.getState().cycling).toBe(false);
    for (let i = 0; i < 100; i++) c.tick(10);
    expect(c.getState().mode).toBe("day");
    expect(c.values().skyTop).toBe(MODE_PRESETS.day.skyTop);
  });

  it("a pinned mode can still be changed manually, then stays put", () => {
    const c = createEnvironmentController({ mode: "day", cycleDurationSec: 30 });
    c.setMode("night");
    c.tick(2);
    expect(c.getState().mode).toBe("night");
    for (let i = 0; i < 100; i++) c.tick(10);
    expect(c.getState().mode).toBe("night");
    expect(c.values().skyTop).toBe(MODE_PRESETS.night.skyTop);
  });

  it("subscribers are notified when the active mode changes", () => {
    const c = createEnvironmentController({ mode: "day", cycleDurationSec: 120, transitionDurationSec: 2 });
    let notified = 0;
    const unsub = c.subscribe(() => notified++);
    expect(c.getState()).toMatchObject({ mode: "day", progress: 1 });
    c.setMode("golden-hour");
    expect(notified).toBe(1);
    expect(c.getState().mode).toBe("golden-hour");
    expect(c.getState().progress).toBe(0);
    c.tick(0.5); // still mid-transition: no new mode change ⇒ no notification
    expect(notified).toBe(1);
    unsub();
    c.setMode("night");
    expect(notified).toBe(1); // unsubscribed
  });

  it("reduced motion prevents auto-advance even in auto mode", () => {
    const c = createEnvironmentController({ mode: "auto", cycleDurationSec: 30, reducedMotion: true });
    expect(c.getState().cycling).toBe(false);
    for (let i = 0; i < 100; i++) c.tick(10);
    expect(c.getState().mode).toBe("day");
    expect(c.values().skyTop).toBe(MODE_PRESETS.day.skyTop);
    // manual selection still applies
    c.setMode("night");
    c.tick(2);
    expect(c.getState().mode).toBe("night");
    expect(c.values().skyTop).toBe(MODE_PRESETS.night.skyTop);
    for (let i = 0; i < 100; i++) c.tick(10);
    expect(c.getState().mode).toBe("night");
  });

  it("reduced motion minimizes manual transitions (settles within one frame)", () => {
    const c = createEnvironmentController({ mode: "day", cycleDurationSec: 30, reducedMotion: true });
    c.setMode("night");
    c.tick(1 / 60);
    expect(c.getState().progress).toBe(1);
    expect(c.values().skyTop).toBe(MODE_PRESETS.night.skyTop);
    expect(c.values().sunPosition).toEqual(MODE_PRESETS.night.sunPosition);
  });

  it("same base config yields identical value sequences (determinism)", () => {
    const a = createEnvironmentController({ mode: "auto", cycleDurationSec: 30 });
    const b = createEnvironmentController({ mode: "auto", cycleDurationSec: 30 });
    const seqA: number[] = [];
    const seqB: number[] = [];
    for (let i = 0; i < 40; i++) {
      a.tick(1);
      b.tick(1);
      seqA.push(a.values().fogDensity, a.values().ambientIntensity);
      seqB.push(b.values().fogDensity, b.values().ambientIntensity);
    }
    expect(seqA).toEqual(seqB);
  });
});
