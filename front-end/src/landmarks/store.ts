/**
 * Landmark selection (camera-system spec: exclusive selection + info panel).
 * The Three-side mesh component and the page-layer panel both talk to this
 * store; exactly one landmark can be selected at a time.
 */
let selected: string | null = null;
const listeners = new Set<() => void>();

function notify(): void {
    for (const l of listeners) l();
}

export const landmarkSelection = {
    get: (): string | null => selected,

    subscribe(fn: () => void): () => void {
        listeners.add(fn);
        return () => {
            listeners.delete(fn);
        };
    },

    select(name: string): void {
        if (selected === name) return;
        selected = name;
        notify();
    },

    clear(): void {
        if (selected === null) return;
        selected = null;
        notify();
    },
};
