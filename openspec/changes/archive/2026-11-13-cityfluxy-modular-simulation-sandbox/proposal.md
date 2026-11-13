# Proposal

## Why

CityFluxy today is a scroll-driven marketing/demo page: a 500vh landing experience with a passive 3D city, fake AI-surveillance HUD numbers, and three side routes (`/cctv`, `/ai-prediction`, `/real-time-traffic`) that render "Not Configured" because every external service is disabled. None of it is interactive beyond camera orbit, and its traffic animation is a hardcoded loop — there is no simulation, no editing, and no persistence. For hackathon work in mobility and smart-city domains, the team needs a reusable, browser-only, interactive simulation workspace instead: a place where a user builds a city, runs deterministic local simulations, and inspects real metrics.

## What Changes

- **BREAKING** Replaces the scroll-driven landing page (`src/app/page.tsx` 500vh hero + marketing sections + footer) with a full-screen interactive workspace opened directly at `/`.
- **BREAKING** Removes the AI/surveillance product surface: `AIDetectionView`, `InvestigationDashboard` fake records, fake `CityHUD` metrics (random "Total Scans", hardcoded `14ms / YOLOv8x / 156 Active Cams`), decorative no-op buttons, `AnimatedTrafficSignal`, the Navbar "Active Surveillance" indicator, and the `/cctv`, `/ai-prediction`, `/real-time-traffic` routes (all currently gated off and rendering `NotConfigured`).
- **BREAKING** Deletes `CinematicCamera.tsx` (GSAP scroll-scrubbed camera that fights OrbitControls and kills all page ScrollTriggers on unmount); the viewport camera becomes standard orbit/pan/zoom.
- Adds a workspace shell: top navigation bar (project name, mode, save/load/import/export, undo/redo indicators), left tool toolbar, right contextual inspector, bottom simulation timeline.
- Adds four workspace modes — Explore, Build, Simulate, Analyze — each activating a different tool set and panel visibility.
- Adds interactive viewport behavior: object picking, hover highlight, ground-plane ghost placement, per-layer visibility toggles.
- Adds city object management: a typed city model (roads, buildings, vehicles, traffic signals, incidents, zones) with selection and inspector-driven property editing.
- Adds editing tools with undo/redo and basic placement validation (road/building overlap, bounds).
- Adds a standalone deterministic simulation engine (plain TypeScript, no React/Three.js): fixed timestep, seeded RNG, road graph, vehicle spawning/car-following, signal phase logic, road closures, incidents, rerouting, and computed metrics.
- Adds scenario management: create/rename/duplicate scenarios, schedule events (road closure, accident, vehicle surge, signal timing change), run/reset, and compare results.
- Adds analytics: metrics panels and visualization layers (density, congestion hotspots, vehicle distribution) computed from live simulation state — no hardcoded display values.
- Adds local persistence: save/load to `localStorage`, JSON export/import with schema validation, settings persistence.
- Adds a minimal module registry (`SandboxModule`) so domain capability packs (mobility first) can declare tools, object types, layers, and metrics.
- Adds disconnected integration ports (`BackendPort`, `AIProviderPort`, `DataProviderPort`) as TypeScript interfaces only — no implementations, no network calls.
- Adds quality settings (low/medium/high: DPR, shadows, instance counts) with a documented performance strategy targeting i3-7100 / 8 GB / GT 710 hardware.
- Adds state management with Zustand (new dependency): separate stores for app, city/project, selection, simulation, scenario, and settings state, replacing module-level mutable singletons (`trafficState`, `vehiclePositions`) and the 4× copy-pasted auth/modal `useState` blocks.
- Refactors rendering for performance: instanced vehicles, instanced/merged traffic-signal poles and buildings, removal of the runtime CDN HDRI fetch (`<Environment preset="city">`), single shadow-casting light with bounded `ContactShadows`.

## Capabilities

### New Capabilities

- `workspace-shell`: Full-screen workspace layout (top bar, toolbar, inspector, timeline) and the four workspace modes that gate tools and panels.
- `city-viewport`: Interactive 3D viewport — camera controls, object picking/highlighting, ghost placement preview, visualization-layer visibility, quality-aware rendering hooks.
- `city-objects`: The city domain model — typed objects (road, building, vehicle, traffic signal, incident, zone), identity, properties, and their inspector display/edit contract.
- `editing-tools`: Build-mode editing — placement, move, delete, undo/redo, and placement validation rules.
- `simulation-engine`: Deterministic local traffic simulation — fixed timestep, seeded RNG, road graph, vehicle spawning and following, signals, closures, incidents, rerouting, metrics.
- `scenario-management`: Scenario CRUD, event scheduling, running/resetting, and scenario result comparison.
- `analytics`: Simulation metrics and visualization layers derived from live simulation state, plus result export.
- `project-persistence`: Local save/load, JSON export/import with validation, settings persistence.
- `domain-modules`: Module registry declaring domain capability packs (tools, object types, layers, metrics) and how the workspace enables them.
- `performance-settings`: Quality tiers, adaptive DPR, entity budgets, and the low-end hardware performance strategy.
- `integration-ports`: Disconnected TypeScript ports for future backend, AI, and data providers.

### Modified Capabilities

(None — the project has no existing specs under `openspec/specs/`.)

## Impact

- **Code removed/rewritten:** `src/app/page.tsx` (landing sections), `src/components/Three/CinematicCamera.tsx`, `src/components/UI/AIDetectionView.tsx`, `InvestigationDashboard.tsx`, `CityHUD.tsx` (fake stats), `AnimatedTrafficSignal.tsx`, routes `src/app/cctv/`, `src/app/ai-prediction/`, `src/app/real-time-traffic/`, `public/realtime-traffic.html`.
- **Code refactored:** `src/components/Three/Scene.tsx` (camera/lights/environment), `City.tsx` (seeded generation, instanced poles, remove module singleton), `TrafficSystem.tsx` (engine-driven instead of self-animated), `Navbar.tsx` (surveillance chrome → workspace commands), `src/config/site.ts` (feature flags/labels), `src/lib/auth.ts` (retained, state moves to store).
- **Code kept:** R3F/Drei scene foundation, instanced windows/dashes/street-lights patterns, `AuthSection`/`ProfileModal`/`NotConfigured` (flagged off), `.glass`/neon design tokens in `globals.css`, Geist typography (fixes the unloaded-Inter mismatch).
- **Dependencies:** adds `zustand` (small, ~1 kB, React-only). No backend, database, auth server, AI API, live-data API, or API keys — the app remains fully functional offline apart from removing the existing drei HDRI CDN fetch.
- **Risk:** largest migration risks are the camera-control change (GSAP scroll camera removal), the traffic rewrite (render-coupled animation → engine-driven state), and performance on GT 710 (addressed via quality tiers and instancing).
- **Scope decision:** one cohesive change rather than several dependent changes. Trade-off: a single change keeps the migration atomic (the workspace replaces the landing page in one cut, so intermediate states are not shippable as the old product anyway), but its task list must be executed in strict phase order; if review prefers, tasks can be split per phase later without changing specs.
