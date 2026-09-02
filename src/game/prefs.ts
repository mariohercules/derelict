// Per-device preferences that are not game state: the mute and the folded
// console. Hydrated before the app mounts; a bad value is the empty prefs.
import { createStore } from 'zustand/vanilla';

export const PREFS_KEY = 'derelict-prefs';

export interface Prefs {
  version: 1;
  muted: boolean;
  linkCollapsed: boolean;
}

export const EMPTY_PREFS: Prefs = { version: 1, muted: false, linkCollapsed: false };

export function validPrefs(v: unknown): v is Prefs {
  if (!v || typeof v !== 'object') return false;
  const p = v as Record<string, unknown>;
  return p.version === 1 && typeof p.muted === 'boolean' && typeof p.linkCollapsed === 'boolean';
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return EMPTY_PREFS;
    const parsed: unknown = JSON.parse(raw);
    return validPrefs(parsed) ? parsed : EMPTY_PREFS;
  } catch {
    return EMPTY_PREFS;
  }
}

export const prefsStore = createStore<Prefs>(() => EMPTY_PREFS);

export function hydratePrefs(): void {
  prefsStore.setState(loadPrefs(), true);
}

export function setPref<K extends Exclude<keyof Prefs, 'version'>>(key: K, value: Prefs[K]): void {
  const next: Prefs = { ...prefsStore.getState(), [key]: value };
  prefsStore.setState(next, true);
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    // Private mode / quota: the choice lives for this session only.
  }
}
