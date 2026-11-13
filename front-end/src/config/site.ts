export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  /** Mirrors the CSS vars in globals.css :root — applied at runtime from layout.tsx */
  palette: { cyan: string; blue: string; purple: string; accent: string };
  labels: {
    sector: string;
    terminal: string;
    footer: string;
  };
  /** Exactly 4 entries render at the designed scene positions; extra entries stack at the origin */
  roadSigns: Array<{ text: string; color: string }>;
}

/**
 * Single source of truth for rebranding — see README "Rebrand in 5 minutes".
 * Pure data only: no browser APIs at module scope (this file is evaluated during `next build`).
 */
export const site: SiteConfig = {
  name: "CityFluxy",
  tagline: "Next-Gen Autonomous City Surveillance & Neural Traffic Intelligence",
  description:
    "A browser-only 3D city traffic simulation sandbox: build roads, place vehicles and signals, run deterministic seeded scenarios, and analyze live traffic metrics — entirely local, no server required.",
  palette: {
    cyan: "#22d3ee",
    blue: "#3b82f6",
    purple: "#a855f7",
    accent: "#0ea5e9",
  },
  labels: {
    sector: "SECTOR-07",
    terminal: "SECURE TERMINAL // SECTOR-07 ACCESS",
    footer: "© 2026 NEXUS SYSTEMS CORP",
  },
  roadSigns: [
    { text: "SECTOR 07", color: "#0ea5e9" },
    { text: "SPEED LIMIT: 60", color: "#ef4444" },
    { text: "AI PATROL", color: "#8b5cf6" },
    { text: "NEURAL NET ACTIVE", color: "#22c55e" },
  ],
};
