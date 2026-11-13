# Tasks

## 1. Phase 0 — Audit and preparation

- [x] 1.1 Add dependencies: `zustand` (state) and `vitest` (dev) to `front-end/package.json`; verify `npm install` succeeds and `npx vitest run` executes an empty suite
- [x] 1.2 Define core types in `front-end/src/lib/model/` (`CityProject`, discriminated `CityObject` union for road/building/vehicle/signal/incident/zone, `ObjectId`, `Scenario`, `SandboxModule`, project `version`); verify `npx tsc --noEmit` passes
- [x] 1.3 Implement seeded RNG (`mulberry32`) and a deterministic city/fleet generator producing `CityProject` from a seed; verify unit test: same seed → deep-equal project, different seed → differing building heights
- [x] 1.4 Implement pure placement validation `canPlace(objects, candidate, bounds)` returning `{ok}` or `{ok:false, reason}`; verify unit tests cover overlap, out-of-bounds, and valid placement
- [x] 1.5 Record migration boundaries: mark reusable components (`Scene`, `City`, `TrafficSystem` core, `Navbar` shell, `AuthSection`/`ProfileModal`/`NotConfigured`, design tokens) vs removal list (`CinematicCamera`, `AIDetectionView`, `InvestigationDashboard`, `CityHUD` fake stats, `AnimatedTrafficSignal`, `/cctv`, `/ai-prediction`, `/real-time-traffic`, `public/realtime-traffic.html`) in the change's design.md reference comment; verify list matches proposal.md "Impact"

## 2. Phase 1 — Workspace foundation

- [x] 2.1 Add Zustand stores (`app`, `project`, `selection`, `sim`, `scenario`, `settings`) with selectors and undo/redo snapshot stack (bound 50, project store only); verify unit tests: undo→redo round-trip, redo stack cleared on new edit, bounds enforced
- [x] 2.2 Build workspace shell layout (top bar, left toolbar, right inspector container, bottom timeline, central viewport region) in `front-end/src/app/page.tsx`, replacing the 500vh landing sections; verify: `/` opens directly into the workspace with no marketing sections or scroll intro
- [x] 2.3 Implement four modes (Explore/Build/Simulate/Analyze) as `useAppStore` state gating toolbar tools and panel visibility; verify in browser: switching modes changes enabled tools without reload and without altering city/selection/simulation state
- [x] 2.4 Wire top-bar commands — project name, mode display, save/load/import/export buttons, settings entry, undo/redo indicators reflecting history; verify: every rendered control produces an observable state change (no-op controls removed)
- [x] 2.5 Implement right inspector with idle state and per-type property display/edit for road/building/vehicle/signal; verify: selection clears → idle state; editing road speed limit updates both stored value and displayed value
- [x] 2.6 Implement bottom timeline (play/pause/reset, speed 0.5×/1×/2×/4×, sim time, status, scenario selector placeholder); verify in browser against a stub sim driver: play advances time, reset returns to zero, status transitions correctly
- [x] 2.7 Remove AI-surveillance surfaces and dead routes (`AIDetectionView`, `InvestigationDashboard`, `CityHUD` fake stats, `AnimatedTrafficSignal`, Navbar surveillance chrome, the three side-route pages, `public/realtime-traffic.html`); verify `npm run build` succeeds and no removed module is imported anywhere (grep for imports = 0)
- [x] 2.8 Fix typography tokens (load/use Geist consistently, remove unloaded Inter hardcode in `globals.css`); verify rendered UI uses Geist and `npx next lint` passes

## 3. Phase 2 — Interactive 3D environment

