import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { saveProject, loadProject, PROJECT_KEY, type ProjectEnvelope } from './projectIO';
import { importProjectFile } from './projectIO';
import { generateProject } from '../model/generate';
import { useProjectStore } from '../state/projectStore';
import { useAppStore } from '../state/appStore';
import type { Building, CityProject, Incident, Road, Signal, Zone } from '../model/types';

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
    expect(() => loadProject()).toThrow(/Missing required field "version"/);
  });

  it('rejects unreadable saved JSON', () => {
    storage.setItem(PROJECT_KEY, 'not json {');
    expect(() => loadProject()).toThrow(/Saved project is not valid JSON/);
  });

  it('rejects an unsupported envelope version', () => {
    storage.setItem(PROJECT_KEY, JSON.stringify({ version: 99, savedAt: 1, projectName: 'x', project: generateProject(1) }));
    expect(() => loadProject()).toThrow(/Unsupported saved project version 99/);
  });

  it('rejects a missing saved timestamp', () => {
    storage.setItem(PROJECT_KEY, JSON.stringify({ version: 1, projectName: 'x', project: generateProject(1) }));
    expect(() => loadProject()).toThrow(/savedAt/);
  });

  it('rejects a non-string saved project name', () => {
    storage.setItem(PROJECT_KEY, JSON.stringify({ version: 1, savedAt: 1, projectName: 5, project: generateProject(1) }));
    expect(() => loadProject()).toThrow(/projectName/);
  });

  it('rejects a schema-invalid saved project naming the field', () => {
    const project = generateProject(1) as unknown as Record<string, unknown>;
    delete project.order;
    storage.setItem(PROJECT_KEY, JSON.stringify({ version: 1, savedAt: 1, projectName: 'x', project }));
    expect(() => loadProject()).toThrow(/Missing required field "order"/);
  });

  it('rejects a saved project with a dangling reference naming the field', () => {
    const project = generateProject(1);
    const vehicle = Object.values(project.objects).find((o) => o.type === 'vehicle')!;
    vehicle.spawnRoadId = 'nope';
    storage.setItem(PROJECT_KEY, JSON.stringify({ version: 1, savedAt: 1, projectName: 'x', project }));
    expect(() => loadProject()).toThrow(new RegExp(`objects\\.${vehicle.id}\\.spawnRoadId`));
  });

  it('a rejected load never replaces the live project or name', () => {
    const live = generateProject(5);
    useProjectStore.getState().setProject(live);
    useAppStore.getState().setProjectName('Live City');
    storage.setItem(PROJECT_KEY, 'not json {');

    // Same guarded sequence as TopBar.handleLoad: state only mutates after load succeeds.
    try {
      const saved = loadProject();
      if (saved) {
        useProjectStore.getState().setProject(saved.project);
        useAppStore.getState().setProjectName(saved.projectName);
      }
    } catch {
      // surfaced as a message; state must stay untouched
    }

    expect(useProjectStore.getState().project).toBe(live);
    expect(useAppStore.getState().projectName).toBe('Live City');
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

describe('export → import round-trip', () => {
  it('preserves vehicles, incidents, zones, events, settings, and references', async () => {
    const p = generateProject(42);
    const building = Object.values(p.objects).find((o): o is Building => o.type === 'building')!;
    const road = Object.values(p.objects).find((o): o is Road => o.type === 'road')!;
    const signal = Object.values(p.objects).find((o): o is Signal => o.type === 'signal')!;

    const zone: Zone = {
      type: 'zone', id: 'zone_rt', name: 'Park RT', position: [0, 0], size: [20, 20], zoneType: 'park',
    };
    p.objects[zone.id] = zone;
    p.order.push(zone.id);
    building.zoneId = zone.id;

    const incident: Incident = {
      type: 'incident', id: 'inc_rt', name: 'Hazard RT', position: [0, 0],
      roadId: road.id, incidentType: 'hazard', severity: 0.4, active: true,
    };
    p.objects[incident.id] = incident;
    p.order.push(incident.id);

    p.scenarios = [
      {
        id: 'scn_rt',
        name: 'Round Trip',
        events: [
          { id: 'ev_road', type: 'road_closure', at: 1, roadId: road.id, closed: true },
          { id: 'ev_sig', type: 'signal_timing_change', at: 2, signalId: signal.id, timing: { green: 9, yellow: 2, offset: 1 } },
        ],
      },
    ];

    const exportPayload = { version: p.version, projectName: 'Round Trip City', project: p };
    const file = { text: async () => JSON.stringify(exportPayload) } as File;

    const imported = await importProjectFile(file);
    expect(imported.projectName).toBe('Round Trip City');
    expect(imported.project).toEqual(p);
    expect((imported.project.objects[building.id] as Building).zoneId).toBe(zone.id);
    expect((imported.project.objects[incident.id] as Incident).roadId).toBe(road.id);
    expect(imported.project.scenarios[0].events).toHaveLength(2);
  });
});
