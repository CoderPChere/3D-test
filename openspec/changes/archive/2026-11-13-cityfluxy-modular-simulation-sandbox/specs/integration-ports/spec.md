# Spec Delta

## Purpose

Defines disconnected TypeScript ports through which future backend, AI, and external-data integrations could attach, while the current application runs entirely without them.

## ADDED Requirements

### Requirement: Future integration contracts exist as interfaces only
The project SHALL define TypeScript interfaces for a backend port (save/load/list projects, save scenarios), an AI port (generate scenario, explain simulation, recommend improvements), and a data port (retrieve city data, list available cities).

#### Scenario: Interfaces are defined
- **WHEN** the codebase is inspected for integration contracts
- **THEN** the three port interfaces exist as pure TypeScript types with no implementations attached

### Requirement: No port has an active implementation or network call
No code path SHALL perform network requests, mock AI responses, provider adapters, or API-key usage for these ports in the current version; the application must function with them entirely unimplemented.

#### Scenario: Application runs without ports
- **WHEN** the application runs end to end (explore, build, simulate, analyze, save, export)
- **THEN** no port interface is invoked and no network request is made

#### Scenario: No fake AI or live-data surfaces
- **WHEN** the UI is inspected
- **THEN** no control or indicator suggests active AI processing or live external data when no provider is connected

### Requirement: Ports are consumable through dependency injection points
Application features that would use a port SHALL accept it as an optional injected dependency (defaulting to none/local), so a future adapter can be added without modifying feature logic.

#### Scenario: Optional wiring
- **WHEN** a feature needs persistence and no backend port is supplied
- **THEN** it falls back to local storage persistence with identical user-visible behavior
