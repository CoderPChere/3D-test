import { useSyncExternalStore } from "react";

/** Session shape shared by AuthSection (writer) and pages (readers). */
export interface Session {
  token: string;
  role: string;
  email: string;
  name: string;
}

const KEYS = {
  token: "auth_token",
  role: "auth_role",
  email: "auth_email",
  name: "auth_name",
} as const;

/** Returns null when logged out (or during SSR). */
export function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(KEYS.token);
  if (!token) return null;
  return {
    token,
    role: localStorage.getItem(KEYS.role) ?? "",
    email: localStorage.getItem(KEYS.email) ?? "",
    name: localStorage.getItem(KEYS.name) ?? "",
  };
}

export function writeSession(session: Session): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.token, session.token);
  localStorage.setItem(KEYS.role, session.role);
  localStorage.setItem(KEYS.email, session.email);
  localStorage.setItem(KEYS.name, session.name);
  notify();
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  notify();
}

// --- React binding -------------------------------------------------------
// localStorage is an external store: pages read it with useSyncExternalStore
// (null server snapshot) instead of setState inside an effect, which cascades
// renders and fails react-hooks/set-state-in-effect.

let cached: Session | null = null;
let primed = false;
const listeners = new Set<() => void>();

function getSnapshot(): Session | null {
  if (!primed) {
    cached = readSession();
    primed = true;
  }
  return cached;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function notify(): void {
  cached = readSession();
  primed = true;
  listeners.forEach((l) => l());
}

/** Live session for rendering: null during SSR/hydration, current value on the client. */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