- [x] 3.1 Refactor `Scene.tsx`: delete `CinematicCamera`, enable OrbitControls with pan/zoom + min/max distance, single shadow-casting directional light, bounded `ContactShadows`, replace `<Environment preset="city">` with a local/procedural environment; verify: orbit/pan/zoom work, no scroll-linked camera motion, and scene renders with network blocked (no CDN fetch)
- [x] 3.2 Refactor `City.tsx` to render from `useProjectStore` data with seeded generation (remove `Math.random()` and module-level `trafficState`); verify: two loads with same seed show identical cities; no module-level mutable sim state remains (grep `export const trafficState` = 0)
- [x] 3.3 Implement instanced rendering: buildings, signal poles/lights, vehicles (per body-type `InstancedMesh`), keeping existing instanced windows/dashes/streetlights; verify: draw calls do not grow linearly with entity count (render stats check) and scene still matches reference images in `images/`
- [x] 3.4 Implement picking: click selects (scene highlight + inspector sync), hover shows hover highlight, empty-ground click clears selection; verify: all three scenarios from `city-viewport` spec pass manually and selection store reflects clicks
- [x] 3.5 Implement ghost placement preview following the pointer with valid/invalid styling driven by `canPlace`; verify: invalid preview styling appears on overlap/bounds and clicking in that state creates nothing (no rejection reason missing)
- [x] 3.6 Implement visualization-layer visibility toggles (geometry/vehicles/signals/heatmap/congestion) in `useSettingsStore`; verify: toggling one layer hides only it, and state persists across mode switches

## 4. Phase 3 — Local simulation engine

- [x] 4.1 Implement `SimulationEngine` core in `front-end/src/lib/simulation/` (fixed 1/20s timestep, seeded RNG, play/pause/reset, snapshot API) with zero React/Three/DOM imports; verify unit tests: headless run in vitest, same seed + inputs → identical state sequence, reset → bit-identical replay
- [x] 4.2 Implement road graph derivation from project roads (adjacency rebuilt on mutation) with spawn/destination rules; verify unit test: graph matches hand-built fixture, rebuild after adding/removing a road updates adjacency
- [x] 4.3 Implement vehicle spawning, movement, and car-following with safe headway plus queue formation at signals/closures; verify unit tests: follower never overlaps leader, vehicles stop ordered behind a red stop line, spawn respects project spawn rules
- [x] 4.4 Implement signal phase cycling from each signal's timing configuration; verify unit test: phases progress red→yellow→green per configured durations and inspector-visible state matches engine state
- [x] 4.5 Implement road closures and incidents (blocking routing, capacity reduction, stranded vehicles when no route exists); verify unit tests: closed road receives no new vehicles, incident queues upstream traffic, disconnected destination yields `stranded` status
- [x] 4.6 Implement alternative-route computation on blockage; verify unit test: closure triggers reroute avoiding the segment when a path exists, and stranded marking when none exists
- [x] 4.7 Compute metrics in-engine (count, avg speed, density, congestion, queue lengths, per-road throughput) from state; verify unit tests: zero-vehicle reset → zeros, queue buildup raises segment metrics, clearing lowers them
- [x] 4.8 Wire the engine to the timeline via a single rAF accumulator driver publishing throttled snapshots to `useSimStore` and instanced-mesh refs; verify: play/pause/reset/speed behavior in browser, double-speed ≈ 2× time advancement, and no per-vehicle React re-renders (React profiler: zero store-driven renders per tick)
- [x] 4.9 Add engine unit-test suite documentation (how to run: `npx vitest run src/lib/simulation`) in `front-end/README.md`; verify the documented command runs successfully

## 5. Phase 4 — Scenario and analysis

