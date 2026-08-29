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
  resetGame(0);
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

  it('sanitizes an armed ritual on load: back to idle, no handle held', () => {
    const saved = { ...initialState(0), ritual: { active: 'launch', phase: 'armed', endsAt: 123456789, held: true } };
    storage.set(SAVE_KEY, JSON.stringify(saved));
    expect(loadSavedState()?.ritual).toEqual({ active: null, phase: 'idle', endsAt: null, held: false });
  });

  it('round-trips the ship seed', () => {
    const stop = startPersisting();
    resetGame(4242);
    stop();
    expect(loadSavedState()?.seed).toBe(4242);
  });

  it('treats a save from before seeded ships as the classic ship', () => {
    const legacy = { ...initialState(0) } as Record<string, unknown>;
    delete legacy.seed;
    storage.set(SAVE_KEY, JSON.stringify(legacy));
    expect(loadSavedState()?.seed).toBe(0);
  });

  it('rejects a save with a malformed launch object', () => {
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), ritual: null }));
    expect(loadSavedState()).toBeNull();
  });

  it('rejects a save with an incomplete power allocation', () => {
    const saved = { ...initialState(), powerAllocation: { life_support: 25 } };
    storage.set(SAVE_KEY, JSON.stringify(saved));
    expect(loadSavedState()).toBeNull();
  });

  it('rejects a save with malformed valve settings', () => {
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(), valveSettings: [] }));
    expect(loadSavedState()).toBeNull();
  });

  it('rejects a save pointing at a room that does not exist', () => {
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(), room: 'holodeck' }));
    expect(loadSavedState()).toBeNull();
  });

  it('keeps a completed ritual as done, but still clears the held flag', () => {
    const saved = { ...initialState(0), ritual: { active: 'launch', phase: 'done', endsAt: null, held: true } };
    storage.set(SAVE_KEY, JSON.stringify(saved));
    expect(loadSavedState()?.ritual).toEqual({ active: 'launch', phase: 'done', endsAt: null, held: false });
  });

  it('rejects a save with an impossible chapter', () => {
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), chapter: 7 }));
    expect(loadSavedState()).toBeNull();
  });
});
