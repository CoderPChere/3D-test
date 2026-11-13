# Spec Delta

## Purpose

Defines the full-screen workspace shell — top bar, tool toolbar, inspector, simulation timeline — and the four workspace modes that control which tools and panels are active.

## ADDED Requirements

### Requirement: Application opens directly into the workspace
The application SHALL load straight into the full-screen simulation workspace at the root route, with no landing page, marketing sections, or scroll-driven intro between the user and the 3D viewport.

#### Scenario: First load
- **WHEN** the user opens the application root URL with no stored project
- **THEN** the workspace renders immediately with the 3D viewport visible, default tools available, and no intermediate page or onboarding overlay

#### Scenario: No backend required at startup
- **WHEN** the application starts with no network services, API keys, or environment credentials configured
- **THEN** it loads without errors and all workspace controls remain functional

### Requirement: Top navigation bar shows project and mode context
The top bar SHALL display the CityFluxy brand, the current project name, the active workspace mode, and controls for save, load, import, export, settings, plus undo and redo indicators.

#### Scenario: Project metadata display
- **WHEN** the workspace is loaded with a project named "Downtown Test"
- **THEN** the top bar shows "Downtown Test" as the current project name and the active mode name

#### Scenario: Undo/redo indicators reflect history
- **WHEN** the user performs an undoable edit
- **THEN** the undo indicator becomes active, and it becomes inactive again when history is exhausted

### Requirement: Left toolbar provides functional tools
The left toolbar SHALL provide Select, Move, Build Road, Add Building, Add Vehicle, Add Signal, Add Incident, Create Zone, and Layer management tools, and each tool MUST have observable behavior when activated.

#### Scenario: Tool activation changes cursor and behavior
- **WHEN** the user activates the Build Road tool
- **THEN** the viewport enters road placement mode, showing a placement preview, and clicking the ground attempts to place a road

#### Scenario: No decorative controls
- **WHEN** any control in the workspace is rendered
- **THEN** interacting with it produces a real state change; controls without behavior MUST NOT be displayed

### Requirement: Right inspector shows selection details
The right panel SHALL display the properties of the currently selected object, and SHALL allow editing of properties that are editable, updating the scene when values change.

#### Scenario: Nothing selected
- **WHEN** no object is selected
- **THEN** the inspector shows an empty/idle state rather than stale object data

#### Scenario: Road selected
- **WHEN** the user selects a road
- **THEN** the inspector shows its name, length, lane count, road type, speed limit, capacity, and open/closed status, and editing speed limit updates the displayed value

### Requirement: Bottom timeline drives the simulation
The bottom timeline SHALL provide play, pause, reset, simulation speed, simulation time, status display, and scenario controls, wired to the local simulation engine.

#### Scenario: Play advances simulation time
- **WHEN** the user presses play on a paused simulation
- **THEN** the simulation status changes to running and simulation time advances in proportion to the selected speed

#### Scenario: Reset returns to initial state
- **WHEN** the user presses reset after running the simulation
- **THEN** simulation time returns to zero, vehicles and metrics return to their initial seeded state, and status changes to stopped

### Requirement: Workspace modes gate tools and panels
The workspace SHALL support four modes — Explore, Build, Simulate, Analyze — where switching modes changes which toolbar tools are enabled and which panels are emphasized without reloading the application.

#### Scenario: Explore mode
- **WHEN** the user switches to Explore mode
- **THEN** selection, inspection, and layer visibility controls are enabled and editing tools are disabled

#### Scenario: Analyze mode
- **WHEN** the user switches to Analyze mode
- **THEN** analytics panels and visualization layer controls are shown and placement tools are disabled

#### Scenario: Mode switch preserves project state
- **WHEN** the user switches modes after editing the city
- **THEN** the city model, selection, and simulation state are unchanged
