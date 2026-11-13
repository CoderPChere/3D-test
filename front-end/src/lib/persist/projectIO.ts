// Local persistence: save/load (localStorage) + export/import (JSON files).
// Imports are validated through parseProject before touching any state.
import { PROJECT_VERSION, type CityProject } from '../model/types';
import { parseProject } from '../model/parseProject';

export const PROJECT_KEY = 'cityfluxy.project';

export interface ProjectEnvelope {
  version: number;
  savedAt: number;
  projectName: string;
  project: CityProject;
}

/** Throws on quota/serialization failure — callers surface the message. */
export function saveProject(project: CityProject, projectName: string): void {
  const envelope: ProjectEnvelope = {
    version: PROJECT_VERSION,
    savedAt: Date.now(),
    projectName,
    project,
  };
  localStorage.setItem(PROJECT_KEY, JSON.stringify(envelope));
}

export function loadProject(): ProjectEnvelope | null {
  const raw = localStorage.getItem(PROJECT_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as ProjectEnvelope;
  if (!parsed || typeof parsed !== 'object' || !parsed.project || !parsed.project.objects) {
    throw new Error('Saved project is invalid');
  }
  return parsed;
}

export function exportProject(project: CityProject, projectName: string): void {
  const blob = new Blob([JSON.stringify({ version: PROJECT_VERSION, projectName, project }, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName.replace(/[^\w-]+/g, '_').toLowerCase() || 'project'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Throws with a human-readable message on invalid files. */
export async function importProjectFile(file: File): Promise<{ projectName: string; project: CityProject }> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new Error('Could not read file');
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON');
  }
  const d = data as { project?: unknown; projectName?: string };
  if (!d || typeof d !== 'object' || !d.project || typeof d.project !== 'object') {
    throw new Error('File does not contain a valid project');
  }
  // Throws ProjectParseError with a specific field message on invalid data.
  const project = parseProject(d.project);
  return { projectName: typeof d.projectName === 'string' ? d.projectName : 'Imported Project', project };
}
