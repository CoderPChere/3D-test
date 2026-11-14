# Apply Notes — cityfluxy-simulation-sandbox-completion

## 0.1 Audit verdicts (re-verified against source before implementation)

| # | Reported gap | Verdict | Evidence (source) |
|---|---|---|---|
| 1 | Missing user-facing object deletion | Confirmed defect (store part exists) | `front-end/src/lib/state/projectStore.ts` `removeObject` is undoable but has no callers; `Inspector.tsx` has no delete control; no Delete/Backspace handlers in `src/`. No dependent-reference cleanup. |
| 2 | Limited road-building interaction | Confirmed defect | `front-end/src/lib/model/placeTools.ts` `buildRoadCandidate` returns a fixed 40-unit horizontal segment centered on the cursor; no draft/preview state; placement only rejects same-orientation overlap. |
| 3 | Incomplete localStorage validation | Confirmed defect | `front-end/src/lib/persist/projectIO.ts` `loadProject` JSON-parses and checks `project.objects` only; `importProjectFile` runs `parseProject`. |
| 4 | Missing referential integrity | Confirmed defect | `front-end/src/lib/model/parseProject.ts` validates `spawnRoadId`/`roadId`/`zoneId`/event targets as strings only; no id/key or order checks, no road-length check. |
| 5 | Limited architectural detail | Partially implemented | `City.tsx` already renders lane dashes, building windows, streetlight poles/lamps, signal lamps. Missing: intersection pads/stop lines, per-type building footprints/rooftops, per-type vehicle silhouettes, vegetation. |
| 6 | Limited analytics visualizations | Confirmed defect | `LiveMetrics.tsx` shows current snapshot only; `CompareResults.tsx` shows last-run table; `simStore.ts` has no history buffer; no chart components. |
| 7 | Incomplete automated verification | Confirmed defect | `front-end/package.json` has no `test`/`typecheck` scripts; no suites for deletion, road builder, local-load validation, referential integrity, shortcuts. |

**Not applicable:** module-configuration persistence — modules are session-only (`moduleStore` has no storage).

No requirement was written for a fixed or inapplicable issue: task groups above align with verdicts 1–7 (2 = editing tasks, 3/4 = data correctness, 5 = visuals, 6 = analytics, 7 = QA).

## 0.2 Baseline gates (before changes)

| Gate | Command | Result |
|---|---|---|
| Unit tests | `npx vitest run` | exit 0 — 121 passed / 121, 22 files |
| Typecheck | `npx tsc --noEmit` | exit 0 — no output |
| Lint | `npm run lint` | exit 0 — no output |
| Build | `npm run build` | exit 0 — 4/4 static pages |

## Progress log

- 0.1 complete: verdicts above recorded from live source inspection.
- 0.2 complete: baseline gates recorded (121/121 tests, tsc/lint/build exit 0).
- 1.x complete: integrity + validated save loads (15 integrity tests, 13 projectIO tests incl. round-trip and failed-load non-mutation).
- 2.1/2.2/2.4/2.6 complete: deleteObjects (6 tests), store deleteObject (10 store tests), shortcuts resolver (8 tests), roadBuilder (16 tests).
- 3.x complete: simStore history (5 tests), Timeline sampling, MetricCharts + CongestionDistribution, scene-subscription check.
- 4.x complete: type-driven footprints/rooftops, instanced intersection pads/stop lines, vehicle cabins, tier-scaled trees, screenshot comparison vs `images/`.
- 5.x complete: `test`/`typecheck` scripts added; suite 27 files / 185 tests green; browser workflows and corrupted-storage rejections recorded above; performance scenarios re-run on the target hardware (all 60 fps) and documented; README controls/shortcuts/analytics/road rules updated.
- Implementation note: footprint variety is derived from a stable hash of the building id (`idJitter`) instead of extra `rand()` draws. This keeps the generator's RNG sequence unchanged, so the generated fleet and spawn layout remain byte-identical to the previous release and the simulation regression suite stays green.
- Final gates: `npm run test` 185/185, `npm run typecheck` 0, `npm run lint` 0, `npm run build` 0 (Next.js 16.1.6, static `/`).

