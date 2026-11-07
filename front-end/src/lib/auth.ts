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
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}
