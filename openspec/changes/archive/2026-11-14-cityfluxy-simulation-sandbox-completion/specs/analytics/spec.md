# Spec Delta

## ADDED Requirements

### Requirement: Simulation runs capture a bounded metric history
While a simulation runs, the workspace SHALL sample engine snapshots into a session-scoped history buffer at a throttled rate of at least two samples per wall-clock second, bounded to a fixed capacity, and SHALL clear the history on reset. History values MUST come from the authoritative engine snapshot, never from placeholder or random values, and sampling MUST NOT add per-frame React re-renders of the 3D scene.

#### Scenario: History grows during a run
- **WHEN** the simulation runs for several seconds
- **THEN** the history buffer contains time-ordered samples of vehicle count, average speed, density, congestion, and throughput

#### Scenario: History is bounded
- **WHEN** a run continues long enough to exceed the buffer capacity
- **THEN** the oldest samples are dropped and memory stays bounded

#### Scenario: Reset clears history
- **WHEN** the user resets the simulation
- **THEN** the history buffer is empty and charts show their empty state

#### Scenario: Paused runs record no new samples
- **WHEN** the simulation is paused
- **THEN** no further history samples are appended

### Requirement: Analyze mode visualizes metrics over time
Analyze mode SHALL display time-series charts for vehicle count, average speed, density, and throughput, derived from the captured history and labeled with their units. The charts SHALL show a clear empty state before any run data exists and SHALL update while the simulation runs.

#### Scenario: Charts populate while running
- **WHEN** the user opens Analyze mode during a run
- **THEN** each time-series chart renders the most recent history trend with its unit label

#### Scenario: Empty state before any run
- **WHEN** Analyze mode is opened with no history
- **THEN** each chart states that no run data exists yet instead of showing fabricated values

### Requirement: Analyze mode visualizes congestion distribution
Analyze mode SHALL display a congestion distribution derived from the current engine snapshot, ranking roads by their measured queue or congestion contribution and labeling them with road names.

#### Scenario: Congestion distribution reflects the snapshot
- **WHEN** vehicles queue on specific roads during a run
- **THEN** the distribution ranks those roads by measured load and uses their project names

#### Scenario: No congestion shows an empty distribution
- **WHEN** no road carries queued vehicles
- **THEN** the distribution states that no congestion is present