## Browser verification (task 2.3, 2.5, 2.7–2.9)

Dev server at `http://localhost:3000`, Playwright MCP, Chromium headful.

| Task | Action | Observed |
|---|---|---|
| 2.3 | Selected Building 2,2 in viewport, clicked inspector Delete | Inspector cleared to "Nothing selected", Undo enabled; re-select shows Building 2,2 restored after undo |
| 2.5 | Delete key with building selected → deleted; Ctrl+Z → restored. Typed Backspace/Delete in the project-name input while a building was selected | Shortcut did not fire: only the text changed, building stayed selected (editable-target guard) |
| 2.7 | Build mode → Build Road → first click | Cyan draft marker shown, translucent preview segment followed the cursor, Undo stayed disabled; Escape removed preview + marker and reset tool to Select |
| 2.8 | Two clicks 5 px apart | `workspace-message`: "Road must be at least 8 units long (got 4.0)"; second attempt through a building: "Overlaps existing building "Building -2,4""; valid open-ground clicks committed a 25.6 u road, selected in the inspector, Undo enabled |
| 2.9 | Flip in road inspector | Road stays selected, length 25.6 u unchanged (footprint fixed); Undo/redo toggles the flip |

## Analytics browser verification (task 3.2–3.4)

- Empty state before any run: all four trend cards show "No run data yet — start the simulation to record this metric."; congestion shows "No congestion — no queued vehicles reported on any road."
- During a run (6.4 s sim time): charts show vehicle count 31, avg speed 7.8 km/h, density 74 %, throughput 12, each with an SVG trend; congestion ranks Central Avenue (5), Road V1 (4), Road V3 (3), Road H1 (2), Road H3 (2), using project names.
- S5-style frame sample (Analyze open while simulating, current quality tier, Chrome headful, dev server): 240 frames, `avgFps 60`, `avgMs 16.7`, `p95Ms 16.9`, `maxMs 17` — within the documented thresholds (avg ≥ 30, p95 ≤ 50 ms, max ≤ 500 ms). Note: measured on the development machine, not the i3-7100/GT 710 target.
- Scene subscription check: no file under `src/components/Three` imports `simStore`, `history`, `MetricCharts`, or `CongestionDistribution`; charts subscribe to `simStore` only, so they cannot re-render the 3D scene.

## Visual refinement verification (task 4.1–4.5)

Screenshots (Playwright MCP, dev server, Chromium headful) under `.playwright-mcp/`:

| Task | Evidence | Observed |
|---|---|---|
| 4.1 | `visual-cabins-crop.png`, `rooftops-crop.png`, `rooftops-crop2.png`; `generate.test.ts` | Footprints vary by type (residential 6.5–8, commercial 8–10, office 7.5–9, industrial 10–11.5 × 6.5–7.5). Pitched pyramid roofs on residential, dark cap slabs on commercial/office, skylight strip on industrial are all visible. Same-seed project stays deep-equal and simulation tests unchanged. |
| 4.2 | `visual-cabins-crop.png`, `quality-low.png` | Crossings show a darker asphalt pad plus two white stop bars per approach; adding a road regenerates them from geometry (memo on `roads`). Two instanced draws for all intersections/stops. |
| 4.3 | `visual-cabins-crop.png` | Coloured bodies now carry a distinct dark cabin/roof box: the yellow long body and magenta van both show separated greenhouse silhouettes; `CABINS` differs per type (car 2.2 u, van 3 u, truck 2.6 u, bus 8.2 u long). Frame sample during a High-quality run: 241 frames, `avgFps 60`, `p95Ms 16.9`, `maxMs 17`. |
| 4.4 | `quality-low.png`, `quality-medium.png`, `quality-high.png` | Low: 0 trees (detail 0); Medium: ~half the corner trees (detail 0.5); High: every corner tree (detail 1). Same camera, same seed; determinism tests stay green. |
| 4.5 | `quality-high.png`, `visual-refine-explore.png`, `visual-cabins-crop.png` vs `images/` | See comparison below. |

