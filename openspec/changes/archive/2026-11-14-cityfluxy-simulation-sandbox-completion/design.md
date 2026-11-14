# Design

## Context

See `proposal.md` for motivation and the verified-gap audit. Current constraints that shape the approach:

- The simulation engine (`src/lib/simulation/engine.ts`, `graph.ts`, `metrics.ts`) is pure TypeScript — no React/Three/DOM — and must stay that way.
- Rendering reads engine snapshots directly in `useFrame`; React re-renders are limited to throttled (≤10 Hz wall) timeline/inspector updates.
- `parseProject` already provides strict structural validation and `ProjectParseError` field paths for imports; local loads bypass it.
- The road graph is derived from project roads on demand (`buildGraph`), splitting at crossings and endpoint-on-road touches; render geometry and graph must never disagree.
- Quality tiers (`src/lib/render/quality.ts`) own DPR, shadows, detail density, and vehicle budgets; the low tier is tuned for the i3-7100 / GT 710 target.
- Module state is session-only; only projects and settings persist. No backend, AI, or data ports are connected.

## Goals / Non-Goals

**Goals:**
- Make Build mode a genuine editor: deletion with clean references, keyboard-driven editing, two-point road drawing with validated connections.
- Make project loading as safe as importing — one validation pipeline, corruption never replaces the live project.
- Give Analyze mode real history and readable charts sourced from engine snapshots.
- Improve scene legibility (intersections, buildings, vehicles, vegetation) without changing the performance envelope or simulation results.
- Leave behind executable verification for every new behavior.

**Non-Goals:**
- No curved roads, one-way traffic semantics, or pedestrian simulation.
- No project schema/envelope version change; no migration tooling.
- No new runtime dependencies (including chart libraries).
- No engine or rendering architecture rewrite; instancing and snapshot-driven updates stay.
- No changes to the archived change's artifacts.

## Decisions

### 1. One validation pipeline: envelope check + `parseProject` + referential integrity

`loadProject()` will validate the envelope (`version`, `savedAt`, `projectName` types) and then call `parseProject` on `parsed.project` — the identical path used by `importProjectFile`. A new pure module `src/lib/model/integrity.ts` exports `validateReferences(project)`, invoked at the end of `parseProject`, which enforces:

- `objects[id].id === id` for every entry.
- `order` has no duplicates and covers exactly the object keys (no unknown ids).
- `vehicle.spawnRoadId` → existing object of type `road`.
- `incident.roadId` → existing road.
- `building.zoneId` (optional) → existing zone.
- scenario event `roadId` → existing road; `signalId` → existing signal.
- road geometry: `a ≠ b`, length ≥ minimum (8 world units).

All failures throw `ProjectParseError` with the field path, so both load and import surface precise messages. *Alternatives rejected:* a separate load-time validator (two rulesets drift), JSON-schema library (dependency + weaker messages).

### 2. Deletion is a pure cascade transform committed once

New pure module `src/lib/model/deleteObjects.ts`:

```ts
deleteObjectWithDependents(project, id): { ok: true; project: CityProject } | { ok: false; reason: string }
```

Rules: deleting a road removes vehicles whose `spawnRoadId` and incidents whose `roadId` point at it, plus scenario events targeting it; deleting a signal removes signal-timing events targeting it; deleting a zone unsets `zoneId` on buildings. The store gets `deleteObject(id)` which applies the transform through the existing `commit` (one undo entry, redo clears as usual). The inspector button and keyboard shortcut both call it and then clear `selectionStore.selectedId` if it matches. If the transform would produce a project that fails integrity (defensive), it returns `{ ok: false }` and nothing is committed. *Alternatives rejected:* blocking deletion when dependents exist (hostile UX), non-cascading delete (dangling references violate the new validation contract), one undo entry per dependent (surprising history).

### 3. Shortcuts live in one pure resolver plus one hook

`src/lib/ui/shortcuts.ts` exports a pure resolver:

```ts
resolveShortcut(ev: { key; ctrlKey; metaKey; shiftKey; target }): 'delete' | 'undo' | 'redo' | 'cancel' | null
```

It returns `null` when the target is an input, textarea, select, or contenteditable ancestor. `Workspace.tsx` mounts a single `useEffect` keydown listener that calls the resolver and dispatches to the project store and app store. Escape sets the tool to `select` and clears any pending road draft. *Alternatives rejected:* per-component listeners (duplication, missed guards), a shortcut library (dependency for four keys).

### 4. Road construction is a two-click state machine with a pure builder

- `appStore` gains `roadDraft: Vec2 | null` with `beginRoadDraft` / `updateRoadDraft` / `cancelRoadDraft`.
- `City.tsx` (which already tracks the ground-plane point and renders placement ghosts) renders a segment preview while a draft exists: `start → snapped cursor`, plus a validity tint from the same validation used on commit.
- First click on the ground stores the start (grid snap 4, or nearest existing endpoint/projection within 4 units); pointer move updates preview; second click builds the candidate and commits through `canPlace` + new checks; Escape aborts. Click-vs-drag still uses the existing 5 px threshold so orbiting does not place.
- New pure module `src/lib/model/roadBuilder.ts`: `snapRoadPoint(p, roads)`, `buildRoadSegment(a, b)`, `validateRoadSegment(objects, bounds, segment)` (min length 8, duplicate endpoints in either order, same-orientation overlap via `canPlace`, perpendicular crossings allowed, bounds). Position is the segment midpoint.
- Graph consistency: `buildGraph` already splits roads at crossings and at endpoints lying on another road. The builder snaps endpoints onto existing endpoints/interiors, so committed geometry is always represented; tests assert the graph contains the new segments and that shared endpoints connect.

