# Performance Test Strategy

Scope: the browser-only simulation workspace (`src/components/Three`, `src/lib/simulation`).
Goal: prove the app stays interactive on the low-end target hardware and define how to
re-run the check after rendering changes.

## Target hardware

| Component | Value |
|---|---|
| CPU | Intel Core i3-7100 @ 3.90 GHz (2 cores / 4 threads) |
| RAM | 8 GB |
| GPU | NVIDIA GeForce GT 710 (2 GB VRAM) |
| OS | Windows 11 Pro |
| Browser | Chrome 157, `devicePixelRatio` 1, 60 Hz display |

## Metrics

Collected per scenario with a `requestAnimationFrame` sampler (see *Measurement method*):

| Metric | Meaning |
|---|---|
| `avgFps` | Frames per second over the sample window |
| `avgMs` | Mean frame time |
| `p95Ms` | 95th-percentile frame time (stutter indicator) |
| `maxMs` | Worst single frame (freeze indicator) |

Correctness companion metrics (not timing): spawn-cap chip visible when the fleet
exceeds the tier budget, and the live vehicle count equals the budget.

## Pass thresholds

Every scenario must meet **all** of the following on the target hardware:

| Threshold | Value |
|---|---|
| `avgFps` | ≥ 30 (60 = vsync ceiling on this display) |
| `p95Ms` | ≤ 50 ms |
| `maxMs` | ≤ 500 ms (no multi-second freeze) |
| Low-tier spawn cap | Engages at budget (20 vehicles) with timeline `spawn cap` indicator |

A failure triggers **one remediation round** (see *Remediation playbook*) followed by a
re-measure of the failing scenario.

## Quality tier budgets

From `src/lib/render/quality.ts` — the knobs a remediation round tunes:

| Tier | DPR | Shadows | Detail (window lights, trees) | Vehicle budget |
|---|---|---|---|---|
| Low | 0.75 | off | 0 | 20 |
| Medium | 1 – 1.25 | on | 0.5 | 64 |
| High | 1 – 1.5 | on | 1 | 256 |

## Scenarios and reproduction steps

Reproduce in this order; each scenario is sampled for **4 seconds** after a **~1 s warm-up**.

| # | Scenario | Setup steps |
|---|---|---|
| S1 | Explore idle, Medium | Fresh load → Explore tab (default) |
| S2 | Simulating, Medium | Simulate tab → Reset → Play |
| S3 | Simulating, Low | Settings → Low → Simulate → Reset → Play (spawn cap engages) |
| S4 | Simulating, High | Settings → High → Simulate → Reset → Play |
| S5 | Analyze open while simulating, Medium | Settings → Medium → Analyze tab → Play |

Steps in detail:

1. `cd front-end && npm run dev` (use `npm run build && npm run start` for production numbers).
2. Open `http://localhost:3000`, keep the window focused (see gotcha below).
3. Run the sampler from step *Measurement method*, record the four numbers.
4. Change tier via the Settings panel (gear, top-right) — applies live, no reload.
5. Play/pause/reset via the timeline footer; mode via the top tabs.
6. Compare each scenario's numbers against *Pass thresholds*.

## Measurement method

Run this in the page (DevTools console, or Playwright `page.evaluate`):

```js
await new Promise((res) => {
  const dts = [];
  let last = performance.now();
  const start = last;
  (function tick(t) {
    dts.push(t - last);
    last = t;
    if (t - start < 4000) { requestAnimationFrame(tick); return; }
    const d = dts.slice(1).sort((a, b) => a - b);
    const avg = d.reduce((a, b) => a + b, 0) / d.length;
    res({
      frames: d.length,
      avgFps: Math.round(1000 / avg),
      avgMs: Math.round(avg * 10) / 10,
      p95Ms: Math.round(d[Math.floor(d.length * 0.95)] * 10) / 10,
      maxMs: Math.round(d[d.length - 1] * 10) / 10,
    });
  })(performance.now());
});
```

**Gotcha:** Chrome throttles `requestAnimationFrame` to ~1 Hz while the window is
occluded/unfocused, which poisons the sample (≈1 fps, 1000 ms frames). Always probe
first (sample 1 s; if `avgFps < 10`, refocus the window and re-sample) and keep the
tab foregrounded for the whole run.

