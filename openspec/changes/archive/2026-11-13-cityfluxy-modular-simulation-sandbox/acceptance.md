# Acceptance Pass — cityfluxy-modular-simulation-sandbox

Source: `prompt.txt` §11 "Critical Acceptance Criteria" (the change's `tasks.md` task 7.7
mislabels the source as `proposal.md`; the criteria live in `prompt.txt` lines 624–638).
Every criterion was demonstrated — via executed browser runs (Playwright, on the target
hardware), unit tests (`npx vitest run`), or static scans — on 2026-11-13.

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| 1 | Starts without backend services or API keys | **PASS** | Static scan of `front-end/src`: zero matches for `fetch(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `process.env`, `NEXT_PUBLIC`, `API_KEY`, `apiKey`, `Bearer`; `ports.test.ts` asserts every port ships `null`. Browser runs capture `externalRequests: []` (tasks 7.2, 7.3, 7.6, 7.7). |
| 2 | Primary experience opens directly into the simulation workspace | **PASS** | Fresh load of `/` renders the workspace (mode tabs, tool rail, 3D viewport, timeline) with no landing/scroll page — see first-run screenshots in tasks 7.6/7.7; landing page removal was the proposal's BREAKING change (tasks 1.x/2.x). |
| 3 | The 3D scene is interactive | **PASS** | Fresh orbit test (7.7): mouse drag on empty space moved the camera from a ¾ perspective to a near top-down view (`orbit-a.png` vs `orbit-b.png`); `OrbitControls` pan/zoom enabled in `Scene.tsx`; raycast picking works (see 4). |
| 4 | Users can select and inspect objects | **PASS** | 7.2: canvas click with the Select tool selected a building and the Inspector showed its properties (`building-height` 29.7); inspector testids `road-length`, `signal-state`, `vehicle-type` present for other types; originally verified in phase 4 (tasks 4.x). |
| 5 | Users can place and edit supported city objects | **PASS** | Fresh placement (7.7): Create Zone → click → project mutated (undo enabled), undo reverts. Invalid placement surfaces a reason (7.3: `Overlaps existing road "Central Avenue"`). Field edit persists (7.2: building height 29.7 → 57). Placement/props pipeline verified in tasks 3.x/4.x. |
| 6 | The simulation can play, pause, and reset | **PASS** | 7.2: play → `RUNNING`, time advanced to T+00:01.5; pause → `PAUSED`; speed `2×` → `aria-pressed=true`; reset → T+00:00.0. Demo run (7.6) played to T+00:17.9. |
| 7 | Simulation behavior is deterministic with same seed/inputs | **PASS** | Unit tests: `generateProject` byte-identical per seed (`generate.test.ts`), engine replay determinism (`engine.test.ts`), budget re-apply on replay (`engineBudget.test.ts`) — full suite 121/121 green. Demo scenario uses literal ids so first-run projects stay byte-stable. |
| 8 | Scenarios can be created and modified locally | **PASS** | 7.2: create (+1), rename (prompt → "Renamed Audit"), duplicate (+1), select switch, event add/change/remove (0→1→0, `road_closure`→`accident`) — all via local Zustand/project store, no network. First-run ships the "Rush Hour" demo (7.6). |
| 9 | Metrics calculated from actual simulation state, not hardcoded | **PASS** | 7.6 live run: vehicles 24 → 31 after the surge event, congestion 45% → 16%, throughput 5 → 43, queue appeared on the closed **Road V3**, compare table showed the recorded run (12.3 km/h, 86% density). Metrics derive from `SimulationEngine` snapshots (`density.ts` pure functions unit-tested). |
| 10 | Projects saved and restored locally | **PASS** | 6.1/6.5: Save writes the versioned envelope to `localStorage["cityfluxy.project"]` (`SAVED …` indicator), Load restores project + name; quota failure shows `Save failed: QuotaExceededError: storage is full` without crashing (7.3). |
| 11 | JSON import/export works with validation | **PASS** | Export downloads `audit_project.json`/`untitled_project.json` (7.2, 6.5); import validates through `parseProject` — bad file → `Import failed: File does not contain a valid project` (7.3), field-level errors like `Missing required field "seed"` (6.2), failed import leaves the project byte-identical (6.2); 12 parser unit tests. |
| 12 | No active UI control is merely decorative | **PASS** | 7.2 full click-through: mode tabs, tool buttons, undo/redo states, scenario CRUD, sim transport/speed, event CRUD, inspector fields, quality/module/layer toggles, compare selects, save/load/import/export — every control produced a verified state change; static scan found no no-op handlers. |
| 13 | No connected AI, backend, database, or live-data service required | **PASS** | Every browser run logs `externalRequests: []` while performing the full workflow (build, simulate, analyze, save, export); body-text scan found no AI/chatbot/CCTV surfaces (`aiHits: []`, task 6.5); `AuthSection`/`AIChatbot`/`lib/auth` deleted. |
| 14 | Future integrations isolated behind interfaces | **PASS** | 6.5: `src/lib/ports/index.ts` defines `BackendPort`, `AIProviderPort`, `DataProviderPort` + a null `ports` registry; TopBar save/load branches `ports.backend ? … : local`; contracts documented in `front-end/README.md` (6.6). |
| 15 | Documented strategy for running on low-end hardware | **PASS** | `front-end/docs/performance.md` (7.4): tier table (DPR/shadows/detail/entity budgets), scenarios, pass thresholds, reproduction steps, and a recorded run executed on the **exact target hardware** (i3-7100, 8 GB, GT 710) — all 5 scenarios PASS (58–60 fps avg, p95 ≤ 17 ms), no remediation needed (7.5). Quality tiers implemented and verified live (7.1). |

**Result: 15 / 15 PASS.**

Notes:
- The environment machine matches the brief's target hardware, so criterion 15's
  recorded run doubles as real performance validation on the i3-7100/8 GB/GT 710.
- Criterion 7 is enforced by unit tests rather than a browser run, because determinism
  requires bit-identical comparison that DOM observations cannot provide.