*Alternatives rejected:* drag-to-draw (fights OrbitControls and the Move tool), keeping the fixed stamp (the confirmed gap), freehand/polyline (scope).

### 5. Road direction = endpoint order, flippable

`a→b` is the orientation; the inspector adds a Flip direction action that swaps `a`/`b` (undoable, footprint unchanged). This is honest two-way geometry, not a one-way model. *Alternatives rejected:* adding a `oneWay` field (engine/lane/graph ripple, schema bump, no UI need demonstrated).

### 6. History sampling piggybacks the existing throttled publish; charts are plain SVG

`simStore` gains `history: MetricSample[]` (session-only, cap 120) where `MetricSample = { t, vehicleCount, avgSpeed, density, congestion, throughput }`. The Timeline's existing publish callback (already ≤10 Hz wall) appends a sample when ≥500 ms passed since the last one, so history is ≥2 Hz wall and decoupled from frame rate. `resetClock()` clears it. Analyze gets:

- `MetricCharts.tsx` — four SVG line charts (vehicle count, avg speed, density, throughput) scaled to the buffer's min/max with unit labels and an empty state.
- `CongestionDistribution.tsx` — horizontal bars for the top queued roads from the current snapshot, using project road names.

Both subscribe only to `simStore`, so chart updates never re-render the Canvas. *Alternatives rejected:* Recharts/Chart.js (bundle + API surface for four sparklines), canvas rendering (more code, weaker accessibility), per-frame sampling (memory/render churn).

### 7. Visual refinement is generated, instanced, and tier-bounded

- **Intersections/stop lines**: derived in `City.tsx` from road crossings (3+ approach direction points) as instanced plane quads and stripe instances; no authored per-intersection data.
- **Buildings**: `generate.ts` picks a type-driven footprint range (residential 6.5–8, commercial 8–10, office 7.5–9, industrial 10–11.5 × 6.5–7.5, rounded to 0.5) with jitter derived from a stable hash of the building id (`idJitter`) rather than extra `rand()` draws, so the generator's RNG sequence — and therefore the fleet/spawn layout — stays unchanged; rooftop silhouettes (residential pitch, office/commercial caps, industrial skylight strip) render through two instanced sets. Same seed → identical output (determinism contract holds).
- **Vehicles**: each type gains a second instanced mesh (cabin/roof) sharing the body transform update from engine snapshots.
- **Vegetation**: low-poly trees (instanced trunk + canopy) at deterministic building-corner offsets (stable hash of building id, no per-frame randomness); each candidate tree is kept when `hash(id) fraction < detail`, so Low renders none, Medium roughly half, High all. No simulation interaction.

### 8. Verification strategy

- `package.json` gains `"test": "vitest run"` and `"typecheck": "tsc --noEmit"`; existing scripts untouched.
- New Vitest suites: `integrity`, `deleteObjects`, `roadBuilder` (+ graph assertions), `shortcuts`, `history` (simStore ring buffer), plus `projectIO` additions for corrupt storage and round-trips.
- Existing 121 tests must stay green; simulation regression suites are not modified.
- Browser flows (delete, draw/edit road, charts while running, save/load, import/export, corrupted-storage rejection) are exercised during apply with Playwright MCP; evidence goes into the change verification notes. No Playwright dependency is added to the repo.
- `front-end/docs/performance.md` is re-measured if the visual additions change rendering cost; measured vs. target language stays explicit.

## Risks / Trade-offs

- **Stricter validation may reject previously loadable (but corrupt) saves** → Mitigation: generated and exported projects always pass; messages name the field; current project is never replaced, so the session is safe.
- **Cascade deletion can remove more than the clicked object** → Mitigation: single undo step restores everything; the inspector shows the delete action on a selected object only.
- **Two-click drawing can conflict with camera gestures** → Mitigation: reuse the existing 5 px click/drag threshold; Escape and tool switching cancel the draft.
- **New instanced categories increase draw calls** → Mitigation: one InstancedMesh per category per tier budget; vegetation count driven by the existing `detail` knob; re-run the documented benchmark and update results.
- **History growth** → Mitigation: fixed 120-sample ring buffer cleared on reset.
- **Shortcut capture could hijack typing** → Mitigation: pure resolver refuses editable targets; tested explicitly.
- **Changing `generate.ts` output alters seeded cities** → Mitigation: determinism is per-seed, not per-version; tests assert same-seed equality, not golden bytes across versions. No stored projects are regenerated.

## Migration Plan

No schema or storage-key changes: existing v1 saves and exports remain valid inputs, and newly saved payloads remain v1. Deploy by merging the change; rollback is a code revert with no data migration. If a stricter validator rejects a legacy local save, the error is surfaced and the live project is untouched — the user can re-save or re-import a valid file.

## Open Questions

None that would change the specs, approach, or task breakdown. Chart styling details and exact vegetation counts are implementation-time tuning within the documented tiers.
