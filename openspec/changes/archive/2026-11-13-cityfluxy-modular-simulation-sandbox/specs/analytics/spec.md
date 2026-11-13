# Spec Delta

## Purpose

Defines analytics: metrics panels and visualization layers in Analyze mode, all derived from live local simulation state, plus export of simulation results.

## ADDED Requirements

### Requirement: Analyze mode presents live metrics
Analyze mode SHALL present simulation metrics — vehicle count, average speed, density, congestion level, per-road throughput, queue lengths — computed from current simulation state.

#### Scenario: Metrics reflect a running simulation
- **WHEN** the simulation runs and traffic builds up
- **THEN** displayed congestion and queue metrics change to match the simulation's actual state

#### Scenario: No hardcoded display values
- **WHEN** any metrics panel is inspected
- **THEN** every numeric value is traceable to computed simulation state; static example values MUST NOT be displayed

### Requirement: Congestion hotspots visualize from computed data
The analytics view SHALL render a congestion/density visualization layer whose intensity at each location derives from computed vehicle density on nearby road segments.

#### Scenario: Hotspot appears with congestion
- **WHEN** a road segment's computed density rises above the congestion threshold
- **THEN** that segment's visualization shows a congestion hotspot and intensifies with density

#### Scenario: Hotspot clears when traffic clears
- **WHEN** vehicles leave a previously congested segment
- **THEN** the hotspot fades and disappears as computed density falls below the threshold

### Requirement: Vehicle distribution is visualizable
The analytics view SHALL support visualizing the distribution of vehicles by type across the road network.

#### Scenario: Distribution view
- **WHEN** the user enables the vehicle distribution layer while vehicles of several types are active
- **THEN** vehicles are rendered distinguishable by type and counts per type match engine state

### Requirement: Simulation results can be exported
The workspace SHALL allow exporting simulation results (metrics summary of a run, optionally per-timestep series) as a local JSON file.

#### Scenario: Export results
- **WHEN** the user exports results after running a scenario
- **THEN** a JSON file downloads containing the run's computed metrics and the scenario/seed it was produced from

#### Scenario: Export with no run data
- **WHEN** the user attempts to export before any simulation has run
- **THEN** the export control indicates there is no data to export and no file is produced

### Requirement: Metric computation does not degrade interactivity
Metrics and visualization layers SHALL update at a bounded cadence (not per render frame per entity) so enabling analytics does not make the viewport unresponsive on target hardware.

#### Scenario: Analytics under load
- **WHEN** all visualization layers are enabled at maximum supported entity counts on target hardware
- **THEN** the viewport remains interactive and layer/metric updates continue at their bounded cadence
