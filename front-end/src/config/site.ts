export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  /** Mirrors the CSS vars in globals.css :root — applied at runtime from layout.tsx */
  palette: { cyan: string; blue: string; purple: string; accent: string };
  /** null = service not configured; feature flags gate the UI */
  api: { auth: string | null; videoStream: string | null; chatbot: string | null };
  features: { auth: boolean; cctv: boolean; chatbot: boolean; traffic: boolean };
  labels: {
    sector: string;
    terminal: string;
    footer: string;
    auth: {
      login: string;
      signup: string;
      loginCta: string;
      signupCta: string;
      passwordLabel: string;
      emailPlaceholder: string;
    };
  };
  /** Exactly 4 entries render at the designed scene positions; extra entries stack at the origin */
  roadSigns: Array<{ text: string; color: string }>;
  chatbot: { name: string; welcome: string; systemPrompt: string };
}

/**
 * Single source of truth for rebranding — see README "Rebrand in 5 minutes".
 * Pure data only: no browser APIs at module scope (this file is evaluated during `next build`).
 */
export const site: SiteConfig = {
  name: "CityFluxy",
  tagline: "Next-Gen Autonomous City Surveillance & Neural Traffic Intelligence",
  description:
    "An advanced smart-city traffic management and surveillance platform fusing AI-powered vehicle detection, live CCTV feeds, neural traffic prediction, and a 3D city simulation.",
  palette: {
    cyan: "#22d3ee",
    blue: "#3b82f6",
    purple: "#a855f7",
    accent: "#0ea5e9",
  },
  api: {
    auth: null,
    videoStream: null,
    chatbot: null,
  },
  features: {
    auth: false,
    cctv: false,
    chatbot: false,
    traffic: false,
  },
  labels: {
    sector: "SECTOR-07",
    terminal: "SECURE TERMINAL // SECTOR-07 ACCESS",
    footer: "© 2026 NEXUS SYSTEMS CORP",
    auth: {
      login: "Neural Access",
      signup: "Network Register",
      loginCta: "Initiate Uplink",
      signupCta: "Authorize Creation",
      passwordLabel: "Uplink Cipher",
      emailPlaceholder: "operative@nexus.corp",
    },
  },
  roadSigns: [
    { text: "SECTOR 07", color: "#0ea5e9" },
    { text: "SPEED LIMIT: 60", color: "#ef4444" },
    { text: "AI PATROL", color: "#8b5cf6" },
    { text: "NEURAL NET ACTIVE", color: "#22c55e" },
  ],
  chatbot: {
    name: "CityFluxy AI",
    welcome:
      "NEURAL LINK ESTABLISHED. I am the CityFluxy AI Intelligence. How can I assist you with traffic predictions today?",
    systemPrompt:
      "You are a highly advanced futuristic AI traffic intelligence system called CityFluxy AI. Respond to the user's inquiry concisely and professionally. Ensure answers have a cybernetic or analytical tone.",
  },
};
