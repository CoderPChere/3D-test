# Spec Delta

## Purpose

Defines the verification gates and automated coverage that keep the browser-only simulation sandbox trustworthy, so every quality or correctness claim is backed by an executed check.

## ADDED Requirements

### Requirement: Standard verification commands exist and pass
The application SHALL provide package scripts for unit tests, type checking, linting, and production build, preserving the existing dev, build, start, and lint commands. Every script MUST exit successfully on the completed change.

#### Scenario: All gates pass
- **WHEN** the maintainer runs the test, typecheck, lint, and build scripts
- **THEN** each command exits with status zero

#### Scenario: Existing scripts are preserved
- **WHEN** the scripts are added
- **THEN** the existing dev, start, build, and lint commands keep their behavior

### Requirement: Editing and persistence behavior has automated coverage
The unit suite SHALL cover object deletion with dependent cleanup and undo, road construction and connection validation, road-graph consistency after edits, local-load validation, referential-integrity rejection, and shortcut gating around editable fields.

#### Scenario: Deletion coverage
- **WHEN** the suite runs
- **THEN** tests prove cascade deletion, selection clearing, and undo/redo restoration

#### Scenario: Road coverage
- **WHEN** the suite runs
- **THEN** tests prove valid segments are added, invalid segments rejected with reasons, and endpoint connections appear in the graph

#### Scenario: Persistence coverage
- **WHEN** the suite runs
- **THEN** tests prove corrupt or dangling saved data is rejected without replacing the current project

#### Scenario: Shortcut coverage
- **WHEN** the suite runs
- **THEN** tests prove shortcuts fire only outside editable fields

### Requirement: Critical user workflows are verified end to end
Before the change is declared complete, the critical workflows MUST be exercised in a browser against the running app: deleting an object, drawing and editing a road, running the simulation with charts, saving and loading, exporting and importing, and rejecting corrupted storage. Each verified workflow SHALL have recorded evidence of the observed result.

#### Scenario: Workflows verified in browser
- **WHEN** verification runs against the running application
- **THEN** each critical workflow succeeds and its evidence is recorded in the change verification notes

#### Scenario: Failures are reported, not assumed
- **WHEN** a browser workflow fails or a check cannot run
- **THEN** the failure is recorded and the change is not declared complete
