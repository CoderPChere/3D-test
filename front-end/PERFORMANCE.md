# CITYFLUXY — Quality Tiers & Performance

Reference implementation of the rendering-performance contract: instanced
rendering, per-tier LOD, a selective shadow policy, adaptive pixel ratio,
and three quality tiers.

## Quality tiers

The tier table lives in `src/config/quality.ts` (`QUALITY`). A runtime tier
switch applies all four settings immediately — no reload:

| Tier | Pixel ratio (adaptive range) | Shadows | Traffic density (on switch) | LOD detail distance |
|---|---|---|---|---|
| `low` | 0.6 – 1.0 | off | `low` | 110 world units |
| `medium` | 1.0 – 1.25 | on | `medium` | 150 world units |
| `high` | 1.0 – 1.5 | on | `high` | 240 world units |

- **Startup density** comes from the project profile
  (`profile.traffic.density`, default `medium`) — the config owns boot; the
  tier table only applies density on a runtime tier switch.
- **Startup tier** comes from `profile.quality.tier` (default `medium`).
- **LOD boundary**: beyond the tier's `lodDistance`, detail layers simplify
  (lit window quads, sign faces, and CCTV markers drop; structures always
  render, so there is never a visible gap).

## Adaptive pixel ratio

`AdaptiveDpr` (in `src/components/Three/Scene.tsx`) measures frame time in
1-second windows inside the frame loop:

- average frame time **> 33 ms** for 3 consecutive windows → pixel ratio
  steps down by 0.1,
- average frame time **< 20** ms for 3 consecutive windows → steps up by 0.1,
- the ratio is always clamped into the active tier's range
  (`clampDpr`, NaN → minimum).

The canvas accepts `[0.6, 1.5]`; the tier table narrows that at runtime.

## Switching tiers

```ts
import { quality } from "@/config/quality";

quality.set("low"); // applies dpr bounds, shadows, density, LOD for the tier
quality.get(); // -> current tier
```

Subscribers (the adaptive dpr + shadow switch, LOD checks) update live.

## Measured performance

Reference hardware: **Intel i3-7100, 8 GB RAM, NVIDIA GT 710 2 GB**,
1920×1080, Chrome (ANGLE/D3D11). Session = continuous page scrolling plus
free-camera orbit drags, averaged over the whole session.

| Settings | Average FPS | Result |
|---|---|---|
| **low tier, high traffic density** | **38.5** (scroll 39.2 / free camera 38.0, 238.7 s) | **≥ 30 FPS gate: PASS** |
| medium tier, default (medium) density | 33.9 (scroll 32.7 / free camera 34.9, 144 s) | measured target, recorded only |

Measured 2026-11-10. The low-tier numbers are the mandatory gate; the
medium-tier number is a measured target with no pass/fail threshold. If a
future scene change drops the low-tier average below 30 FPS, recalibrate the
`QUALITY` defaults (pixel-ratio ceiling and LOD distance are the release
valves) and re-run the profile.
