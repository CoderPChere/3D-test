import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useSettingsStore,
  readSettings,
  writeSettings,
  defaultLayers,
  SETTINGS_KEY,
} from './settingsStore';

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

const defaults = () => ({ quality: 'medium' as const, speed: 1, layers: defaultLayers() });

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeStorage());
  useSettingsStore.setState(defaults());
  localStorage.clear(); // setState fires the persist subscriber — start each test clean
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('settings persistence (cityfluxy.settings)', () => {
  it('persists a quality-tier change under cityfluxy.settings', () => {
    expect(localStorage.getItem(SETTINGS_KEY)).toBeNull();
    useSettingsStore.getState().setQuality('low');
    const raw = localStorage.getItem(SETTINGS_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).quality).toBe('low');
  });

  it('persists speed and layer toggles', () => {
    useSettingsStore.getState().setSpeed(4);
    useSettingsStore.getState().toggleLayer('heatmap');
    const s = readSettings();
    expect(s?.speed).toBe(4);
    expect(s?.layers.heatmap).toBe(true);
    expect(s?.layers.geometry).toBe(true); // untouched defaults survive
  });

  it('round-trips write → read → hydrate (reload simulation)', () => {
    writeSettings({ ...defaults(), quality: 'high', layers: { ...defaultLayers(), congestion: true } });

    // Fresh boot reads storage first (any state write would re-persist defaults over it).
    const stored = readSettings();
    expect(stored).not.toBeNull();
    useSettingsStore.setState(defaults());
    useSettingsStore.getState().hydrate(stored!);

    const s = useSettingsStore.getState();
    expect(s.quality).toBe('high');
    expect(s.layers.congestion).toBe(true);
    expect(s.layers.distribution).toBe(false); // defaults not clobbered
  });

  it('returns null for corrupt storage instead of crashing', () => {
    localStorage.setItem(SETTINGS_KEY, 'not-json{');
    expect(readSettings()).toBeNull();
  });

  it('ignores an invalid tier value from storage', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ quality: 'ultra', speed: 1, layers: defaultLayers() }));
    expect(readSettings()?.quality).toBe('medium');
  });
});
