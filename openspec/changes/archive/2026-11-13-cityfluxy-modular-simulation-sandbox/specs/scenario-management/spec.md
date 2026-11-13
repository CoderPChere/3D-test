# Spec Delta

## Purpose

Defines scenario management: creating and organizing scenarios with scheduled events, running and resetting them, and comparing their results.

## ADDED Requirements

### Requirement: Users can create, rename, and duplicate scenarios
The workspace SHALL allow creating a new scenario, renaming an existing one, and duplicating a scenario including its scheduled events.

#### Scenario: Duplicate a scenario
- **WHEN** the user duplicates scenario "Rush Hour"
- **THEN** a new scenario appears with a distinct name and an identical copy of "Rush Hour"'s events

#### Scenario: Rename a scenario
- **WHEN** the user renames a scenario
- **THEN** the new name appears in all scenario selectors and the scenario's events are unchanged

### Requirement: Scenarios can contain scheduled events
A scenario SHALL support scheduled event types: road closure, traffic accident, vehicle surge, and signal timing change, each with a simulation-time trigger.

#### Scenario: Schedule a road closure
- **WHEN** the user adds a road closure event at simulation time 60s to a scenario
- **THEN** the event appears in the scenario's event list showing type, target, and trigger time

#### Scenario: Event fires at its trigger time
- **WHEN** a simulation runs that scenario and simulated time reaches 60s
- **THEN** the road closure takes effect in the running simulation

#### Scenario: Event ordering
- **WHEN** a scenario contains multiple events with the same trigger time
- **THEN** all of them apply at that timestep in a stable, defined order

### Requirement: Scenarios run and reset against the simulation
A scenario SHALL be runnable from the timeline and resettable, where starting a run begins from the base seeded state plus the scenario definition.

#### Scenario: Run a scenario
- **WHEN** the user selects a scenario and presses play
- **THEN** the simulation runs with that scenario's events activating at their trigger times

#### Scenario: Reset a scenario run
- **WHEN** the user resets after running a scenario
- **THEN** all scenario-event effects are reverted and simulation time returns to zero

### Requirement: Scenario results can be compared
The workspace SHALL allow comparing the results of two completed (or stopped) scenario runs on shared metrics (for example average speed, total delay, max queue length, throughput).

#### Scenario: Compare two runs
- **WHEN** the user compares scenario A and scenario B results in Analyze mode
- **THEN** shared metrics for both runs are displayed side by side, each computed from that run's simulation state

#### Scenario: Comparison before results exist
- **WHEN** the user selects a scenario that has never been run for comparison
- **THEN** the workspace indicates no results are available for it instead of showing placeholder values
