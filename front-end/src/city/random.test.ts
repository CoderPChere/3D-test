import { describe, it, expect } from "vitest";
import { createSeededRandom } from "./random";

describe("createSeededRandom", () => {
  it("produces an identical value sequence for the same base seed", () => {
    const a = createSeededRandom(1337);
    const b = createSeededRandom(1337);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("produces a different value sequence for a different base seed", () => {
    const a = createSeededRandom(1337);
    const b = createSeededRandom(1338);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it("returns values in [0, 1)", () => {
    const r = createSeededRandom(42);
    for (let i = 0; i < 100; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("keeps sequences independent between instances regardless of call interleaving", () => {
    const a = createSeededRandom(7);
    const b = createSeededRandom(7);
    a.next();
    b.next();
    expect(a.next()).toBe(b.next());
  });
});