## Recorded run — 2026-11-14 (after visual refinement; target hardware)

Environment: the exact target machine above, verified before the run (i3-7100, GT 710,
8 GB, Chrome 157.0.8103.51); Next.js **dev server**; Playwright automation, foreground
tab, `devicePixelRatio` 1. Same sampler and 1 s warm-up + 4 s window as documented.
This run includes the capstone visuals: type-driven footprints/rooftops, instanced
intersection pads and stop lines, vehicle cabins, and tier-scaled roadside trees.

| # | Scenario | avgFps | avgMs | p95Ms | maxMs | Cap visible | Verdict |
|---|---|---|---|---|---|---|---|
| S1 | Explore idle, Medium | 60 | 16.7 | 16.9 | 17.0 | n/a | PASS |
| S2 | Simulating, Medium | 60 | 16.7 | 16.9 | 17.0 | no | PASS |
| S3 | Simulating, Low | 60 | 16.7 | 16.9 | 17.0 | yes (20 vehicles = budget) | PASS |
| S4 | Simulating, High | 60 | 16.7 | 16.9 | 17.0 | no | PASS |
| S5 | Analyze + simulating, Medium | 60 | 16.7 | 16.9 | 17.0 | no (31 vehicles, 4 trend charts) | PASS |

**Measured values above vs. targets:** all four metrics are at the 60 Hz vsync ceiling
in every scenario; targets (avg ≥ 30, p95 ≤ 50 ms, max ≤ 500 ms, Low cap at 20) are met
with headroom. No remediation round was needed, and the visual additions did not add a
measurable frame cost on the GT 710. S3's live count was read as 20 from the Analyze
panel; S5 ran with the trend charts mounted.

## Previous recorded run — 2026-11-13 (pre-visual-refinement, target hardware)

Environment: the exact target machine above; Next.js **dev server** (production build is
expected to be equal or faster); Chrome 157 headful driven by Playwright automation;
`devicePixelRatio` 1.

| # | Scenario | avgFps | avgMs | p95Ms | maxMs | Cap visible | Verdict |
|---|---|---|---|---|---|---|---|
| S1 | Explore idle, Medium | 60 | 16.7 | 16.9 | 17.0 | n/a | PASS |
| S2 | Simulating, Medium | 60 | 16.7 | 16.9 | 17.1 | no | PASS |
| S3 | Simulating, Low | 58 | 17.3 | 17.0 | 116.8 | yes (20 vehicles = budget) | PASS |
| S4 | Simulating, High | 60 | 16.7 | 16.9 | 17.0 | no | PASS |
| S5 | Analyze + simulating, Medium | 60 | 16.7 | 16.9 | 17.0 | no | PASS |

All scenarios meet every threshold (avg ≥ 30, p95 ≤ 50, max ≤ 500; S3's 116.8 ms max is
a one-off warm-up frame right after the tier switch/reset, still well under 500 ms).
**No remediation round required** — the results were vsync-locked at the display's
60 Hz ceiling in every scenario, so headroom on this hardware is real but bounded by
the 60 Hz sample (a faster display would show the true ceiling).

## Remediation playbook (one round, only on failure)

Tunables live in `src/lib/render/quality.ts` (per tier) — apply in this order, then
re-measure the failing scenario:

1. **Frame time / FPS** → lower the tier's `dpr` cap (e.g. High `1.5 → 1.25`,
   Medium `1.25 → 1`); DPR is the single largest GPU cost on the GT 710.
2. **Still failing** → reduce `detail` (window lights and roadside trees) one step.
3. **Still failing** → set `shadows: false` for that tier (removes the directional
   shadow pass + `ContactShadows` render target).
4. **Sim-bound (S2/S4 fail, S1 passes)** → lower `vehicleBudget` for that tier
   (spawn-cap indicator tells the user why); vehicles and window lights are already
   instanced (`Instances`), so remaining cost is per-instance shading, not draw calls.

Structural invariants that must not regress while tuning: vehicles/buildings/windows
render through drei `Instances` (batched draw calls), the timeline driver publishes at
≤ 10 Hz (DOM updates never run per frame), and the 3D scene reads the engine directly
in `useFrame` (no React re-render per frame).
