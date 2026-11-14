# Spec Delta

## ADDED Requirements

### Requirement: Intersections carry surface detailing
The scene SHALL render intersection surface treatment and stop lines at intersections derived from road geometry, without per-intersection authored data, and the detailing MUST remain batched/instanced so draw calls do not grow per intersection.

#### Scenario: Intersection detailing follows roads
- **WHEN** a new road creates an intersection by crossing or meeting an existing road
- **THEN** the intersection shows its surface treatment and approach stop lines

### Requirement: Buildings vary by type and seed
Procedurally generated buildings SHALL vary in footprint and rooftop treatment according to building type and seed. The same seed MUST produce identical building geometry, and building rendering MUST remain instanced.

#### Scenario: Types read differently
- **WHEN** a generated city is viewed
- **THEN** residential, commercial, office, and industrial buildings show distinct footprint or rooftop characteristics

#### Scenario: Determinism is preserved
- **WHEN** the same seed is generated twice
- **THEN** the building geometry and variety are identical

### Requirement: Vehicles have readable silhouettes per type
Vehicles SHALL render with distinguishable per-type silhouettes (for example body plus cabin or roof), positioned from engine state, and MUST remain instanced with no per-vehicle React updates while simulating.

#### Scenario: Types are distinguishable
- **WHEN** cars, vans, buses, and trucks are visible in the scene
- **THEN** each type is recognizable by its shape and proportions

#### Scenario: Simulation updates stay instanced
- **WHEN** the simulation runs
- **THEN** vehicle transforms update without a React re-render per frame or a draw call per vehicle

### Requirement: Vegetation is instanced and quality-bounded
The scene SHALL render roadside trees positioned deterministically from road geometry. Vegetation density MUST follow the quality tier's detail budget, MAY be omitted on the low tier, and MUST NOT affect simulation behavior.

#### Scenario: Trees follow the quality tier
- **WHEN** the user switches from low to high quality
- **THEN** additional roadside vegetation appears without changing simulation results

#### Scenario: Vegetation has no simulation effect
- **WHEN** vegetation is visible
- **THEN** vehicle movement, signals, and metrics match a run without vegetation
