# CityFluxy

A browser-only 3D city traffic simulation sandbox: build roads, place vehicles and signals, run deterministic seeded scenarios, and analyze live traffic metrics — entirely local, no server, no API keys, no network calls.

## Quick start

```bash
git clone https://github.com/CoderPChere/3D-test.git
cd 3D-test/front-end
npm install
npm run dev
```

Open `http://localhost:3000` (Node.js 18+).

## What it does

- **Four workspace modes** — Explore / Build / Simulate / Analyze — over a live 3D city (Three.js + React Three Fiber)
- **Build** — place and edit roads, buildings, vehicles, signals, incidents, and zones, with undo/redo and rejected-placement feedback
- **Simulate** — deterministic fixed-timestep engine: play / pause / reset / speed, cycling traffic signals, road closures, accidents, vehicle surges, and rerouting
- **Scenarios** — create, rename, duplicate; schedule typed events; runs are recorded and comparable side by side; results exportable as JSON
- **Analyze** — live metrics computed from simulation state (speed, density, congestion, queues, throughput, distribution), congestion heatmap, density layers
- **Quality tiers** — Low / Medium / High (DPR, shadows, detail, entity budgets) tuned for the i3-7100 / 8 GB / GT 710 target hardware
- **Local persistence** — `localStorage` save/load plus validated JSON import/export; nothing leaves the browser
- Ships a seeded **"Rush Hour" demo scenario** on first run

## Project structure

```
front-end/                     Next.js app (single route: /)
├── src/lib/simulation/        pure-TS deterministic engine (no React/Three/DOM imports)
├── src/lib/model/             project model, seeded generation, placement, import validation
├── src/lib/state/             Zustand stores (project, scenario, sim, settings, modules)
├── src/lib/ports/             future integration contracts — interfaces only, all null
├── src/components/Three/      3D scene (instanced buildings, vehicles, signals, layers)
├── src/components/Workspace/  top bar, toolbar, inspector, timeline, analytics panels
├── docs/performance.md        perf strategy + recorded target-hardware benchmark
└── README.md                  test commands, persistence schemas, port contracts
openspec/                      spec-driven planning record (archived change + specs)
images/                        reference artwork used while building the scene
prompt.txt                     original requirements brief
```

## Verification

```bash
cd front-end
npx tsc --noEmit   # types
npx vitest run     # unit tests (engine determinism, model, stores, persistence)
npm run lint
npm run build
```

All four gates pass. `front-end/docs/performance.md` records the benchmark run on the exact target hardware (60 fps vsync-locked across all scenarios); `openspec/changes/archive/2026-11-13-cityfluxy-modular-simulation-sandbox/acceptance.md` records the 15/15 acceptance pass.

## Docs

- [`front-end/README.md`](front-end/README.md) — test suite, localStorage keys, JSON schemas, integration-port contracts
- [`front-end/docs/performance.md`](front-end/docs/performance.md) — performance scenarios, thresholds, remediation playbook
- [`openspec/`](openspec/) — proposal, design, specs, and task ledger for the simulation-sandbox change
