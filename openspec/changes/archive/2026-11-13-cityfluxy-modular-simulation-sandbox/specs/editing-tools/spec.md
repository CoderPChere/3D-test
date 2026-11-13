# Spec Delta

## Purpose

Defines Build-mode editing behavior: placing, moving, and deleting city objects, undo/redo of edits, and validation rules that reject invalid placements.

## ADDED Requirements

### Requirement: Users can place supported objects
When a placement tool is active, clicking on valid ground SHALL create the corresponding object (road, building, vehicle, traffic signal, incident, or zone) at the clicked position and make it available for selection.

#### Scenario: Place a building
- **WHEN** the Add Building tool is active and the user clicks valid empty ground
- **THEN** a new building appears at that position and becomes the current selection

#### Scenario: Placement respects active tool
- **WHEN** the Add Building tool is active and the user clicks ground
- **THEN** a building is created, not a road or vehicle; only the active tool's object type may be created by clicking

### Requirement: Invalid placements are rejected with feedback
The system SHALL reject a placement that overlaps an existing object, violates minimum spacing, or falls outside buildable bounds, and SHALL explain the rejection to the user.

#### Scenario: Overlapping placement
- **WHEN** the user attempts to place a building that intersects an existing building
- **THEN** no object is created and the user sees a message stating the reason (overlap)

#### Scenario: Out-of-bounds placement
- **WHEN** the user attempts to place an object beyond the buildable ground bounds
- **THEN** no object is created and the rejection reason is displayed

### Requirement: Users can move objects
The Move tool SHALL allow dragging a selected object to a new ground position, updating its position in the project state.

#### Scenario: Move a building
- **WHEN** the user drags a building with the Move tool to a new valid position
- **THEN** the building renders at the new position and the inspector shows the updated coordinates

#### Scenario: Move rejected when target is occupied
- **WHEN** the user drops a building onto a position overlapping another object
- **THEN** the object returns to its original position and a rejection message is shown

### Requirement: Users can delete objects
The system SHALL allow deleting the selected object, with a visible confirmation or an undo opportunity before the deletion becomes permanent.

#### Scenario: Delete a road
- **WHEN** the user deletes a selected road
- **THEN** the road disappears from the scene and inspector and the deletion is recorded in undo history

### Requirement: Edits support undo and redo
Every state-changing edit (place, move, delete, property change) SHALL be undoable and redoable through the top-bar controls, in reverse and forward order respectively.

#### Scenario: Undo a placement
- **WHEN** the user places a building and presses undo
- **THEN** the building is removed and project state matches the state before placement

#### Scenario: Redo after undo
- **WHEN** the user undoes a placement and then presses redo
- **THEN** the building reappears with its original properties and identifier

#### Scenario: New edit clears the redo stack
- **WHEN** the user undoes an edit and then performs a different new edit
- **THEN** the redo history for the abandoned branch is discarded

### Requirement: Editing is scoped to Build mode
Object placement, move, and delete tools SHALL be enabled only in Build mode (and equivalent simulation-authoring contexts), and SHALL be disabled during Analyze mode.

#### Scenario: Tool availability by mode
- **WHEN** the user switches from Build mode to Analyze mode
- **THEN** placement, move, and delete tools become inactive and cannot modify the city model
