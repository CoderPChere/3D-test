# Spec Delta

## Purpose

Defines the typed city object model — roads, buildings, vehicles, traffic signals, incidents, zones — including identity, observable properties, and the inspector display/edit contract for each type.

## ADDED Requirements

### Requirement: City objects have a typed, unique identity
Every city object SHALL have a stable unique identifier and a type from the supported set (road, building, vehicle, traffic signal, incident, zone), and identifiers SHALL remain stable across save/load and export/import.

#### Scenario: Stable identity across save/load
- **WHEN** a project containing a road is saved and then loaded
- **THEN** the road retains the same identifier it had before saving

#### Scenario: Object creation assigns identity
- **WHEN** a user places a new building
- **THEN** the building is assigned a unique identifier not used by any other object in the project

### Requirement: Road objects expose traffic-relevant properties
A road object SHALL expose name, length, lane count, road type, speed limit, capacity, and open/closed status, and length SHALL be derived from its geometry rather than entered manually.

#### Scenario: Road properties displayed
- **WHEN** the user selects a road
- **THEN** the inspector shows name, derived length, lane count, road type, speed limit, capacity, and current open/closed status

#### Scenario: Closed road status affects simulation
- **WHEN** the user sets a road's status to closed in the inspector
- **THEN** the simulation treats that road as closed (no new vehicles enter it) and the inspector shows status "Closed"

### Requirement: Building objects expose structural properties
A building object SHALL expose name, building type, height, position, and associated zone (if any).

#### Scenario: Building properties displayed
- **WHEN** the user selects a building
- **THEN** the inspector shows its name, type, height, position coordinates, and associated zone name or "None"

#### Scenario: Height editing updates the scene
- **WHEN** the user changes a building's height in the inspector
- **THEN** the building's rendered geometry updates to the new height and the value persists in the project

### Requirement: Vehicle objects expose runtime properties
A vehicle object SHALL expose vehicle type, current speed, current route, and status, where speed, route, and status reflect live simulation values rather than static defaults.

#### Scenario: Vehicle selected while simulation runs
- **WHEN** the user selects a moving vehicle during a running simulation
- **THEN** the inspector shows its type, a non-placeholder speed value matching its current motion, its current route, and its status (for example moving, stopped at signal, queued)

### Requirement: Traffic signal objects expose timing properties
A traffic signal object SHALL expose current signal state, cycle duration, and timing configuration (phase durations), and timing edits SHALL affect subsequent simulation behavior.

#### Scenario: Signal properties displayed
- **WHEN** the user selects a traffic signal
- **THEN** the inspector shows the signal's current state (red/yellow/green per approach), its cycle duration, and its phase timing configuration

#### Scenario: Timing edit takes effect
- **WHEN** the user increases a signal's green phase duration while the simulation is paused and then runs the simulation
- **THEN** subsequent signal cycles use the updated green phase duration

### Requirement: Generated city content is deterministic
Procedural generation of city objects (buildings, windows, vehicle fleets) SHALL be driven by a stored seed such that the same seed and inputs produce an identical city and fleet.

#### Scenario: Same seed reproduces the city
- **WHEN** two projects are generated from the same seed
- **THEN** building heights, placements, and the initial vehicle fleet are identical between them

#### Scenario: Different seed varies the city
- **WHEN** a project is generated with a different seed
- **THEN** at least one generated attribute (such as building heights) differs from the original
