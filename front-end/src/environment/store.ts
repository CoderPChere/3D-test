import { createEnvironmentController, type EnvController } from "./controller";
import { defaultProfile } from "../config/city";

/**
 * The single shared environment controller (dynamic-environment spec:
 * "single source of mode changes"). The frame loop in EnvironmentRig ticks it;
 * UI subscribes to read mode + transition progress.
 */
export const environment: EnvController = createEnvironmentController({
    ...defaultProfile.environment,
    // SSR/prerender-safe: no window during build
    reducedMotion:
        typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
});
