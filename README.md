# Hackathon Starter — Universal Frontend Template

> **One config file rebrands it. Feature flags switch the service-dependent demos on or off.**

A clone-as-template frontend starter built on Next.js 16 / React 19 / TypeScript / Tailwind CSS v4 / Three.js. It ships with a fully working demo (the "CityFluxy" smart-city surveillance theme — 3D city, investigation dashboard, neon/glassmorphism UI) so a fresh clone looks good immediately. Rebrand it for your next project by editing **`front-end/src/config/site.ts`** — no `.env`, no build magic, config is a plain typed TS module.

---

## Quick Start

```bash
git clone <your-repo-url>
cd <repo>
cd front-end
npm install
npm run dev
```

Open `http://localhost:3000`. Requires Node.js v20.9+ (Next.js 16's minimum).

---

## Rebrand in 5 minutes

Everything identity-related lives in **`front-end/src/config/site.ts`**:

| Field | What it changes |
|---|---|
| `name`, `tagline`, `description` | Page `<title>`/meta, navbar logo, hero heading, footer brand, AI-operatives copy |
| `palette` (`cyan`, `blue`, `purple`, `accent`) | Theme tokens **and** all brand glow shadows (`glow-*` utilities follow these automatically) |
| `labels.sector`, `labels.terminal`, `labels.footer` | HUD/sector strings, terminal subtitle, footer copyright line |
| `labels.auth.*` | Login/signup modal headings, CTAs, password label, email placeholder |
| `roadSigns` (4 × `{text, color}`) | Text/colors of the 3D road signs in the city scene |
| `chatbot` (`name`, `welcome`, `systemPrompt`) | Chatbot persona and greeting |

Defaults are the proven CityFluxy demo content — change only what you need. Generic sci-fi flavor copy (HUD micro-copy, form labels like "Secure Email", dashboard demo rows) intentionally stays in the components as the template's style.

---

## Create a project profile

City shape, HUD copy, and quality defaults live in a second config file — **`front-end/src/config/city.ts`** (`defaultProfile`). Like `site.ts` it is pure data: edit a value, save, reload the page — no component code changes.

```ts
export const defaultProfile: CityProfile = {
  seed: 1337,                                          // same seed ⇒ identical city
  generation: { extent: 60, density: 0.7, heightRange: [10, 40] },
  environment: { mode: "auto", cycleDurationSec: 120 }, // "day" | "golden-hour" | "night" | "auto"
  traffic: { density: "medium", signalCycleSec: 10, minGap: 8 }, // "off" | "low" | "medium" | "high"
  water: { enabled: true },                            // false removes the river and its bridges
  districts: [
    { name: "Central Core", center: [0, 0], radius: 24, style: "highrise", heightRange: [30, 70], density: 0.85 },
    // style: "highrise" | "midrise" | "lowrise" | "campus" | "park" (park = green space, no buildings)
  ],
  landmarks: [
    {
      name: "harbor-exchange",
      title: "Harbor Exchange",
      description: "Riverside trading floor.",
      district: "Central Core",                                  // must match a districts[].name
      action: { type: "navigate", route: "/real-time-traffic" }, // or { type: "none" } / { type: "callback", id: "..." }
    },
  ],
  emphasis: { districts: [], landmarks: ["nexus-spire"], dimOthers: false },
  uiContent: {
    hero: { title: "CITYFLUXY", tagline: "…" },
    hud: { totalScans: "Total Scans", activeViolations: "Active Violations", /* …7 HUD labels */ },
  },
  quality: { tier: "medium" },                           // "low" | "medium" | "high"
};
```

**Rules of thumb:**

- **Defaults are safe** — `validateProfile()` falls back per invalid field (with a console warning), so a malformed profile renders the default city instead of crashing.
- **Put district centers on the 12-unit plot grid** (multiples of 12) so generated roads run between building plots instead of through them; `style: "park"` districts stay green.
- **Landmarks get a reserved plot at their district center**; duplicate names or missing fields are skipped with a console warning and the rest still work.
- **Changing `seed`, `generation.*`, or district layout regenerates the city on reload** — the same seed always reproduces the identical layout.
- **Every field and its default** is documented in the comment block at the top of `src/config/city.ts`.

---

## Feature flags

All service-dependent demos are **OFF by default** — a fresh clone has no dead buttons or broken embeds. Disabled features hide their nav links and swap their dead element for a styled *"Service Not Configured"* panel (routes stay reachable; delete the route folder to remove a page entirely).

| Flag (in `site.features`) | Default | Gates |
|---|---|---|
| `auth` | `false` | Navbar login button + access gating on `/cctv`, `/ai-prediction`, `/real-time-traffic` |
| `cctv` | `false` | CCTV nav link + the feed slot on `/cctv` |
| `chatbot` | `false` | "AI Prediction" nav link + chatbot panel on `/ai-prediction` |
| `traffic` | `false` | "Live Traffic" nav link + iframe on `/real-time-traffic` |

### API endpoints (in `site.api`)

| Key | Default | Meaning |
|---|---|---|
| `auth` | `null` | Auth backend base URL. `null` + `features.auth: true` → **mock mode** |
| `videoStream` | `null` | MJPEG stream URL, e.g. `http://127.0.0.1:8000/video` |
| `chatbot` | `null` | Ollama base URL (e.g. an ngrok tunnel) — called as `POST {url}/api/generate` |

**Mock-auth rule:** with `features.auth: true` and `api.auth: null`, login accepts *any* credentials, writes a local session, and shows a visible **"DEMO MODE — any password works"** hint — so login-gated demos work with zero backend. Set `api.auth` to switch to real fetches.

---

## Auth API contract

When `api.auth` is set, the modal calls (paths and response shape are fixed):

```
POST {api.auth}/api/v1/auth/login     body: { email, password }
POST {api.auth}/api/v1/auth/signup    body: { name, email, password, organization }
→ 200 response: { access_token, role, name }
→ error response: { detail }          (HTTP 4xx)
```

The session is stored in `localStorage` under `auth_token`, `auth_role`, `auth_email`, `auth_name` (read/written only via `front-end/src/lib/auth.ts`).

---

## Routes

| Route | Page | Notes |
|---|---|---|
| `/` | Home | 3D city hero, scroll sections, Investigation Dashboard — always available |
| `/cctv` | Live CCTV terminal | Feed slot gated by `features.cctv` + `api.videoStream`; auth-gated when `features.auth` |
| `/ai-prediction` | Neural Traffic Predictor | Chatbot panel gated by `features.chatbot` + `api.chatbot`; auth-gated when `features.auth` |
| `/real-time-traffic` | Traffic dashboard | Iframe gated by `features.traffic`; auth-gated when `features.auth` |

**To remove a page:** delete its folder under `front-end/src/app/<route>/`. Set its flag to `false` to just hide it.

---

## What stays static (by design)

- **Sci-fi flavor copy** — form labels, HUD micro-copy, dashboard demo data. It's the template's style, not its identity.
- **Semantic status glows** — red/green/amber shadows (violations, REC dot, traffic lights) are status signals, not brand.
- **3D scene art** — building/road/car colors and geometry in `src/components/Three/`.

---

## Project structure

```
front-end/
├── src/
│   ├── app/                  # Next.js app router (4 feature routes + _not-found)
│   ├── components/
│   │   ├── Three/            # Procedural 3D city engine (Three.js / R3F)
│   │   └── UI/               # Navbar, AuthSection, chatbot, dashboards, modals
│   ├── config/site.ts        # ← single source of truth for rebranding + flags
│   └── lib/auth.ts           # session read/write/clear helper
└── public/realtime-traffic.html   # standalone iframe dashboard
```

**Tech stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Three.js (`@react-three/fiber` + `@react-three/drei`), Framer Motion, GSAP, Lucide React.

### UI components

| Component | Purpose |
|---|---|
| `CursorGlow.tsx` | Custom glowing cursor that follows the mouse |
| `CityHUD.tsx` | Futuristic heads-up display overlay on the 3D city |
| `AIDetectionView.tsx` | AI detection metrics panel in homepage scroll |
| `AnimatedTrafficSignal.tsx` | Animated traffic signal widget |
| `Navbar.tsx` | Global navigation, flag-aware + auth state aware |
| `AuthSection.tsx` | Login/signup modal (real / mock / off — three states) |
| `ProfileModal.tsx` | View/edit profile + logout |
| `NotConfigured.tsx` | Styled panel shown where a disabled feature's content would be |

---

## Verification

```bash
cd front-end
npm run lint        # eslint — exits 0 (warnings allowed)
npx tsc --noEmit    # type-check
npm test            # vitest unit suite
npm run build       # all routes prerender statically
```

Config is build-time data — keep `src/config/site.ts` pure (no browser APIs at module scope) or static generation breaks.
