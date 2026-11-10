import { describe, it, expect } from "vitest";
import { cameraMode, INITIAL_MODE } from "./store";

describe("camera mode store (task 5.1)", () => {
    it("starts in the initial mode and notifies subscribers on change", () => {
        expect(cameraMode.get().mode).toBe(INITIAL_MODE);
        let notified = 0;
        const off = cameraMode.subscribe(() => notified++);
        cameraMode.setMode("overview");
        expect(cameraMode.get().mode).toBe("overview");
        expect(notified).toBe(1);
        cameraMode.setMode("overview"); // no-op: no duplicate notification
        expect(notified).toBe(1);
        off();
        cameraMode.setMode("free");
        expect(cameraMode.get().mode).toBe("free");
        expect(notified).toBe(1); // unsubscribed
    });

    it("stores a landmark focus point", () => {
        cameraMode.setFocus([12, 0, -8]);
        expect(cameraMode.get().focus).toEqual([12, 0, -8]);
        cameraMode.setFocus(null);
        expect(cameraMode.get().focus).toBeNull();
    });
});
