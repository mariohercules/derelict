import { gameStore, initialState } from './store';
import type { GameState } from './types';

export const SAVE_KEY = 'derelict-save-v1';

export function loadSavedState(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (typeof parsed.act !== 'number' || typeof parsed.room !== 'string' || !parsed.doors) return null;
    // Merge over initialState so old saves survive new fields
    return { ...initialState(), ...parsed } as GameState;
  } catch {
    return null;
  }
}

export function startPersisting(): () => void {
  return gameStore.subscribe((s) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch {
      // Private mode / quota: play on without saves.
    }
  });
}
