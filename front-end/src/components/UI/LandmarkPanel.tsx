"use client";

import { useSyncExternalStore } from "react";
import { landmarkSelection } from "@/landmarks/store";
import { invokeLandmarkCallback } from "@/landmarks/actions";
import { defaultProfile } from "@/config/city";

/**
 * Page-layer info panel for the selected landmark (camera-system spec).
 * Fixed above HUD and scroll sections so it stays visible and clickable
 * at any scroll position — the canvas' drei Html portals sit below them.
 */
export default function LandmarkPanel() {
    const name = useSyncExternalStore(
        landmarkSelection.subscribe,
        landmarkSelection.get,
        landmarkSelection.get
    );
    if (!name) return null;
    const lm = defaultProfile.landmarks.find((l) => l.name === name);
    if (!lm) return null;
    const action = lm.action; // const keeps narrowing inside the affordance closures

    return (
        <div className="fixed bottom-24 left-6 z-20 w-72 glass p-4 rounded border border-neon-cyan bg-black/70">
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-neon-cyan font-mono uppercase tracking-widest">
                    {lm.title}
                </p>
                <button
                    aria-label="Close landmark info"
                    onClick={() => landmarkSelection.clear()}
                    className="text-slate-400 hover:text-neon-cyan text-sm leading-none"
                >
                    ✕
                </button>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">{lm.description}</p>

            {/* configurable action affordance — absent for none/undefined */}
            {action?.type === "navigate" && (
                <a
                    href={action.route}
                    aria-label="Landmark action"
                    className="mt-3 inline-block w-full text-center text-xs font-bold font-mono uppercase tracking-widest text-black bg-neon-cyan hover:bg-white py-1.5 rounded transition-colors"
                >
                    Open →
                </a>
            )}
            {action?.type === "callback" && (
                <button
                    aria-label="Landmark action"
                    onClick={() => invokeLandmarkCallback(action.id)}
                    className="mt-3 w-full text-xs font-bold font-mono uppercase tracking-widest text-neon-cyan border border-neon-cyan hover:bg-neon-cyan hover:text-black py-1.5 rounded transition-colors"
                >
                    Activate
                </button>
            )}
        </div>
    );
}
