# Spec Delta

## Purpose

Defines the interactive 3D viewport: camera behavior, object picking and highlighting, placement previews, layer visibility, and quality-aware rendering behavior.

## ADDED Requirements

### Requirement: Camera supports orbit, pan, and zoom
The viewport camera SHALL support orbit, pan, and zoom via mouse input, and SHALL NOT be driven by page scroll position.

#### Scenario: Orbit interaction
- **WHEN** the user drags with the primary mouse button over the viewport
- **THEN** the camera orbits around the scene center

#### Scenario: Zoom interaction
- **WHEN** the user scrolls or uses the zoom gesture over the viewport
- **THEN** the camera moves closer to or farther from the scene within configured min/max distance limits

#### Scenario: Page scroll does not move the camera
- **WHEN** there is no page scroll content or the user attempts to scroll while hovering the viewport
- **THEN** the camera position changes only through explicit pan/zoom/orbit input, never through scroll-linked animation

### Requirement: Objects can be picked and highlighted
The viewport SHALL allow clicking a city object to select it and hovering to highlight it, with a visible highlight distinct from unselected objects.

#### Scenario: Click selects an object
- **WHEN** the user clicks a building in the viewport
- **THEN** that building becomes the current selection, the inspector shows its properties, and the building renders with a selection highlight

#### Scenario: Click on empty ground clears selection
- **WHEN** the user clicks ground with no object under the pointer
- **THEN** the current selection is cleared and the inspector returns to its idle state

#### Scenario: Hover feedback
- **WHEN** the pointer hovers over a selectable object
- **THEN** the object shows a hover highlight without changing the current selection

### Requirement: Placement tools show a ground preview
While a placement tool is active, the viewport SHALL render a ghost preview of the object under the pointer on the ground plane, following pointer movement.

#### Scenario: Valid placement position
- **WHEN** the Build Road tool is active and the pointer is over buildable ground
- **THEN** a preview of the road segment follows the pointer and is rendered in a valid (allowed) visual state

#### Scenario: Invalid placement position
- **WHEN** the placement preview overlaps an existing object or lies outside buildable bounds
- **THEN** the preview renders in an invalid visual state and clicking does not create the object

### Requirement: Visualization layers are independently toggleable
The viewport SHALL render city content in named visualization layers (for example geometry, vehicles, signals, density heatmap, congestion hotspots) that can each be shown or hidden without affecting others.

#### Scenario: Toggle a layer off
- **WHEN** the user hides the density heatmap layer
- **THEN** heatmap rendering disappears while buildings, roads, and vehicles remain visible

#### Scenario: Toggle persists across mode switches
- **WHEN** a layer is hidden and the user switches workspace modes
- **THEN** the layer remains hidden

### Requirement: Rendering avoids runtime network dependencies
Scene rendering SHALL NOT fetch external assets at runtime; the scene must render fully offline after the application bundle loads.

#### Scenario: Offline rendering
- **WHEN** the application runs with all external network access blocked
- **THEN** the 3D scene renders with materials, lighting, and environment intact and no failed-asset errors

### Requirement: Rendering stays responsive on low-end hardware
The viewport SHALL keep frame rendering within a documented performance budget on the target hardware class (dual-core i3, 8 GB RAM, 2 GB VRAM GPU) by applying the quality tier settings (DPR cap, shadow policy, entity budgets).

#### Scenario: Low quality tier
- **WHEN** the user selects the Low quality tier on the target hardware
- **THEN** device pixel ratio is reduced, non-essential shadows are disabled, and the scene maintains interactive frame rates at the maximum supported entity count
