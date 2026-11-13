# Spec Delta

## Purpose

Defines quality tiers, adaptive rendering behavior, entity budgets, and the performance validation strategy for low-end hardware (dual-core i3, 8 GB RAM, 2 GB VRAM GPU).

## ADDED Requirements

### Requirement: Quality tiers are user-selectable and persisted
The settings panel SHALL offer Low, Medium, and High quality tiers that apply observable rendering differences (device pixel ratio cap, shadow rendering, vegetation/detail density) and persist across sessions.

#### Scenario: Switching to Low
- **WHEN** the user selects the Low tier
- **THEN** device pixel ratio is capped lower, non-essential shadows stop rendering, and the change is visible without restarting the application

#### Scenario: Tier persists
- **WHEN** the user selects a tier and reloads
- **THEN** the selected tier remains active after reload

### Requirement: Entity counts stay within configured budgets
Each quality tier SHALL define maximum rendered entity counts (vehicles, buildings detail, lights); when the budget would be exceeded, the system applies its documented policy (cap spawns / degrade detail) rather than degrading frame rate unbounded.

#### Scenario: Vehicle budget enforcement
- **WHEN** vehicle count would exceed the active tier's budget
- **THEN** spawning is capped at the budget and the timeline indicates the cap; frame rate does not collapse

### Requirement: Static geometry is batched and vehicles are instanced
The renderer SHALL use instancing for repeated dynamic objects (vehicles, signal lights, windows, lane dashes) and batching/merging for repeated static geometry, keeping draw calls bounded as object counts grow.

#### Scenario: Draw-call scaling
- **WHEN** vehicle count increases from 20 to the tier maximum
- **THEN** draw calls grow sub-linearly (vehicles render through shared instanced draws rather than per-vehicle meshes)

### Requirement: Shadows and post-processing are bounded by tier
The system SHALL use a bounded shadow configuration (at most one shadow-casting light, fixed-resolution contact shadows at a limited update cadence) and no heavy post-processing pipeline by default.

#### Scenario: No per-frame full shadow passes
- **WHEN** the scene renders with default settings
- **THEN** shadow maps update at most once per frame from a single shadow-casting light, and no post-processing chain runs

### Requirement: A performance test strategy exists for the target hardware
The project SHALL document a repeatable performance test strategy for the target hardware class covering: startup time, frame rate in Explore mode at default city size, frame rate with all layers enabled, and simulation step time at maximum entity counts, with pass thresholds recorded alongside the strategy.

#### Scenario: Strategy documented and executable
- **WHEN** a developer reads the performance documentation
- **THEN** it specifies the scenarios to measure, the metrics to capture, the pass thresholds, and how to reproduce them on the target hardware class
