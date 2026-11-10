import { describe, it, expect, vi, afterEach } from "vitest";
import { validateProfile, defaultProfile } from "./city";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("validateProfile", () => {
  it("passes a valid profile through unchanged with no warnings", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = validateProfile(defaultProfile);
    expect(result).toEqual(defaultProfile);
    expect(warn).not.toHaveBeenCalled();
  });

  it("falls back to the default seed when the seed is invalid", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = validateProfile({ ...defaultProfile, seed: -5 });
    expect(result.seed).toBe(defaultProfile.seed);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("seed");
  });

  it("falls back to a default color when a road sign color is unknown", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = validateProfile({
      ...defaultProfile,
      roadSigns: [{ text: "TEST SIGN", color: "not-a-color" }],
    });
    expect(result.roadSigns[0].color).toMatch(/^#[0-9a-f]{3,8}$/i);
    expect(result.roadSigns[0].text).toBe("TEST SIGN");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("color");
  });

  it("falls back when generation density is out of range", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = validateProfile({
      ...defaultProfile,
      generation: { ...defaultProfile.generation, density: 5 },
    });
    expect(result.generation.density).toBe(defaultProfile.generation.density);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("density");
  });

  it("falls back when traffic density is not a known level", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = validateProfile({
      ...defaultProfile,
      traffic: { ...defaultProfile.traffic, density: "insane" as never },
    });
    expect(result.traffic.density).toBe(defaultProfile.traffic.density);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("density");
  });

  it("uses defaults and warns when given a completely invalid profile", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = validateProfile("not an object");
    expect(result).toEqual(defaultProfile);
    expect(warn).toHaveBeenCalled();
  });
});

describe("landmark registry consumption (task 5.5)", () => {
  it("skips duplicate and invalid landmark entries with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = validateProfile({
      ...defaultProfile,
      landmarks: [
        { name: "alpha", title: "Alpha", description: "First", district: "Central Core" },
        { name: "alpha", title: "Alpha Copy", description: "Duplicate name", district: "Central Core" },
        { name: "", title: "No Name", description: "Empty name", district: "Central Core" },
        { name: "beta", title: "Beta" }, // missing description + district
        {
          name: "gamma",
          title: "Gamma",
          description: "Bad action",
          district: "Central Core",
          action: { type: "navigate" }, // navigate without a route
        },
      ],
    });
    expect(result.landmarks.map((l) => l.name)).toEqual(["alpha", "gamma"]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('duplicate landmark "alpha" dropped')
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("invalid landmark entry dropped")
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('invalid action on landmark "gamma"')
    );
    // invalid action stripped, entry kept
    expect(result.landmarks[1].action).toBeUndefined();
  });

  it("keeps a valid landmark action intact", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = validateProfile({
      ...defaultProfile,
      landmarks: [
        {
          name: "delta",
          title: "Delta",
          description: "Nav",
          district: "Central Core",
          action: { type: "navigate", route: "/cctv" },
        },
      ],
    });
    expect(result.landmarks).toHaveLength(1);
    expect(result.landmarks[0].action).toEqual({ type: "navigate", route: "/cctv" });
    expect(warn).not.toHaveBeenCalled();
  });
});
