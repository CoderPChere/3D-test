import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { saveProject, loadProject, PROJECT_KEY, type ProjectEnvelope } from './projectIO';
import { generateProject } from '../model/generate';
import type { CityProject } from '../model/types';

/** Minimal in-memory localStorage for the node test environment. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  } as Storage;
}

const scenarioProject = (): CityProject => {
  const p = generateProject(42);
  p.scenarios = [
    { id: 'scn_keep', name: 'Rush hour', events: [{ id: 'e1', type: 'vehicle_surge', at: 2, count: 6, roadId: p.order.find((id) => p.objects[id].type === 'road')! }] },
  ];
  return p;
};

let storage: Storage;
let setItemSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  storage = fakeStorage();
  vi.stubGlobal('localStorage', storage);
  setItemSpy = vi.spyOn(storage, 'setItem');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('save/load round-trip', () => {
  it('preserves ids, scenarios, and seed across save→load', () => {
    const project = scenarioProject();
    saveProject(project, 'My City');

    const envelope = loadProject();
    expect(envelope).not.toBeNull();
    expect(envelope!.version).toBe(project.version);
    expect(envelope!.projectName).toBe('My City');
    expect(envelope!.project.seed).toBe(42);
    expect(envelope!.project.order).toEqual(project.order);
    expect(envelope!.project.objects).toEqual(project.objects);
    expect(envelope!.project.scenarios).toEqual(project.scenarios);
    expect(envelope!.savedAt).toBeTypeOf('number');
  });

  it('returns null when nothing was ever saved', () => {
    expect(loadProject()).toBeNull();
  });
});

describe('versioned envelope', () => {
  it('stores the envelope under the versioned key with a version field', () => {
    saveProject(generateProject(7), 'X');
    const raw = storage.getItem(PROJECT_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as ProjectEnvelope;
    expect(parsed.version).toBeTypeOf('number');
    expect(parsed.projectName).toBe('X');
    expect(parsed.project.seed).toBe(7);
  });

  it('rejects a saved payload that is not a valid envelope', () => {
    storage.setItem(PROJECT_KEY, JSON.stringify({ version: 1, savedAt: 1, projectName: 'x', project: { nope: true } }));
    expect(() => loadProject()).toThrow(/invalid/i);
  });
});

describe('quota failure', () => {
  it('surfaces a thrown error instead of losing data silently', () => {
    setItemSpy.mockImplementation(() => {
      const e = new Error('QuotaExceededError: storage full');
      e.name = 'QuotaExceededError';
      throw e;
    });
    expect(() => saveProject(generateProject(1), 'X')).toThrow(/QuotaExceededError/);
    // Nothing was written → load still reports no saved project.
    expect(loadProject()).toBeNull();
  });
});
