# Tasks

## 0. Audit Baseline

- [x] 0.1 Re-verify the seven reported gaps against current source and record confirmed defects with file evidence in the change notes; verify: each gap has a verdict (confirmed / partial / fixed / not applicable) and no requirement is written for a fixed or inapplicable issue
- [x] 0.2 Record baseline gates before changes (`npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`) in the change notes; verify: four recorded exit codes and test counts

## 1. Data Correctness

- [x] 1.1 Add pure `src/lib/model/integrity.ts` with `validateReferences(project)` enforcing id/key agreement, duplicate-free `order`, vehicle→road, incident→road, building→zone, event→road/signal (with type checks), and non-degenerate roads; verify: failing-first unit tests cover every rule and pass after implementation
- [x] 1.2 Call `validateReferences` from `parseProject` after structural parsing; verify: generated projects and full exports still validate, and dangling-reference fixtures fail with their field path
- [x] 1.3 Validate localStorage loads with envelope checks plus `parseProject` in `loadProject`; verify: tests prove corrupt JSON, wrong version, schema errors, and dangling references throw readable messages
- [x] 1.4 Ensure a failed load never mutates the live project and `TopBar` surfaces `Load failed: …`; verify: store-level test plus browser check that the project and name are unchanged after a rejected load
- [x] 1.5 Add export→import round-trip test with vehicles, incidents, zones, and scenario events; verify: imported project deep-equals the exported one and all references resolve
- [x] 1.6 Document the validation rules and error behavior in `front-end/README.md`; verify: documented field list matches `integrity.ts` behavior

## 2. Editing Completion

- [x] 2.1 Add pure `src/lib/model/deleteObjects.ts` cascade transform (road removes bound vehicles/incidents/events, signal removes timing events, zone unsets building references); verify: unit tests assert exact resulting project for each case
- [x] 2.2 Add `deleteObject` to the project store as one undoable commit and clear the selection when it matches; verify: tests prove one history entry, undo restores everything, redo reapplies
- [x] 2.3 Add the Delete action to the inspector for the selected object; verify: browser check that deletion removes the object, clears the inspector, and undo restores it
- [x] 2.4 Add pure `src/lib/ui/shortcuts.ts` resolver for Delete/Backspace, Ctrl+Z, Ctrl+Y/Ctrl+Shift+Z, Escape with editable-target guards; verify: unit tests cover every key and input/textarea/select/contenteditable guards
- [x] 2.5 Mount a single global shortcut listener in the workspace and wire it to delete/undo/redo/cancel; verify: browser check that shortcuts work in the viewport and typing in the project-name or inspector fields is never intercepted
- [x] 2.6 Add pure `src/lib/model/roadBuilder.ts` (endpoint/grid snapping, segment building, validation for min length, duplicates, overlap, bounds); verify: failing-first unit tests for each accept/reject rule
- [x] 2.7 Add road-draft state and a live segment preview in the viewport for the road tool, with Escape cancellation; verify: browser check that first click starts a preview and Escape discards it
- [x] 2.8 Commit road drafts through validation and confirm graph representation; verify: unit tests assert new roads appear as graph segments and endpoint connections share nodes, and browser check shows rejection reasons for invalid segments
- [x] 2.9 Add direction flip to the road inspector (swap endpoints, footprint unchanged); verify: unit test plus browser check that flip is undoable and the road stays in place

## 3. Analytics

- [x] 3.1 Add bounded metric history to `simStore` sampled in the timeline publish callback at ≥2 Hz wall and cleared on reset; verify: unit tests cover sampling fields, capacity cap, reset clearing, and no growth while paused
- [x] 3.2 Add `MetricCharts` with SVG time-series charts for vehicle count, average speed, density, and throughput; verify: browser check during a run shows populated trends with units, and the empty state appears before any run
- [x] 3.3 Add `CongestionDistribution` ranking roads by measured queue load with project names; verify: browser check during congestion shows ranked roads, and an empty state appears when nothing is queued
- [x] 3.4 Confirm chart updates do not re-render the 3D scene; verify: frame sampling during a run stays within the recorded performance thresholds and the scene renders from engine state only

## 4. Visual Refinement

- [x] 4.1 Vary generated building footprints and rooftop treatment by type with seeded determinism; verify: same-seed tests stay deep-equal and type-driven variety is observable in the scene
- [x] 4.2 Derive intersection surface pads and approach stop lines from road geometry using instanced meshes; verify: browser screenshot shows detailing at crossings and new roads gain it automatically
- [x] 4.3 Add a second instanced mesh per vehicle type for cabin/roof silhouettes driven by engine transforms; verify: browser check distinguishes car/van/bus/truck and simulation frame rate stays within thresholds
- [x] 4.4 Add deterministically placed instanced roadside trees scaled by the quality `detail` budget; verify: Low/Medium/High browser comparison shows tier-scaled vegetation and simulation determinism tests still pass
- [x] 4.5 Capture scene screenshots and compare against the approved references in `images/` for palette, proportions, and legibility; verify: screenshots recorded with a short pass/fail note per visual priority

## 5. Performance and Final Verification

- [x] 5.1 Add `"test": "vitest run"` and `"typecheck": "tsc --noEmit"` scripts while preserving existing scripts; verify: `npm run test`, `npm run typecheck`, `npm run lint`, and `npm run build` all exit 0
- [x] 5.2 Extend tests for shortcut gating, road connection, local-load validation, and referential integrity to the levels required by the quality-assurance spec; verify: full suite green including all pre-existing simulation regression tests
- [x] 5.3 Run browser verification of all critical workflows (delete, draw/edit road, run with charts, save/load, export/import, corrupted-storage rejection); verify: each workflow has recorded evidence and any failure is fixed before completion
- [x] 5.4 Re-run the documented performance scenarios after visual changes and update `front-end/docs/performance.md` with measured results, separating measured values from targets; verify: thresholds met or the remaining gap is documented
- [x] 5.5 Update `front-end/README.md` with the new controls, shortcuts, charts, and validation behavior; verify: every documented control exists in the UI and behaves as described

## Workflow follow-up

- Update planning artifacts if implementation deviates from the approved design.
- Run `openspec validate "cityfluxy-simulation-sandbox-completion" --strict` before review.
- Archive the change after implementation and review are complete.
