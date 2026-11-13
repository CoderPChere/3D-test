# CityFluxy front-end

Browser-only modular simulation workspace (Next.js + React + Three.js/R3F + Zustand).

## Tests

Unit tests (simulation engine, model, stores) run headless in vitest:

```bash
npx vitest run                 # full suite
npx vitest run src/lib/simulation   # engine suite only (determinism, graph, vehicles, signals, closures, metrics)
```

The simulation engine (`src/lib/simulation/engine.ts`) is pure TypeScript — no React/Three/DOM imports — so its tests run without a browser.

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

Import validation: `importProjectFile` parses the file, then `parseProject` (`src/lib/model/parseProject.ts`) checks structure, required fields, enums, ranges, and version, throwing `ProjectParseError` with a `.field` path and a human-readable message. A failed import never touches the current project. Save quota failures surface as `Save failed: …` instead of silently succeeding.

## Integration ports

`src/lib/ports/index.ts` defines three disconnected contracts — pure TypeScript interfaces, no implementations, no network calls, no API keys:

- `BackendPort` — `saveProject` / `loadProject` / `listProjects` / `saveScenario`
- `AIProviderPort` — `generateScenario` / `explainSimulation` / `recommendImprovements`
- `DataProviderPort` — `listAvailableCities` / `retrieveCityData`

The mutable `ports` registry defaults to `{ backend: null, ai: null, data: null }`. The only wired consumer is TopBar save/load, which branches `ports.backend ? await ports.backend.… : <local fallback>` with identical user-visible behavior either way; everything else (export/import files, results export) is local by design. To attach a future adapter, assign `ports.backend = adapter` at startup — no feature code changes.
