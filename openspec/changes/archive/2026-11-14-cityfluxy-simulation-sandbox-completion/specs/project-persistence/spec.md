# Spec Delta

## ADDED Requirements

### Requirement: Local project loads are validated like imports
Loading a saved project from local storage MUST pass envelope validation (schema version, saved timestamp, project name) and the same structural validation applied to JSON imports, including project version, object schema, enums, numeric ranges, and required fields. Corrupt, unsupported, or schema-invalid data MUST be rejected with a readable message and MUST NOT replace the current project.

#### Scenario: Valid saved project loads
- **WHEN** the user loads a previously saved project
- **THEN** the project and its name are restored and the saved state indicator reflects the save

#### Scenario: Corrupted saved data is rejected
- **WHEN** the stored payload is unreadable JSON or fails envelope validation
- **THEN** the load fails with a message and the current project remains unchanged

#### Scenario: Unsupported version is rejected
- **WHEN** the stored project declares an unsupported project version
- **THEN** the load fails naming the version and the current project remains unchanged

#### Scenario: Schema-invalid stored project is rejected
- **WHEN** the stored project has a missing field, wrong type, invalid enum, or out-of-range value
- **THEN** the load fails naming the offending field and the current project remains unchanged

### Requirement: Object identity and order are consistent
Validation MUST reject a project when an object's `id` field differs from its map key, or when `order` contains duplicate or unknown ids. Error messages MUST name the offending field path.

#### Scenario: Identity/key mismatch is rejected
- **WHEN** an object entry's `id` does not match its key in `objects`
- **THEN** validation fails naming that object's id field

#### Scenario: Duplicate order entry is rejected
- **WHEN** `order` lists the same object id more than once
- **THEN** validation fails naming the duplicate order entry

### Requirement: Object references must resolve to existing objects
Validation MUST reject a project when a vehicle's `spawnRoadId` does not reference an existing road, an incident's `roadId` does not reference an existing road, or a building's optional `zoneId` does not reference an existing zone. Error messages MUST name the offending field path.

#### Scenario: Dangling vehicle reference is rejected
- **WHEN** a project contains a vehicle whose spawn road id does not exist
- **THEN** validation fails naming that vehicle's spawn-road field

#### Scenario: Dangling incident reference is rejected
- **WHEN** an incident's road id does not reference an existing road
- **THEN** validation fails naming that incident's road field

#### Scenario: Dangling zone reference is rejected
- **WHEN** a building's zone id does not reference an existing zone
- **THEN** validation fails naming that building's zone field

### Requirement: Scenario event targets must resolve with the correct type
Validation MUST reject a scenario event whose `roadId` does not reference an existing road or whose `signalId` does not reference an existing signal, including targets that exist with the wrong object type. Error messages MUST name the offending field path.

#### Scenario: Dangling event target is rejected
- **WHEN** a scenario event targets a road or signal that does not exist
- **THEN** validation fails naming the event target field

#### Scenario: Wrong target type is rejected
- **WHEN** a signal-timing event targets an object that is not a signal
- **THEN** validation fails instead of applying partial behavior

### Requirement: Road geometry must be valid
Validation MUST reject a road whose endpoints are identical or whose length is below the minimum supported segment length, naming the road's geometry fields.

#### Scenario: Degenerate road geometry is rejected
- **WHEN** a road's endpoints are identical or produce a length below the minimum
- **THEN** validation fails naming the road geometry fields

### Requirement: Validation accepts valid projects unchanged
A freshly generated project or a complete export MUST pass validation without modification.

#### Scenario: Valid projects remain accepted
- **WHEN** a freshly generated project or a complete export is validated
- **THEN** it is accepted unchanged, including all cross-object references

### Requirement: Export and import preserve project relationships
Exporting a project and importing the resulting file MUST preserve object ids, geometry, references between objects, scenarios and their events, and project settings.

#### Scenario: Round-trip preserves references
- **WHEN** a project with vehicles, incidents, zones, and scenario events is exported and re-imported
- **THEN** the imported project equals the exported project and all references still resolve

#### Scenario: Invalid files never mutate the project
- **WHEN** an import fails for any reason
- **THEN** the current project, name, and selection are unchanged and the message states the failure
