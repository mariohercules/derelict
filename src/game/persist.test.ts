import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSavedState, startPersisting, SAVE_KEY } from './persist';
import { gameStore, resetGame, initialState } from './store';

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
});

beforeEach(() => {
  storage.clear();
  resetGame();
});

describe('persistence', () => {
  it('round-trips state through localStorage', () => {
    const stop = startPersisting();
    gameStore.setState({ auxPower: true, act: 2, room: 'engineering' });
    stop();
    const loaded = loadSavedState();
    expect(loaded?.auxPower).toBe(true);
    expect(loaded?.room).toBe('engineering');
  });

  it('returns null for corrupt saves instead of throwing', () => {
    storage.set(SAVE_KEY, '{not json');
    expect(loadSavedState()).toBeNull();
  });

  it('returns null when a save is missing expected fields', () => {
    storage.set(SAVE_KEY, JSON.stringify({ hello: 'world' }));
    expect(loadSavedState()).toBeNull();
  });

  it('sanitizes an in-flight countdown on load: back to idle, no handle held', () => {
    const saved = {
      ...initialState(),
      launch: { phase: 'countdown', countdownEndsAt: 123456789, handleHeld: true },
    };
    storage.set(SAVE_KEY, JSON.stringify(saved));
    const loaded = loadSavedState();
    expect(loaded?.launch).toEqual({ phase: 'idle', countdownEndsAt: null, handleHeld: false });
  });

  it('keeps a launched save as launched, but still clears handleHeld', () => {
    const saved = {
      ...initialState(),
      launch: { phase: 'launched', countdownEndsAt: null, handleHeld: true },
    };
    storage.set(SAVE_KEY, JSON.stringify(saved));
    const loaded = loadSavedState();
    expect(loaded?.launch).toEqual({ phase: 'launched', countdownEndsAt: null, handleHeld: false });
  });
});
