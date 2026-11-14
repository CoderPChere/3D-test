# CityFluxy front-end

Browser-only modular simulation workspace (Next.js + React + Three.js/R3F + Zustand).

## Tests

Unit tests (simulation engine, model, stores) run headless in vitest:

```bash
npm run test                     # full suite (vitest run)
npm run typecheck                # tsc --noEmit
npm run lint                     # eslint
npm run build                    # production build
npx vitest run src/lib/simulation   # engine suite only (determinism, graph, vehicles, signals, closures, metrics)
```

The simulation engine (`src/lib/simulation/engine.ts`) is pure TypeScript — no React/Three/DOM imports — so its tests run without a browser.

## Controls and shortcuts

| Action | How |
|---|---|
| Select / inspect | **Select** tool → click an object |
| Delete selected object | Inspector **Delete** or `Delete` / `Backspace` |
| Undo / redo | `Ctrl+Z` / `Ctrl+Y` or `Ctrl+Shift+Z` (`Cmd` works too), or the top-bar arrows |
| Cancel a road draft | `Escape` (also returns the tool to Select) |
| Build a road | **Build** mode → **Build Road** → click a start point, move for the live preview, click the end point |
| Flip road direction | Select the road → Inspector **Flip** (footprint unchanged) |
| Quality tier | Gear → Low / Medium / High (applies live) |

Shortcuts are ignored while focus is in an `input`, `textarea`, `select`, or contenteditable
element, so typing in the project name or an inspector field never deletes an object or
undoes an edit.

Deletion is a single undoable cascade: a road also removes the vehicles and incidents bound
to it and timing events that reference it; a signal removes its timing events; a zone clears
references to it from buildings. Undo restores the whole set in one step.

### Road building rules

Click endpoints snap to a nearby road endpoint or road interior within 4 units, otherwise to
the 4-unit grid. A committed segment must be at least 8 units long, must not duplicate an
existing segment, must stay inside the project bounds, and must not intersect a building.
A rejected click shows the reason in the status message and leaves the draft active until
you click a valid point or press `Escape`.

## Analytics

The **Analyze** tab shows:

- **Live metrics** — vehicles, average speed, density, congestion, throughput, and the
  roads with the longest queues from the latest simulation snapshot.
- **Trends** — SVG sparklines for vehicle count, average speed, density, and throughput
  from a session-only history of the last 120 samples (sampled every 500 ms of wall time,
  roughly one minute). Empty until the first run; Reset clears it.
- **Congestion distribution** — roads ranked by queued vehicles, using project road names.
- **Compare results** — per-scenario comparison and results export.

Charts read the throttled simulation store only; they never re-render the 3D scene.

## Persistence (all local, no backend)

| Store | Key / file | Shape |
|---|---|---|
| Save slot | `localStorage["cityfluxy.project"]` | versioned envelope (below) |
| Settings | `localStorage["cityfluxy.settings"]` | `{ quality, speed, layers }` |
| Project export file | `<project-name>.json` | envelope without `savedAt` |
| Results export file | `cityfluxy-results-<timestamp>.json` | results payload (below) |

### Versioned project envelope

Written by `saveProject` (`src/lib/persist/projectIO.ts`) under `cityfluxy.project`; an export is the same payload minus `savedAt`:

```json
{
  "version": 1,
  "savedAt": 1763000000000,
  "projectName": "Untitled Project",
  "project": {
    "version": 1,
    "seed": 1,
    "objects": { "<id>": { "type": "road|building|vehicle|signal|incident|zone", "...": "..." } },
    "order": ["<id>", "..."],
    "scenarios": [{ "id": "...", "name": "...", "events": [] }],
    "settings": { "quality": "medium", "speed": 1, "layers": { "geometry": true } }
  }
}
```

- `version` — envelope/project schema version (`PROJECT_VERSION = 1` in `src/lib/model/types.ts`). Imports with any other value fail with `Unsupported project version …`.
- `project` — a full `CityProject`. `objects` is keyed by id, `order` fixes render/placement order (every entry must reference an existing object), `scenarios` hold scheduled events, `settings` mirrors the initial workspace settings.

Settings envelope (`cityfluxy.settings`): `{ "quality": "low"|"medium"|"high", "speed": number, "layers": Record<LayerId, boolean> }` — read/written by `src/lib/state/settingsStore.ts`; corrupt or out-of-range values fall back to defaults, and a quota failure keeps settings session-only.

Results export: `{ "version": 1, "seed": number, "exportedAt": number, "runs": [{ "scenarioId", "scenarioName", "seed", "ranAt", "simTime", "metrics" }] }` — built by `buildResultsExport` (`src/lib/persist/resultsIO.ts`), which returns null (UI shows `No run data to export`, no file) when nothing has run.

Import and load validation: `importProjectFile` parses the file and `loadProject` parses the save slot, and both run the same pipeline — `parseProject` (`src/lib/model/parseProject.ts`) checks structure, required fields, enums, ranges, and project version, then `validateReferences` (`src/lib/model/integrity.ts`) checks referential integrity. Both throw `ProjectParseError` with a `.field` path and a human-readable message.

Referential rules enforced by `validateReferences`:

- every `objects` entry's `id` matches its map key;
- `order` lists every object exactly once (no duplicates, no unknown or missing ids);
- `vehicle.spawnRoadId` and `incident.roadId` reference an existing road;
- `building.zoneId` (when present) references an existing zone;
- scenario event `roadId` references an existing road and `signalId` references an existing signal;
- every road has endpoints at least `MIN_ROAD_LENGTH` (8 world units) apart.

`loadProject` also validates the envelope before the project: JSON must parse, `version` must equal `PROJECT_VERSION`, and `savedAt` must be a finite number while `projectName` must be a string. A failed import or load never touches the current project or name; the UI shows `Import failed: …` / `Load failed: …`. Save quota failures surface as `Save failed: …` instead of silently succeeding.

## Integration ports

`src/lib/ports/index.ts` defines three disconnected contracts — pure TypeScript interfaces, no implementations, no network calls, no API keys:

- `BackendPort` — `saveProject` / `loadProject` / `listProjects` / `saveScenario`
- `AIProviderPort` — `generateScenario` / `explainSimulation` / `recommendImprovements`
- `DataProviderPort` — `listAvailableCities` / `retrieveCityData`

The mutable `ports` registry defaults to `{ backend: null, ai: null, data: null }`. The only wired consumer is TopBar save/load, which branches `ports.backend ? await ports.backend.… : <local fallback>` with identical user-visible behavior either way; everything else (export/import files, results export) is local by design. To attach a future adapter, assign `ports.backend = adapter` at startup — no feature code changes.
