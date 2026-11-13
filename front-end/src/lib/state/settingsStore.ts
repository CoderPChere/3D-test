import { create } from 'zustand';
import { LAYER_IDS, type LayerId, type QualityTier } from '../model/types';

interface SettingsState {
  quality: QualityTier;
  speed: number;
  layers: Record<LayerId, boolean>;
  setQuality: (q: QualityTier) => void;
  setSpeed: (speed: number) => void;
  toggleLayer: (layer: LayerId) => void;
  /** Bulk-hydrate from persisted settings (local persistence task). */
  hydrate: (s: Pick<SettingsState, 'quality' | 'speed' | 'layers'>) => void;
}

const defaultLayers = (): Record<LayerId, boolean> =>
  Object.fromEntries(LAYER_IDS.map((id) => [id, id === 'geometry' || id === 'vehicles' || id === 'signals'])) as Record<
    LayerId,
    boolean
  >;

export const SETTINGS_KEY = 'cityfluxy.settings';

type PersistedSettings = Pick<SettingsState, 'quality' | 'speed' | 'layers'>;

/** Read persisted settings; null when absent/corrupt (callers fall back to defaults). */
export function readSettings(): PersistedSettings | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
    if (!parsed || typeof parsed !== 'object') return null;
    const quality =
      parsed.quality === 'low' || parsed.quality === 'medium' || parsed.quality === 'high' ? parsed.quality : 'medium';
    return {
      quality,
      speed: typeof parsed.speed === 'number' && Number.isFinite(parsed.speed) ? parsed.speed : 1,
      layers: { ...defaultLayers(), ...(parsed.layers ?? {}) },
    };
  } catch {
    return null;
  }
}

/** Auto-persist on every change; quota failure keeps settings session-only (never crashes the app). */
export function writeSettings(s: PersistedSettings): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // shortcut: quota → settings are session-only; project data outranks them
  }
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  quality: 'medium',
  speed: 1,
  layers: defaultLayers(),
  setQuality: (quality) => set({ quality }),
  setSpeed: (speed) => set({ speed }),
  toggleLayer: (layer) => set((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } })),
  hydrate: ({ quality, speed, layers }) => set({ quality, speed, layers: { ...defaultLayers(), ...layers } }),
}));

// Persist across sessions: hydrate once at startup, write on every change.
const storedSettings = readSettings();
if (storedSettings) useSettingsStore.setState(storedSettings);
useSettingsStore.subscribe((s) => writeSettings({ quality: s.quality, speed: s.speed, layers: s.layers }));

export { defaultLayers };
