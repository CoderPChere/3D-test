// Singleton engine bound to the current project. Rebinds (fresh engine) when the
// project object identity changes, so edits always simulate the latest city.
import type { CityProject } from '../model/types';
import { SimulationEngine } from './engine';

let bound: CityProject | null = null;
let engine: SimulationEngine | null = null;

export function getEngine(project: CityProject): SimulationEngine {
  if (engine === null || project !== bound) {
    bound = project;
    engine = new SimulationEngine(project);
  }
  return engine;
}