- [x] 5.1 Implement scenario CRUD (create/rename/duplicate with events) in `useScenarioStore` + management UI; verify: duplicate copies all events under a new name, rename preserves events, browser check per `scenario-management` spec
- [x] 5.2 Implement event scheduling and engine execution for road closure, accident, vehicle surge, signal timing change (trigger time + stable ordering for ties); verify unit tests: event fires at trigger timestep, same-time events apply in defined order
- [x] 5.3 Wire scenario run/reset through the timeline (start from base seeded state + scenario definition, reset reverts event effects); verify: run then reset returns state identical to pre-run replay
- [x] 5.4 Implement scenario comparison (two runs, shared metrics side by side, empty state for un-run scenarios); verify: comparison shows per-run computed metrics and shows "no results" for a never-run scenario (no placeholder numbers)
- [x] 5.5 Implement analytics panels in Analyze mode (vehicles, avg speed, density, congestion, throughput, queues) bound to live `useSimStore` metrics; verify: metrics track a running simulation and show real zero after reset
- [x] 5.6 Implement congestion hotspot and vehicle-distribution visualization layers driven by engine density data with bounded update cadence; verify: hotspot appears/intensifies/fades with computed density and viewport stays interactive with all layers on
- [x] 5.7 Implement simulation results export (JSON download with metrics, scenario, seed) and empty-run guard; verify: exported file downloads and parses; export with no run shows the no-data message and produces no file

## 6. Phase 5 — Persistence and modularity

- [x] 6.1 Implement save/load to localStorage with versioned envelope and saved-state indicator + failure surfacing; verify: save→load round-trip preserves ids/scenarios/seed (unit test) and a simulated quota failure shows an error message
- [x] 6.2 Implement JSON export/import with `parseProject` validation (structure, required fields, enums, ranges) returning typed, human-readable errors; verify unit tests: malformed JSON, missing field, unknown object type each rejected with specific error and current project untouched; valid file imports equivalently
- [x] 6.3 Persist settings (quality tier, layer defaults, speed preference) under `cityfluxy.settings`; verify: change tier → reload → tier persists
- [x] 6.4 Implement `SandboxModule` registry with mobility module enabled by default; derive toolbar tools, placeable types, layers, and metrics from enabled modules; verify: first launch has mobility capabilities, disabling a module removes its tools/layers/metrics without deleting existing objects, enabling restores them, and no network request occurs
- [x] 6.5 Define disconnected ports (`BackendPort`, `AIProviderPort`, `DataProviderPort`) with local-adapter fallback wiring and no implementations; verify: grep shows no network calls tied to ports, app completes save/load/export with ports unimplemented, and no UI hints at active AI/live data
- [x] 6.6 Document the persistence format and port contracts in `front-end/README.md`; verify documented schema matches the versioned envelope produced by a real export

## 7. Phase 6 — Polish, performance, and validation

- [x] 7.1 Implement quality tiers (Low/Medium/High: DPR cap, shadow policy, detail density, entity budgets with spawn-cap indicator); verify: tier switch applies live, persists after reload, and spawn cap engages at budget with timeline indication
- [x] 7.2 Audit every rendered control for real behavior (acceptance 12); verify: checklist pass — each control click produces a state change, decorative controls removed
- [x] 7.3 Add error handling pass: placement/save/import/engine-step failures surface user-readable messages without crashing the canvas; verify: force each failure (bad import file, storage quota, engine exception) and observe handled error UI
- [x] 7.4 Write the performance test strategy document (scenarios, metrics, pass thresholds, reproduction steps for i3-7100/8 GB/GT 710) in `front-end/docs/performance.md`; verify the doc exists, contains recorded thresholds, and its steps were executed once with results noted
- [x] 7.5 Run measurements per 7.4 and apply one remediation round (instancing/DPR/shadow tweaks) if any threshold fails; verify: re-run shows thresholds met or remaining gap documented
- [x] 7.6 Build the demo scenario (seeded city + rush-hour scenario with events) and load it by default from first-run state; verify: fresh user can play demo and see signals, congestion, and metrics behaving per specs
- [x] 7.7 Full acceptance pass against proposal.md "Critical Acceptance Criteria" 1–15; verify: each criterion demonstrated and recorded as pass/fail in `openspec/changes/cityfluxy-modular-simulation-sandbox/acceptance.md`
- [x] 7.8 Run final gates: `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`; verify all four exit 0

## Workflow follow-up

- Validate the change: `openspec validate "cityfluxy-modular-simulation-sandbox" --strict`
- Review artifacts and start implementation with the apply workflow (`/opsx-apply`) when ready.
- Archive the change after implementation and review are complete.
