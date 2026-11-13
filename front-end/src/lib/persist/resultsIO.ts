// Simulation-results export: pure builder + JSON download (analytics spec).
import { PROJECT_VERSION, type Scenario } from '../model/types';
import type { ScenarioResult } from '../state/scenarioStore';

export interface ResultsExport {
  version: number;
  /** Project seed the runs were produced from. */
  seed: number;
  exportedAt: number;
  runs: Array<{
    scenarioId: string;
    scenarioName: string;
    seed: number;
    ranAt: number;
    simTime: number;
    metrics: ScenarioResult['metrics'];
  }>;
}

/** Null when nothing has run — callers show the no-data message instead of a file. */
export function buildResultsExport(
  results: Record<string, ScenarioResult>,
  scenarios: Scenario[],
  seed: number,
): ResultsExport | null {
  const runs = Object.values(results).map((r) => ({
    scenarioId: r.scenarioId,
    scenarioName: scenarios.find((s) => s.id === r.scenarioId)?.name ?? 'Unknown scenario',
    seed: r.seed,
    ranAt: r.ranAt,
    simTime: r.simTime,
    metrics: r.metrics,
  }));
  if (runs.length === 0) return null;
  return { version: PROJECT_VERSION, seed, exportedAt: Date.now(), runs };
}

export function downloadResults(data: ResultsExport): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cityfluxy-results-${new Date(data.exportedAt).toISOString().replace(/[:.]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