### 4.5 Reference comparison (approved references in `images/`)

| Priority | Reference | Pass/fail | Note |
|---|---|---|---|
| Palette | `City.png`, `UI.png` | Pass | Dark navy night city with cyan accents and warm window light, matching the in-app palette; refs are daylight renders, so the palette tracks the product style rather than the raw reference. |
| Rooftop/proportion variety | `buildings.png` | Pass | Type semantics match the reference set: pitched roof = house, flat cap = office/commercial, skylight strip = warehouse; footprints fill the grid without clipping roads. Stylised low-poly, not photoreal (intended). |
| Intersection legibility | `roads2.png` | Pass | Dashed lane lines, darker intersection pads, and white stop bars at every approach are readable from both aerial and street views; no yellow centre line (single-road colour scheme kept for the neon palette). |
| Vehicle legibility | `cars.png` | Pass | Cabin/roof silhouette separates car, van, truck, and bus at aerial zoom; colour-by-id keeps individual vehicles distinguishable (refs use realistic paint, app uses neon). |
| Greenery | `greenaries.png` | Pass | Trunk + rounded low-poly canopy reads as a street tree at both tiers and anchors building corners; no benches/bins/planters added (out of scope for 4.4). |
| Overall legibility | `City.png` | Pass | Streets, buildings, trees, vehicles, signals, and stop lines remain distinguishable in a single frame; no z-fighting between pads, dashes, stops, and vehicle shadows observed. |

## Critical workflow browser verification (task 5.3)

Same dev server/Chromium session; project name and storage used as fixtures. Exact observed values:

| Workflow | Action | Evidence |
|---|---|---|
| Delete | Selected Building 2,2, clicked inspector Delete; Ctrl+Z | Inspector cleared, Undo enabled; undo restored the building (also shortcut Delete + undo, and typed-field guard, in 2.3/2.5) |
| Draw road | Build mode → Build Road → two clicks | Invalid short segment rejected with "Road must be at least 8 units long (got 4.0)"; building collision rejected with `Overlaps existing building "..."`; valid segment committed, selected, undoable |
| Edit road | Selected a road, changed Lanes 2→3, Enter; Ctrl+Z / Ctrl+Y | Lanes committed to 3, Ctrl+Z restored 2, Ctrl+Y restored 3, Undo/Redo buttons track state; flip direction also verified in 2.9. Note: Ctrl+Z inside the lanes input is intentionally ignored by the editable-target guard; it applies once focus leaves the field |
| Run with charts | Play → 8.7 s run | Live metrics populated (31 vehicles), all four trend SVGs drew, congestion ranked by road name (2.3–3.4 evidence) |
| Save/load | Named project "Persist Check", Save, renamed to "Mutated Name", Load | Save state showed `Saved 3:53:18 PM`; Load replaced the name back to "Persist Check" from the stored envelope (`cityfluxy.project`) |
| Export/import | Export, then import a copy renamed "Imported Check" through the hidden file input | Export downloaded `persist_check.json` and showed "Project exported"; import showed `Imported "Imported Check"`, input read "Imported Check", state "Unsaved" |
| Corrupted storage | Stored `not json {{{`, Load | `Load failed: Saved project is not valid JSON`; project name stayed "Imported Check" (current project not replaced) |
| Dangling storage refs | Stored a valid envelope whose `veh_0_0.spawnRoadId` = `road_that_does_not_exist`, Load | `Load failed: objects.veh_0_0.spawnRoadId references missing road "road_that_does_not_exist"`; project name stayed "Imported Check" |

