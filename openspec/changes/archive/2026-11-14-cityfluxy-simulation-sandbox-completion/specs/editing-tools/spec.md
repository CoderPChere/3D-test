# Spec Delta

## ADDED Requirements

### Requirement: Users can delete objects and dependent references are cleaned up
The system SHALL let users delete the selected object from the inspector and complete the deletion in a single undoable step. Vehicles and incidents bound to a deleted road SHALL be removed, buildings SHALL have their zone reference unset when a zone is deleted, and scenario events targeting a deleted road or signal SHALL be removed. The selection SHALL be cleared after deletion.

#### Scenario: Delete a selected object
- **WHEN** the user selects an object and activates Delete in the inspector
- **THEN** the object is removed from the project, the selection is cleared, and undo restores it

#### Scenario: Delete a road with dependents
- **WHEN** the user deletes a road that vehicles, incidents, and scenario events reference
- **THEN** those dependents are removed in the same undo step and no reference to the deleted road remains

#### Scenario: Delete a zone referenced by buildings
- **WHEN** the user deletes a zone assigned to buildings
- **THEN** those buildings remain and their zone reference becomes unset

### Requirement: Keyboard shortcuts operate on the workspace
The workspace SHALL support Delete or Backspace to delete the selection, Ctrl+Z to undo, Ctrl+Y or Ctrl+Shift+Z to redo, and Escape to cancel an active placement or edit operation. Shortcuts MUST NOT fire while focus is in an input, textarea, select, or contenteditable element.

#### Scenario: Delete with the keyboard
- **WHEN** an object is selected and no editable field has focus and the user presses Delete
- **THEN** the object is deleted with the same dependent cleanup as the inspector action

#### Scenario: Typing is never intercepted
- **WHEN** focus is inside a text input and the user presses Backspace, Ctrl+Z, or Escape
- **THEN** the workspace shortcut does not run and the field handles the key normally

#### Scenario: Escape cancels road drawing
- **WHEN** a road start point is placed and the user presses Escape
- **THEN** the pending segment and preview are discarded without modifying the project

#### Scenario: Undo and redo with the keyboard
- **WHEN** an edit exists in history and the user presses Ctrl+Z and then Ctrl+Y or Ctrl+Shift+Z
- **THEN** the edit is undone and then reapplied

### Requirement: Roads are constructed from two ground points
Selecting the road tool SHALL arm a two-click construction mode: the first ground click sets the start point, pointer movement previews the pending straight segment, and the second click commits it. Start and end points MUST snap to the grid and to compatible existing road endpoints. The committed road SHALL be immediately selectable and editable, and only straight segments are supported in this change.

#### Scenario: Draw a road segment
- **WHEN** the road tool is active and the user clicks a start point and then an end point
- **THEN** a straight road between those points is added to the project as one undoable edit

#### Scenario: Preview reflects the pending segment
- **WHEN** a start point is placed and the pointer moves over the ground plane
- **THEN** a preview of the pending segment is shown before any second click

#### Scenario: Snap to an existing endpoint
- **WHEN** the second click lands near an existing road endpoint
- **THEN** the new segment ends exactly on that endpoint

### Requirement: Road placement validates geometry and connections
The system SHALL reject road segments that are shorter than the minimum length, degenerate, out of bounds, duplicates of an existing segment, or overlapping a same-orientation road, and SHALL show a readable reason. Perpendicular crossings are allowed. After a commit, the new road MUST be represented in the simulation road graph with shared endpoints connected, so no visually connected road is missing from simulation data.

#### Scenario: Reject an invalid segment
- **WHEN** the user attempts to commit a zero-length, too-short, duplicate, or overlapping segment
- **THEN** no road is added and the message states the reason

#### Scenario: Endpoint connection enters the graph
- **WHEN** a new road ends on an existing road's endpoint and both are committed
- **THEN** the simulation graph contains connected segments for both roads

#### Scenario: Perpendicular crossing is accepted
- **WHEN** a new road crosses an existing road at a right angle
- **THEN** the segment is accepted and the graph splits both roads at the intersection

### Requirement: Road direction is editable
A road's direction SHALL be its a→b endpoint order, and the inspector SHALL provide a flip action that reverses that order as an undoable edit without moving the road.

#### Scenario: Flip a road
- **WHEN** the user activates Flip direction on a selected road
- **THEN** the endpoints swap, the road occupies the same footprint, and the edit can be undone and redone
