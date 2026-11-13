# Spec Delta

## Purpose

Defines local persistence: saving and loading projects in browser storage, JSON export/import with validation, and settings persistence — all without any backend service.

## ADDED Requirements

### Requirement: Projects save and load locally
The workspace SHALL save the current project (city model, scenarios, seed, settings) to browser local storage and load it back with full fidelity, listing saved projects by name.

#### Scenario: Save then load
- **WHEN** the user saves a project and later loads it
- **THEN** the city objects, identifiers, scenarios, and seed match what was saved

#### Scenario: Save feedback
- **WHEN** a save completes
- **THEN** the top bar indicates the saved state (for example a "saved" timestamp) and a save failure surfaces an error message rather than silently succeeding

### Requirement: Projects export and import as JSON
The workspace SHALL export the current project as a downloadable JSON file and import a project from such a file, replacing or opening the project in the workspace.

#### Scenario: Export then import round-trip
- **WHEN** a project is exported and immediately imported
- **THEN** the imported project is equivalent to the exported one, including object identifiers and scenarios

### Requirement: Imported data is validated before use
The system SHALL validate imported JSON against the project schema (structure, required fields, object types, value ranges) and reject invalid data with a specific, human-readable error without corrupting the current project.

#### Scenario: Malformed JSON
- **WHEN** the user imports a file that is not valid JSON
- **THEN** the import is rejected with an error naming the parse failure and the current project remains unchanged

#### Scenario: Schema-invalid project
- **WHEN** the imported JSON is valid JSON but lacks required fields or contains an unknown object type
- **THEN** the import is rejected with an error identifying the invalid field(s) and the current project remains unchanged

#### Scenario: Valid project
- **WHEN** the imported file passes validation
- **THEN** the project loads into the workspace and is selectable as the active project

### Requirement: Settings persist locally
User settings (quality tier, layer visibility defaults, simulation speed preference) SHALL persist across sessions in local storage.

#### Scenario: Settings survive reload
- **WHEN** the user changes the quality tier to Low and reloads the application
- **THEN** the quality tier is still Low after reload

### Requirement: Persistence requires no backend
Save, load, export, import, and settings persistence SHALL operate entirely in the browser with no network requests, accounts, or API keys.

#### Scenario: Fully offline persistence
- **WHEN** the application runs with all network access blocked
- **THEN** save, load, export, import, and settings persistence all complete successfully
