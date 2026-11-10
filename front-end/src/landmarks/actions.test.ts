import { describe, it, expect, vi, afterEach } from "vitest";
import { registerLandmarkCallback, invokeLandmarkCallback } from "./actions";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("landmark callback actions (task 5.6)", () => {
  it("invokes a callback registered under the action id", () => {
    const fn = vi.fn();
    registerLandmarkCallback("open-cctv", fn);
    expect(invokeLandmarkCallback("open-cctv")).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("warns and does not throw for an unregistered id", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(invokeLandmarkCallback("missing-id")).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("missing-id");
  });

  it("re-registering an id replaces the previous callback", () => {
    const first = vi.fn();
    const second = vi.fn();
    registerLandmarkCallback("dup", first);
    registerLandmarkCallback("dup", second);
    invokeLandmarkCallback("dup");
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
