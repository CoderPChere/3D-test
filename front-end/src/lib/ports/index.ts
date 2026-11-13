// Disconnected integration ports (integration-ports spec): pure TypeScript
// contracts only. No implementation ships — `ports` stays null and every
// consumer falls back to local behavior, so the app runs end-to-end without them.
import type { CityProject, Scenario } from '../model/types';

/** A saved project as returned by any persistence backend. */
export interface SavedProject {
  projectName: string;
  savedAt: number;
  project: CityProject;
}

/** Backend persistence contract; local fallback lives in lib/persist/projectIO. */
export interface BackendPort {
  saveProject(projectName: string, project: CityProject): Promise<void>;
  loadProject(): Promise<SavedProject | null>;
  listProjects(): Promise<string[]>;
  saveScenario(projectName: string, scenario: Scenario): Promise<void>;
}

/** AI contract — never invoked; the current UI exposes no AI surface. */
export interface AIProviderPort {
  generateScenario(seed: number): Promise<Scenario>;
  explainSimulation(resultsJson: string): Promise<string>;
  recommendImprovements(resultsJson: string): Promise<string[]>;
}

export interface ExternalCity {
  id: string;
  name: string;
  seed: number;
}

/** External city-data contract; the app only ever uses its locally generated city. */
export interface DataProviderPort {
  listAvailableCities(): Promise<ExternalCity[]>;
  retrieveCityData(cityId: string): Promise<CityProject>;
}

/**
 * Runtime registry a future adapter can assign at startup. All null by default:
 * the application must work with every port unimplemented.
 */
export const ports: {
  backend: BackendPort | null;
  ai: AIProviderPort | null;
  data: DataProviderPort | null;
} = { backend: null, ai: null, data: null };
