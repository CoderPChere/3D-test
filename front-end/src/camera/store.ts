/**
 * Camera mode state (camera-system spec: "single source of mode changes").
 * The CameraRig is the only writer of the three camera; this store tells it
 * which mode is active and which world point landmark-focus should frame.
 *
 * Camera mode config:
 *
 * - INITIAL_MODE   Start mode for every scene (re)mount — the one knob in
 *                  this file. Set it to any CameraMode value, e.g.
 *                    export const INITIAL_MODE: CameraMode = "overview";
 *                  to frame the whole city from above on load instead of
 *                  the scroll flight's opening pose.
 *
 * Modes (enter from project code with cameraMode.setMode(...)):
 *
 * - "hero"           Default start: the camera follows the page scroll
 *                    flight (the 500vh main timeline scrubbed in CameraRig).
 * - "overview"       Fixed elevated framing of the whole city.
 * - "flythrough"     Fixed low pass between the towers.
 * - "free"           User orbit — drag rotates, wheel/pinch zooms, with the
 *                    camera distance clamped to 10..200 and the polar angle
 *                    clamped so it never sinks below the ground plane.
 * - "landmark-focus" Entered automatically when a landmark is selected; the
 *                    mode active before the first selection is restored
 *                    when the selection clears.
 *
 * The scroll flight (hero) and landmark selection are the built-in mode
 * drivers; overview, flythrough, and free are entered from project code.
 */
export type CameraMode = "hero" | "overview" | "flythrough" | "free" | "landmark-focus";

/** Mode the rig starts in regardless of component mount order */
export const INITIAL_MODE: CameraMode = "hero";

export interface CameraModeState {
    mode: CameraMode;
    /** World point landmark-focus frames; null frames the city center */
    focus: readonly [number, number, number] | null;
}

let state: CameraModeState = { mode: INITIAL_MODE, focus: null };
const listeners = new Set<() => void>();

function update(patch: Partial<CameraModeState>): void {
    state = { ...state, ...patch };
    for (const l of listeners) l();
}

export const cameraMode = {
    get: (): CameraModeState => state,

    subscribe(fn: () => void): () => void {
        listeners.add(fn);
        return () => {
            listeners.delete(fn);
        };
    },

    setMode(mode: CameraMode): void {
        if (state.mode === mode) return;
        update({ mode });
    },

    setFocus(focus: CameraModeState["focus"]): void {
        update({ focus });
    },
};
