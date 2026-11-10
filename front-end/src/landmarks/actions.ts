/**
 * Callback actions for the landmark registry (landmark-interaction spec:
 * "invoke a callback"). Projects register a handler per action id; the
 * landmark panel invokes it when the action affordance is activated.
 */
type Callback = () => void;

const callbacks = new Map<string, Callback>();

export function registerLandmarkCallback(id: string, fn: Callback): void {
    callbacks.set(id, fn);
}

/** Returns true when a callback ran; warns and returns false otherwise. */
export function invokeLandmarkCallback(id: string): boolean {
    const fn = callbacks.get(id);
    if (!fn) {
        console.warn(`no callback registered for landmark action "${id}"`);
        return false;
    }
    fn();
    return true;
}
