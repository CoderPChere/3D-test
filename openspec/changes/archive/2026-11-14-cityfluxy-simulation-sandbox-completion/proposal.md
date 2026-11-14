# Proposal

## Why

The archived `cityfluxy-modular-simulation-sandbox` change delivered a working browser-only sandbox, but a fresh audit of the live code confirms gaps that keep it from being a dependable city-editing tool: objects cannot be deleted from the UI, roads are fixed-direction stamps, saved projects load without validation, imported data can carry dangling references, analytics has no history, the city/vehicle visuals are flat, and the verification scripts/tests do not cover these paths. Closing them is the difference between a demo and a reliable hackathon tool.

## Audit Findings

Each previously reported gap was verified against the current implementation (not the archived narrative):

| # | Reported gap | Verdict | Evidence |
|---|---|---|---|
| 1 | Missing user-facing object deletion | **Confirmed defect (store part exists)** | `removeObject` is undoable (`projectStore.ts:60-66`) but has zero callers; `Inspector.tsx` has no delete control; no `Delete`/`Backspace` handler exists. No dependent-reference cleanup. |
| 2 | Limited road-building interaction | **Confirmed defect** | `placeTools.ts:40-56` always builds a fixed 40-unit horizontal segment centered on the cursor; no two-point draw, preview, endpoint snapping, or connection validation beyond same-orientation overlap (`placement.ts:97-102`). |
| 3 | Incomplete localStorage validation | **Confirmed defect** | `loadProject` (`projectIO.ts:26-34`) only parses JSON and checks `project.objects` exists; imports go through `parseProject` (`projectIO.ts:67`) but loads do not. No version, schema, range, or reference checks. |
| 4 | Missing referential integrity | **Confirmed defect** | `parseProject` validates field types/ranges but never resolves `vehicle.spawnRoadId`, `incident.roadId`, `building.zoneId`, or event `roadId`/`signalId` against `objects`; object `id` vs. map key mismatch, duplicate `order` entries, and degenerate road geometry are accepted. |
| 5 | Limited architectural detail in procedural city | **Partially implemented** | Seeded 49-building grid with 4 types, lane dashes, windows, streetlights, and signal lamps exist; buildings share one 8×8 footprint, no intersection surfacing/stop lines, vehicles are single boxes, no vegetation. |
| 6 | Limited analytics visualizations | **Confirmed defect** | Analyze mode shows only the current metrics snapshot and a last-run comparison table; no history buffer exists (`simStore.ts`), so no time-series charts and no congestion-distribution chart. |
| 7 | Incomplete automated verification | **Confirmed defect** | `package.json` lacks `test` and `typecheck` scripts; no tests exist for deletion, road construction/connection, local-load validation, or referential integrity; browser automation exists only as ad-hoc runs. |

**Already fixed / not applicable:** module configuration persistence — modules are session-only (`moduleStore` has no storage), so there is nothing to validate on project load. Simulation determinism, closures, signals, and metrics regression coverage already exist and must be preserved.

## What Changes

- **Object deletion**: Delete action in the inspector, `Delete`/`Backspace` shortcuts, selection cleanup, cascade removal of dependent vehicles/incidents/scenario events (single undo step), zone-reference unsetting, and guards against leaving invalid project state.
- **Keyboard shortcuts**: `Delete`/`Backspace` delete, `Ctrl+Z` undo, `Ctrl+Y`/`Ctrl+Shift+Z` redo, `Escape` cancels placement/edit; never fire while typing in inputs, textareas, selects, or contenteditable elements.
- **Road construction**: two-click start/endpoint drawing with live preview, grid and endpoint snapping, straight-segment validation (minimum length, duplicate/overlap rejection, endpoint connection), graph rebuild verification, and post-placement editing (lanes, type, speed limit, open/closed, direction flip).
- **Persistence safety**: localStorage load runs the same `parseProject` pipeline as imports plus envelope checks; referential integrity is validated for every cross-object reference and scenario event; corrupted, unsupported, or dangling data is rejected with a readable message and the current project is left untouched; export→import round-trip preserves all relationships.
- **Analytics**: session-scoped metric history sampled from engine snapshots (throttled, ring-buffered) rendered as dependency-free SVG time-series charts (density, average speed, vehicle count, throughput) plus a congestion-distribution chart; charts update independently of the 3D scene.
- **Visual refinement** (instanced, quality-tier bounded): intersection surface pads and stop lines, varied building footprints/rooftops by type, two-part vehicle silhouettes, and instanced roadside trees.
- **Quality assurance**: add `npm run test` and `npm run typecheck`; add unit coverage for deletion/cascade, road validation and graph consistency, local-load validation, referential integrity, shortcut matching, and history capture; re-run lint/build, recalibrate the performance doc if rendering cost changes, and verify key workflows in a browser.

**Non-goals:** no backend, AI, live data, API keys, or network calls (ports stay disconnected); no curved roads; no one-way traffic model (direction = segment orientation, flippable); no pedestrian simulation; no project schema version bump; no charting dependency; the archived change is not modified.

## Capabilities

### New Capabilities

- `quality-assurance`: verification scripts and automated coverage required to prove editing, persistence, simulation regressions, and application gates pass.

### Modified Capabilities

- `editing-tools`: deletion with dependent-reference handling and undo, keyboard shortcuts, two-point road construction, connection validation, and direction editing.
- `project-persistence`: validated local loading, referential-integrity enforcement, and corruption-safe rejection.
- `analytics`: historical metric sampling with time-series and congestion-distribution charts derived from simulation state.
- `city-viewport`: instanced visual refinement — intersections, buildings, vehicles, vegetation — bounded by quality tiers.

## Impact

Affected code: `src/lib/persist/projectIO.ts`, `src/lib/model/parseProject.ts` (+ new integrity module), `src/lib/state/projectStore.ts`, `src/lib/model/placeTools.ts` (+ new road-builder module), `src/lib/state/simStore.ts`, `src/components/Three/City.tsx`, `src/components/Three/CityTraffic.tsx`, `src/components/Workspace/Inspector.tsx`, `src/components/Workspace/Workspace.tsx` (+ shortcuts hook), Analyze components (new chart components), `src/lib/model/generate.ts`, `package.json`, tests, and docs (`front-end/README.md`, `front-end/docs/performance.md`).

No new dependencies. No API, storage-key, or envelope changes. Simulation engine stays React/Three/DOM-free; rendering remains instanced and quality-tier driven; all metrics and charts derive from the same engine snapshots used by the timeline and exporter.
