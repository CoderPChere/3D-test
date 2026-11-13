# Spec Delta

## Purpose

Defines the standalone local simulation engine: deterministic fixed-timestep traffic simulation with vehicles, signals, closures, incidents, rerouting, and computed metrics, independent of React and Three.js.

## ADDED Requirements

### Requirement: Engine runs a fixed-timestep deterministic loop
The simulation SHALL advance in fixed timesteps with a seeded random source, and the same seed plus the same sequence of inputs SHALL produce an identical trajectory of simulation state.

#### Scenario: Deterministic replay
- **WHEN** two simulations run with the same seed, same project, and same input sequence
- **THEN** their vehicle positions, signal states, and metric values match exactly at every timestep

#### Scenario: Step function has no ambient randomness or time dependency
- **WHEN** the engine advances a step without wall-clock input
- **THEN** the resulting state depends only on prior state and the seeded RNG

### Requirement: Engine is independent of UI frameworks
The simulation engine SHALL be pure TypeScript with no imports from React, Three.js, or DOM APIs, and SHALL be drivable without rendering.

#### Scenario: Headless execution
- **WHEN** the engine is executed in a plain TypeScript/Node context with a project snapshot
- **THEN** it advances and emits state without any browser or renderer present

### Requirement: Play, pause, and reset control simulation
The timeline controls SHALL start, pause, and reset the simulation, where reset restores the exact initial seeded state.

#### Scenario: Pause freezes state
- **WHEN** the user pauses a running simulation
- **THEN** simulation time and all simulation state stop changing until resumed

#### Scenario: Reset restores initial state
- **WHEN** the user resets after running
- **THEN** the state equals the initial seeded state, verified by matching subsequent replay output

### Requirement: Simulation speed changes effective advancement rate
The timeline SHALL offer discrete simulation speed settings (for example 0.5×, 1×, 2×, 4×) that change how much simulated time advances per unit of wall-clock time.

#### Scenario: Double speed
- **WHEN** the simulation runs at 2× for ten wall-clock seconds from a paused start
- **THEN** simulated time advances approximately twenty seconds

### Requirement: Vehicles spawn, follow, and queue
Vehicles SHALL spawn from the road network according to spawn rules, travel routes, follow leading vehicles with safe headway, and form queues when blocked by signals, closures, or congestion.

#### Scenario: Car-following
- **WHEN** a slower vehicle occupies the lane ahead of a moving vehicle
- **THEN** the following vehicle reduces speed and does not overlap the leading vehicle

#### Scenario: Queue at red signal
- **WHEN** vehicles approach a red signal
- **THEN** they decelerate and stop behind the stop line in order rather than passing through

### Requirement: Traffic signals cycle per configuration
Signals SHALL cycle through phases per their timing configuration and expose their state to vehicles and the inspector.

#### Scenario: Phase progression
- **WHEN** the simulation runs with default signal timing
- **THEN** each approach's signal state progresses red → yellow → green per configured durations

### Requirement: Road closures and incidents alter traffic behavior
Closed roads and active incidents SHALL block or impede traffic: vehicles MUST NOT route through closed roads, and incidents reduce capacity on affected segments.

#### Scenario: Closure blocks routing
- **WHEN** a road is closed (manually or by a scenario event)
- **THEN** no new vehicles enter that road and vehicles already on it exit or despawn at the next opportunity

#### Scenario: Incident creates congestion
- **WHEN** an incident activates on a road segment
- **THEN** vehicles on that segment slow or queue behind the incident point

### Requirement: Vehicles reroute around blocked segments
When a vehicle's route contains a closed or incident-affected segment, the engine SHALL compute an alternative route if one exists; if none exists, the vehicle SHALL be marked stranded.

#### Scenario: Alternative route exists
- **WHEN** a closure blocks a vehicle's current route and another path to its destination exists
- **THEN** the vehicle receives a new route avoiding the closed segment

#### Scenario: No alternative exists
- **WHEN** a closure disconnects a vehicle's destination entirely
- **THEN** the vehicle is marked as stranded with a status visible in the inspector

### Requirement: Metrics are computed from simulation state
All displayed metrics (vehicle count, average speed, density, congestion level, queue lengths, per-road throughput) SHALL be computed from live engine state and MUST NOT be hardcoded or randomly generated.

#### Scenario: Metrics track state
- **WHEN** the simulation runs and vehicles accumulate on a road
- **THEN** that road's density/queue metrics rise accordingly and fall when vehicles leave

#### Scenario: Metrics start from real zero
- **WHEN** a freshly reset simulation has no vehicles
- **THEN** vehicle count and throughput metrics read zero
