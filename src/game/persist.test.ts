import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSavedState, startPersisting, migrateV1, SAVE_KEY, LEGACY_SAVE_KEY } from './persist';
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

  it('rejects a save with an impossible checkpoint chapter', () => {
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), checkpoint: { chapter: 9, room: 'bridge' } }));
    expect(loadSavedState()).toBeNull();
  });

  it('rejects a save with a bogus ending', () => {
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), ending: 'bogus' }));
    expect(loadSavedState()).toBeNull();
  });

  it('rejects a save with a bogus ritual.active', () => {
    const saved = { ...initialState(0), ritual: { active: 'bogus', phase: 'idle', endsAt: null, held: false } };
    storage.set(SAVE_KEY, JSON.stringify(saved));
    expect(loadSavedState()).toBeNull();
  });
});

describe('v1 → v2 migration', () => {
  function v1Save(overrides: Record<string, unknown> = {}) {
    return {
      seed: 0, act: 3, room: 'bridge', auxPower: true, grateRemoved: true, breakersFlipped: ['C', 'A', 'B'],
      doors: { cryo_exit: true, engineering_exit: true },
      powerAllocation: { life_support: 15, doors: 5, medbay: 0, engines: 20, comms: 0 },
      fuseInstalled: '10A', valveSettings: [6, 3, 7], starFixTaken: true, trajectorySet: true,
      launch: { phase: 'countdown', countdownEndsAt: 123456789, handleHeld: true },
      toolCalls: 30, won: false,
      ...overrides,
    };
  }

  it('maps a v1 launch to a ritual and fills the new fields', () => {
    const m = migrateV1(v1Save());
    expect(m.ritual).toEqual({ active: 'launch', phase: 'armed', endsAt: 123456789, held: true });
    expect(m.chapter).toBe(1);
    expect(m.sealedLogRead).toBe(false);
    expect(m.ending).toBeNull();
    expect(m.checkpoint).toEqual({ chapter: 1, room: 'bridge' });
    expect((m as Record<string, unknown>).launch).toBeUndefined();
  });

  it('maps a won v1 save to the leave-unknowing ending and a done ritual', () => {
    const m = migrateV1(v1Save({ won: true, launch: { phase: 'launched', countdownEndsAt: null, handleHeld: false } }));
    expect(m.ending).toBe('leave_unknowing');
    expect(m.ritual?.phase).toBe('done');
  });

  it('loads a v1 save from the legacy key when no v2 save exists, with progress intact', () => {
    storage.set(LEGACY_SAVE_KEY, JSON.stringify(v1Save()));
    const loaded = loadSavedState();
    expect(loaded?.room).toBe('bridge');
    expect(loaded?.trajectorySet).toBe(true);
    expect(loaded?.ritual).toEqual({ active: null, phase: 'idle', endsAt: null, held: false }); // armed → sanitized
    expect(loaded?.chapter).toBe(1);
  });

  it('prefers the v2 save when both exist', () => {
    storage.set(LEGACY_SAVE_KEY, JSON.stringify(v1Save({ room: 'engineering' })));
    storage.set(SAVE_KEY, JSON.stringify({ ...initialState(0), room: 'bridge', doors: { cryo_exit: true, engineering_exit: true } }));
    expect(loadSavedState()?.room).toBe('bridge');
  });

  it('writes v2 only, clearing a pre-existing legacy save', () => {
    storage.set(LEGACY_SAVE_KEY, JSON.stringify(v1Save()));
    const stop = startPersisting();
    gameStore.setState({ auxPower: true });
    stop();
    expect(storage.has(SAVE_KEY)).toBe(true);
    expect(storage.has(LEGACY_SAVE_KEY)).toBe(false);
  });
});
