# Spec Delta

## Purpose

Defines the module registry that lets the workspace enable domain capability packs (mobility first, later infrastructure, environment, safety, logistics) declaring their tools, object types, layers, and metrics.

## ADDED Requirements

### Requirement: Modules are declarable and listed
The system SHALL support registering modules with at least: id, display name, enabled state, available tools, supported object types, visualization layers, and metrics, and SHALL list registered modules in settings.

#### Scenario: Registered modules appear
- **WHEN** the application starts with the mobility module registered
- **THEN** settings shows a module list including the mobility module with its display name and enabled state

#### Scenario: Module declaration drives its metadata
- **WHEN** a module declares object types and metrics
- **THEN** those declarations are the source of the module's listed capabilities in the UI

### Requirement: Enabled modules contribute workspace capabilities
Enabling a module SHALL make its declared tools available in the toolbar, its object types placeable and inspectable, its layers toggleable, and its metrics shown in Analyze mode; disabling a module SHALL remove them.

#### Scenario: Enable a module
- **WHEN** the user enables an additional registered module
- **THEN** its tools, object types, layers, and metrics become available without restarting the application

#### Scenario: Disable a module
- **WHEN** the user disables a module
- **THEN** its tools disappear from the toolbar and its layers/metrics are removed, while existing city objects of its types remain in the project (not silently deleted)

### Requirement: Mobility is the default enabled module
The workspace SHALL ship with the mobility module registered and enabled by default so the core experience (roads, vehicles, signals, traffic metrics) works on first launch.

#### Scenario: First launch capability
- **WHEN** the application starts for the first time
- **THEN** mobility tools, object types, layers, and metrics are available without any configuration

### Requirement: Module system stays minimal
The module system SHALL NOT introduce runtime code loading, remote plugin installation, or third-party plugin sandboxes; modules are compile-time registrations toggled at runtime.

#### Scenario: No dynamic code fetch
- **WHEN** a module is enabled
- **THEN** no remote code is downloaded and no network request occurs
